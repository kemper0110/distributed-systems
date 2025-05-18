import {expect, test} from "vitest";
import {Node, computeNodeHash} from "../src/models/node.js";


test('computeNodeHash', () => {
    expect(computeNodeHash('http://data-node-1:3000'))
        .toBe(243184019782282781942565018797699597828909785317n)
    expect(computeNodeHash('http://data-node-2:3000'))
        .toBe(138404337094372407280685703980352609907935878198n)
    expect(computeNodeHash('http://data-node-3:3000'))
        .toBe(135368206619986750171632734766170259844927985615n)
})

const nodes: Node[] = [
    {
        url: "node-1",
        hash: 3n
    },
    {
        url: "node-2",
        hash: 5n
    },
    {
        url: "node-3",
        hash: 9n
    }
]

// test('sortNodes', () => {
//     const shuffledNodes = [...nodes].sort(() => Math.random() - 0.5)
//     const sortedNodes = sortNodes(shuffledNodes)
//     expect(sortedNodes).toEqual(nodes)
// })

// test('find node by hash', () => {
//     const nodeFinder = makeNodeFinder(nodes)
//
//     expect(nodeFinder('0')).toEqual(nodes[0])
//     expect(nodeFinder('1')).toEqual(nodes[0])
//     expect(nodeFinder('2')).toEqual(nodes[0])
//     expect(nodeFinder('3')).toEqual(nodes[0])
//
//     expect(nodeFinder('4')).toEqual(nodes[1])
//     expect(nodeFinder('5')).toEqual(nodes[1])
//
//     expect(nodeFinder('6')).toEqual(nodes[2])
//     expect(nodeFinder('7')).toEqual(nodes[2])
//     expect(nodeFinder('8')).toEqual(nodes[2])
//     expect(nodeFinder('9')).toEqual(nodes[2])
//
//     // пошли по кругу
//     expect(nodeFinder('10')).toEqual(nodes[0])
//     expect(nodeFinder('20')).toEqual(nodes[0])
//     expect(nodeFinder('29')).toEqual(nodes[0])
//
//     expect(nodeFinder('30')).toEqual(nodes[1])
// })
