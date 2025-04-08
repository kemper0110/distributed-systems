import {pipeline} from "node:stream/promises";
import fs from "fs";

const buffer = Buffer.alloc(1024 * 1024)


async function main() {
    console.time('write')
    await pipeline(
        async function* () {
            const s = performance.now()
            let c = 0
            for (let i = 0; i < 1024; ++i) {
                const s0 = performance.now()
                yield buffer
                const s1 = performance.now()
                c += s1 - s0
            }
            console.log('yielded', performance.now() - s)
            console.log('part yielded', c)
        },
        fs.createWriteStream("./f.txt", {
            highWaterMark: 8 * 1024 * 1024
        })
    )
    console.timeEnd('write')
}

main()
    .then(() => console.log('done'))
    .catch(console.error)