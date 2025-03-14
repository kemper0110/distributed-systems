import * as fs from "node:fs";


/*
    Попытка Mistral AI сгенерировать код для node:stream,
    который читает данные из одного файла и пишет эти же данные в два файла,
    не перегружая потребителей данными. Чтение с диска быстрее, чем запись.

    Используется традиционный подход node:stream с on('data') и on('drain').
 */


const inputStream = fs.createReadStream("chunks/chunk1.txt");
const outputStream1 = fs.createWriteStream("chunks/chunk2.txt");
const outputStream2 = fs.createWriteStream("chunks/chunk3.txt");

console.log(
    inputStream.readableHighWaterMark,
    outputStream1.writableHighWaterMark,
    outputStream2.writableHighWaterMark,
    )

let canWriteToStream1 = true;
let canWriteToStream2 = true;
let chunkId = 0;
inputStream.on('data', (chunk) => {
    console.log(chunkId, chunk.length)
    if (!outputStream1.write(chunk)) {
        console.log(chunkId, 'outputStream1 is full');
        canWriteToStream1 = false;
    }

    if (!outputStream2.write(chunk)) {
        console.log(chunkId, 'outputStream2 is full');
        canWriteToStream2 = false;
    }

    if (!canWriteToStream1 || !canWriteToStream2) {
        console.log(chunkId, 'Both streams are full, pausing the input stream');
        inputStream.pause();
    }
    chunkId++;
});

outputStream1.on('drain', () => {
    console.log(chunkId, 'Output stream 1 drained');
    canWriteToStream1 = true;
    // If both streams are ready, resume the input stream
    if (canWriteToStream2) {
        console.log(chunkId, 'Both streams are ready, resuming the input stream');
        inputStream.resume();
    }
});

outputStream2.on('drain', () => {
    console.log(chunkId, 'Output stream 2 drained');
    canWriteToStream2 = true;
    // If both streams are ready, resume the input stream
    if (canWriteToStream1) {
        console.log(chunkId, 'Both streams are ready, resuming the input stream');
        inputStream.resume();
    }
});

inputStream.on('end', () => {
    outputStream1.end();
    outputStream2.end();
    console.log("Data successfully written to both output streams.");
});

inputStream.on('error', (err) => {
    console.error("Error reading the input stream:", err);
});

outputStream1.on('error', (err) => {
    console.error("Error writing to outputStream1:", err);
});

outputStream2.on('error', (err) => {
    console.error("Error writing to outputStream2:", err);
});