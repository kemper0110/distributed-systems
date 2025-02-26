import * as fs from 'node:fs'
import {pipeline} from "node:stream/promises";
import {createWriteStream} from "node:fs";
import {EventEmitter} from 'node:events';
import {Readable} from "node:stream";

// pipeline(function* () {
//     for(let i = 0; i < 1_000_000; ++i)
//         yield `line_${i}\n`
// }, fs.createWriteStream("big.txt")).then(() => {
//     console.log('done')
// })


// async function* chunker(source: AsyncIterable<any>) {
//     const CHUNK_SIZE = 1024 * 1024
//     let buffer = Buffer.of(0)
//     for await(const chunk of source) {
//         buffer = Buffer.concat([buffer, chunk])
//         while(buffer.length >= CHUNK_SIZE) {
//             const chunk = buffer.subarray(0, CHUNK_SIZE)
//             buffer = buffer.subarray(CHUNK_SIZE)
//             yield chunk
//         }
//     }
//     while(buffer.length >= CHUNK_SIZE) {
//         const chunk = buffer.subarray(0, CHUNK_SIZE)
//         buffer = buffer.subarray(CHUNK_SIZE)
//         yield chunk
//     }
// }
//
// async function writer(source: AsyncIterable<any>) {
//     const writables = [
//         createWriteStream("chunks/chunk1.txt"),
//         createWriteStream("chunks/chunk2.txt"),
//         createWriteStream("chunks/chunk3.txt"),
//         createWriteStream("chunks/chunk4.txt"),
//     ]
//     let chunkId = 0;
//     for await(const chunk of source) {
//         writables[chunkId % writables.length].write(chunk)
//         ++chunkId
//     }
//     console.log('writer done')
//     writables.forEach(w => w.end())
// }
//
// pipeline(fs.createReadStream("big.txt"), chunker, writer).then(() => {
//     console.log('done')
// })

async function* Aboba() {
    for (let i = 0; i < 3; ++i)
        yield Buffer.from("aboba")
}

const readable = Readable.from(Aboba(), {
    highWaterMark: 100
})