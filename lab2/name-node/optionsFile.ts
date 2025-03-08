import {IncomingMessage, ServerResponse} from "node:http";

export function optionsFile(requestId: number, request: IncomingMessage, response: ServerResponse) {
    response.writeHead(200, {
        "Allow": "GET, HEAD, POST, OPTIONS",
    }).end()
}