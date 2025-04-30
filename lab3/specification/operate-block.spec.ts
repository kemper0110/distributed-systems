import {expect, test} from "vitest";
import {createApp} from "../src/http/app.js";
import {Node, computeNodeHash} from "../src/models/node.js";
import fs from "fs";
import {asyncRandomFill, generateBlockPath} from "./utils.js";


test('post block + read block', async (ctx) => {
    const port = 53300
    const url = `http://localhost:${port}`
    const node: Node = {
        url: url,
        hash: computeNodeHash(url)
    }

    const blockPath = generateBlockPath(ctx.task.id)

    const block1 = Buffer.alloc(1024 * 1024 + 423) // 1 MB + 423 bytes
    await asyncRandomFill(block1)

    await createApp({
        port,
        nodes: [node],
        selfNode: node,
        blockPath,
    })

    const block1Path = `${url}/block/block1`

    const postResponse = await fetch(block1Path, {
        method: 'POST',
        body: block1
    })
    expect(postResponse.status).toBe(200)

    const getResponse = await fetch(block1Path)
    expect(getResponse.status).toBe(200)
    expect(await getResponse.arrayBuffer()).toEqual(block1.buffer)

    fs.rmSync(blockPath, {recursive: true})
})