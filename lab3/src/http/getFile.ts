import http, {IncomingMessage, ServerResponse} from "node:http";
import {
    calculateBlockCount,
    calculateBlockSizeBytes,
    computeBlockHash,
    decodeFileKey,
    resolveBlockPath
} from "../models/file.js";
import {pipeline} from "node:stream/promises";
import {acceptRanges, Range, RangeError, rangeParser} from "./range-parser.js";
import {readBlock} from "./getBlock.js";
import {BlockNotFoundError} from "./BlockNotFoundError.js";
import {agent} from "./agent.js";
import {AppConfig, AppState} from "../app.js";
import {getSuccessor} from "./chord/getSuccessor.js";

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

export async function getFile(request: IncomingMessage, response: ServerResponse, fileKey: string, method: "GET" | "HEAD", config: AppConfig, state: AppState) {
    const file = decodeFileKey(fileKey)
    const {mimeType, size, blockSize} = file

    const range = rangeParser(request.headers.range ?? '', size)
    if (range === RangeError.ResultInvalid || range === RangeError.ResultUnsatisfiable)
        return response.writeHead(416, {...acceptRanges}).end()

    const blockSizeBytes = calculateBlockSizeBytes(blockSize)
    const blockCount = calculateBlockCount(size, blockSizeBytes)
    const blockRange = range ? getRangeInfo(range, blockSizeBytes) : {
        blockStart: 0,
        blockEnd: blockCount - 1,
        skip: 0, take: 0,
    }

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


    return await pipeline(
        async function* () {
            for (let i = blockRange.blockStart; i < blockRange.blockEnd + 1; ++i) {
                const bHash = computeBlockHash({file, idx: i})
                // console.log('Хеш блока', i, bHash)
                const nodeUrl = await getSuccessor(bHash, config, state)
                // console.log('Узел блока', i, nodeUrl)
                if (nodeUrl === undefined) {
                    throw new BlockNotFoundError(config.selfNode.url, i, bHash)
                }

                const skip = i === blockRange.blockStart && blockRange.skip > 0 ? blockRange.skip : undefined
                const take = i === blockRange.blockEnd && blockRange.take > 0 ? blockRange.take : undefined

                const selfRead = nodeUrl === config.selfNode.url
                if (selfRead) {
                    yield* readBlock(config, resolveBlockPath(config.blockPath, bHash), skip, take)
                } else {
                    yield* await readRemoteBlock(bHash, nodeUrl, i, skip, take)
                }
            }
        },
        response
    )
}


function makeRangeHeader(take?: number, skip?: number) {
    if (take === undefined && skip === undefined)
        return undefined
    if (take === undefined)
        return `bytes=${skip}-`
    if (skip === undefined)
        return `bytes=0-${take}` // отличается лишь одним байтом от `-${take}`
    return `bytes=${skip}-${take}`
}

async function readRemoteBlock(bHash: bigint, nodeUrl: string, i: number, skip?: number, take?: number) {
    // @ts-ignore
    const {promise: downstreamResponsePromise, resolve, reject} = Promise.withResolvers()
    const url = new URL("/block/" + bHash, nodeUrl)
    const range = makeRangeHeader(take, skip);

    http.request(url, {
        method: 'GET',
        headers: {
            'accept': 'application/octet-stream',
            ...(range && {range}),
        },
        agent,
    }, downstreamResponse => resolve(downstreamResponse))
        .on("error", e => reject(e))
        .end()
    const downstreamResponse: IncomingMessage = await downstreamResponsePromise
    if (downstreamResponse.statusCode === 404)
        throw new BlockNotFoundError(nodeUrl, i, bHash)
    return downstreamResponse
}