import {IncomingMessage, ServerResponse} from "node:http";
import fsp from "fs/promises";
import {pipeline} from "node:stream/promises";
import fs from "fs";
import {resolveBlockPath} from "../models/file.js";
import {AppConfig} from "../app.js";

export async function postBlock(request: IncomingMessage, response: ServerResponse, blockName: bigint, config: AppConfig) {
    const filePath = resolveBlockPath(config.blockPath, blockName)
    const stats = await fsp.stat(filePath).catch<Error>(e => e);
    if (!(stats instanceof Error))
        return response.writeHead(409).end();
    await pipeline(request, saveBlock(config, filePath))
    return response.writeHead(200).end()
}

export function saveBlock(config: AppConfig, filePath: string) {
    return fs.createWriteStream(filePath, {
        highWaterMark: config.hwm?.localWrite,
    })
}