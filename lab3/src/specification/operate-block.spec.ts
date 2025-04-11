import {describe, expect, test} from "vitest";
import {createApp} from "../app";
import {Node, nodeHash} from "../models/node";
import fs from "fs";
import {generateBlockPath} from "./utils";


test('post block + read block', {timeout: 3_000_000}, async (ctx) => {
    const port = 53300
    const url = `http://localhost:${port}`
    const node: Node = {
        url: url,
        hash: nodeHash(url)
    }

    const blockPath = generateBlockPath(ctx.task.id)
    const block1 = Buffer.from(Array.from({length: 128}, (_, i) => i))

    await createApp({
        port,
        nodes: [node],
        selfNode: node,
        blockPath,
    })

    const block1Path = `${url}/block/block1`

    describe('post block', async () => {
        const postResponse = await fetch(block1Path, {
            method: 'POST',
            body: block1
        })
        expect(postResponse.status).toBe(200)
    })

    describe('read block', async () => {
        const getResponse = await fetch(block1Path)
        expect(getResponse.status).toBe(200)
        expect(await getResponse.arrayBuffer()).toEqual(block1.buffer)
    })

    fs.rmSync(blockPath, {recursive: true})
})