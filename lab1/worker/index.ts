import {App} from 'uWebSockets.js';

const PORT = Number.parseInt(process.env.PORT) || 4000;

const app = App()
    .post('/solve', (res, req) => {
        res.end();
    })
    .listen(PORT, (token) => {
        if (token) {
            console.log(`Сервер запущен на http://localhost:${PORT}`);
        } else {
            console.log('Не удалось запустить сервер');
        }
    });