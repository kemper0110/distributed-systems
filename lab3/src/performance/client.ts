import * as http from "node:http";
import {pipeline} from "node:stream/promises";

console.log('hello')

let len = 0
http.get('http://localhost:4444', async (res) => {
    const start = performance.now()
    await pipeline(res, async function (source) {
        for await (const chunk of source) {
            len += chunk.length
        }
    })
    const duration = (performance.now() - start) / 1000
    console.log('download:', duration, 's')
    console.log("Done. Bytes received:", len);
    console.log(`Speed: ${(len / duration / 1e9).toFixed(2)} GB/s`)
})
    .on('error', console.error)
    .end()