import {SubTask} from "../common/subTask";
import {WorkerStateArray} from "./WorkerStateArray";
import {stringToEmoji} from "./stringToEmoji";

export type WorkerConfig = {
    origin: string;
}

function workerToString(origin: string) {
    return origin + stringToEmoji(origin)
}

export class WorkerPool {
    protected state: WorkerStateArray;

    constructor(protected readonly workers: WorkerConfig[]) {
        this.state = new WorkerStateArray(workers.length)
    }

    availableWorkersCount() {
        return this.state.get()
            .filter(w => w.type === 'idle')
            .length;
    }

    protected async sendTask(workerId: number, subtask: SubTask) {
        const {origin} = this.workers[workerId]
        const send = async () => {
            console.debug(`Отправка задачи [${subtask.startRow}, ${subtask.startRow + subtask.rowCount}) на узел ${workerToString(origin)}.`)
            const response = await fetch(new URL("/solve", origin), {
                method: 'POST',
                body: JSON.stringify(subtask),
                headers: {
                    'content-type': 'application/json',
                    'accept': 'application/json',
                }
            })
            return await response.json()
        }
        // первая попытка
        let response = await send().catch<TypeError>(e => e)
        if (!(response instanceof TypeError))
            return response
        // вторая попытка
        response = await send().catch<TypeError>(e => e)
        if (!(response instanceof TypeError))
            return response
        // неудачно
        throw response
    }

    protected async captureIdleWorker(subtask: SubTask) {
        while (true) {
            if (this.state.validWorkersCount() == 0)
                throw new NoValidWorkersError()
            const idleWorkerIndex = this.state.findIdleWorker()
            if (idleWorkerIndex !== -1) {
                this.state.set(idleWorkerIndex, {type: 'busy', subtask})
                return idleWorkerIndex
            }
            await this.state.wait()
        }
    }

    async dispatch(subtask: SubTask) {
        while (true) {
            const workerIndex = await this.captureIdleWorker(subtask)

            const response = await this.sendTask(workerIndex, subtask).catch<TypeError>(e => e)
            if (response instanceof TypeError) {
                console.warn(`Узел ${workerToString(this.workers[workerIndex].origin)} оказался недоступен. Работа будет перераспределена.`)
                this.state.set(workerIndex, {type: 'crash-loop-backoff'})
                setTimeout(() => this.state.set(workerIndex, {type: "idle"}), 5_000)
            }
            else {
                console.info(`Узел ${workerToString(this.workers[workerIndex].origin)} справился с работой.`)
                this.state.set(workerIndex, {type: "idle"})
                return response
            }
        }
    }
}

export class NoValidWorkersError extends TypeError {
    constructor() {
        super("Отсутствуют работоспособные узлы");
    }
}