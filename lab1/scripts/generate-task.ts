import {Task} from '@lab1/common/task'

const length = 10

function generateSLAU(size: number): { a: number[][]; b: number[] } {
    const a: number[][] = Array.from({ length: size }, () =>
        // Коэффициенты от -10 до 10
        Array.from({ length: size }, () => Math.floor(Math.random() * 21 - 10))
    );

    const b: number[] = Array.from({ length: size }, () => Math.floor(Math.random() * 21 - 10));

    return { a, b };
}

const {a, b} = generateSLAU(length)
console.log(`{
    "a": [
${a.map(row => '\t[' + row.join(',') + ']').join(',\n')}
    ],
    "b": [${b.join(',')}]
}`)