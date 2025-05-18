export class BlockNotFoundError extends Error {
    constructor(node: string, blockIdx: number, blockHash: bigint) {
        super(`Блок #${blockIdx}(${blockHash}) не найден на узле ${node}`);
    }
}