import {setTimeout} from "node:timers/promises";

/*
    Клиент тормозит скачивание данных с помощью `setTimeout`.

    В данном случае это искусственно,
    но браузер тоже умеет тормозить скачивание, например,
    когда видео скачивается быстрее, чем пользователь успевает просмотреть.
 */

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