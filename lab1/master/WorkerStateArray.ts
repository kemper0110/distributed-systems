import {SubTask} from "../common/subTask";

export type WorkerState = IdleState | BusyState | CrashLoopBackoffState;
export type WorkerStateType = Pick<WorkerState, 'type'>['type']
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

export class WorkerStateArray {
    protected states: WorkerState[];
    protected listeners: Array<() => void> = []

    constructor(length: number) {
        this.states = Array.from({length}).map(() => ({type: "idle"}))
    }

    get(): readonly WorkerState[] {
        return this.states
    }

    set(idx: number, state: WorkerState) {
        this.states[idx] = state
        this.listeners.forEach(cb => cb())
        this.listeners = []
    }

    wait() {
        return new Promise<void>(res => this.listeners.push(res))
    }

    findIdleWorker(): number | -1 {
        const idleIndices = this.states
            .map((s, i) => s.type === 'idle' ? i : -1)
            .filter(i => i !== -1);
        if (idleIndices.length === 0) return -1;
        return idleIndices[Math.floor(Math.random() * idleIndices.length)]
    }

    validWorkersCount(): number {
        return this.states.filter(s => s.type !== 'crash-loop-backoff').length
    }
}