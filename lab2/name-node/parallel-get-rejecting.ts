import assert from "node:assert";

const parallelCount = 100

async function main() {
    const abortControllers = Array.from({length: parallelCount}, (_, i) => new AbortController())
    const promises = abortControllers.map(ctrl => {
        return fetch('http://localhost:4000/file/avatar.mp4', {
            method: 'GET',
            headers: {
                'accept': 'application/octet-stream',
            },
            signal: ctrl.signal
        })
    })

    const responses = await Promise.all(promises)

    responses.forEach((response, idx) => {
        console.log(idx, response.status, response.headers.get('content-length'))
    })
    assert.equal(responses.every(r => r.status === 200), true)
    assert.equal(responses.every(r => r.headers.get('content-length') === '1122984927'), true)

    // берем первый чанк
    const chunks = await Promise.all(responses.map(r => r.body!.values().next()))

    assert.equal(chunks.every(c => !c.done), true)
    assert.equal(chunks.every(c => c.value!.length > 0), true)

    abortControllers.forEach(ctrl => ctrl.abort())
}

main().catch(e => {
    console.error(e)
})