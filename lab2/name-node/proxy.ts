import Fastify from 'fastify';
import {fastifyMultipart} from '@fastify/multipart'
import {DataNodes} from "./data-nodes";
import {Readable} from "node:stream";
import {request} from 'undici'
import * as http from 'node:http'
import FormData from "form-data";
import {IncomingMessage} from "node:http";

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

    const fastify = Fastify({
        logger: true
    });
    fastify.register(fastifyMultipart, {
        limits: {
            fieldNameSize: 100, // Max field name size in bytes
            fieldSize: 100,     // Max field value size in bytes
            fields: 10,         // Max number of non-file fields
            fileSize: 1024 * 1024 * 1024,  // For multipart forms, the max file size in bytes
            files: 1,           // Max number of file fields
            headerPairs: 200,  // Max number of header key=>value pairs
            parts: 10         // For multipart forms, the max number of parts (fields + files)
        }
    })

    fastify.get("/block", async (request, reply) => {

    })

    const dataNode = datanodes.get()[0]
    const origin = dataNode.origin
    console.log('selected datanode:', dataNode)

    fastify.post("/block", async (req, reply) => {
        const data = await req.file()
        const fileStream = data.file
        // const fileWebStream = Readable.toWeb(fileStream)

        // const form = new FormData()
        // form.append("file", fileStream, {filename: data.filename})
        // form.append("file", fileWebStream)

        const headers = {
            // ...form.getHeaders(),
            "Transfer-Encoding": "chunked"
        }
        try {
            let resolve;
            const promise = new Promise<IncomingMessage>((res) => resolve = res)
            const req = http.request({
                hostname: "localhost",
                port: 3000,
                path: "/block/rica.mp4",
                method: "POST",
                headers
            }, res => resolve(res))
            fileStream.pipe(req);
            req.on("error", err => {
                console.error("Request error:", err)
            })
            const res = await promise;
            // const {statusCode} = await request(new URL("/block/rica.mp4", origin), {
            //     method: "POST",
            //     headers,
            //     body: form
            // })
            return reply.status(res.statusCode).send(res.statusMessage)
        } catch (e) {
            return reply.status(500).send()
        }
    })

    fastify.listen({port: PORT, host: '0.0.0.0'}, () => {
        console.log(`Server running on http://localhost:${PORT}/`);
    });
}


main().catch(e => {
    console.error(e)
})