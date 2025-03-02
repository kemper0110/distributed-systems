import {FastifyInstance} from "fastify";
import {z} from "zod";
import {db} from "./db";
import '@fastify/multipart'
import {pipeline} from "node:stream/promises";
import {DataNodes} from "./data-nodes";
import {IncomingMessage, ServerResponse} from "node:http";
import {BlockNotFoundError} from "./BlockNotFoundError";
import {Readable} from "node:stream";
import {toBlockId} from "./common";

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

export async function getFile2(
    request: IncomingMessage,
    response: ServerResponse,
    filePath: string,
    query: Record<string, string>,
    datanodes: DataNodes
) {
    try {
        console.log(request.headers)
        const datanodesSnapshot = datanodes.get()
        const {startBlock, blockCount} = getFileQueryParams.parse(query)

        const stmt = db.prepare(`
            SELECT f.id,
                   f.path,
                   f.mimeType,
                   f.blockSize,
                   f.fileSize,
                   json_group_array(
                           json_object(
                                   'dataNode', b.dataNode,
                                   'blockIdx', b.blockIdx
                           )
                   ) AS blocks
            FROM file f
                     JOIN
                 blocks b ON b.fileId = f.id
            GROUP BY f.id, f.path, f.mimeType, f.blockSize, f.fileSize
        `)

        const fileInfo = stmt.get(filePath) as {
            mimeType: string
            blockSize: number
            fileSize: number
            blocks: string
        } | undefined

        if (!fileInfo)
            return response.writeHead(404).end()

        const {mimeType, blockSize, fileSize} = fileInfo
        const blockSizeBytes = 1024 * 1024 * blockSize
        const allBlocks = (JSON.parse(fileInfo.blocks) as Array<{ dataNode: string, blockIdx: number }>)
            .sort((a, b) => a.blockIdx - b.blockIdx)

        const requestedBlocks = startBlock ? (
            allBlocks.slice(startBlock, startBlock + blockCount)
        ) : allBlocks

        const nameSet = new Set(datanodesSnapshot.map(node => node.name))
        const unavailableNodes = requestedBlocks.reduce((acc, block) => {
                if (!nameSet.has(block.dataNode))
                    acc.add(block.dataNode)
                return acc;
            }, new Set()
        )
        if (unavailableNodes.size > 0)
            return response.writeHead(521).end("Недоступны требуемые узлы: " + [...unavailableNodes].join(", "))

        if (requestedBlocks === allBlocks)
            response.writeHead(200, {
                "Content-Type": mimeType,
                "Content-Length": fileSize
            })
        else {
            // TODO: [options, head] handlers
            // check if last block is excluded or not
            const lastBlock = allBlocks[allBlocks.length - 1]
            const size = requestedBlocks.reduce((acc, block) => {
                if(block.blockIdx === lastBlock.blockIdx) {
                    const rem = fileSize % blockSizeBytes
                    return acc + (rem === 0 ? blockSizeBytes : rem)
                }
                return acc + blockSize * 1024 * 1024
            }, 0)
            response.writeHead(200, {
                "Content-Type": mimeType,
                "Content-Length": size
            })
        }

        await pipeline(async function* () {
            for (const {dataNode, blockIdx} of requestedBlocks) {
                const {origin} = datanodesSnapshot.find(n => n.name === dataNode)!
                const blockId = toBlockId(blockIdx, filePath)
                const downstreamResponse = await fetch(new URL("/block/" + blockId, origin), {
                    method: 'GET'
                });
                console.log(blockId, downstreamResponse.status, downstreamResponse.statusText)
                if (downstreamResponse.status === 404)
                    throw new BlockNotFoundError(dataNode, blockIdx)
                const body = await downstreamResponse.arrayBuffer()
                yield Buffer.from(body)
            }
        }, response)
        response.end()
    } catch (e) {
        if (e.code === 'ERR_STREAM_PREMATURE_CLOSE') {
            console.error('Stream premature close', e)
        } else {
            console.error(e)
        }
        if (!response.headersSent) {
            if (e instanceof BlockNotFoundError) {
                response.writeHead(404).end(e.message)
            }
            response.writeHead(500).end(e.message)
        }
    }
}