import {db} from "./db";

// const availableNodeNames = ['node1', 'node2', 'node0']
// const nodeCount = 4
//
// const nodesStmt = db.prepare(`
//     WITH nodes(name) as (VALUES ${availableNodeNames.map(() => '(?)').join(', ')})
//     SELECT n.name, b.dataNode, COUNT(*) AS blockCount, f.blockSize, COUNT(*) * f.blockSize as totalBlockSize
//     FROM nodes n
//              LEFT JOIN blocks b on b.dataNode = n.name
//              LEFT JOIN file f on f.id = b.fileId
//     GROUP BY b.dataNode
//     ORDER BY totalBlockSize
//     limit ?;
// `)
// const vacantNodeNames = nodesStmt.all(...availableNodeNames, nodeCount) as { name: string }[]
// console.log(vacantNodeNames)


const insertFileStmt = db.prepare(`
            insert into file(path, mimeType, blockSize, fileSize) values (?, ?, ?, ?) returning file.id;
        `)
const res = insertFileStmt.get("aboba2.xts", "awdawd", 4, 128) as {id: number}
console.log(res)