import {expect, test} from "vitest";
import {App, createApp} from "../src/app.js";
import {computeNodeHash, Node} from "../src/models/node.js";
import {generateBlockPath} from "./utils.js";
import {setTimeout} from "node:timers/promises";

test('single pioneer node bootstrap test', async (ctx) => {
    const port = 53300
    const url = `http://localhost:${port}`
    const node: Node = {
        url: url,
        hash: computeNodeHash(url)
    }

    const blockPath = generateBlockPath(ctx.task.id)

    await createApp({
        port,
        selfNode: node,
        blockPath,
        isPioneer: true,
        stabilizeInterval: 100,
    })

    await setTimeout(400)
})

test('2 nodes bootstrap test', {timeout: 200_000}, async (ctx) => {
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

    const pioneerSuccessor = await fetch(`${pioneerUrl}/successor`).then(r => r.text())
    expect(pioneerSuccessor).toBe(followerUrl)
    const pioneerPredecessor = await fetch(`${pioneerUrl}/predecessor`).then(r => r.text())
    expect(pioneerPredecessor).toBe(followerUrl)

    const followerSuccessor = await fetch(`${followerUrl}/successor`).then(r => r.text())
    expect(followerSuccessor).toBe(pioneerUrl)
    const followerPredecessor = await fetch(`${followerUrl}/predecessor`).then(r => r.text())
    expect(followerPredecessor).toBe(pioneerUrl)
})


test('10 nodes bootstrap test', {
    timeout: 200_000,
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

    const ports = Array.from({length: 9}, (_, i) => 53302 + i)
    const urls = ports.map(port => `http://localhost:${port}`)
    const nodes: Node[] = urls.map(url => ({
        url,
        hash: computeNodeHash(url)
    }))
    const blockPaths = ports.map(port => generateBlockPath(ctx.task.id, port.toString()))

    const followerApps = [] as App[];
        await using disposableAppGroup = {
            async [Symbol.asyncDispose]() {
                const promises = followerApps.map(app => app[Symbol.asyncDispose]())
                for (const item of promises) {
                    // @ts-ignore
                    await item
                }
            }
        }
    for (let i = 0; i < ports.length; ++i) {
        const app = await createApp({
            port: ports[i],
            selfNode: nodes[i],
            blockPath: blockPaths[i],
            isPioneer: false,
            mentorNode: pioneerNode,
            stabilizeInterval: 100,
        })
        followerApps.push(app)
    }

    await setTimeout(2000)

    const sortedNodes = nodes.concat(pioneerNode).sort((a, b) => {
        const diff = a.hash - b.hash
        if (diff === 0n) return 0
        return diff > 0 ? 1 : -1
    })

    const map: Record<string, { pred: string, succ: string }> = {}

    for (let i = 0; i < sortedNodes.length; ++i) {
        const node = sortedNodes[i]
        const predId = (i - 1) % sortedNodes.length
        map[node.url] = {
            pred: sortedNodes[predId >= 0 ? predId : sortedNodes.length + predId]?.url ?? '',
            succ: sortedNodes[(i + 1) % sortedNodes.length]?.url ?? '',
        }
    }

    const pioneerSuccessor = await fetch(`${pioneerUrl}/successor`).then(r => r.text())
    expect(pioneerSuccessor).toBe(map[pioneerUrl].succ)
    const pioneerPredecessor = await fetch(`${pioneerUrl}/predecessor`).then(r => r.text())
    expect(pioneerPredecessor).toBe(map[pioneerUrl].pred)

    for (let i = 0; i < ports.length; ++i) {
        const successor = await fetch(`${urls[i]}/successor`).then(r => r.text())
        expect(successor).toBe(map[urls[i]].succ)
        const predecessor = await fetch(`${urls[i]}/predecessor`).then(r => r.text())
        expect(predecessor).toBe(map[urls[i]].pred)
    }

    const tourDuMonde = await fetch(sortedNodes[0].url + '/tour-du-monde').then(r => r.json())
    expect(tourDuMonde).toEqual(sortedNodes.map(n => n.url))

    // await setTimeout(100_000)
})


