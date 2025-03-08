export enum RangeError {
    ResultUnsatisfiable,
    ResultInvalid,
}

export type ByteRange = {
    type: 'bytes'
    start: number
    end: number
}
export type BlockRange = {
    type: 'blocks'
    start: number
    end: number
}
export type Range = ByteRange | BlockRange

export function rangeParser(str: string, sizeAsBlocks: number, sizeAsBytes: number): RangeError | Range | undefined {
    const index = str.indexOf('=')

    if (index === -1) {
        return undefined
    }

    const type = str.slice(0, index)

    let size: number
    if (type === 'bytes') {
        size = sizeAsBytes
    } else if (type === 'blocks') {
        size = sizeAsBlocks
    } else {
        return RangeError.ResultUnsatisfiable
    }

    const expr = str.slice(index + 1).split(',')[0];

    const range = expr.split('-');
    if(range.length === 0)
        return undefined

    let start = parseInt(range[0], 10);
    let end = parseInt(range[1], 10);

    // -nnn
    if (isNaN(start)) {
        start = size - end
        end = size - 1
        // nnn-
    } else if (isNaN(end)) {
        end = size - 1
    }

    // limit last-byte-pos to current length
    if (end > size - 1) {
        end = size - 1
    }

    if (isNaN(start) || isNaN(end) || start > end || start < 0) {
        return RangeError.ResultInvalid
    }

    return {
        type,
        start: start,
        end: end
    }
}