import {App} from 'uWebSockets.js';
import {TaskCache} from "./TaskCache";

const PORT = Number.parseInt(process.env.PORT) || 4000;

const taskCache = new TaskCache(20);

const app = App()
    .post('/upload-task', (res, req) => {
        // TODO: загружаем таску в кэш
        res.end();
    })
    .post('/solve', (res, req) => {
        // TODO: проверяем по ID таски наличие в кэше
        res.end();
    })
    .listen(PORT, (token) => {
        if (token) {
            console.log(`Сервер запущен на http://localhost:${PORT}`);
        } else {
            console.log('Не удалось запустить сервер');
        }
    });