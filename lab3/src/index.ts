import {AppConfig, createApp} from "./app";
import {Node, computeNodeHash} from "./models/node";

const PORT = Number(process.env.PORT) || 3000

const nodes: Node[] = Object.keys(process.env)
    .filter(k => k.startsWith('DATANODE_'))
    .map(k => process.env[k]!)
    .map(url => ({url, hash: computeNodeHash(url)}))

const self = nodes.find(n => n.url === process.env.SELF)!

console.log(nodes, self)

const blockPath = process.env.BLOCKS_PATH || "./blocks"

const config: AppConfig = {
    port: PORT,
    nodes,
    selfNode: self,
    blockPath,
    hwm: {
        // server: 8 * 1024 * 1024, // прироста чтения не дает
        // localRead: 2 * 1024 * 1024, // сильно ускоряет чтение (~ в 3 раза)
        // localWrite: 2 * 1024 * 1024, // ускоряет запись на 13% (мало)
    }
}

process.on('uncaughtException', err => {
    if (err.code === 'ECANCELED' || err.code === 'ECONNRESET') {
        console.warn(`[uncaughtException] ${err.code}:`, err.message)
        return // не падаем
    }
    console.error('[uncaughtException]', err)
    process.exit(1) // только если это что-то действительно плохое
})

process.on('unhandledRejection', reason => {
    console.error('[unhandledRejection]', reason)
    // в твоём случае можно не падать, если это cancel/reset
})

createApp(config)
    .then(address => {
        console.log(`Server running at http://${address.address}:${address.port}`)
    })
    .catch(e => {
        console.error(e)
    })