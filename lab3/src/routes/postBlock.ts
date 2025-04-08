import {IncomingMessage, ServerResponse} from "node:http";
import fsp from "fs/promises";
import {pipeline} from "node:stream/promises";
import fs from "fs";
import {resolveBlockPath} from "../models/file";

export async function postBlock(request: IncomingMessage, response: ServerResponse, blockName: string, blockPath: string) {
    const filePath = resolveBlockPath(blockPath, blockName)
    const stats = await fsp.stat(filePath).catch<Error>(e => e);
    if (!(stats instanceof Error))
        return response.writeHead(409).end();
    await pipeline(request, saveBlock(filePath))
    return response.writeHead(200).end()
}

export function saveBlock(filePath: string) {
    return fs.createWriteStream(filePath, {
        highWaterMark: Number(process.env.LOCAL_WRITE_HWM) || undefined,
    })
}