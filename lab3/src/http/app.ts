import * as http from "node:http";
import {AddressInfo} from "node:net";
import {getBlock} from "./getBlock.js";
import {getFile} from "./getFile.js";
import {postFile} from "./postFile.js";
import {Node} from "../models/node.js";
import {postBlock} from "./postBlock.js";
import fs from "fs";
import {IncomingMessage, ServerResponse} from "node:http";

export type AppConfig = {
    port: number | undefined
    nodes: Node[]
    selfNode: Node
    blockPath: string
    hwm?: {
        server?: number | undefined
        localRead?: number | undefined
        localWrite?: number | undefined
    }
}

async function asyncHandler(config: AppConfig, request: IncomingMessage, response: ServerResponse) {
    try {
        const url = new URL(request.url!, `http://0.0.0.0`)
        const query = Object.fromEntries(url.searchParams.entries())

        const blockName = url.pathname.match(new RegExp("/block/(.*)"))?.[1]
        if (blockName) {
            switch (request.method) {
                case 'GET':
                case 'HEAD': {
                    return await getBlock(request, response, blockName, request.method, config)
                }
                case 'POST': {
                    return await postBlock(request, response, blockName, config)
                }
                case 'OPTIONS': {
                    return response.writeHead(200, {'allow': 'GET, HEAD, POST, OPTIONS'}).end()
                }
            }
        }

        const fileName = url.pathname.match(new RegExp("/file/(.*)"))?.[1]
        if (fileName) {
            switch (request.method) {
                case 'GET':
                case 'HEAD': {
                    return await getFile(request, response, fileName, request.method, config)
                }
                case 'POST': {
                    return await postFile(request, response, query, fileName, config)
                }
                case 'OPTIONS': {
                    return response.writeHead(200, {'allow': 'GET, HEAD, POST, OPTIONS'}).end()
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

export async function createApp(config: AppConfig) {
    fs.mkdirSync(config.blockPath, {recursive: true})
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

        asyncHandler(config, request, response)
            .catch(e => {
                console.log('my uncaught :O')
                console.error(e)
            })
    })

    return new Promise<AddressInfo>((resolve, reject) => {
        server.once('error', e => {
            reject(e)
        })
        server.on('listening', () => {
            const address = server.address() as AddressInfo
            config.port = address.port
            resolve(address);
        })
        server.listen(config.port)
    })
}
