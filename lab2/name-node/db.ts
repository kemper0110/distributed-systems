import {DatabaseSync} from 'node:sqlite';

export const db = new DatabaseSync('name-node.db')

db.exec(`create table if not exists file (
    id integer primary key,
    path varchar(255) unique,
    mimeType VARCHAR(40) not null,
    blockSize integer not null,
    fileSize integer not null
);`);

db.exec(`create table if not exists blocks(
    fileId integer references file(id) not null,
    blockIdx integer not null,
    dataNode varchar(50) not null
);`);

db.exec(`create unique index if not exists blocksIndex on blocks (fileId, blockIdx)`)