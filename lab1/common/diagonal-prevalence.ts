/*
    Проверка диагонального преобладания матрицы.
    Сумма модулей элементов строки должна быть меньше диагонального элемента матрицы.
 */
export function getDiagonalNotPrevalenceRow(a: number[][]): number | -1 {
    for (let i = 0; i < a.length; i++) {

        let sum = 0;
        for (let j = 0; j < a[i].length; j++) {
            if(j == i)
                continue;
            sum += Math.abs(a[i][j]);
        }

        if (sum >= Math.abs(a[i][i])) {
            debugger;
            return i;
        }
    }

    return -1;
}