import crypto from "node:crypto";

export type Node = {
    url: string
    hash: string
}

export function sortNodes(nodes: Node[]): Node[] {
    return [...nodes].sort((a, b) => a.hash.localeCompare(b.hash))
}

export function makeNodeFinder(nodes: Node[]) {
    const sortedNodes = sortNodes(nodes)
    return (targetHash: string) => findNodeByHash(sortedNodes, targetHash)
}

/**
 * Find node by hash in sorted nodes array
 * @param nodes must be sorted by hash
 * @param targetHash hash to find
 */
export function findNodeByHash(nodes: Node[], targetHash: string): Node {
    return nodes.find(node => node.hash >= targetHash) || nodes[0]
}

export function nodeHash(nodeUrl: string): string {
    return crypto.createHash('sha1').update(nodeUrl).digest('hex')
}