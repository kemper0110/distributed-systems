import {createWriteStream} from "node:fs";
import {pipeline} from "node:stream/promises";
import {setTimeout} from "timers/promises";

/*
    Do you really know, как правильно писать в файл,
    не собирая все данные в памяти?
 */

const size = 1024 * 1024 * 8
const count = size / 8
const padding = 8 - 1

function generateLine(i: number) {
    return i.toString(10).padStart(padding, ' ') + '\n'
}

const fileStream = createWriteStream('text.txt')
pipeline(
    async function* () {
        for (let i = 0; i < count; ++i) {
            yield Buffer.from(generateLine(i))
            if(i % 1024 === 0) {
                await setTimeout(100)
            }
        }
    },
    fileStream
).then(() => {
    console.log('done')
}).catch(e => {
    console.error(e)
})