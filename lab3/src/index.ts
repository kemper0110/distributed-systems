import {createServer} from "./server";
import {Node, nodeHash} from "./models/node";
import * as fs from "fs";

process.env.SERVER_HWM = String(8 * 1024 * 1024) // прироста чтения не дает
process.env.LOCAL_READ_HWM = String(8 * 1024 * 1024) // сильно ускоряет чтение (~ в 3 раза)
process.env.LOCAL_WRITE_HWM = String(8 * 1024 * 1024) // ускоряет запись на 13% (мало)

const nodes: Node[] = [
    {
        url: "http://localhost:3001",
        hash: nodeHash("http://localhost:3001")
    },
]
const self = nodes[0]

const blockPath = "./blocks"

fs.mkdirSync(blockPath, {recursive: true})

createServer(3000, nodes, self, blockPath)
    .then(address => {
        console.log(`Server running at http://${address.address}:${address.port}`)
    })
    .catch(console.error)