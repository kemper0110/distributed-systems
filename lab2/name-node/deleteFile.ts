import {IncomingMessage, ServerResponse} from "node:http";
import {DataNodes} from "./data-nodes";
import {getFileInfo} from "./getFileInfo";
import {toBlockId} from "./common";
import {db} from "./db";

export async function deleteFile(
    requestId: number,
    request: IncomingMessage,
    response: ServerResponse,
    filePath: string,
    datanodes: DataNodes) {
    const datanodesSnapshot = datanodes.get()

    const fileInfo = getFileInfo(filePath);
    if (!fileInfo)
        return response.writeHead(404).end();

    const {blocks} = fileInfo

    const stmt = db.prepare(`delete FROM file WHERE file.path = ?`)

    const {changes} = stmt.run(filePath)
    console.log(`[${requestId}]`, changes)

    for(const {dataNode, blockIdx} of blocks) {
        const {origin} = datanodesSnapshot.find(n => n.name === dataNode)!
        const blockId = toBlockId(blockIdx, filePath)
        const downstreamResponse = await fetch(new URL("/block/" + blockId, origin), {
            method: 'DELETE'
        });
        if (downstreamResponse.status !== 200)
            return response.writeHead(500).end(downstreamResponse.statusText)
    }

    response.writeHead(200).end()
}