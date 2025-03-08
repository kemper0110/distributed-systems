import {db} from "./db";
import {BlockInfo} from "./getFile/getFile";

export function getFileInfo(filePath: string) {
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