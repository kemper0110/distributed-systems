import {test, expect} from "vitest";
import {jacobiIteration} from "./jacobi";


test("simple calc", () => {
    const a = [
        [4, -1, 1],
        [-2, 6, 1],
        [1, 1, 5]
    ]
    const b = [7, 9, -6]
    const x = [0, 0, 0]

    const results = Array.from({length: 3})
        .map((_, i) => jacobiIteration({
            aRow: a[i],
            rowIndex: i,
            b, x
        }))
    console.log(JSON.stringify(results))
    expect(results).toStrictEqual([1.75, 1.5, -1.2])
})

test("normal calc", () => {
    const a = [
        [125, -3, -1, -9, -9],
        [10, -628, -4, 10, 8],
        [13, 4, -323, -1, 7],
        [5, -8, -8, 555, 4],
        [-4, -8, 4, 6, -333]
    ]
    const b = [2, 5, 0, 8, -10]
    let x = [0, 0, 0, 0, 0]

    for (let i = 0; i < 10; ++i) {
        const xNew = x.map((_, i) =>
            jacobiIteration({ aRow: a[i], rowIndex: i, b, x })
        );
        console.log(JSON.stringify(xNew))
        x = xNew
    }
    // [0.9, 3.7, -4, 5,-5]
})