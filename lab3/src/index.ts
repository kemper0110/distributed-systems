import {AppConfig, BootstrapConfig, createApp} from "./app.js";
import {computeNodeHash, Node} from "./models/node.js";


let PORT = 3000
if (process.env.PORT) {
    PORT = Number(process.env.PORT)
} else {
    console.info('PORT env variable is not set, using default value', PORT)
}

if (!process.env.SELF)
    throw new Error('SELF env variable is not set')
const selfNode: Node = {
    url: process.env.SELF!,
    hash: computeNodeHash(process.env.SELF!)
}

let bootstrapConfig: BootstrapConfig
if(process.env.IS_PIONEER === 'true') {
    console.info('IS_PIONEER env variable is set, considering self node as first node in system!')
    bootstrapConfig = {
        isPioneer: true
    }
} else {
    if (!process.env.MENTOR)
        throw new Error('MENTOR env variable is not set, it\'s required for non-pioneer nodes')
    bootstrapConfig = {
        isPioneer: false,
        mentorNode: {
            url: process.env.MENTOR!,
            hash: computeNodeHash(process.env.MENTOR!)
        }
    }
}

let blockPath = "./blocks"
if (process.env.BLOCKS_PATH) {
    blockPath = process.env.BLOCKS_PATH
} else {
    console.info('BLOCKS_PATH env variable is not set, using default value', blockPath)
}

let stabilizeInterval = 1000
if (process.env.STABILIZE_INTERVAL) {
    stabilizeInterval = Number.parseInt(process.env.STABILIZE_INTERVAL)
} else {
    console.info('STABILIZE_INTERVAL env variable is not set, using default value', stabilizeInterval)
}

const config: AppConfig = {
    port: PORT,
    selfNode,
    ...bootstrapConfig,
    blockPath,
    stabilizeInterval,
    hwm: {
        // server: 8 * 1024 * 1024, // прироста чтения не дает
        // localRead: 2 * 1024 * 1024, // сильно ускоряет чтение (~ в 3 раза)
        // localWrite: 2 * 1024 * 1024, // ускоряет запись на 13% (мало)
    }
}

process.on('uncaughtException', err => {
    // @ts-ignore
    if (err.code === 'ECANCELED' || err.code === 'ECONNRESET') {
        // @ts-ignore
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