import {createServer} from "node:http";
import {pipeline} from "node:stream/promises";

/*
    Node.js сервер, который стримит данные.
 */

const bigMessage = Buffer.alloc(32 * 1024, 49)

const server = createServer(async (request, response) => {
    response.writeHead(200, {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked"
    })
    // просто стримим данные в response
    await pipeline(
        async function* () {
            console.log('start')
            for (let i = 0; i < 100; i++) {
                /*
                    сервер не вызывает `yield`, пока клиент не будет готов принять данные
                 */
                yield Buffer.concat([Buffer.from("message #" + i + "\n"), bigMessage], 32 * 1024)
                console.log('yielded', i)
            }
            console.log('end')
        },
        response
    )
    response.end()
})

server.listen(5001, () => {
    console.log('server listening on port 5001')
})