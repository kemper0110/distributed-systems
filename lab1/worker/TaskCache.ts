import {JacobiTask} from "./jacobi";
import {nanoid} from "nanoid";

export class TaskCache {
    private readonly cache: Array<{
        key: string,
        task: JacobiTask
    }>;

    constructor(cacheSize: number) {
        this.cache = Array(cacheSize);
    }

    get(key: string): JacobiTask | undefined {
        const idx = this.cache.findIndex(task =>
            task.key === key
        )
        if (idx === -1)
            return undefined;

        const elem = this.cache[idx]
        // элемент и так первый
        if (idx === 0)
            return elem.task;

        this.cache[idx] = this.cache[idx - 1] // сдвигаем вправо левый элемент
        this.cache[idx - 1] = elem // сдвигаем влево правый элемент

        return elem.task;
    }

    put(task: JacobiTask): string {
        const key = nanoid()
        this.cache.unshift({key, task});
        return key;
    }
}