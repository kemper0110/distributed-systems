import {Agent} from "node:http";

export const agent = new Agent({
    keepAlive: true,
})