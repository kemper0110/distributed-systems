import {SubTask} from "../common/subTask";

export type WorkerConfig = {
    origin: string;
}

export type WorkerState = IdleState | BusyState | CrashLoopBackoffState;

export type IdleState = {
    type: 'idle';
}

export type BusyState = {
    type: 'busy';
    subtask: SubTask;
}

export type CrashLoopBackoffState = {
    type: 'crash-loop-backoff';
}

export class WorkerPool {
    protected state: WorkerState[] = [];
    protected listeners: Array<() => void> = [];

    constructor(protected readonly workers: WorkerConfig[]) {
        this.state = this.workers.map(w => ({
            type: 'idle'
        }))
    }

    async dispatch(subtask: SubTask) {

        // when changed state
        this.listeners.forEach(l => l());
    }

    async listenState() {
        return new Promise<void>(res => this.listeners.push(res));
    }

    getState(): readonly WorkerState[] {
        return this.state;
    }
}