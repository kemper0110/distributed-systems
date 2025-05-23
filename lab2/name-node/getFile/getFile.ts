import {pipeline} from "node:stream/promises";
import {DataNode, DataNodes} from "../data-nodes";
import {IncomingMessage, ServerResponse} from "node:http";
import {BlockNotFoundError} from "../BlockNotFoundError";
import {toBlockId} from "../common";
import {Range, RangeError, rangeParser} from "../range-parser";
import {getFileInfo} from "../getFileInfo";
import * as http from "node:http";

export type BlockInfo = { dataNode: string; blockIdx: number }

const acceptRanges = {
    "Accept-Ranges": "bytes, blocks"
}

export function getUnavailableNodes(datanodesSnapshot: readonly DataNode[], requestedBlocks: BlockInfo[]) {
    const nameSet = new Set(datanodesSnapshot.map(node => node.name))
    return requestedBlocks.reduce((acc, block) => {
            if (!nameSet.has(block.dataNode))
                acc.add(block.dataNode)
            return acc;
        }, new Set<string>()
    );
}

type BlockRangeStreamInfo = {
    blockStart: number
    blockEnd: number
    skip: number
    take: number
}

function getRangeInfo(byteRange: Range, blockSizeBytes: number): BlockRangeStreamInfo {
    const {start, end} = byteRange
    const blockStart = Math.floor(start / blockSizeBytes)
    const blockEnd = Math.floor(end / blockSizeBytes)

    const skip = start % blockSizeBytes // сколько нужно пропустить в начале первого блока
    const take = end % blockSizeBytes // сколько нужно взять из последнего блока
    return {
        blockStart,
        blockEnd,
        skip,
        take,
    }
}

async function* skippingTransformer(source: AsyncIterable<Buffer | Uint8Array>, blockRangeSkip: number) {
    let skipped = 0 // счетчик скипнутых байтов
    for await (const chunk of source) {
        const remainingToSkip = blockRangeSkip - skipped
        if (remainingToSkip >= chunk.length) {
            // скипаем весь чанк
            skipped += chunk.length
        } else if (remainingToSkip > 0) {
            // скипаем часть чанка, а часть отдаем
            skipped += remainingToSkip
            yield chunk.subarray(remainingToSkip) // start указывается включительно
        } else {
            // уже наскипались, отдаем весь чанк
            yield chunk
        }
    }
}

async function* takingTransformer(source: AsyncIterable<Buffer | Uint8Array>, blockRangeTake: number) {
    let taken = 0
    for await (const chunk of source) {
        const remainingToTake = blockRangeTake - taken
        if (remainingToTake >= chunk.length) {
            // отдаем весь чанк
            taken += chunk.length
            yield chunk
        } else if (remainingToTake > 0) {
            // отдаем часть чанка
            taken += remainingToTake
            yield chunk.subarray(0, remainingToTake + 1) // end исключительный у subarray и включительный у range
        }
        // больше не отдаем чанки
    }
}

export async function getFile(
    requestId: number,
    request: IncomingMessage,
    response: ServerResponse,
    method: "GET" | "HEAD",
    filePath: string,
    query: Record<string, string>,
    datanodes: DataNodes) {
    try {
        console.log(`[${requestId}]`, request.headers.range)
        const datanodesSnapshot = datanodes.get()

        const fileInfo = getFileInfo(filePath);

        if (!fileInfo)
            return response.writeHead(404, {...acceptRanges}).end("File not found")

        const {mimeType, blockSize, fileSize, blocks: allBlocks} = fileInfo
        const blockSizeBytes = 1024 * 1024 * blockSize

        const range = rangeParser(request.headers.range ?? '', allBlocks.length, fileSize)
        console.log(`[${requestId}] parsed range`, JSON.stringify(range))
        if (range === RangeError.ResultInvalid || range === RangeError.ResultUnsatisfiable)
            return response.writeHead(416, {...acceptRanges}).end()

        const blockRange = range ? getRangeInfo(range, blockSizeBytes) : {
            blockStart: 0,
            blockEnd: allBlocks.length - 1,
            skip: 0, take: 0,
        }
        const requestedBlocks = allBlocks.slice(blockRange.blockStart, blockRange.blockEnd + 1)

        const unavailableNodes = getUnavailableNodes(datanodesSnapshot, requestedBlocks);
        if (unavailableNodes.size > 0)
            return response.writeHead(521, {...acceptRanges}).end("Required nodes are unavailable: " + [...unavailableNodes].join(", "))

        if (range) {
            response.writeHead(206, {
                "Content-Type": mimeType,
                "Content-Length": range.end - range.start + 1,
                ...acceptRanges,
                "Content-Range": range.type === 'bytes' ? (
                    `bytes ${range.start}-${range.end}/${fileSize}`
                ) : (
                    `blocks ${range.start}-${range.end}/${allBlocks.length}`
                )
            })
        } else {
            response.writeHead(200, {
                "Content-Type": mimeType,
                "Content-Length": fileSize,
                ...acceptRanges,
            })
        }

        if (method === "HEAD")
            return response.end()

        await pipeline(
            async function* () {
                const nodesMap = Object.fromEntries(datanodesSnapshot.map(n => [n.name, n.origin]))

                for (let i = 0; i < requestedBlocks.length; i++) {
                    const {dataNode, blockIdx} = requestedBlocks[i];
                    const origin = nodesMap[dataNode]!
                    const blockId = toBlockId(blockIdx, filePath)
                    // @ts-ignore
                    const {promise: downstreamResponsePromise, resolve, reject} = Promise.withResolvers()
                    const url = new URL("/block/" + blockId, origin)
                    // console.log('fetching from', url.toString())
                    http.request(url, {
                        method: 'GET',
                        headers: {
                            'accept': 'application/octet-stream',
                        },
                    }, downstreamResponse => resolve(downstreamResponse))
                        .on("error", e => reject(e))
                        .end()
                    const downstreamResponse: IncomingMessage = await downstreamResponsePromise
                    if (downstreamResponse.statusCode === 404)
                        throw new BlockNotFoundError(dataNode, blockIdx)

                    const skipping = i === 0 && blockRange != undefined && blockRange.skip > 0
                    const taking = i === requestedBlocks.length - 1 && blockRange != undefined && blockRange.take > 0

                    if (skipping && taking) {
                        yield* takingTransformer(
                            skippingTransformer(
                                downstreamResponse,
                                blockRange.skip
                            ),
                            blockRange.take
                        )
                    } else if (skipping) {
                        yield* skippingTransformer(downstreamResponse, blockRange.skip);
                    } else if (taking) {
                        yield* takingTransformer(downstreamResponse, blockRange.take);
                    } else {
                        yield* downstreamResponse
                    }
                }
            },
            response
        )
        response.end()
    } catch (e) {
        if (e.code === 'ERR_STREAM_PREMATURE_CLOSE') {
            console.info(`[${requestId}]`, 'Запрос оборван клиентом')
        } else {
            console.error(`[${requestId}]`, e)
        }
        if (!response.headersSent) {
            if (e instanceof BlockNotFoundError) {
                response.writeHead(404, {...acceptRanges}).end(e.message)
            }
            response.writeHead(500, {...acceptRanges}).end(e.message)
        } else {
            response.end()
        }
    }
}