import {DataNodes} from "./data-nodes";
import http from "node:http";
import {Readable} from "node:stream";
import {pipeline} from "node:stream/promises";
import {postFile} from "./postFile";
import {getFile} from "./getFile/getFile";
import {optionsFile} from "./optionsFile";

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 4000

async function main() {
    const datanodes = new DataNodes([
        // {
        //     origin: "http://localhost:3000",
        //     name: "node1"
        // }
    ])
    await datanodes.forceUpdate()
    datanodes.listen().catch(e => console.error("docker listen err", e))
    const dataNode = datanodes.get()[0]
    const origin = dataNode.origin

    let requestIdCounter = 0;

    http.createServer(async (request, response) => {
        const requestId = requestIdCounter++
        console.log('request', requestId)
        const url = new URL(request.url!, `http://0.0.0.0:${PORT}`)
        const query = Object.fromEntries(url.searchParams.entries())
        const match = url.pathname.match(new RegExp("/file/(.*)"))
        if (match === null)
            return response.writeHead(404).end();

        const filePath = match[1]
        if (!filePath)
            return response.writeHead(404).end();

        try {
            switch (request.method) {
                case "GET":
                case "HEAD": {
                    await getFile(requestId, request, response, request.method, filePath, query, datanodes)
                    return
                }
                case "OPTIONS": {
                    return optionsFile(requestId, request, response)
                }
                case "POST": {
                    await postFile(requestId, request, response, filePath, query, datanodes)
                    return
                }
            }
        } catch (e) {
            return response.writeHead(500).end()
        }
    }).listen(PORT, () => {
        console.log(`server listening on port ${PORT}`)
    })
}

main().catch(e => {
    console.error(e)
})

const memoryMetrics = false

if (memoryMetrics) {
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
}