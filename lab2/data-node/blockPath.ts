import * as path from 'path'
import * as fs from 'fs'
import {fileURLToPath} from "node:url";

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const blocksPath = process.env.BLOCKS_PATH || './blocks'

const blocksDir = path.resolve(__dirname, blocksPath)

fs.mkdirSync(blocksDir, {
    recursive: true
})

export function resolveBlockPath(id: string) {
    return path.join(blocksDir, path.basename(id))
}