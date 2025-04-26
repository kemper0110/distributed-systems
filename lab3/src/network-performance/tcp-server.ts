import { createServer } from "net";

const CHUNK_SIZE = 4 * 1024 * 1024; // 1 MB
const TOTAL_MB = 1024; // 4 GB total
const chunk = Buffer.alloc(CHUNK_SIZE, 'a');

const server = createServer({
    // highWaterMark: 4 * 1024 * 1024,
    // noDelay: true,
}, (socket) => {
    console.log('Client connected');
    let sent = 0;

    function write() {
        while (sent < TOTAL_MB) {
            const ok = socket.write(chunk);
            sent++;
            if (!ok) {
                socket.once('drain', write);
                return;
            }
        }
        socket.end();
        console.log('Finished sending data');
    }

    write();
});

server.listen(4444, () => {
    console.log('TCP server listening on port 4444');
});
