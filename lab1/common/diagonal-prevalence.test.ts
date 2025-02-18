import {test, expect} from "vitest";
import {getDiagonalNotPrevalenceRow} from "./diagonal-prevalence";

test('checkDiagonalPrevalence ok', () => {
    const a = [
        [4, -1, 1],
        [-2, 6, 1],
        [1, 1, 5]
    ];

    expect(getDiagonalNotPrevalenceRow(a)).toBe(-1);
});

test('checkDiagonalPrevalence bad', () => {

    const b = [
        [4, -1, 1],
        [-4, 6, 2],
        [1, 1, 5]
    ];

    expect(getDiagonalNotPrevalenceRow(b)).toBe(1);
})
