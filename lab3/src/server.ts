import * as http from "node:http";
import {AddressInfo} from "node:net";
import {getBlock} from "./routes/getBlock";
import {getFile} from "./routes/getFile";
import {postFile} from "./routes/postFile";
import {Node} from "./models/node";
import {postBlock} from "./routes/postBlock";

export async function createServer(port: number | undefined, nodes: Node[], self: Node, blockPath: string) {
    const server = http.createServer({
        // highWaterMark: 1024 * 1024, // todo: test big highWaterMark
    }, async (request, response) => {
        try {
            const url = new URL(request.url!, `http://0.0.0.0:${port ?? 80}`)
            const query = Object.fromEntries(url.searchParams.entries())

            const blockName = url.pathname.match(new RegExp("/block/(.*)"))?.[1]
            if(blockName) {
                switch (request.method) {
                    case 'GET': case 'HEAD': {
                        return await getBlock(request, response, blockName, blockPath, request.method)
                    }
                    case 'POST': {
                        return await postBlock(request, response, blockName, blockPath)
                    }
                    case 'OPTIONS': {
                        return response.writeHead(200, {'allow': 'GET, HEAD, POST, OPTIONS'}).end()
                    }
                }
            }

            const fileName = url.pathname.match(new RegExp("/file/(.*)"))?.[1]
            if(fileName) {
                switch (request.method) {
                    case 'GET': case 'HEAD': {
                        return await getFile(request, response, fileName, nodes, self, blockPath, request.method)
                    }
                    case 'POST': {
                        return await postFile(request, response, query, nodes, self, blockPath, fileName)
                    }
                    case 'OPTIONS': {
                        return response.writeHead(200, {'allow': 'GET, HEAD, POST, OPTIONS'}).end()
                    }
                }
            }
            response.writeHead(404).end()
        } catch (e) {
            const acc = request.headers.accept
            if(e?.code === 'ERR_STREAM_PREMATURE_CLOSE') {
                console.log(acc?.substring(0, 15), 'premature close')
            }
            if (response.headersSent) {
                response.end()
            } else {
                response.writeHead(500).end((e as Error).message)
            }
        }
    })

    return new Promise<AddressInfo>((resolve, reject) => {
        server.once('error', reject)
        server.on('listening', () => resolve(server.address() as AddressInfo))
        server.listen(port)
    })
}
