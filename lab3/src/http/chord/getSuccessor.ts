import {AppConfig, AppState} from "../../app.js";
import http, {IncomingMessage, ServerResponse} from "node:http";
import {getLocalSuccessor, isResponsible} from "../../models/node.js";
import {agent} from "../agent.js";
import {CorsHeaders} from "../cors-headers.js";

export async function getMySuccessor(request: IncomingMessage, response: ServerResponse, config: AppConfig, state: AppState) {
    return response.writeHead(200, {...CorsHeaders, 'content-type': 'text/plain'}).end(state.successor.url)
}

// export const HTTP_X_GET_SUCCESSOR_BALANCE = 'x-get-successor-balance'
// const startingBalance = process.env.GET_SUCCESSOR_BALANCE ? Number.parseInt(process.env.GET_SUCCESSOR_BALANCE) : 100

export async function getSuccessorEndpoint(request: IncomingMessage, response: ServerResponse, hash: bigint, config: AppConfig, state: AppState) {
    const successorUrl = await getSuccessor(hash, config, state)
    if (successorUrl === undefined)
        return response.writeHead(404, {...CorsHeaders}).end()
    return response.writeHead(200, {...CorsHeaders, 'content-type': 'text/plain'}).end(successorUrl)
}

export async function getSuccessor(hash: bigint, config: AppConfig, state: AppState) {
    const localSuccessor = getLocalSuccessor(state.predecessor, config.selfNode, state.successor, hash)
    if (localSuccessor)
        return localSuccessor.url
    return await downstreamSuccessor(hash, state.successor.url)
}

export async function downstreamSuccessor(hash: bigint, successorUrl: string) {
    // @ts-ignore
    const {promise: downstreamResponsePromise, resolve, reject} = Promise.withResolvers()
    http.get(successorUrl + "/successor/" + hash, {
        agent
    }, downstreamResponse => resolve(downstreamResponse))
        .on("error", e => reject(e))
        .end()
    const downstreamResponse: IncomingMessage = await downstreamResponsePromise

    if (downstreamResponse.statusCode === 404)
        return undefined

    // @ts-ignore
    return await new Response(downstreamResponse).text()
}