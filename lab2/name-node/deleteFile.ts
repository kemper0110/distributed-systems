import {IncomingMessage, ServerResponse} from "node:http";
import {DataNodes} from "./data-nodes";
import {getFileInfo} from "./getFileInfo";
import {toBlockId} from "./common";

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

    const {mimeType, blockSize, fileSize, blocks: allBlocks} = fileInfo

    for(const {dataNode, blockIdx} of allBlocks) {

        const {origin} = datanodesSnapshot.find(n => n.name === dataNode)!
        const blockId = toBlockId(blockIdx, filePath)
        const downstreamResponse = await fetch(new URL("/block/" + blockId, origin), {
            method: 'DELETE'
        });
    }
}