export function calculatePrecision(X: number[], XPrev: number[]): number {
    const N = X.length;
    let sum = 0;
    for (let i = 0; i < N; i++)
        sum += Math.pow(X[i] - XPrev[i], 2);
    return Math.sqrt(sum);
}