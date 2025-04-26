import {expect, test} from "vitest";
import {createApp} from "../app.js";
import {computeNodeHash, Node} from "../models/node.js";
import fs from "fs";
import {asyncRandomFill, generateBlockPath} from "./utils.js";


test('post file + read file', {
    skip: true
}, async (ctx) => {
    const ports = [53301, 53302]
    const urls = ports.map(port => `http://localhost:${port}`)
    const nodes: Node[] = urls.map(url => ({
        url,
        hash: computeNodeHash(url)
    }))
    const blockPaths = ports.map(port => generateBlockPath(ctx.task.id, port.toString()))

    for (let i = 0; i < ports.length; ++i) {
        await createApp({
            nodes,
            port: ports[i],
            selfNode: nodes[i],
            blockPath: blockPaths[i],
        })
    }

    const requestNode = nodes[0]

    const file1 = Buffer.alloc(1024 * 1024 * 4 + 423) // 4 MB + 423 bytes
    await asyncRandomFill(file1)

    const postResponse = await fetch(`${requestNode.url}/file/file1?blockSize=1`, {
        method: 'POST',
        body: file1
    })
    const fileKey = await postResponse.text()
    expect(postResponse.status).toBe(200)

    const getResponse = await fetch(`${requestNode.url}/file/${fileKey}`)
    const text = await getResponse.text()
    expect(getResponse.status, text).toBe(200)
    expect(text).toEqual(file1)

    blockPaths.forEach(blockPath => fs.rmSync(blockPath, {recursive: true}))
})