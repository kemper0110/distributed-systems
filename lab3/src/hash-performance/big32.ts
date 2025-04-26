import crypto from "node:crypto";
import {Node} from "../models/node";
import {Block, File} from "../models/file";

function computeNodeHash(nodeUrl: string): Uint32Array {
    const buffer = crypto.createHash('sha1').update(nodeUrl).digest()
    return new Uint32Array(buffer.buffer, buffer.byteOffset, 5)
}
function computeBlockHash(block: Block): Uint32Array {
    const {idx, file} = block
    const {name, size, mimeType, blockSize} = file
    const buffer = crypto.createHash('sha1')
        .update(`${idx} ${name} ${size} ${mimeType} ${blockSize}`)
        .digest()
    return new Uint32Array(buffer.buffer, buffer.byteOffset, 5)
}

function findNodeByHash(nodeHashes: Uint32Array, targetHash: Uint32Array): number {
    const HASH_SIZE = 5
    const nodeCount = nodeHashes.length / 5;

    let foundIndex = 0;

    outer: for (let i = 0; i < nodeCount; i++) {
        let offset = i * HASH_SIZE;

        for (let j = 0; j < HASH_SIZE; j++) {
            const diff = nodeHashes[offset + j] - targetHash[j];

            if (diff > 0) {
                break; // Это node нам подходит
            } else if (diff < 0) {
                continue outer; // Перейти к следующему node
            }
        }

        foundIndex = i;
        break;
    }

    return foundIndex * HASH_SIZE;
}

// function findNodeByHash(nodeHashes: Uint32Array[], targetHash: Uint32Array): number {
//     return nodeHashes.findIndex(hash => cmp(hash, targetHash) >= 0) || 0
// }

function cmp(a: Uint32Array, b: Uint32Array): number {
    for(let i = 0; i < 5; ++i) {
        if(a[i] < b[i])
            return -1
        if(a[i] > b[i])
            return 1
    }
    return 0
}

// 7.98 sec
const NODE_COUNT = 50_000
const BLOCK_COUNT = 50_000


const nodes = Array.from({length: NODE_COUNT}, (_, i) => ({
    url: `http://localhost:${i}`,
    hash: computeNodeHash(`http://localhost:${i}`)
}))

nodes.sort((a, b) => cmp(a.hash, b.hash))

const nodeHashes = new Uint32Array(nodes.length * 5)
nodes.forEach((u, i) => {
    nodeHashes.set(u.hash, i * u.hash.length)
})

const file: File = {
    name: 'bigFile.txt',
    size: 1024 * 1024,
    mimeType: 'text/plain',
    blockSize: 16
}
const blockHashes = Array.from({length: BLOCK_COUNT}, (_, i) => computeBlockHash({file, idx: i}))

const results = Array.from<number>({length: BLOCK_COUNT})
console.log('start')
const start = performance.now()
for(let i = 0; i < BLOCK_COUNT; ++i) {
    results[i] = findNodeByHash(nodeHashes, blockHashes[i])
    // console.log(i)
}
const end = performance.now()

console.log('time', (end - start) / 1000, 'sec')

console.log(results.reduce((a, b) => a + b, 0))








