import {IncomingMessage, ServerResponse} from "node:http";
import {blockCount, blockHash, fileFromKey, resolveBlockPath} from "../models/file";
import {makeNodeFinder, Node} from "../models/node";
import {pipeline} from "node:stream/promises";
import {Range, RangeError, rangeParser} from "../range-parser";
import fs from "fs";
import {acceptRanges} from "./utils";
import {clearInterval, setInterval} from "node:timers";
import {setTimeout} from "node:timers/promises";
import {readBlock} from "./getBlock";

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

export async function getFile(request: IncomingMessage, response: ServerResponse, fileKey: string, nodes: Node[], self: Node, blockPath: string, method: 'GET' | 'HEAD') {
    const acc = '"' + request.headers.accept?.substring(0, 9) + ' ' + request.headers.range + '"'

    const file = fileFromKey(fileKey)
    const {mimeType, size, blockSize} = file

    const range = rangeParser(request.headers.range ?? '', size)
    if (range === RangeError.ResultInvalid || range === RangeError.ResultUnsatisfiable)
        return response.writeHead(416, {...acceptRanges}).end()

    const blockSizeBytes = 1024 * 1024 * blockSize

    const bc = blockCount(size, blockSize)

    const blockRange = range ? getRangeInfo(range, blockSizeBytes) : {
        blockStart: 0,
        blockEnd: bc - 1,
        skip: 0, take: 0,
    }
    console.log(range, blockRange)

    if (range) {
        response.writeHead(206, {
            'content-type': mimeType,
            'content-length': range.end - range.start + 1,
            'content-range': `bytes ${range.start}-${range.end}/${size}`,
            ...acceptRanges,
        })
    } else {
        response.writeHead(200, {
            'content-type': mimeType,
            'content-length': size,
            ...acceptRanges,
        })
    }

    if (method === "HEAD")
        return response.end()

    // const nodeFinder = makeNodeFinder(nodes)

    let key;
    try {
        key = setInterval(() => {
            console.log(acc, request.destroyed, request.closed, request.aborted)
        }, 500)

        let len = 0;
        await pipeline(
            async function* () {
                for (let i = blockRange.blockStart; i < blockRange.blockEnd + 1; ++i) {
                    console.log('sent', i, 'block')
                    const bHash = blockHash({
                        file,
                        idx: i
                    })
                    // const node = nodeFinder(bHash)
                    // if (node === self) {
                    // } else {
                    // }

                    const stream = readBlock(resolveBlockPath(blockPath, bHash),
                        i === 0 && blockRange.skip > 0 ? blockRange.skip : undefined,
                        i === blockRange.blockEnd && blockRange.take > 0 ? blockRange.take : undefined
                    )
                    yield* stream
                }
            },
            async function*(source) {
                for await (const chunk of source) {
                    len += chunk.length
                    console.log(acc, `${chunk.length}/${len}`)
                    yield chunk
                }
            },
            response
        )
        console.log(acc, 'sent', len, 'to')
    } catch (e) {
        console.log('error!!!', acc, e)
    } finally {
        console.log(acc, 'finally!')
        clearInterval(key)
    }
}