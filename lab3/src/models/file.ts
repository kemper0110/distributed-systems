import crypto from "node:crypto";
import * as path from "node:path";
import jwt from 'jsonwebtoken';

export type File = {
    name: string
    size: number
    mimeType: string
    blockSize: number
}

export const secretKey = "lab3-secret-key"

export function encodeFileKey(file: File): string {
    return jwt.sign(file, secretKey, {noTimestamp: true})
}

export function decodeFileKey(key: string): File {
    return jwt.verify(key, secretKey, {ignoreExpiration: true}) as File
}

export function resolveBlockPath(blockPath: string, blockHash: bigint): string {
    return path.join(blockPath, blockHash.toString())
}

export function calculateBlockCount(fileSize: number, blockSize: number): number {
    return Math.ceil(fileSize / blockSize)
}



export type Block = {
    idx: number
    file: File
}

export function computeBlockHash(block: Block): bigint {
    const {idx, file} = block
    const {name, size, mimeType, blockSize} = file
    const hex = crypto.createHash('sha1')
        .update(`${idx} ${name} ${size} ${mimeType} ${blockSize}`)
        .digest('hex')
    return BigInt('0x' + hex)
}

export function calculateBlockSizeBytes(blockSize: number): number {
    return 1024 * 1024 * blockSize
}