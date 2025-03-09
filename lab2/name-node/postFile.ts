import {FastifyInstance} from "fastify";
import {z} from "zod";
import '@fastify/multipart'
import {pipeline} from "node:stream/promises";
import {Readable, Writable} from "node:stream";
import * as fs from 'fs';
import * as path from 'path';
import {db} from "./db";
import {DataNode, DataNodes} from "./data-nodes";

export const postFileQueryParams = z.object({
    blockSize: z.coerce.number().int().min(1).max(128),
    mimeType: z.string(),
    nodeCount: z.coerce.number().int().min(1).optional(),
    replicationFactor: z.coerce.number().int().min(1).optional().default(1),
})

export const postFilePathParams = z.object({
    "*": z.string(),
})


function selectDataNode(datanodes: DataNodes) {
    return datanodes.get()[0]
}

export function postFile(fastify: FastifyInstance, datanodes: DataNodes) {
    fastify.post("/file/*", async (request, reply) => {
        const length = request.headers["content-length"]
        const {"*": path} = postFilePathParams.parse(request.params)
        const {mimeType, blockSize, nodeCount, replicationFactor} = postFileQueryParams.parse(request.query)
        db.exec("begin transaction")
        try {
            const stmt = db.prepare("select exists(select 1 from file where path == ?) as _exists")
            const {_exists} = stmt.get(path) as {_exists: number}
            if(_exists) {
                return reply.status(409).send(new Error("Файл с таким именем уже существует"))
            }

            // await pipeline(data.file, streamToDataNodes())
            const data = await request.file()
            const buffer: Buffer<ArrayBufferLike> = await data.toBuffer()

            const datanode = selectDataNode(datanodes)

            const totalChunks = Math.ceil(buffer.byteLength / blockSize);
            for (let i = 0; i < totalChunks; i++) {
                const start = i * blockSize;
                const end = Math.min(start + blockSize, buffer.byteLength);
                const block = buffer.subarray(start, end);

                try {
                    const blockName = path + i;
                    const response = await fetch(new URL("/block/" + blockName, datanode.origin), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'Content-Length': block.byteLength.toString(),
                        },
                        body: block,
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to send chunk ${i}: ${response.statusText}`);
                    }

                    console.log(`Chunk ${i} sent successfully.`);
                } catch (error) {
                    console.error(`Error sending chunk ${i}:`, error);
                }
            }
        } catch (e) {
            db.exec("revert")
        } finally {
            db.exec("commit")
        }
        return reply.status(200).send()
    })
    fastify.patch("/file/*", async (request, reply) => {

    })
    // TODO: patch file
}


// function streamToDataNodes(): NodeJS.WritableStream {
//
//     const rs = new ReadableStream({
//         pull(controller) {
//
//         }
//     })
//
//     const promise = fetch("http://localhost:3000/block", {
//         body: rs
//     });
//
//     return Writable.fromWeb(new WritableStream({
//         write: (chunk, controller) => {
//
//         },
//     }))
// }
