import {pipeline} from "node:stream/promises";

export function makeChunkToBlockStreamer(source: AsyncIterable<Buffer | Uint8Array>, blockSizeBytes: number)
{
    let tail: Buffer | undefined
    let readableDone = false
    async function* streamChunksToBlock() {
        readableDone = false
        let remainingToBlock = blockSizeBytes
        function yieldPart(part: Buffer) {
            remainingToBlock -= part.length
            return part
        }
        function yieldTailSplit(buf: Buffer) {
            const part = buf.subarray(0, remainingToBlock)
            tail = buf.subarray(remainingToBlock)
            return yieldPart(part)
        }
        if (tail) {
            yield yieldPart(tail)
            tail = undefined
        }
        while (true) {
            if (remainingToBlock === 0) return;
            if (remainingToBlock < 0) throw new TypeError('omg remaining < 0')
            // @ts-ignore
            const {value, done} = await source.next()
            if (done) {
                break;
            }
            if (value.length <= remainingToBlock) {
                yield yieldPart(value)
            } else {
                yield yieldTailSplit(value)
            }
        }

        if (!tail) {
            readableDone = true
            return;
        }

        // @ts-ignore
        if (tail.length > remainingToBlock) {
            yield yieldTailSplit(tail)
            // readableDone не выставляем, чтобы отправить tail на следующую ноду
        } else {
            yield tail
            tail = undefined
            readableDone = true
        }
    }
    return {
        streamChunksToBlock,
        isReadableDone: () => readableDone
    }
}


if (import.meta.vitest) {
    const {it, expect} = import.meta.vitest

    it('stream chunks to block: chunk = block', async () => {
        const {streamChunksToBlock, isReadableDone} = makeChunkToBlockStreamer(async function*() {
            yield Buffer.alloc(10)
        }(), 10)
        await pipeline(
            streamChunksToBlock,
            async function receiver(source: AsyncIterable<Buffer | Uint8Array>) {
                const iterator = source[Symbol.asyncIterator]()

                let res = await iterator.next()
                expect(res.done).toBe(false)
                expect(res.value.length).toBe(10)

                res = await iterator.next()
                expect(res.done).toBe(true)
            }
        )
        expect(isReadableDone()).toBe(false)

        await pipeline(
            streamChunksToBlock,
            async function receiver(source: AsyncIterable<Buffer | Uint8Array>) {
                const iterator = source[Symbol.asyncIterator]()

                let res = await iterator.next()
                expect(res.done).toBe(true)
            }
        )
        expect(isReadableDone()).toBe(true)
    })

    // it('stream chunks to block: 2 chunks = block', async () => {
    //     const {streamChunksToBlock, isReadableDone} = makeChunkToBlockStreamer(async function*() {
    //         yield Buffer.alloc(5)
    //         yield Buffer.alloc(5)
    //     }(), 10)
    //     await pipeline(
    //         streamChunksToBlock,
    //         async function receiver(source: AsyncIterable<Buffer | Uint8Array>) {
    //             const iterator = source[Symbol.asyncIterator]()
    //
    //             let res = await iterator.next()
    //             expect(res.done).toBe(false)
    //             expect(res.value.length).toBe(5)
    //
    //             res = await iterator.next()
    //             expect(res.done).toBe(false)
    //             expect(res.value.length).toBe(5)
    //
    //             res = await iterator.next()
    //             expect(res.done).toBe(true)
    //         }
    //     )
    //     expect(isReadableDone()).toBe(true)
    // })

    /*
            // overdose chunks = block + tail
            yield Buffer.alloc(5)
            yield Buffer.alloc(8)

            // tail + completing chunk = block
            yield Buffer.alloc(7)

       // 2 chunks = block

        expect(isReadableDone()).toBe(false)

        // overdose chunks = block + tail
        await pipeline(
            streamChunksToBlock,
            async function receiver(source: AsyncIterable<Buffer | Uint8Array>) {
                const iterator = source[Symbol.asyncIterator]()

                let res = await iterator.next()
                expect(res.done).toBe(false)
                expect(res.value.length).toBe(5)

                res = await iterator.next()
                expect(res.done).toBe(false)
                expect(res.value.length).toBe(5)

                res = await iterator.next()
                expect(res.done).toBe(true)
            }
        )
        expect(isReadableDone()).toBe(false)

        // tail + completing chunk = block
        await pipeline(
            streamChunksToBlock,
            async function receiver(source: AsyncIterable<Buffer | Uint8Array>) {
                const iterator = source[Symbol.asyncIterator]()

                // tail
                let res = await iterator.next()
                expect(res.done).toBe(false)
                expect(res.value.length).toBe(3)

                // chunk
                res = await iterator.next()
                expect(res.done).toBe(false)
                expect(res.value.length).toBe(7)

                res = await iterator.next()
                expect(res.done).toBe(true)
            }
        )

     */
}