import {IncomingMessage, ServerResponse} from "node:http";
import {pipeline} from "node:stream/promises";
import {z} from "zod";
import {blockHash, File, fileKey, resolveBlockPath} from "../models/file";
import {makeNodeFinder, Node} from "../models/node";
import * as http from "node:http";
import fs from "fs";

const postFileQueryParams = z.object({
    blockSize: z.coerce.number().int().gt(0).optional().default(1),
})

// function saveBlock(filePath: string) {
//     return async function (source: AsyncIterable<Buffer | Uint8Array>) {
//         console.log('self node local write', filePath)
//         return
//     }
// }

function sendBlock(blockHash: string, nodeUrl: string, size: number) {
    return async (source: AsyncIterable<Buffer | Uint8Array>) => {
        // @ts-ignore
        const {promise: downstreamResponsePromise, resolve, reject} = Promise.withResolvers()

        const url = new URL("/file", nodeUrl)
        url.searchParams.append("hash", blockHash)
        const downstreamRequest = http.request(url, {
            method: "POST",
            headers: {
                "content-type": "application/octet-stream",
                "content-length": size,
            },
        }, downstreamResponse => resolve(downstreamResponse))
            .on("error", e => reject(e))

        let count = 0;
        await pipeline(
            source,
            async function* counter(source) {
                for await (const chunk of source) {
                    count += chunk.length
                    console.log(`${chunk.length}/${count}`)
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


export async function postFile(request: IncomingMessage, response: ServerResponse, query: Record<string, string>, nodes: Node[], self: Node, blockPath: string, fileName: string) {
    const {blockSize} = postFileQueryParams.parse(query)

    const cl = request.headers["content-length"]
    if (!cl)
        return response.writeHead(400).end("Content-Length header is required")

    const file = {
        name: fileName,
        blockSize,
        size: parseInt(cl),
        mimeType: request.headers["content-type"] ?? 'application/octet-stream'
    } satisfies File

    const key = fileKey(file)

    console.log('file', file, 'filekey', key)

    const blockSizeBytes = 1024 * 1024 * blockSize

    const nodeFinder = makeNodeFinder(nodes)

    // осталось лишь отстримить файл блоками на узлы... уххх

    await pipeline(
        request,
        async function* (source) {
            for await (let chunk of source) {
                while (chunk.length > blockSizeBytes) {
                    yield chunk.subarray(0, blockSizeBytes)
                    chunk = chunk.subarray(blockSizeBytes)
                }
                yield chunk
            }
        },
        // тут sender как в лабе2, даже проще
        async function sender(source) {
            let blockIdx = 0;
            let tail: Buffer | undefined

            while (true) {
                console.log('sending block', blockIdx)

                let readableDone = false

                async function* chunksToBlock() {
                    let remainingToBlock = blockSizeBytes
                    if (tail) {
                        remainingToBlock -= tail.length
                        yield tail
                        tail = undefined
                    }
                    while (true) {
                        if (remainingToBlock === 0) return;
                        if (remainingToBlock < 0) throw new TypeError('omg remaining < 0')
                        // @ts-ignore
                        const {value, done} = await source.next()
                        if (done) {
                            console.log('source done')
                            break;
                        }
                        if (value.length > remainingToBlock) {
                            const part = value.subarray(0, remainingToBlock)
                            tail = value.subarray(remainingToBlock)
                            yield part
                            remainingToBlock -= part.length
                        } else {
                            yield value
                            remainingToBlock -= value.length
                        }
                    }

                    if (!tail) {
                        readableDone = true
                        return;
                    }

                    if (tail.length > remainingToBlock) {
                        const part = tail.subarray(0, remainingToBlock)
                        tail = tail.subarray(remainingToBlock)
                        yield part
                        // readableDone не выставляем, чтобы отправить tail на следующую ноду
                    } else {
                        yield tail
                        tail = undefined
                        readableDone = true
                    }
                }

                const bHash = blockHash({
                    file,
                    idx: blockIdx,
                })
                const node = nodeFinder(bHash)
                // if(node !== self) {
                //     await pipeline(
                //         chunksToBlock,
                //         sendBlock(bHash, node.url, 0) // todo: calculate real size (really hard)
                //     )
                // } else {
                await pipeline(
                    chunksToBlock,
                    fs.createWriteStream(resolveBlockPath(blockPath, bHash), {
                        // highWaterMark: 1024 * 1024 // todo: test big highWaterMark
                    }),
                    // saveBlock(resolveBlockPath(blockPath, bHash))
                )
                // }

                if (readableDone) {
                    break
                }
                console.log('sent block', blockIdx)
                blockIdx++
            }
        }
    )

    response.writeHead(200).end(key)
}