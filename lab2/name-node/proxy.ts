import Fastify from 'fastify';
import {DataNodes} from "./data-nodes";
import {Readable} from "node:stream";
import {request} from 'undici'
import * as http from 'node:http'
import {ClientRequest, IncomingMessage} from "node:http";
import {pipeline} from "node:stream/promises";

const PORT = Number.parseInt(process.env.PORT) || 4000

async function main() {

    const datanodes = new DataNodes([
        {
            origin: "http://localhost:3000",
            name: "local-data-node"
        }
    ])
    // await datanodes.forceUpdate()
    // datanodes.listen().catch(e => console.error("docker listen err", e))
    const dataNode = datanodes.get()[0]
    const origin = dataNode.origin

    http.createServer(async (request, response) => {
        const match = request.url.match(new RegExp("/block/(.*)"))
        if (match === null)
            return response.writeHead(404).end();

        const blockId = match[1]
        if (!blockId)
            return response.writeHead(404).end();

        try {
            switch (request.method) {
                case "GET": {
                    const downstreamResponse = await fetch(new URL("/block/" + blockId, "http://localhost:3000"), {
                        method: 'GET',
                    });
                    console.log(downstreamResponse.status, downstreamResponse.statusText)
                    if (downstreamResponse.status === 404)
                        return response.writeHead(404).end()
                    const body = downstreamResponse.body
                    const readable = Readable.fromWeb(body)
                    response.writeHead(200, {
                        "Content-Type": "video/mp4"
                    })
                    await pipeline(readable, response)
                    return response.end()
                }
                case "POST": {
                    // @ts-ignore
                    const {promise: downstreamResponsePromise, resolve, reject} = Promise.withResolvers()
                    const downstreamRequest = http.request(new URL("/block/" + blockId, "http://localhost:3000"), {
                        method: "POST",
                        headers: {"content-type": request.headers["content-type"]},
                    }, downstreamResponse => resolve(downstreamResponse))
                        .on("error", (e) => reject(e))
                    await pipeline(request, downstreamRequest)
                    const downstreamResponse = await downstreamResponsePromise
                    console.log(downstreamResponse.statusCode, JSON.stringify(downstreamResponse.headers, null, 2))
                    return response.writeHead(200).end();
                }
            }
        } catch (e) {
            return response.writeHead(500).end()
        }
    }).listen(PORT)
}


main().catch(e => {
    console.error(e)
})


const formatMemoryUsage = (data: number) => `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;

setInterval(() => {
    const memoryData = process.memoryUsage();
    const memoryUsage = {
        rss: `${formatMemoryUsage(memoryData.rss)} -> Resident Set Size`, //total memory allocated for the process execution
        heapTotal: `${formatMemoryUsage(memoryData.heapTotal)} -> total allocated heap`,
        heapUsed: `${formatMemoryUsage(memoryData.heapUsed)} -> actual used memory`,
        external: `${formatMemoryUsage(memoryData.external)} -> V8 external memory`,
    };
    console.table(memoryUsage);
}, 500)