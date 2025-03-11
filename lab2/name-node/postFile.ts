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

function streamToDataNode(blockIdx: number, filePath: string, origin: string) {
    return async function (source: AsyncIterable<Buffer | Uint8Array>) {
        // @ts-ignore
        const {promise: downstreamResponsePromise, resolve, reject} = Promise.withResolvers()
        const blockId = toBlockId(blockIdx, filePath)
        const url = new URL("/block/" + blockId, origin)
        const downstreamRequest = http.request(url, {
            method: "POST",
            headers: {
                "content-type": "application/octet-stream",
                "transfer-encoding": "chunked",
            },
        }, downstreamResponse => resolve(downstreamResponse))
            .on("error", e => reject(e))

        let count = 0;
        await pipeline(
            source,
            async function* counter(source) {
                for await (const chunk of source) {
                    count += chunk.length
                    console.log(`[${blockIdx}]`, `${chunk.length}/${count}`)
                    yield chunk
                }
            },
            downstreamRequest
        )
        console.log(`[${blockIdx}]`, 'sent', count, 'to', url.toString())

        const downstreamResponse: IncomingMessage = await downstreamResponsePromise
        if (downstreamResponse.statusCode !== 200)
            throw new Error(`Downstream${blockIdx} response status code is not 200`)
    }
}

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
        console.info('selected nodes', vacantNodeNames)
        const vacantNodes = vacantNodeNames.map(({name}) =>
            dataNodesSnapshot.find(n => n.name === name)
        )

        const blocks = [] as Array<{ dataNode: string, blockIdx: number }>

        const blockSizeBytes = blockSize * 1024 * 1024

        let fileSize = 0
        await pipeline(
            request,
            async function* fileSizeCounter(source) {
                for await (let chunk of source) {
                    fileSize += chunk.length
                    yield chunk
                }
            },
            async function* bigChunkSplitter(source) {
                for await (let chunk of source) {
                    while (chunk.length > blockSizeBytes) {
                        yield chunk.subarray(0, blockSizeBytes)
                        chunk = chunk.subarray(blockSizeBytes)
                    }
                    yield chunk
                }
            },
            async function sender(source) {
                let blockIdx = 0;
                let tail: Buffer | undefined

                while (true) {
                    console.log(`[${requestId}]`, 'sending block', blockIdx)
                    let readableDone = false
                    const selectedNode = vacantNodes[blockIdx % vacantNodes.length]!
                    blocks.push({dataNode: selectedNode.name, blockIdx})

                    async function* chunksToBlock() {
                        let bb = blockIdx
                        let remainingToBlock = blockSizeBytes
                        if (tail) {
                            remainingToBlock -= tail.length
                            yield tail
                            tail = undefined
                        }
                        while (true) {
                            if (remainingToBlock === 0) return;
                            if (remainingToBlock < 0) throw new TypeError('omg remaining < 0')
                            const {value, done} = await source.next()
                            if (done) {
                                console.log('source done')
                                break;
                            }
                            if (value.length > remainingToBlock) {
                                const part = value.subarray(0, remainingToBlock)
                                tail = value.subarray(remainingToBlock)
                                yield part
                                remainingToBlock -= part.length
                            } else {
                                yield value
                                remainingToBlock -= value.length
                            }
                        }

                        if(!tail) {
                            readableDone = true
                            return;
                        }

                        if (tail.length > remainingToBlock) {
                            const part = tail.subarray(0, remainingToBlock)
                            tail = tail.subarray(remainingToBlock)
                            yield part
                            // remainingToBlock -= part.length
                            // readableDone не выставляем, чтобы отправить tail на следующую ноду
                        } else {
                            yield tail
                            tail = undefined
                            readableDone = true
                        }
                    }

                    await pipeline(
                        chunksToBlock,
                        streamToDataNode(blockIdx, filePath, selectedNode.origin)
                    )

                    if (readableDone) {
                        break
                    }
                    console.log(`[${requestId}]`, 'sent block', blockIdx)
                    blockIdx++
                }
            }
        )

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
        console.error(e)
        // @ts-ignore
        return response.writeHead(500).end(e.message);
    }
}