import {expect, test} from "vitest";
import {makeNodeFinder, Node, computeNodeHash, sortNodes} from "../models/node";


test('computeNodeHash', () => {
    expect(computeNodeHash('http://data-node-1:3000'))
        .toBe('2a98bfa3a92ba2596a77fba70ad5d159dc6160e5')
    expect(computeNodeHash('http://data-node-2:3000'))
        .toBe('183e43def597b080852a4a2689eacdbc43fd1c36')
    expect(computeNodeHash('http://data-node-3:3000'))
        .toBe('17b61ecd682717e919f1fa10def86020646a17cf')
})

const nodes: Node[] = [
    {
        url: "node-1",
        hash: "3"
    },
    {
        url: "node-2",
        hash: "5"
    },
    {
        url: "node-3",
        hash: "9"
    }
]

test('sortNodes', () => {
    const shuffledNodes = [...nodes].sort(() => Math.random() - 0.5)
    const sortedNodes = sortNodes(shuffledNodes)
    expect(sortedNodes).toEqual(nodes)
})

test('find node by hash', () => {
    const nodeFinder = makeNodeFinder(nodes)

    expect(nodeFinder('0')).toEqual(nodes[0])
    expect(nodeFinder('1')).toEqual(nodes[0])
    expect(nodeFinder('2')).toEqual(nodes[0])
    expect(nodeFinder('3')).toEqual(nodes[0])

    expect(nodeFinder('4')).toEqual(nodes[1])
    expect(nodeFinder('5')).toEqual(nodes[1])

    expect(nodeFinder('6')).toEqual(nodes[2])
    expect(nodeFinder('7')).toEqual(nodes[2])
    expect(nodeFinder('8')).toEqual(nodes[2])
    expect(nodeFinder('9')).toEqual(nodes[2])

    // пошли по кругу
    expect(nodeFinder('10')).toEqual(nodes[0])
    expect(nodeFinder('20')).toEqual(nodes[0])
    expect(nodeFinder('29')).toEqual(nodes[0])

    expect(nodeFinder('30')).toEqual(nodes[1])
})
