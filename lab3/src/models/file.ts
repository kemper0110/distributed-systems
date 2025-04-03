import {z} from "zod";
import crypto from "node:crypto";
import * as path from "node:path";
import * as jwt from 'jsonwebtoken';
import fs from "fs";

export const fileSchema = z.object({
    name: z.string(),
    size: z.number().int().gt(0),
    mimeType: z.string(),
    blockSize: z.number().int().gt(0),
})

export type File = z.infer<typeof fileSchema>

export type Block = {
    idx: number
    file: File
}

export const secretKey = "lab3-secret-key"

export function fileKey(file: File): string {
    return jwt.sign(file, secretKey, {noTimestamp: true})
}

export function fileFromKey(key: string): File {
    return jwt.verify(key, secretKey, {ignoreExpiration: true}) as File
}

export function blockHash(block: Block): string {
    return crypto.createHash('sha1')
        .update(
            `${block.idx} ${block.file.name} ${block.file.size} ${block.file.mimeType} ${block.file.blockSize}`
        )
        .digest('hex')
}

export function resolveBlockPath(blockPath: string, blockHash: string): string {
    return path.join(blockPath, blockHash)
}

export function blockCount(fileSize: number, blockSize: number): number {
    return Math.ceil(fileSize / blockSize)
}
