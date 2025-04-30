import {test} from "vitest";
import {makeNodeFinder, Node, computeNodeHash} from "../src/models/node.js";
import {calculateBlockCount, computeBlockHash, File} from "../src/models/file.js";
import fs from "fs";

test('distribution test', () => {
    const nodes = Array.from({length: 1000}, (_, i) => ({
        url: `http://localhost:${i}`,
        hash: computeNodeHash(`http://localhost:${i}`)
    } as Node))

    fs.writeFileSync('src/specification/demo/nodes-distribution/data.js', 'window.data=' + JSON.stringify(nodes.map(n => n.hash)), 'utf8')

    const blocks = nodes.map(() => new Set())

    const nodeFinder = makeNodeFinder(nodes)

    const file: File = {
        name: 'bigFile.txt',
        size: 1024 * 1024,
        mimeType: 'text/plain',
        blockSize: 16
    }

    const bc = calculateBlockCount(file.size, file.blockSize) // 65_536
    console.log('block count', bc)
    for (let i = 0; i < bc; ++i) {
        const bHash = computeBlockHash({file, idx: i})
        const node = nodeFinder(bHash)
        const nodeBlocks = blocks[nodes.indexOf(node)]
        if (nodeBlocks.has(bHash))
            throw new Error('block already exists')
        nodeBlocks.add(bHash)
    }

    const counts = blocks.map(b => b.size)

    fs.writeFileSync('src/specification/demo/blocks-distribution/data.js', 'window.data=' + JSON.stringify(counts), 'utf8')

    counts.sort((a, b) => a - b)

    const median = (
        counts[Math.floor(counts.length / 2)] + counts[Math.ceil(counts.length / 2)]
    ) / 2

    console.log('median', median, 'min', counts[0], 'max', counts[counts.length - 1])
})