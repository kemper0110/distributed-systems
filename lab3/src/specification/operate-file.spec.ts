import {describe, expect, test} from "vitest";
import {createApp} from "../app";
import {Node, nodeHash} from "../models/node";
import fs from "fs";
import {generateBlockPath} from "./utils";


describe('post file + read file', {timeout: 3_000_000}, async (ctx) => {
    const ports = [53300, 53301]
    const urls = ports.map(port => `http://localhost:${port}`)
    const nodes: Node[] = urls.map(url => ({
        url,
        hash: nodeHash(url)
    }))
    const blockPaths = ports.map(port => generateBlockPath('operate-file', port.toString()))

    for(let i = 0; i < ports.length; ++i) {
        await createApp({
            nodes,
            port: ports[i],
            selfNode: nodes[i],
            blockPath: blockPaths[i],
        })
    }

    const requestNode = nodes[0]

    const file1 = Array.from({length: 2 * 1024}, (_, i) => i.toString().padEnd(1024)).join('')
    expect(file1.length).toBe(2 * 1024 * 1024)

    test('post file', async () => {
        const postResponse = await fetch(`${requestNode.url}/file/file1` + '?' + new URLSearchParams({blockSize: '1'}), {
            method: 'POST',
            body: file1
        })
        const token = await postResponse.text()
        expect(postResponse.status).toBe(200)

        const getResponse = await fetch(`${requestNode.url}/file/${token}`)
        const text = await getResponse.text()
        expect(getResponse.status, text).toBe(200)
        expect(text).toEqual(file1)

        blockPaths.forEach(blockPath => fs.rmSync(blockPath, {recursive: true}))
    })
})