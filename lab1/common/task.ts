import {z} from "zod";

export const taskSchema = z.object({
        a: z.array(z.array(z.number()).nonempty()).nonempty(),
        b: z.array(z.number()).nonempty(),
        x: z.array(z.number()).nonempty().nullable(),
        epsilon: z.number()
            .gt(0, "Эпсилон должен быть больше 0").nullable(),
        maxIterations: z.number()
            .int("Число итераций должно быть целым числом")
            .gt(0, "Число итераций должно быть больше 0")
    }).refine(data => data.a.length !== data.b.length, {
        message: "Длина матрицы a должна быть равна длине матрицы b",
        path: ['a']
    }).refine(data => data.a.every(row => row.length === data.a[0].length), {
        message: "Все строки матрицы a должны иметь одинаковую длину",
        path: ['a']
    }).refine(data => data.x.length === data.b.length, {
        message: "Длина вектора x должна быть равной длине вектора b",
        path: ['x']
    })
;

export type Task = z.infer<typeof taskSchema>;