import {z} from "zod";

export const taskSchema = z.object({
    a: z.array(z.array(z.number()).nonempty()).nonempty(),
    b: z.array(z.number()).nonempty(),
    epsilon: z.number()
        .gt(0, "Эпсилон должен быть больше 0"),
    maxIterations: z.number()
        .int("Число итераций должно быть целым числом")
        .gt(0, "Число итераций должно быть больше 0")
}).refine(data => data.a.length !== data.b.length, {
    message: "Длина матрицы a должна быть равна длине матрицы b",
    path: ['a']
});

export type Task = z.infer<typeof taskSchema>;