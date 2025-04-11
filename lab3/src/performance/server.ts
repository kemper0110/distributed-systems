import * as http from "node:http";
import {pipeline} from "node:stream/promises";

const mb =  Buffer.alloc(1024 * 1024, 'a')
const mbytes = 4 * 1024

const server = http.createServer((request, response) => {
    response.writeHead(200, {
        'content-type': 'application/octet-stream',
        'content-length': mb.length * mbytes,
    })
    pipeline(
        async function* () {
            for (let i = 0; i < mbytes; ++i)
                yield mb
        },
        response
    )
})

server.listen(4444)
console.log('server listening!')