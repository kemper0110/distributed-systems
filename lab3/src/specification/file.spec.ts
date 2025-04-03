import {expect, test} from "vitest";
import {fileFromKey, blockHash, fileKey, File} from "../models/file";

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
    expect(blockHash({idx: 1, file: file1})).toBe('62f7fcb7c51164e97f39d5f679d7b526e83a7869')
    expect(blockHash({idx: 2, file: file1})).toBe('752e389f61792b4e778ad731d05108da4d8607e8')
    expect(blockHash({idx: 1, file: file2})).toBe('d50a97d1881c4da198d6f6be6bb5eb5d996623d3')
    expect(blockHash({idx: 1, file: file3})).toBe('6072d1817dccf5a0017f14e25036bafc02bfa710')
    expect(blockHash({idx: 1, file: file4})).toBe('b5ce7dbf50f7f2eec5d6687e89cc03a51874b3b2')
    expect(blockHash({idx: 1, file: file5})).toBe('a8a7a4010e3f22c020075d9ce502fc5e09b0ceef')
    expect(blockHash({idx: 1, file: fileVideo})).toBe('f4d12d0bccb3bb8003ada59b4c84c8e0c97bfe19')
})

test('fileKey', () => {
    const keys = new Set<string>()

    keys.add(fileKey(file1))
    keys.add(fileKey(file2))
    keys.add(fileKey(file3))
    keys.add(fileKey(file4))
    keys.add(fileKey(file5))
    keys.add(fileKey(fileVideo))

    expect(keys.size, "Keys are not unique!").toBe(6)
})

test('fileFromKey', () => {
    expect(fileFromKey(fileKey(file1))).toStrictEqual(file1)
    expect(fileFromKey(fileKey(file2))).toStrictEqual(file2)
    expect(fileFromKey(fileKey(file3))).toStrictEqual(file3)
    expect(fileFromKey(fileKey(file4))).toStrictEqual(file4)
    expect(fileFromKey(fileKey(file5))).toStrictEqual(file5)
    expect(fileFromKey(fileKey(fileVideo))).toStrictEqual(fileVideo)
})