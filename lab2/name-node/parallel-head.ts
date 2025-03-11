import assert from "node:assert";

const parallelCount = 100

async function main() {
    const promises = Array.from({length: parallelCount}, (_, i) => i).map(i => {
        return fetch('http://localhost:4000/file/avatar.mp4', {
            method: 'HEAD',
            headers: {
                'accept': 'application/octet-stream',
            },
        })
    })

    const responses = await Promise.all(promises)

    responses.forEach((response, idx) => {
        console.log(idx, response.status, response.headers.get('content-length'))
    })
    assert.equal(responses.every(r => r.status === 200), true)
    assert.equal(responses.every(r => r.headers.get('content-length') === '1122984927'), true)
}

main().catch(e => {
    console.error(e)
})