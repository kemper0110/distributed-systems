import {IncomingMessage, ServerResponse} from "node:http";
import {pipeline} from "node:stream/promises";
import * as fs from "fs";
import * as fsp from "fs/promises";
import {resolveBlockPath} from "../models/file";
import {Range, RangeError, rangeParser} from "../range-parser";
import {acceptRanges} from "./utils";

export async function getBlock(request: IncomingMessage, response: ServerResponse, blockName: string, blockPath: string, method: 'GET' | 'HEAD') {
    const filePath = resolveBlockPath(blockPath, blockName)
    const stats = await fsp.stat(filePath).catch<Error>(e => e);
    if (stats instanceof Error) {
        return response.writeHead(404).end();
    }

    const range = rangeParser(request.headers.range ?? '', stats.size)
    if (range === RangeError.ResultInvalid || range === RangeError.ResultUnsatisfiable)
        return response.writeHead(416, {...acceptRanges}).end()

    if (range) {
        response.writeHead(206, {
            'content-type': 'application/octet-stream',
            'content-length': range.end - range.start + 1,
            'content-range': `bytes ${range.start}-${range.end}/${stats.size}`,
            ...acceptRanges,
        })
    } else {
        response.writeHead(200, {
            'content-type': 'application/octet-stream',
            'content-length': stats.size,
            ...acceptRanges,
        })
    }

    if(method === 'HEAD')
        return response.end()

    await pipeline(readBlock(filePath, range?.start, range?.end), response)
    return response.end()
}

export function readBlock(filePath: string, start?: number, end?: number) {
    return fs.createReadStream(filePath, {
        // highWaterMark: 1024 * 1024 // todo: test big highWaterMark
        start,
        end,
    })
}