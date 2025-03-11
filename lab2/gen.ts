import {pipeline} from "node:stream/promises";
import {setTimeout} from "timers/promises";

async function* subgenerator(source) {
    for await (const chunk of source) {
        console.log('subgenerated')
        yield chunk.subarray(0, chunk.length / 2)
    }
}

async function* generator(source) {
    yield* subgenerator(source)
}

pipeline(
    function* () {
        for(let i = 0; i < 20; i++) {
            yield Buffer.from(i.toString().padEnd(6, '0'))
        }
    },
    generator,
    async function reader(source) {
        for await (const chunk of source) {
            console.log('read', chunk.toString())
            await setTimeout(1000)
        }
    }
)
    .then(() => console.log('done'))
    .catch(e => console.error(e))