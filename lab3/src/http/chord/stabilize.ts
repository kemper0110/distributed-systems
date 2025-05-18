import http, {IncomingMessage} from "node:http";
import {AppConfig, AppState} from "../../app.js";
import {agent} from "../agent.js";
import {computeNodeHash, isMoreSuitableSuccessor} from "../../models/node.js";


export async function stabilize(config: AppConfig, state: AppState, signal: AbortSignal) {
    const oldSuccessorUrl = state.successor.url

    const xUrl = oldSuccessorUrl === config.selfNode.url ?
        state.predecessor?.url :
        await getPredecessor(oldSuccessorUrl, signal)
    if (xUrl !== undefined && xUrl !== state.successor.url) {
        const xHash = computeNodeHash(xUrl)
        if (isMoreSuitableSuccessor(xHash, config.selfNode.hash, state.successor.hash)) {
            console.info(config.selfNode.url, 'Выбран successor', xUrl)
            state.successor = {
                url: xUrl,
                hash: xHash
            }
        }
    }

    await notifySuccessor(oldSuccessorUrl, config.selfNode.url, signal)
}

async function getPredecessor(successorUrl: string, signal: AbortSignal) {
    // @ts-ignore
    const {promise: downstreamResponsePromise, resolve, reject} = Promise.withResolvers()
    http.get(successorUrl + '/predecessor', {agent, signal}, downstreamResponse => resolve(downstreamResponse))
        .on("error", e => reject(e))
        .end()
    const downstreamResponse: IncomingMessage = await downstreamResponsePromise
    if (downstreamResponse.statusCode === 204) {
        return undefined
    } else {
        // @ts-ignore
        return await new Response(downstreamResponse).text()
    }
}

async function notifySuccessor(successorUrl: string, newSuccessorUrl: string, signal: AbortSignal) {
    // @ts-ignore
    const {promise: downstreamResponsePromise, resolve, reject} = Promise.withResolvers()
    http.request(successorUrl + '/notify/' + encodeURIComponent(newSuccessorUrl), {
        method: 'POST',
        agent,
        signal,
    }, downstreamResponse => resolve(downstreamResponse))
        .on("error", e => reject(e))
        .end()
    const downstreamResponse: IncomingMessage = await downstreamResponsePromise
    // @ts-ignore
    return await new Response(downstreamResponse).text()
}