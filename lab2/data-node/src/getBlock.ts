import {FastifyInstance} from "fastify";
import {z} from "zod";
import * as fs from 'fs'
import * as fsp from 'fs/promises'
import {resolveBlockPath} from "./blockPath";
import {pipeline} from "node:stream/promises";

export const getBlockParams = z.object({
    id: z.string()
})

export function getBlock(fastify: FastifyInstance) {
    fastify.get("/block/:id", async (request, reply) => {
        const {id} = getBlockParams.parse(request.params)
        const filePath = resolveBlockPath(id)

        const stats = await fsp.stat(filePath).catch<Error>(e => e);
        if(stats instanceof Error)
            return reply.status(404).send()

        reply.raw.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': stats.size,
        })
        await pipeline(fs.createReadStream(filePath), reply.raw)
    })
}