import {expect, test} from "vitest";
import {createApp} from "../src/app.js";
import {computeNodeHash, Node} from "../src/models/node.js";
import fs from "fs";
import {asyncRandomFill, generateBlockPath} from "./utils.js";
import {setTimeout} from "node:timers/promises";


test('post file + read file', {
    // skip: true
}, async (ctx) => {
    const pioneerPort = 53301
    const pioneerUrl = `http://localhost:${pioneerPort}`
    const pioneerNode: Node = {
        url: pioneerUrl,
        hash: computeNodeHash(pioneerUrl)
    }
    const pioneerBlockPaths = generateBlockPath(ctx.task.id, pioneerPort.toString())

    await using pioneerApp = await createApp({
        port: pioneerPort,
        selfNode: pioneerNode,
        blockPath: pioneerBlockPaths,
        isPioneer: true,
        stabilizeInterval: 100,
    })

    // пусть процесс немного стабилизируется
    await setTimeout(400)

    const followerPort = 53302
    const followerUrl = `http://localhost:${followerPort}`
    const followerNode: Node = {
        url: followerUrl,
        hash: computeNodeHash(followerUrl)
    }
    const followerBlockPaths = generateBlockPath(ctx.task.id, followerPort.toString())
    await using followerApp = await createApp({
        port: followerPort,
        selfNode: followerNode,
        blockPath: followerBlockPaths,
        isPioneer: false,
        mentorNode: pioneerNode,
        stabilizeInterval: 100,
    })

    await setTimeout(1000)

    const file1 = Buffer.alloc(1024 * 1024 * 4 + 423) // 4 MB + 423 bytes
    await asyncRandomFill(file1)

    const postResponse = await fetch(`${pioneerNode.url}/file/file1?blockSize=1`, {
        method: 'POST',
        body: file1
    })
    const fileKey = await postResponse.text()
    expect(postResponse.status).toBe(200)

    const getResponse = await fetch(`${pioneerNode.url}/file/${fileKey}`)
    expect(getResponse.status).toBe(200)
    expect(await getResponse.arrayBuffer()).toEqual(file1.buffer)

    fs.rmSync(pioneerBlockPaths, {recursive: true})
    fs.rmSync(followerBlockPaths, {recursive: true})
})