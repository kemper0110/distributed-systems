import {createServer} from "node:http";
import {pipeline} from "node:stream/promises";

const bigMessage = Buffer.alloc(32 * 1024, 49)

const server = createServer(async (request, response) => {
    response.writeHead(200, {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked"
    })
    await pipeline(async function* () {
        console.log('start')
        for (let i = 0; i < 100; i++) {
            yield Buffer.concat([Buffer.from("message #" + i + "\n"), bigMessage], 32 * 1024)
            console.log('yielded', i)
        }
        console.log('end')
    }, response)
    response.end()
})

server.listen(5001, () => {
    console.log('server listening on port 5001')
})