import {createServer} from "./server";
import {Node, nodeHash} from "./models/node";
import * as fs from "fs";
import {resolveBlockPath} from "./models/file";

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