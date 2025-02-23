// fastify.get('/download', (request, reply) => {
//     const filePath = path.join(process.cwd(), 'costa-rica.mp4');
//     const stat = fs.statSync(filePath);
//
//     reply.raw.writeHead(200, {
//         'Content-Type': 'video/mp4',
//         'Content-Length': stat.size,
//     });
//
//     const stream = fs.createReadStream(filePath);
//     stream.pipe(reply.raw);
// });
//
// fastify.get('/', async (request, reply) => {
//     // Serve the index.html file from the project directory
//     reply.type("text/html")
//     reply.send(`<!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Video Streaming with Fastify</title>
// </head>
// <body>
//     <h1>Fastify Video Streaming</h1>
//     <video controls width="600">
//         <source src="/video-streaming" type="video/mp4">
//         Your browser does not support the video tag.
//     </video>
// </body>
// </html>`)
// })
//
// fastify.get('/video', (request, reply) => {
//     const filePath = path.join(process.cwd(), 'costa-rica.mp4');
//     const stat = fs.statSync(filePath);
//     const range = request.headers.range;
//
//     if (!range) {
//         reply.raw.writeHead(200, {
//             'Content-Type': 'video/mp4',
//             'Content-Length': stat.size,
//         })
//         fs.createReadStream(filePath).pipe(reply.raw);
//         return
//     }
//
//     // Парсим `Range`
//     const [start, end] = range.replace(/bytes=/, '').split('-').map(Number);
//     const chunkSize = (end || stat.size - 1) - start + 1;
//
//     reply.raw.writeHead(206, {
//         'Content-Range': `bytes ${start}-${end || stat.size - 1}/${stat.size}`,
//         'Accept-Ranges': 'bytes',
//         'Content-Length': chunkSize,
//         'Content-Type': 'video/mp4',
//     })
//
//     fs.createReadStream(filePath, { start, end }).pipe(reply.raw)
// });

// fastify.get('/video-streaming', async (request, reply) => {
//     const videoPath = path.join(process.cwd(), 'costa-rica.mp4')
//     const videoSize = fs.statSync(videoPath).size
//
//     const range = rangeParser.default(videoSize, request.headers.range)
//     if (typeof range === 'number') {
//         if (range === -2) {
//             throw new Error('Malformed header string')
//         } else if (range === -1) {
//             throw new Error('Unsatisfiable range')
//         }
//         return undefined
//     }
//     request.log.info({ range })
//     if (!range) {
//         const error = new Error('Range Not Satisfiable')
//         error.statusCode = 416
//         throw error
//     }
//
//     const singleRange = range[0]
//
//     const chunkSize = 1e6 // 1MB
//     const { start } = singleRange
//     const end = Math.min(start + chunkSize, videoSize - 1)
//     const contentLength = end - start + 1
//
//     // Set the appropriate headers for range requests
//     reply.headers({
//         'Accept-Ranges': 'bytes',
//         'Content-Range': `bytes ${start}-${end}/${videoSize}`,
//         'Content-Length': contentLength
//     })
//
//     // Send a 206 Partial Content status code
//     reply.code(206)
//     reply.type('video/mp4')
//
//     // Stream the requested chunk of the video file
//     return fs.createReadStream(videoPath, { start, end })
// })