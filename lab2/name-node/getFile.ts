import {db} from "./db";
import {pipeline} from "node:stream/promises";
import {DataNode, DataNodes} from "./data-nodes";
import {IncomingMessage, ServerResponse} from "node:http";
import {BlockNotFoundError} from "./BlockNotFoundError";
import {toBlockId} from "./common";
import {Range, RangeError, rangeParser} from "./range-parser";

type BlockInfo = { dataNode: string; blockIdx: number }

function getFileInfo(filePath: string) {
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
        WHERE f.path = ?
        GROUP BY f.id, f.path, f.mimeType, f.blockSize, f.fileSize
    `)

    const fileInfo = stmt.get(filePath) as {
        mimeType: string
        blockSize: number
        fileSize: number
        blocks: string
    } | undefined;

    if (!fileInfo)
        return undefined;
    const blocks = (JSON.parse(fileInfo.blocks) as Array<BlockInfo>)
        .sort((a, b) => a.blockIdx - b.blockIdx)

    return {
        ...fileInfo,
        blocks
    }
}

function calculateSize(requestedBlocks: BlockInfo[],
                       lastBlock: BlockInfo,
                       fileSize: number,
                       blockSizeBytes: number): number {
    return requestedBlocks.reduce((acc, block) => {
        // check if last block is excluded or not
        if (block.blockIdx === lastBlock.blockIdx) {
            const rem = fileSize % blockSizeBytes
            return acc + (rem === 0 ? blockSizeBytes : rem)
        }
        return acc + blockSizeBytes
    }, 0)
}


const acceptRanges = {"Accept-Ranges": "bytes, blocks"}

function getUnavailableNodes(datanodesSnapshot: readonly DataNode[], requestedBlocks: BlockInfo[]) {
    const nameSet = new Set(datanodesSnapshot.map(node => node.name))
    return requestedBlocks.reduce((acc, block) => {
            if (!nameSet.has(block.dataNode))
                acc.add(block.dataNode)
            return acc;
        }, new Set<string>()
    );
}

function byteRangeToBlockRange(byteRange: Range, blockSizeBytes: number): Range {
    const {start, end} = byteRange
    const blockStart = Math.floor(start / blockSizeBytes)
    const blockEnd = Math.floor(end / blockSizeBytes)
    return {
        type: 'blocks',
        start: blockStart,
        end: blockEnd,
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
        if (range === RangeError.ResultInvalid || range === RangeError.ResultUnsatisfiable)
            return response.writeHead(416, {...acceptRanges}).end()

        const blockRange = range?.type === 'bytes' ? byteRangeToBlockRange(range, blockSizeBytes) : range

        const requestedBlocks = blockRange ? (
            allBlocks.slice(blockRange.start, blockRange.end + 1)
        ) : allBlocks;
        const unavailableNodes = getUnavailableNodes(datanodesSnapshot, requestedBlocks);
        if (unavailableNodes.size > 0)
            return response.writeHead(521, {...acceptRanges}).end("Required nodes are unavailable: " + [...unavailableNodes].join(", "))

        const size = !blockRange ? fileSize : calculateSize(requestedBlocks, allBlocks[allBlocks.length - 1], fileSize, blockSizeBytes);

        const contentRange = blockRange ? {
            "Content-Range": range?.type === 'bytes' ? (
                `bytes ${blockRange.start * blockSizeBytes}-${blockRange.end * blockSizeBytes}/${fileSize}`
            ) : (
                `blocks ${blockRange.start}-${blockRange.end}/${allBlocks.length}`
            )
        } : undefined

        response.writeHead(blockRange ? 206 : 200, {
            "Content-Type": mimeType,
            "Content-Length": size,
            ...acceptRanges,
            ...contentRange,
        })

        if (method === "HEAD")
            return response.end()

        // let debugBuffer = Buffer.alloc(0)
        // async function collector(source: AsyncIterable<Buffer>) {
        //     for await(const chunk of source) {
        //         debugBuffer = Buffer.concat([debugBuffer, chunk])
        //     }
        // }

        await pipeline(async function* () {
            for (const {dataNode, blockIdx} of requestedBlocks) {
                const {origin} = datanodesSnapshot.find(n => n.name === dataNode)!
                const blockId = toBlockId(blockIdx, filePath)
                const downstreamResponse = await fetch(new URL("/block/" + blockId, origin), {
                    method: 'GET'
                });
                console.log(`[${requestId}, ${new Date().getMinutes()}:${new Date().getSeconds()}]`, blockId, downstreamResponse.status, downstreamResponse.statusText)
                if (downstreamResponse.status === 404)
                    throw new BlockNotFoundError(dataNode, blockIdx)
                for await (const chunk of downstreamResponse.body!.values()) {
                    yield Buffer.from(chunk)
                    console.log(`[${requestId}, ${new Date().getMinutes()}:${new Date().getSeconds()}]`, blockId, 'yielded', chunk.length)
                }
            }
        }, response)
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