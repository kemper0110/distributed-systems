import {FastifyInstance} from "fastify";
import {z} from "zod";
import * as fs from 'fs'
import {resolveBlockPath} from "./blockPath";
import {pipeline} from "node:stream/promises";
import '@fastify/multipart'

export const postBlockParams = z.object({
    id: z.string()
})

export function postBlock(fastify: FastifyInstance) {
    fastify.post("/block/:id", async (request, reply) => {
        const {id} = postBlockParams.parse(request.params)
        const data = await request.file()
        await pipeline(data.file, fs.createWriteStream(resolveBlockPath(id)))
        return reply.status(200).send()
    })
}