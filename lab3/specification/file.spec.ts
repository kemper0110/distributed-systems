import {expect, test} from "vitest";
import {decodeFileKey, computeBlockHash, encodeFileKey, File} from "../src/models/file.js";

const file1: File = {
    name: 'test.txt',
    size: 100,
    mimeType: 'text/plain',
    blockSize: 1
}
const file2: File = {
    name: 'test2.txt',
    size: 100,
    mimeType: 'text/plain',
    blockSize: 1
}
const file3: File = {
    name: 'test.txt',
    size: 128,
    mimeType: 'text/plain',
    blockSize: 1
}
const file4: File = {
    name: 'test.txt',
    size: 100,
    mimeType: 'application/octet-stream',
    blockSize: 1
}
const file5: File = {
    name: 'test.txt',
    size: 100,
    mimeType: 'text/plain',
    blockSize: 10
}
const fileVideo: File = {
    name: 'big-video.mp4',
    size: 123124514,
    mimeType: 'video/mp4',
    blockSize: 1
}

test('fileHash', {
    // skip: true
}, () => {
    expect(computeBlockHash({idx: 1, file: file1})).toBe(565011394434449518361421450909910536467424901225n)
    expect(computeBlockHash({idx: 2, file: file1})).toBe(668982686987994413874242129466550256224434522088n)
    expect(computeBlockHash({idx: 1, file: file2})).toBe(1216251266892575473453820283904551295426140447699n)
    expect(computeBlockHash({idx: 1, file: file3})).toBe(550623649483123865956705418423738653225435244304n)
    expect(computeBlockHash({idx: 1, file: file4})).toBe(1037932237167311478430938634213830213374586434482n)
    expect(computeBlockHash({idx: 1, file: file5})).toBe(962848960720671841203915814330581339533279809263n)
    expect(computeBlockHash({idx: 1, file: fileVideo})).toBe(1397658527895578444721629905631863269314719907353n)
})

test('fileKey', () => {
    const keys = new Set<string>()

    keys.add(encodeFileKey(file1))
    keys.add(encodeFileKey(file2))
    keys.add(encodeFileKey(file3))
    keys.add(encodeFileKey(file4))
    keys.add(encodeFileKey(file5))
    keys.add(encodeFileKey(fileVideo))

    expect(keys.size, "Keys are not unique!").toBe(6)
})

test('fileFromKey', () => {
    expect(decodeFileKey(encodeFileKey(file1))).toStrictEqual(file1)
    expect(decodeFileKey(encodeFileKey(file2))).toStrictEqual(file2)
    expect(decodeFileKey(encodeFileKey(file3))).toStrictEqual(file3)
    expect(decodeFileKey(encodeFileKey(file4))).toStrictEqual(file4)
    expect(decodeFileKey(encodeFileKey(file5))).toStrictEqual(file5)
    expect(decodeFileKey(encodeFileKey(fileVideo))).toStrictEqual(fileVideo)
})