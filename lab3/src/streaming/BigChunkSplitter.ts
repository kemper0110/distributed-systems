import {pipeline} from "node:stream/promises";

export function makeBigChunkSplitter(
    blockSizeBytes: number
) {
    return async function* (source: AsyncIterable<Buffer | Uint8Array>): AsyncGenerator<Buffer | Uint8Array, void> {
        for await (let chunk of source) {
            while (chunk.length > blockSizeBytes) {
                yield chunk.subarray(0, blockSizeBytes);
                chunk = chunk.subarray(blockSizeBytes);
            }
            yield chunk;
        }
    };
}

if (import.meta.vitest) {
    const {it, expect} = import.meta.vitest

    it('split big chunk', async () => {
        const splitter = makeBigChunkSplitter(10)

        await pipeline(
            async function* source() {
                yield Buffer.alloc(5)
                yield Buffer.alloc(10)
                yield Buffer.alloc(12)
            },
            splitter,
            async function receiver(source: AsyncIterable<Buffer | Uint8Array>) {
                const iterator = source[Symbol.asyncIterator]()

                let res = await iterator.next()
                expect(res.done).toBe(false)
                expect(res.value.length).toBe(5)

                res = await iterator.next()
                expect(res.done).toBe(false)
                expect(res.value.length).toBe(10)

                res = await iterator.next()
                expect(res.done).toBe(false)
                expect(res.value.length).toBe(10)

                res = await iterator.next()
                expect(res.done).toBe(false)
                expect(res.value.length).toBe(2)

                res = await iterator.next()
                expect(res.done).toBe(true)
            }
        )
    })
}