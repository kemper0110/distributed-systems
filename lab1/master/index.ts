import {taskSchema} from "../common/task";
import fastify from "fastify";
import {NoValidWorkersError, WorkerConfig, WorkerPool} from "./WorkerPool";
import {SubTask} from "../common/subTask";
import {calculatePrecision} from "./precision";
import * as fs from "node:fs";
import {getDiagonalNotPrevalenceRow} from "../common/diagonal-prevalence";

const PORT = Number.parseInt(process.env.PORT) || 3000;

const app = fastify({logger: true})


async function introspectFromDocker(): Promise<WorkerConfig[]> {
    try {
        const url = new URL("/containers/json?" + new URLSearchParams({
            filters: JSON.stringify({
                label: ["lab1-container=worker"]
            })
        }), process.env.DOCKER_DAEMON)
        const res = await fetch(url);
        const containers = await res.json();
        return containers.map(c => ({origin: "http://localhost:" + c.Ports[0].PublicPort}));
    } catch (e) {
        console.error('Ошибка интроспекции через докер: ', e.message);
        return [];
    }
}

function fromEnv() {
    return Object.keys(process.env)
        .filter(key => key.startsWith("WORKER"))
        .map(key => ({
            key,
            origin: process.env[key]
        }))
}

let workerPool: WorkerPool;
(process.env.USE_DOCKER_INTROSPECTION === '1' ? introspectFromDocker() : Promise.resolve(fromEnv()))
    .then(config => {
        console.log(`Обнаружено узлов: ${config.length}.`)
        workerPool = new WorkerPool(config)
    })


app
    .post('/solve', async (request, reply) => {
        const result = taskSchema.safeParse(request.body);
        if (!result.success)
            return reply.status(400).send(result.error.message);
        const input = result.data;

        const height = input.a.length

        let iteration = 0;
        let precision = Number.MAX_VALUE;
        let x = input.x ?? Array.from({length: input.b.length}, () => 0)

        try {

            while (iteration < input.maxIterations && (
                // если указан epsilon, то проверяем и по точности
                !input.epsilon || precision > input.epsilon
            )) {
                console.info(`Итерация ${iteration}. Точность ${precision}.`)
                // нужно узнать текущее количество доступных воркеров, чтобы равномерно распределить задачи
                const availableWorkerCount = workerPool.availableWorkersCount()
                if (availableWorkerCount === 0) {
                    throw new NoValidWorkersError();
                }
                // складываем промисы на отправленные задачи, чтобы ожидать их завершения
                const sentTasks: Promise<{ startRow: number, rowCount: number, x: number[] }>[] = []

                // нельзя брать воркеров больше, чем есть строк. в крайнем случае будет 1 воркер = 1 строка
                const maxWorkerCount = Math.min(height, availableWorkerCount)
                // применяем ограничение на минимальное количество строк для воркера
                const usingWorkerCount = input.minRowsPerWorker ?
                    Math.ceil(Math.min(height / input.minRowsPerWorker, maxWorkerCount))
                    : maxWorkerCount
                const basicLimit = Math.floor(height / usingWorkerCount)
                const topLimit = height - basicLimit * (usingWorkerCount - 1)
                for (let workerIdx = 0; workerIdx < usingWorkerCount; ++workerIdx) {
                    const startRow = workerIdx * basicLimit
                    const rowCount = workerIdx === usingWorkerCount - 1 ? topLimit : basicLimit

                    const subtask = {
                        aSlice: input.a.slice(startRow, startRow + rowCount) as SubTask['aSlice'],
                        startRow,
                        rowCount,
                        b: input.b,
                        x: x,
                    } satisfies SubTask
                    const promise = workerPool.dispatch(subtask)
                        .then(result => ({
                            startRow, rowCount,
                            x: result
                        }))
                    sentTasks.push(promise)
                }
                const results = await Promise.all(sentTasks)
                const xNew = []
                for (const res of results)
                    for (let i = 0; i < res.rowCount; ++i)
                        xNew[res.startRow + i] = res.x[i]
                if (xNew.indexOf(undefined) !== -1)
                    throw new TypeError("Не установлено значение для одного из элементов массива результатов")
                console.log(`Решение на итерации ${iteration}:`, JSON.stringify(xNew.map(v => v.toFixed(1))))
                precision = calculatePrecision(xNew, x)
                if(precision === Infinity)
                    throw new TypeError("Вычисление не сходится")
                x = xNew
                iteration++
            }

            reply.send({x, iteration, precision})
        } catch (e) {
            console.error(`Работа преждевременно прервана. Исключение: ${e.message}.`)
            reply.send({x, iteration, precision, error: e.message})
        }
    })
    .listen({port: PORT}, (err, address) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Сервер запущен на ${address}`);
    });