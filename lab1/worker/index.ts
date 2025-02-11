import fastify from "fastify";

const app = fastify({logger: true})

const PORT = Number.parseInt(process.env.PORT) || 4000;

app
    .post('/solve', async (request, reply) => {

    })
    .listen({port: PORT}, (err, address) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Сервер запущен на ${address}`);
    });