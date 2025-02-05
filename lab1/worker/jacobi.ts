export type JacobiSubTask = {
    aRow: number[]
    b: number[]
    X: number[]
    rowIndex: number
}

export function jacobiIteration(task: JacobiSubTask): number {
    const {aRow, b, X, rowIndex} = task;
    const N = aRow.length;
    let sum = 0;
    for (let j = 0; j < N; j++)
        if (j !== rowIndex)
            sum += aRow[j] * X[j];
    return (b[rowIndex] - sum) / aRow[rowIndex];
}