import {z} from "zod";

export const subTaskSchema = z.object({
    aSlice: z.array(z.array(z.number()).nonempty()).nonempty(),
    b: z.array(z.number()).nonempty(),
    x: z.array(z.number()),
    startRow: z.number()
        .int("Номер строки должен быть целым числом")
        .min(0, "Номер строки должен быть не меньше 0"),
    rowCount: z.number()
        .int("Число строк должно быть целым числом")
        .min(0, "Число строк должно быть не меньше 0"),
})

export type SubTask = z.infer<typeof subTaskSchema>;