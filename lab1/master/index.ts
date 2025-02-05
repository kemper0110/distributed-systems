import {App} from 'uWebSockets.js';
import {taskSchema} from "./task";

const PORT = Number.parseInt(process.env.PORT) || 3000;

const app = App()
    .post('/solve', async (res, req) => {
        let aborted = false;
        res.onAborted(() => {
            console.log('Request aborted');
            aborted = true;
        })

        const blob = await new Promise<Buffer>((resolve) => {
            const chunks: Buffer[] = [];
            res.onData((data, isLast) => {
                chunks.push(Buffer.from(data));
                if (isLast) resolve(Buffer.concat(chunks));
            })
        })
        if (aborted) return;
        const data = JSON.parse(blob.toString());

        const task = taskSchema.safeParse(data);
        if(!task.success) {
            res.writeStatus("400 Bad Request").end(JSON.stringify(task.error.issues));
            return;
        }



        res.end();
    })
    .listen(PORT, (token) => {
        if (token) {
            console.log(`Сервер запущен на http://localhost:${PORT}`);
        } else {
            console.log('Не удалось запустить сервер');
        }
    });