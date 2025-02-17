export type JacobiSubTask = {
    aRow: number[]
    b: number[]
    x: number[]
    rowIndex: number
}

export function jacobiIteration(task: JacobiSubTask): number {
    const {aRow, b, x, rowIndex} = task;
    const diag = aRow[rowIndex];
    if (diag === 0) throw new Error("Диагональный элемент не может быть нулем");

    const N = x.length;
    let sum = 0;
    for (let j = 0; j < N; j++) {
        if (j !== rowIndex)
            sum += aRow[j] * x[j];
    }
    return (b[rowIndex] - sum) / diag;
}