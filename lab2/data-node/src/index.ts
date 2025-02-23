import Fastify from 'fastify';
import {getBlock} from "./getBlock";
import {postBlock} from "./postBlock";
import {fastifyMultipart, FastifyMultipartBaseOptions} from '@fastify/multipart'

const PORT = Number.parseInt(process.env.PORT) || 3000

const multipartOptions = {
    limits: {
        fieldNameSize: 100, // Max field name size in bytes
        fieldSize: 100,     // Max field value size in bytes
        fields: 10,         // Max number of non-file fields
        fileSize: 128 * 1024 * 1024,  // For multipart forms, the max file size in bytes
        files: 1,           // Max number of file fields
        headerPairs: 200,  // Max number of header key=>value pairs
        parts: 10         // For multipart forms, the max number of parts (fields + files)
    }
} satisfies FastifyMultipartBaseOptions


async function main() {
    const fastify = Fastify({
        logger: true
    })
    fastify.register(fastifyMultipart, multipartOptions)
    getBlock(fastify)
    postBlock(fastify)
    fastify.listen({port: PORT, host: '0.0.0.0'}, () => {
        console.log(`Server running on http://localhost:${PORT}/`);
    });
}

main().catch(e => {
    console.error(e)
})


// const formatMemoryUsage = (data: number) => `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;
//
// setInterval(() => {
//     const memoryData = process.memoryUsage();
//     const memoryUsage = {
//         rss: `${formatMemoryUsage(memoryData.rss)} -> Resident Set Size`, //total memory allocated for the process execution
//         heapTotal: `${formatMemoryUsage(memoryData.heapTotal)} -> total allocated heap`,
//         heapUsed: `${formatMemoryUsage(memoryData.heapUsed)} -> actual used memory`,
//         external: `${formatMemoryUsage(memoryData.external)} -> V8 external memory`,
//     };
//     console.table(memoryUsage);
// }, 500)