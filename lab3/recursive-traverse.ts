

type Context = {
    self: string
    successor: string
}

const contexts: Record<string, Context> = {
    '1': {
        self: '1',
        successor: '2',
    },
    '2': {
        self: '2',
        successor: '3',
    },
    '3': {
        self: '3',
        successor: '4',
    },
    '4': {
        self: '4',
        successor: '5',
    },
    '5': {
        self: '5',
        successor: '1'
    }
}

function recursiveTraverse(context: Context, initiator: string | undefined): string[] {
    if(context.successor === initiator)
        return [context.self]
    return [
        context.self,
        ...recursiveTraverse(contexts[context.successor], initiator ?? context.self)
    ]
}


const list = recursiveTraverse(contexts['1'], undefined)

console.log(list)
