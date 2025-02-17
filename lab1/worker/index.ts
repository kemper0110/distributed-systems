import fastify from "fastify";
import {subTaskSchema} from "../common/subTask";
import {jacobiIteration} from "./jacobi";

const app = fastify({logger: true})

const PORT = Number.parseInt(process.env.PORT) || 4000;

app
    .post('/solve', async (request, reply) => {
        const parseResult = subTaskSchema.safeParse(request.body)
        if(!parseResult.success)
            return reply.status(400).send(parseResult.error.message);
        const input = parseResult.data;

        const results: number[] = []
        for(let i = 0; i < input.rowCount; ++i) {
            const res = jacobiIteration({
                aRow: input.aSlice[i],
                x: input.x,
                b: input.b,
                rowIndex: input.startRow + i,
            })
            results.push(res)
        }
        reply.send(results)
    })
    .get('/', (req, rep) => {
        rep.send("Hello world")
    })
    .listen({port: PORT, host: '0.0.0.0'}, (err, address) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Сервер запущен на ${address}`);
    });