
let callCounter = 0
async function call(callId: number) {
    console.log(`${callId}: Call enter ${callCounter}`)
    callCounter += 1
    await new Promise(resolve => setTimeout(resolve, 200))
    await new Promise(resolve => setTimeout(resolve, 200))
    await new Promise(resolve => setTimeout(resolve, 200))
    callCounter -= 1
    console.log(`${callId}: Call exit ${callCounter}`)
}

function makeCriticalSection() {
    let criticalPromise = Promise.resolve()
    return async (criticalFn: () => Promise<void>) => {
        return criticalPromise = criticalPromise.then(() => criticalFn())
    }
}

const go = makeCriticalSection()

Promise.all([
    go(() => call(1)),
    go(() => call(2)),
    go(() => call(3)),
    go(() => call(4)),
]).then(() => {
    console.log('done')
}).catch(e => {
    console.log(e)
})