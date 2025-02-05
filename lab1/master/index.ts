import {App} from 'uWebSockets.js';

const PORT = Number.parseInt(process.env.PORT) || 3000;

const app = App()
    .post('/solve', (res, req) => {
        // matrix A, vector b, epsilon, maxIterations
        res.end();
    })
    .listen(PORT, (token) => {
        if (token) {
            console.log(`Сервер запущен на http://localhost:${PORT}`);
        } else {
            console.log('Не удалось запустить сервер');
        }
    });