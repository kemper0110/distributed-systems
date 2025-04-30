import * as http from "node:http";
import {IncomingMessage, ServerResponse} from "node:http";
import {pipeline} from "node:stream/promises";
import {z} from "zod";
import {
    calculateBlockCount,
    calculateBlockSizeBytes,
    computeBlockHash,
    encodeFileKey,
    File,
    resolveBlockPath
} from "../models/file.js";
import {makeNodeFinder} from "../models/node.js";
import {saveBlock} from "./postBlock.js";
import {agent} from "./agent.js";
import {AppConfig} from "./app.js";
import {makeBigChunkSplitter} from "../streaming/BigChunkSplitter.js";
import {makeChunkToBlockStreamer} from "../streaming/ChunkToBlockStreamer.js";

function saveRemoteBlock(blockHash: string, nodeUrl: string, size: number) {
    return async (source: AsyncIterable<Buffer | Uint8Array>) => {
        // @ts-ignore
        const {promise: downstreamResponsePromise, resolve, reject} = Promise.withResolvers()

        const url = new URL("/block/" + blockHash, nodeUrl)
        console.log('request', url.toString())
        const downstreamRequest = http.request(url, {
            method: "POST",
            headers: {
                "content-type": "application/octet-stream",
                "content-length": size,
            },
            agent,
        }, downstreamResponse => resolve(downstreamResponse))
            .on("error", e => reject(e))

        await pipeline(source, downstreamRequest)
        const downstreamResponse: IncomingMessage = await downstreamResponsePromise
        if (downstreamResponse.statusCode !== 200)
            throw new Error(`Downstream response status code is not 200`)
    }
}

const postFileQueryParams = z.object({
    blockSize: z.coerce.number().int().gt(0).optional().default(1),
})

export async function postFile(request: IncomingMessage, response: ServerResponse, query: Record<string, string>, fileName: string, config: AppConfig) {
    const {blockSize} = postFileQueryParams.parse(query)

    const cl = request.headers["content-length"]
    if (!cl)
        return response.writeHead(400).end("Server does not support Transfer-Encoding: chunked. Please provide Content-Length.")

    const file: File = {
        name: fileName,
        blockSize,
        size: parseInt(cl),
        mimeType: request.headers["content-type"] ?? 'application/octet-stream'
    }

    const key = encodeFileKey(file)
    const blockSizeBytes = calculateBlockSizeBytes(blockSize)
    const blockCount = calculateBlockCount(file.size, blockSizeBytes)
    const nodeFinder = makeNodeFinder(config.nodes)

    console.log('file', file, 'filekey', key)
    await pipeline(
        request,
        makeBigChunkSplitter(blockSizeBytes),
        async function sender(source: AsyncIterable<Buffer | Uint8Array>) {
            const {streamChunksToBlock, isReadableDone} = makeChunkToBlockStreamer(source, blockSizeBytes)

            for (let blockIdx = 0; blockIdx < blockCount; ++blockIdx) {
                console.log('sending block', blockIdx)

                const bHash = computeBlockHash({
                    file,
                    idx: blockIdx
                })
                const node = nodeFinder(bHash)
                const selfSave = node === config.selfNode
                if (selfSave) {
                    console.log('self save')
                    await pipeline(
                        streamChunksToBlock,
                        saveBlock(config, resolveBlockPath(config.blockPath, bHash)),
                    )
                } else {
                    console.log('remote save', node.url)
                    // последний блок может быть неполным
                    const thisBlockSize = blockIdx !== blockCount - 1 ? blockSizeBytes : file.size % blockSizeBytes
                    // problem-solving improved (а тесты не падали из-за чётного размера)
                    // const thisBlockSize = blockIdx === blockCount - 1 ? blockSizeBytes : file.size % blockSizeBytes
                    await pipeline(
                        streamChunksToBlock,
                        saveRemoteBlock(bHash, node.url, thisBlockSize === 0 ? blockSizeBytes : thisBlockSize)
                    )
                }
                console.log('sent block', blockIdx)
                if (isReadableDone()) {
                    break
                }
            }
        }
    )

    console.log('request finished')
    response.writeHead(200).end(key)
}
