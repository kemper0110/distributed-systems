import {IncomingMessage, ServerResponse} from "node:http";
import {pipeline} from "node:stream/promises";
import {z} from "zod";
import {blockCount, blockHash, File, fileKey, resolveBlockPath} from "../models/file";
import {makeNodeFinder, Node} from "../models/node";
import * as http from "node:http";
import {saveBlock} from "./postBlock";
import {agent} from "./agent";
import {Readable} from "node:stream";
import {AppConfig} from "../app";

const postFileQueryParams = z.object({
    blockSize: z.coerce.number().int().gt(0).optional().default(1),
})

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

        let count = 0;
        await pipeline(
            source,
            async function* counter(source) {
                for await (const chunk of source) {
                    count += chunk.length
                    // console.log(`${chunk.length}/${count}`)
                    yield chunk
                }
            },
            downstreamRequest
        )
        console.log('sent', count, 'to', url.toString())

        const downstreamResponse: IncomingMessage = await downstreamResponsePromise
        if (downstreamResponse.statusCode !== 200)
            throw new Error(`Downstream response status code is not 200`)
    }
}


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

    const key = fileKey(file)
    const blockSizeBytes = 1024 * 1024 * blockSize
    const bc = blockCount(file.size, blockSizeBytes)
    const nodeFinder = makeNodeFinder(config.nodes)

    console.log('file', file, 'filekey', key)
    await pipeline(
        request,
        makeBigChunkSplitter(blockSizeBytes),
        async function sender(source) {
            let tail: Buffer | undefined
            for (let blockIdx = 0; blockIdx < bc; ++blockIdx) {
                console.log('sending block', blockIdx)
                let readableDone = false
                async function* chunksToBlock() {
                    let remainingToBlock = blockSizeBytes
                    function yieldPart(part: Buffer) {
                        remainingToBlock -= part.length
                        return part
                    }
                    function yieldTailSplit(buf: Buffer) {
                        const part = buf.subarray(0, remainingToBlock)
                        tail = buf.subarray(remainingToBlock)
                        return yieldPart(part)
                    }
                    if (tail) {
                        yield yieldPart(tail)
                        tail = undefined
                    }
                    while (true) {
                        if (remainingToBlock === 0) return;
                        if (remainingToBlock < 0) throw new TypeError('omg remaining < 0')
                        // @ts-ignore
                        const {value, done} = await source.next()
                        if (done) {
                            break;
                        }
                        if (value.length <= remainingToBlock) {
                            yield yieldPart(value)
                        } else {
                            yield yieldTailSplit(value)
                        }
                    }

                    if (!tail) {
                        readableDone = true
                        return;
                    }

                    // @ts-ignore
                    if (tail.length > remainingToBlock) {
                        yield yieldTailSplit(tail)
                        // readableDone не выставляем, чтобы отправить tail на следующую ноду
                    } else {
                        yield tail
                        tail = undefined
                        readableDone = true
                    }
                }

                const bHash = blockHash({
                    file,
                    idx: blockIdx
                })
                const node = nodeFinder(bHash)
                const selfSave = node === config.selfNode
                if (selfSave) {
                    console.log('self save')
                    await pipeline(
                        chunksToBlock,
                        saveBlock(config, resolveBlockPath(config.blockPath, bHash)),
                    )
                } else {
                    console.log('remote save', node.url)
                    // последний блок может быть неполным
                    const thisBlockSize = blockIdx !== bc - 1 ? blockSizeBytes : file.size % blockSizeBytes
                    // problem-solving improved (а тесты не падали из-за чётного размера)
                    // const thisBlockSize = blockIdx === bc - 1 ? blockSizeBytes : file.size % blockSizeBytes
                    await pipeline(
                        chunksToBlock,
                        saveRemoteBlock(bHash, node.url, thisBlockSize === 0 ? blockSizeBytes : thisBlockSize)
                    )
                }
                console.log('sent block', blockIdx)
                if (readableDone) {
                    break
                }
            }
        }
    )

    console.log('request finished')
    response.writeHead(200).end(key)
}

function makeBigChunkSplitter(blockSizeBytes: number) {
    return async function* bigChunkSplitter(source: Readable) {
        for await (let chunk of source) {
            while (chunk.length > blockSizeBytes) {
                yield chunk.subarray(0, blockSizeBytes)
                chunk = chunk.subarray(blockSizeBytes)
            }
            yield chunk
        }
    }
}