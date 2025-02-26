import * as http from "node:http";
import * as fs from "fs";
import * as fsp from "fs/promises";
import {pipeline} from "node:stream/promises";
import {resolveBlockPath} from "./blockPath";

const PORT = Number.parseInt(process.env.PORT || '') || 3000


async function main() {
    http.createServer(async (request, response) => {
        // const abortController = new AbortController()
        // request.on('close', () => abortController.abort("The request has been canceled"))

        const match = request.url!.match(new RegExp("/block/(.*)"))
        if (match === null)
            return response.writeHead(404).end();

        const blockId = match[1]
        if(!blockId)
            return response.writeHead(404).end();

        const filePath = resolveBlockPath(blockId)
        console.log(request.url, blockId, filePath, JSON.stringify(request.headers, null, 2))

        try {
            switch (request.method) {
                case "POST": {
                    response.writeHead(200)
                    await pipeline(request, fs.createWriteStream(filePath))
                    return response.end()
                }
                case "GET": {
                    const stats = await fsp.stat(filePath).catch<Error>(e => e);
                    if (stats instanceof Error) {
                        return response.writeHead(404).end();
                    }
                    response.writeHead(200, {
                        'Content-Type': 'application/octet-stream',
                        'Content-Length': stats.size,
                    })
                    await pipeline(fs.createReadStream(filePath), response)
                    return response.end()
                }
            }
        } catch (e) {
            response.writeHead(500).end(e.message)
        }
    }).listen(PORT)
}

main().catch(e => {
    console.error(e)
})


// const formatMemoryUsage = (data: number) => `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;
//
// setInterval(() => {
//     const memoryData = process.memoryUsage();
//     const memoryUsage = {
//         rss: `${formatMemoryUsage(memoryData.rss)} -> Resident Set Size`, //total memory allocated for the process execution
//         heapTotal: `${formatMemoryUsage(memoryData.heapTotal)} -> total allocated heap`,
//         heapUsed: `${formatMemoryUsage(memoryData.heapUsed)} -> actual used memory`,
//         external: `${formatMemoryUsage(memoryData.external)} -> V8 external memory`,
//     };
//     console.table(memoryUsage);
// }, 500)