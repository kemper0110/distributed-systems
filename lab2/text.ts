import {createWriteStream} from "node:fs";
import {pipeline} from "node:stream/promises";

const size = 1024 * 1024 * 8
const count = size / 8
const padding = 8 - 1

const ws = createWriteStream('text.txt')
pipeline(
    function* () {
        for (let i = 0; i < count; ++i) {
            yield Buffer.from(i.toString(10).padStart(padding, ' ') + '\n')
        }
    }, ws
).then(() => {
    console.log('done')
}).catch(e => {
    console.error(e)
})