import {FastifyInstance} from "fastify";
import {z} from "zod";
import {db} from "./db";
import '@fastify/multipart'
import * as rangeParser from 'range-parser'
import {pipeline} from "node:stream/promises";
import {Readable, Writable} from "node:stream";
import * as fs from 'fs';
import * as path from 'path';
import {DataNodes} from "./data-nodes";
import {postFilePathParams} from "./postFile";

export const getFileQueryParams = z.object({
    startBlock: z.number().int().min(0).optional(),
    blockCount: z.number().int().min(1).optional().default(1)
})

export const getFilePathParams = z.object({
    "*": z.string(),
})

export function getFile(fastify: FastifyInstance, datanodes: DataNodes) {
    fastify.head("/file/*", async (request, reply) => {
        const {"*": path} = getFilePathParams.parse(request.params)
        const {startBlock, blockCount} = getFileQueryParams.parse(request.query)
        const stmt = db.prepare(`select fileSize, mimeType
                             from file
                             where path = ?`)
        const row = stmt.get(path) as { fileSize: number, mimeType: string }
        if (!row)
            return reply.status(404).send()
        const {fileSize, mimeType} = row
        // TODO: check Range header
        // TODO: чтение поблочно под вопросом
        return reply.headers({
            "content-type": mimeType,
            "content-length": fileSize,
        }).status(200).send()
    })

    fastify.get("/file/*", async (request, reply) => {
        const {"*": path} = getFilePathParams.parse(request.params)
    })
}