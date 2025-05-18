import {IncomingMessage, ServerResponse} from "node:http";
import {AppConfig, AppState} from "../../app.js";
import {computeNodeHash, isMoreSuitablePredecessor} from "../../models/node.js";


export async function notify(request: IncomingMessage, response: ServerResponse, predecessor: string, config: AppConfig, state: AppState) {
    const hash = computeNodeHash(predecessor)
    if (state.predecessor?.url !== predecessor && (
        state.predecessor === null
        || isMoreSuitablePredecessor(hash, config.selfNode.hash, state.predecessor.hash)
        || state.predecessor.url === config.selfNode.url
    )) {
        console.info(config.selfNode.url, 'Выбран predecessor', predecessor)
        state.predecessor = {
            url: predecessor,
            hash: hash
        }
    }
    return response.writeHead(200).end()
}