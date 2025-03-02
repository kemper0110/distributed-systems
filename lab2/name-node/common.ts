
export function toBlockId(blockIdx: number, filePath: string) {
    return blockIdx + '_' + filePath.replace('/', '_')
}