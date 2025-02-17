type OrderEvent = "start" | "process" | "complete" | "reset";
type State = "idle" | "processing" | "completed"

function idleState(event: OrderEvent): State {
    return event === "start" ? "processing" : "idle";
}

function processingState(event: OrderEvent): State {
    return event === "complete" ? "completed" : "processing";
}

function completedState(event: OrderEvent): State {
    return event === "reset" ? "idle" : "completed";
}

function* orderStateMachine() {
    let state: State = "idle"
    const stateFunctions: Record<State, (event: OrderEvent) => State> = {
        processing: processingState,
        idle: idleState,
        completed: completedState
    }

    while (true) {
        const event: OrderEvent | undefined = yield state;
        if(event) state = stateFunctions[state](event)
    }
}


// Использование автомата
const orderFSM = orderStateMachine();
const initialState = orderFSM.next().value;
console.log(initialState)
const afterStartState = orderFSM.next("start").value
console.log(afterStartState)

console.log(orderFSM.next("complete").value); // completed
console.log(orderFSM.next("reset").value); // idle