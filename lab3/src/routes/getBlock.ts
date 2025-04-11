import {IncomingMessage, ServerResponse} from "node:http";
import {pipeline} from "node:stream/promises";
import * as fs from "fs";
import * as fsp from "fs/promises";
import {resolveBlockPath} from "../models/file";
import {RangeError, rangeParser} from "../range-parser";
import {acceptRanges} from "./utils";
import {AppConfig} from "../app";

export async function getBlock(request: IncomingMessage, response: ServerResponse, blockName: string, method: "GET" | "HEAD", config: AppConfig) {
    const filePath = resolveBlockPath(config.blockPath, blockName)
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

    return await pipeline(readBlock(config, filePath, range?.start, range?.end), response)
}

export function readBlock(config: AppConfig, filePath: string, start?: number, end?: number) {
    return fs.createReadStream(filePath, {
        highWaterMark: config.hwm?.localRead,
        start,
        end,
    })
}