import * as http from "node:http";
import {pipeline} from "node:stream/promises";
import * as fs from "fs";
import * as fsp from "fs/promises";

const mb =  Buffer.alloc(1024 * 1024, 'a')
const mbytes = 1071

const server = http.createServer(async (request, response) => {
    if(request.method === 'POST') {
        /**
         * upload.sh
         * dry-run 1700 MB/s
         * writing 1200-1400 MB/s
         */
        let len = 0
        const t = performance.now()
        await pipeline(
            request,
            async function* (source) {
                for await (const chunk of source) {
                    len += chunk.length
                    yield chunk
                }
            },
            fs.createWriteStream("./video.mp4")
        )
        console.log('len=', len, 'time=', performance.now() - t)
        response.writeHead(200, {
            'content-type': 'text/plain',
        })
        response.end('received ' + len + ' bytes')
    } else if(request.method === 'GET') {
        /**
         * download.sh
         * dry-run 1250-1400 MB/s
         * reading 980-1220 MB/s
         */
        const path = "../../videos/avatar.mp4"
        const stats = await fsp.stat(path)
        response.writeHead(200, {
            'content-type': 'video/mp4',
            // 'content-length': mb.length * mbytes,
            'content-length': stats.size
        })
        await pipeline(
            fs.createReadStream(path, {
                highWaterMark: 32 * 1024 * 1024
            }),
            // async function* () {
            //     for (let i = 0; i < mbytes; ++i)
            //         yield mb
            // },
            response
        )
    }
})

server.listen(4444)
console.log('server listening!')