export type JacobiTask = {
    A: number[][],
    b: number[],
}

export function jacobiIteration(
    task: JacobiTask,
    X: number[],
    rowIndex: number
): number {
    const {A, b} = task;
    const N = A.length;
    let sum = 0;
    for (let j = 0; j < N; j++)
        if (j !== rowIndex)
            sum += A[rowIndex][j] * X[j];
    return (b[rowIndex] - sum) / A[rowIndex][rowIndex];
}