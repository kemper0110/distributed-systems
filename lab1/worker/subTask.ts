import {z} from "zod";

const subTaskSchema = z.object({
    aRow: z.array(z.number()).nonempty(),
    b: z.array(z.number()).nonempty(),
    X: z.array(z.number()).nonempty(),
    rowIndex: z.number()
        .int("Номер строки должен быть целым числом")
        .gt(0, "Номер строки должен быть больше 0")
})

export type SubTask = z.infer<typeof subTaskSchema>;