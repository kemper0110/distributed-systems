export class BlockNotFoundError extends Error {
    constructor(dataNode: string, blockIdx: number) {
        super(`Блок #${blockIdx} не найден на узле ${dataNode}`);
    }
}