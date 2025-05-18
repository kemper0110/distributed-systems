import http, {IncomingMessage, ServerResponse} from "node:http";
import {AppConfig, AppState} from "../../app.js";
import {agent} from "../agent.js";
import {CorsHeaders} from "../cors-headers.js";

export const HTTP_X_TOUR_DU_MONDE_BALANCE = 'x-tour-du-monde-balance'
const startingBalance = process.env.TOUR_DU_MONDE_BALANCE ? Number.parseInt(process.env.TOUR_DU_MONDE_BALANCE) : 100

export async function tourDuMonde(request: IncomingMessage, response: ServerResponse, initiator: string | undefined, config: AppConfig, state: AppState) {
    if (state.successor.url === initiator)
        return response
            .writeHead(200, {...CorsHeaders, 'content-type': 'application/json'})
            .end(JSON.stringify([config.selfNode.url]))

    const balanceHeaderValue =
        initiator === undefined ? startingBalance :
        Number.parseInt(request.headers[HTTP_X_TOUR_DU_MONDE_BALANCE] as string | undefined ?? '0')

    if (balanceHeaderValue < 1)
        return response
            .writeHead(402, {...CorsHeaders, 'content-type': 'application/json'})
            .end(JSON.stringify([config.selfNode.url]))

    const nodes = await downstreamTourDuMonde(
        initiator ?? config.selfNode.url,
        state.successor.url,
        (balanceHeaderValue - 1).toString()
    )

    return response
        .writeHead(200, {
            ...CorsHeaders,
            'content-type': 'application/json'
        })
        .end(JSON.stringify([
            config.selfNode.url,
            ...nodes
        ]))
}

async function downstreamTourDuMonde(initiator: string, successor: string, balance: string): Promise<string[]> {
    // @ts-ignore
    const {promise: downstreamResponsePromise, resolve, reject} = Promise.withResolvers()
    http.get(successor + `/tour-du-monde/${initiator}`, {
        agent,
        headers: {
            [HTTP_X_TOUR_DU_MONDE_BALANCE]: balance
        }
    }, downstreamResponse => resolve(downstreamResponse))
        .on("error", e => reject(e))
        .end()
    const downstreamResponse: IncomingMessage = await downstreamResponsePromise
    // @ts-ignore
    const text = await new Response(downstreamResponse).text()
    return JSON.parse(text)
}