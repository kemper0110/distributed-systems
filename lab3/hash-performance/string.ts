import crypto from "node:crypto";
import {Node} from "../src/models/node.js";
import {Block, File} from "../src/models/file.js";

function computeNodeHash(nodeUrl: string): string {
    return crypto.createHash('sha1').update(nodeUrl).digest('hex')
}
function computeBlockHash(block: Block): string {
    const {idx, file} = block
    const {name, size, mimeType, blockSize} = file
    return crypto.createHash('sha1')
        .update(`${idx} ${name} ${size} ${mimeType} ${blockSize}`)
        .digest('hex')
}

function findNodeByHash(nodeHashes: string[], targetHash: string): number {
    return nodeHashes.findIndex(hash => hash >= targetHash) || 0
}


// 4.73 sec
const NODE_COUNT = 50_000
const BLOCK_COUNT = 50_000


const nodes = Array.from({length: NODE_COUNT}, (_, i) => ({
    url: `http://localhost:${i}`,
    hash: computeNodeHash(`http://localhost:${i}`)
}) satisfies Node)

nodes.sort((a, b) => a.hash.localeCompare(b.hash))

const nodeHashes = nodes.map(u => u.hash)

const file: File = {
    name: 'bigFile.txt',
    size: 1024 * 1024,
    mimeType: 'text/plain',
    blockSize: 16
}
const blockHashes = Array.from({length: BLOCK_COUNT}, (_, i) => computeBlockHash({file, idx: i}))

const results = Array.from<number>({length: BLOCK_COUNT})
const start = performance.now()
for(let i = 0; i < BLOCK_COUNT; ++i) {
    results[i] = findNodeByHash(nodeHashes, blockHashes[i])
}
const end = performance.now()

console.log('time', (end - start) / 1000, 'sec')

console.log(results.reduce((a, b) => a + b, 0))








