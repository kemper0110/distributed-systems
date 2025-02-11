import {taskSchema} from "../common/task";
import fastify from "fastify";
import {WorkerPool} from "./WorkerPool";

const PORT = Number.parseInt(process.env.PORT) || 3000;

const app = fastify({logger: true})

const workerPool = new WorkerPool([
    {origin: 'http://localhost:3001'},
])

app
    .post('/solve', async (request, reply) => {
        const result = taskSchema.safeParse(request.body);
        if(!result.success)
            return reply.status(400).send(result.error.message);
        const input = result.data;

        let iteration = 0;
        let precision = Infinity;
        const x = input.x ?? (
            Array.from({length: input.b.length}, () => 0) as [number, ...number[]]
        );

        while(iteration < input.maxIterations && (
            input.epsilon ? precision > input.epsilon : true
        )) {

            for(let rowIdx = 0; rowIdx < input.a.length; ++rowIdx) {
                const promise = workerPool.dispatch({
                    aRow: input.a[rowIdx],
                    rowIndex: rowIdx,
                    b: input.b,
                    x: x
                })
                promise.then(res => {

                }).catch(err => {

                })
            }

            iteration++;
        }

    })
    .listen({port: PORT}, (err, address) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Сервер запущен на ${address}`);
    });