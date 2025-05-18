import {AppConfig, AppState} from "../../app.js";
import {IncomingMessage, ServerResponse} from "node:http";
import {CorsHeaders} from "../cors-headers.js";


export async function getPredecessor(request: IncomingMessage, response: ServerResponse, config: AppConfig, state: AppState) {
    if(state.predecessor === null) {
        return response.writeHead(204, {...CorsHeaders, 'content-type': 'text/plain'}).end('')
    } else {
        return response.writeHead(200, {...CorsHeaders, 'content-type': 'text/plain'}).end(state.predecessor.url)
    }
}