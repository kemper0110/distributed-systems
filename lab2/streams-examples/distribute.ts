import * as fs from 'node:fs';
import {Writable} from "node:stream";
import {pipeline} from "node:stream/promises";

/*
    Жалкая попытка Mistral AI сгенерировать код для задачи из `twinker.ts`.
    Проблема в вызове `writables[writableIndex].write(chunkToWrite)`,
    который не отслеживает возвращаемый boolean.
    Этот код приведет к большому потреблению памяти.

    НЕ ИСПОЛЬЗУЙТЕ ЭТОТ КОД
 */

const readStream = fs.createReadStream('../costa-rica.mp4');

const CHUNK_SIZE = 1024 * 1024; // 1MB

const writables = [
    fs.createWriteStream("../chunks/c1"),
    fs.createWriteStream("../chunks/c2"),
    fs.createWriteStream("../chunks/c3"),
    fs.createWriteStream("../chunks/c4"),
]

let buffer = Buffer.alloc(0);
let writableIndex = 0;
pipeline(readStream, new Writable({
    write(chunk, encoding, callback) {
        buffer = Buffer.concat([buffer, chunk]);

        while (buffer.length >= CHUNK_SIZE) {
            const chunkToWrite = buffer.subarray(0, CHUNK_SIZE);
            buffer = buffer.subarray(CHUNK_SIZE); // Оставляем остаток

            console.log('write to', writableIndex)
            writables[writableIndex].write(chunkToWrite);

            writableIndex = (writableIndex + 1) % writables.length;
        }
        console.log('callback call', buffer.length)

        callback();
    },

    final(callback) {
        console.log('final')
        // Если остались данные < 1MB, отправляем в последний writable
        if (buffer.length > 0) {
            writables[writableIndex].write(buffer);
        }

        // Закрываем потоки
        writables.forEach(w => w.end());

        callback();
    }
})).then(() => {
    console.log('done')
})