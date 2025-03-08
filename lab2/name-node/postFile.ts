import {z} from "zod";
import {pipeline} from "node:stream/promises";
import {db} from "./db";
import {DataNodes} from "./data-nodes";
import http, {IncomingMessage, ServerResponse} from "node:http";
import {toBlockId} from "./common";

export const postFileQueryParams = z.object({
    blockSize: z.coerce.number().int().min(1).max(128),
    nodeCount: z.coerce.number().int().min(1).optional(),
    // replicationFactor: z.coerce.number().int().min(1).optional().default(1),
})

export async function postFile(requestId: number, request: IncomingMessage,
                               response: ServerResponse,
                               filePath: string,
                               query: Record<string, string>
    , datanodes: DataNodes) {
    const dataNodesSnapshot = datanodes.get()
    const mimeType = request.headers["content-type"] ?? 'application/octet-stream'
    const {blockSize, nodeCount = dataNodesSnapshot.length} = postFileQueryParams.parse(query)

    db.exec("begin transaction")
    try {
        {
            const existsStmt = db.prepare("select exists(select 1 from file where path == ?) as _exists")
            const {_exists} = existsStmt.get(filePath) as { _exists: number }
            if (_exists) {
                return response.writeHead(409).end("Файл с таким именем уже существует")
            }
        }

        const availableNodeNames = dataNodesSnapshot.map(n => n.name)
        const nodesStmt = db.prepare(`
            WITH nodes(name) as (VALUES ${availableNodeNames.map(() => '(?)').join(', ')})
            SELECT n.name, b.dataNode, COUNT(*) AS blockCount, f.blockSize, COUNT(*) * f.blockSize as totalBlockSize
            FROM nodes n
                     LEFT JOIN blocks b on b.dataNode = n.name
                     LEFT JOIN file f on f.id = b.fileId
            GROUP BY b.dataNode
            ORDER BY totalBlockSize
            limit ?;
        `)
        const vacantNodeNames = nodesStmt.all(...availableNodeNames, nodeCount) as { name: string }[]
        const vacantNodes = vacantNodeNames.map(({name}) =>
            dataNodesSnapshot.find(n => n.name === name)
        )

        const blocks = [] as Array<{ dataNode: string, blockIdx: number }>

        const blockSizeBytes = blockSize * 1024 * 1024

        let fileSize = 0
        await pipeline(request, async function (source: AsyncIterable<Buffer>) {
            // TODO: stream chunks not waiting full block
            let blockIdx = 0;
            let blockBuffer = Buffer.alloc(0)

            async function sendBlock(block: Buffer) {
                const selectedNode = vacantNodes[blockIdx % vacantNodes.length]!
                blocks.push({dataNode: selectedNode.name, blockIdx})
                // @ts-ignore
                const {promise: downstreamResponsePromise, resolve, reject} = Promise.withResolvers()
                const blockId = toBlockId(blockIdx, filePath)
                const downstreamRequest = http.request(new URL("/block/" + blockId, selectedNode.origin), {
                    method: "POST",
                    headers: {"content-type": "application/octet-stream"},
                }, downstreamResponse => resolve(downstreamResponse))
                    .on("error", (e) => reject(e))
                downstreamRequest.end(block)
                // await pipeline(request, downstreamRequest)
                // request.pause()
                const downstreamResponse = await downstreamResponsePromise
                // request.resume()
                if (downstreamResponse.statusCode !== 200)
                    throw new Error(`Downstream${blockIdx} response status code is not 200`)
                blockIdx++
            }

            for await (const chunk of source) {
                fileSize += chunk.length
                blockBuffer = Buffer.concat([blockBuffer, chunk])
                console.log('chunk', chunk.length, 'of buffer', blockBuffer.length, 'of file', fileSize)
                while (blockBuffer.length >= blockSizeBytes) {
                    const block = blockBuffer.subarray(0, blockSizeBytes)
                    blockBuffer = blockBuffer.subarray(blockSizeBytes)
                    await sendBlock(block)
                    console.log('sent', blockIdx)
                }
            }
            // отсылаем неполный блок
            if (blockBuffer.length > 0)
                await sendBlock(blockBuffer)
        })

        const insertFileStmt = db.prepare(`
            insert into file(path, mimeType, blockSize, fileSize)
            values (?, ?, ?, ?)
            returning file.id;
        `)
        const insertedFile = insertFileStmt.get(filePath, mimeType, blockSize, fileSize) as { id: number }
        const fileId = insertedFile.id

        const insertBlocksStmt = db.prepare(`
            insert into blocks(fileId, blockIdx, dataNode)
            values ${blocks.map(() => '(?, ?, ?)').join(', ')}
        `)
        const {changes} = insertBlocksStmt.run(...blocks.flatMap(({
                                                                      dataNode,
                                                                      blockIdx
                                                                  }) => [fileId, blockIdx, dataNode]))
        console.log(changes)
        db.exec("commit")
        return response.writeHead(200).end();
    } catch (e) {
        db.exec("revert")
        // @ts-ignore
        return response.writeHead(500).end(e.message);
    }
}