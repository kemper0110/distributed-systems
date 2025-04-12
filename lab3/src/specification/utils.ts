import path from "node:path";
import os from "node:os";
import {randomFill} from "node:crypto";

export function generateBlockPath(testId: string, appId: string = '') {
    const date = new Date().toLocaleString()
        .replaceAll(', ', '-')
        .replaceAll(':', '-')
    const rnd = Math.floor(Math.random() * 1000)
    return path.join(os.tmpdir(), `lab3-node-${testId}-${date}-${appId}-${rnd}`, 'blocks')
}

export function asyncRandomFill(buffer: Buffer) {
    return new Promise<void>((res, rej) =>
        randomFill(buffer, e => e ? rej(e) : res())
    )
}