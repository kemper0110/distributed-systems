import * as http from "node:http";
import {IncomingMessage, ServerResponse} from "node:http";
import {AddressInfo} from "node:net";
import {getBlock} from "./http/getBlock.js";
import {getFile} from "./http/getFile.js";
import {postFile} from "./http/postFile.js";
import {computeNodeHash, Node} from "./models/node.js";
import {postBlock} from "./http/postBlock.js";
import fs from "fs";
import {getMySuccessor, getSuccessorEndpoint} from "./http/chord/getSuccessor.js";
import {getPredecessor} from "./http/chord/getPredecessor.js";
import {tourDuMonde} from "./http/chord/tourDuMonde.js";
import {stabilize} from "./http/chord/stabilize.js";
import {setInterval, setTimeout} from "node:timers/promises";
import {notify} from "./http/chord/notify.js";
import {agent} from "./http/agent.js";

export type AppConfig = {
    port: number | undefined
    selfNode: Node
    blockPath: string
    stabilizeInterval: number
    hwm?: {
        server?: number | undefined
        localRead?: number | undefined
        localWrite?: number | undefined
    }
} & BootstrapConfig

export type BootstrapConfig = PioneerConfig | OnboardingConfig

export type PioneerConfig = {
    isPioneer: true
}

export type OnboardingConfig = {
    isPioneer: false
    mentorNode: Node
}

export type AppState = {
    predecessor: Node | null
    successor: Node
}

async function asyncHandler(config: AppConfig, request: IncomingMessage, response: ServerResponse, state: AppState) {
    try {
        const url = new URL(request.url!, `http://0.0.0.0`)
        const query = Object.fromEntries(url.searchParams.entries())

        if (url.pathname.match(new RegExp("^/successor$"))) {
            if (request.method === 'GET')
                return await getMySuccessor(request, response, config, state)
            return response.writeHead(405).end()
        }

        const successor = url.pathname.match(new RegExp("^/successor/(.*)$"))?.[1]
        if (successor) {
            if (request.method === 'GET')
                return await getSuccessorEndpoint(request, response, BigInt(successor), config, state)
            return response.writeHead(405).end()
        }

        if (url.pathname.match(new RegExp("^/predecessor$"))) {
            if (request.method === 'GET')
                return await getPredecessor(request, response, config, state)
            return response.writeHead(405).end()
        }

        const notifyMatch = url.pathname.match(new RegExp("^/notify/(.*)$"))?.[1]
        if (notifyMatch) {
            if (request.method === 'POST')
                return await notify(request, response, decodeURIComponent(notifyMatch), config, state)
            return response.writeHead(405).end()
        }

        const tourDuMondeInitiator = url.pathname.match(new RegExp("^/tour-du-monde$"))
        const tourDuMondeContinuator = url.pathname.match(new RegExp("^/tour-du-monde/(.*)$"))
        if (tourDuMondeInitiator || tourDuMondeContinuator) {
            if (request.method === 'GET')
                return await tourDuMonde(request, response, tourDuMondeContinuator?.[1], config, state)
            return response.writeHead(405).end()
        }

        const blockName = url.pathname.match(new RegExp("^/block/(.*)$"))?.[1]
        if (blockName) {
            switch (request.method) {
                case 'GET':
                case 'HEAD': {
                    return await getBlock(request, response, BigInt(blockName), request.method, config)
                }
                case 'POST': {
                    return await postBlock(request, response, BigInt(blockName), config)
                }
                case 'OPTIONS': {
                    return response.writeHead(200, {'allow': 'GET, HEAD, POST, OPTIONS'}).end()
                }
                default: {
                    return response.writeHead(405).end()
                }
            }
        }

        const fileName = url.pathname.match(new RegExp("/file/(.*)"))?.[1]
        if (fileName) {
            switch (request.method) {
                case 'GET':
                case 'HEAD': {
                    return await getFile(request, response, fileName, request.method, config, state)
                }
                case 'POST': {
                    return await postFile(request, response, query, fileName, config, state)
                }
                case 'OPTIONS': {
                    return response.writeHead(200, {'allow': 'GET, HEAD, POST, OPTIONS'}).end()
                }
                default: {
                    return response.writeHead(405).end()
                }
            }
        }
        response.writeHead(404).end()
    } catch (e) {
        const acc = request.headers.accept
        // @ts-ignore
        if (e?.code === 'ERR_STREAM_PREMATURE_CLOSE') {
            console.log(acc?.substring(0, 7), 'premature close')
        }
        if (response.headersSent) {
            response.end()
        } else {
            response.writeHead(500).end((e as Error).message)
        }
    }
}

export type App = {
    server: http.Server
}

export async function createApp(config: AppConfig) {
    fs.mkdirSync(config.blockPath, {recursive: true})
    const state = await bootstrap(config)
    const server = http.createServer({
        highWaterMark: config.hwm?.server
    }, (request, response) => {

        response.on('error', err => {
            console.log('response error')
            console.error(err)
        })

        request.on('error', err => {
            console.log('request error')
            console.error(err)
        })

        asyncHandler(config, request, response, state)
            .catch(e => {
                console.log('my uncaught :O')
                console.error(e)
            })
    })

    await new Promise<AddressInfo>((resolve, reject) => {
        console.log(config.selfNode.url, 'starting')
        server.once('error', e => {
            reject(new Error('Cannot start server ' + config.selfNode.url, {
                cause: e
            }))
        })
        server.on('listening', () => {
            const address = server.address() as AddressInfo
            config.port = address.port
            resolve(address);
        })
        try {
            server.listen(config.port)
        } catch (e) {
            reject(new Error('Cannot start server ' + config.selfNode.url, {
                cause: e
            }))
        }
    })
    const stabilizeController = new AbortController()
    backgroundStabilize(config, state, stabilizeController.signal).catch(e => {
        if(e?.code === 'ABORT_ERR') return
        console.error(e)
    })
    return {
        server,
        async [Symbol.asyncDispose]() {
            stabilizeController.abort()
            await setTimeout(100)
            await new Promise<void>((res, rej) => {
                this.server.close(err => err ? rej(err) : res())
            })
            console.log(config.selfNode.url, 'closed')
        }
    }
}


async function backgroundStabilize(config: AppConfig, state: AppState, signal: AbortSignal) {
    for await (const _ of setInterval(config.stabilizeInterval, undefined, {signal})) {
        stabilize(config, state, signal).catch(e => {
            if(e?.code === 'ABORT_ERR') return
            console.error(e)
        })
    }
}

async function bootstrap(config: AppConfig): Promise<AppState> {
    if (config.isPioneer) {
        return {
            predecessor: {...config.selfNode},
            successor: {...config.selfNode},
        }
    }

    // @ts-ignore
    const {promise: downstreamResponsePromise, resolve, reject} = Promise.withResolvers()
    http.get(config.mentorNode.url + '/successor/' + config.selfNode.hash, {agent}, downstreamResponse => resolve(downstreamResponse))
        .on("error", e => reject(e))
        .end()

    const downstreamResponse: IncomingMessage = await downstreamResponsePromise
    // @ts-ignore
    const successorUrl = await new Response(downstreamResponse).text()

    console.info(config.selfNode.url, 'Выбран successor', successorUrl)

    return {
        successor: {
            url: successorUrl,
            hash: computeNodeHash(successorUrl)
        },
        predecessor: null
    }
}