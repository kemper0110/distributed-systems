import crypto from "node:crypto";

/* [V8:inline-me-pls]

    string VS uint32array VS regular js array
    full sha1 VS 128 bit truncated sha1
    for cycle VS unrolled
    sha1 VS md5


    переписать на плюсы и сравнить производительность
    1. с хешем в виде статического массива
    2. с индексом в виде статического массива статическим массивов
 */

export type Node = {
    url: string
    hash: string
}

export function computeNodeHash(nodeUrl: string): string {
    return crypto.createHash('sha1').update(nodeUrl).digest('hex')
}

export function sortNodes(nodes: Node[]): Node[] {
    return [...nodes].sort((a, b) => a.hash.localeCompare(b.hash))
}

/**
 * Find node by hash in sorted nodes array
 * @param nodes must be sorted by hash
 * @param targetHash hash to find
 */
export function findNodeByHash(nodes: Node[], targetHash: string): Node {
    return nodes.find(node => node.hash >= targetHash) || nodes[0]
}

export function makeNodeFinder(nodes: Node[]) {
    const sortedNodes = sortNodes(nodes)
    return (targetHash: string) => findNodeByHash(sortedNodes, targetHash)
}
