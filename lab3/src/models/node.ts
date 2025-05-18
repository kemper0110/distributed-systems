import crypto from "node:crypto";

export type Node = {
    url: string
    hash: bigint
}

export function computeNodeHash(nodeUrl: string): bigint {
    const hex = crypto.createHash('sha1').update(nodeUrl).digest('hex')
    return BigInt('0x' + hex)
}

export function isResponsible(predecessorHash: bigint, nodeHash: bigint, targetHash: bigint) {
    return inOpenClosedRingRange(predecessorHash, targetHash, nodeHash)
}

export function isMoreSuitableSuccessor(newSuccessorHash: bigint, nodeHash: bigint, successorHash: bigint) {
    return inOpenRingRange(nodeHash, newSuccessorHash, successorHash)
}

export function isMoreSuitablePredecessor(newPredecessorHash: bigint, nodeHash: bigint, predecessorHash: bigint) {
    return inOpenRingRange(predecessorHash, newPredecessorHash, nodeHash)
}

export function inOpenRingRange(start: bigint, target: bigint, end: bigint) {
    if(start < end) {
        return start < target && target < end
    } else {
        // Кольцевой случай
        return target > start || target < end
    }
}

export function inOpenClosedRingRange(start: bigint, target: bigint, end: bigint): boolean {
    if (start < end) {
        // Простой случай
        return start < target && target <= end
    } else if (start > end) {
        // Кольцевой случай
        return target > start || target <= end
    } else {
        // Единственный узел в системе — отвечает за всё
        return true
    }
}

/**
 * Позволяет определить, что
 * `successor(hash) = self` или
 * `successor(hash) = self.successor`
 * иначе undefined
 */
export function getLocalSuccessor(predecessor: Node | null, self: Node, successor: Node, hash: bigint) {
    if (predecessor) {
        if(isResponsible(predecessor.hash, self.hash, hash))
            return self
    } else {
        if (self.hash === hash)
            return self
        // если predecessor === null && self.hash < hash
        // то нельзя точно определить владение текущим узлом
    }
    if (isResponsible(self.hash, successor.hash, hash)) {
        return successor
    }
    return undefined
}