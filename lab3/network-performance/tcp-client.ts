import { Socket } from "net";

const client = new Socket({
    onread: {
        buffer: Buffer.alloc(4 * 1024 * 1024),
        callback: (len, buffer) => {
            // console.log('data', len)
            total += len
            return true
        }
    }
});
let total = 0;
let start: number

client.connect(4444, "127.0.0.1", () => {
    console.log("Connected to server");
    start = performance.now();
});

// client.on("data", (chunk) => {
//     total += chunk.length;
// });

client.on("end", () => {
    const duration = (performance.now() - start) / 1000
    console.log('download:', duration, 's')
    console.log("Done. Bytes received:", total);
    console.log(`Speed: ${(total / duration / 1e9).toFixed(2)} GB/s`)
});

client.on("error", (err) => {
    console.error("Error:", err);
});
