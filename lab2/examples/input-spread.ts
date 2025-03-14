import {pipeline} from "node:stream/promises";
import {setTimeout} from "timers/promises";

function emitter(channel: number) {
    return async function emit(source: AsyncIterable<Buffer | Uint8Array>) {
        console.log(`[${channel}]`, 'start')
        let overall = 0
        for await (const chunk of source) {
            overall += chunk.length
            console.log(`[${channel}]`, chunk.toString(), `${chunk.length}/${overall}`)
        }
        console.log(`[${channel}]`, 'end', overall)
    }
}

const maxEmitterByteCount = 8
const chunkSize = 2

pipeline(
    async function* () {
        for (let i = 0; i < 20; i++) {
            await setTimeout(100)
            yield Buffer.from(i.toString().padStart(chunkSize, '0'))
        }
    },
    async function (source) {
        let emitterId = 0
        let tail: Buffer | undefined
        while (true) {
            let readableDone = false
            await pipeline(source, async function* (source) {
                let emitted = 0
                if (tail) {
                    emitted += tail.length
                    yield tail
                    tail = undefined
                }
                for await(const chunk of source) {
                    const remaining = maxEmitterByteCount - emitted
                    if (chunk.length <= remaining) {
                        yield chunk
                        emitted += chunk.length
                    } else {
                        const part = chunk.subarray(0, remaining)
                        if(tail) throw new TypeError('tail is not empty')
                        tail = chunk.subarray(remaining)
                        yield part
                        emitted += part.length
                    }
                    if (emitted === maxEmitterByteCount) {
                        return;
                    }
                    if(emitted > maxEmitterByteCount) {
                        throw new TypeError('Too much emitted')
                    }
                }
                if (tail) {
                    if(tail.length > maxEmitterByteCount - emitted) {
                        const part = tail.subarray(0, maxEmitterByteCount - emitted)
                        yield part
                        emitted += part.length
                        tail = tail.subarray(maxEmitterByteCount - emitted)
                    } else {
                        yield tail
                        readableDone = true
                    }
                } else {
                    readableDone = true
                }
            }, emitter(emitterId))
            if (readableDone)
                break
            emitterId = (emitterId + 1) % maxEmitterByteCount
        }
    }
)
    .then(() => console.log('done'))
    .catch(e => console.error(e))


async function* bigChunkSplitter(source) {
    for await (let chunk of source) {
        while (chunk.length > maxEmitterByteCount) {
            yield chunk.subarray(0, maxEmitterByteCount)
            chunk = chunk.subarray(maxEmitterByteCount)
        }
        yield chunk
    }
}