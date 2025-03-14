import {setTimeout} from "node:timers/promises";

async function main() {
    const response = await fetch('http://localhost:5001')
    console.log('response', response)
    for await (const chunk of response.body!.values()) {
        console.log('wait 1000')
        await setTimeout(1000)
        console.log('chunk', chunk.length, chunk)
    }
}

main().catch(e => {
    console.error(e)
})