import './App.css'
import {useEffect, useRef} from "react";

function generateFilename() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const extension = '.txt';

    let filename = '';
    for (let i = 0; i < 10; i++) { // Генерируем имя файла длиной 10 символов
        const randomIndex = Math.floor(Math.random() * characters.length);
        filename += characters[randomIndex];
    }
    return filename + extension;
}

function generateFileSizeBlocks() {
    return Math.ceil(Math.random() * 10)
}

async function generateHash(str: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return BigInt('0x' + hashHex);
}

function truncateMod(hash: bigint, del: number): number {
    return Number(hash % BigInt(del))
}

function truncate1024(hash: bigint, max: number): number {
    const max256Bit = BigInt('0xFFFFFFFFFFFFFFFF' + 'FFFFFFFFFFFFFFFF' + 'FFFFFFFFFFFFFFFF' + 'FFFFFFFFFFFFFFFF');
    const maxTargetRange = BigInt(max);
    return Number((hash * maxTargetRange) / (max256Bit + BigInt(1)));
}

async function generateDots(length: number, w: number, h: number, method: 'mod' | 'div') {
    const inputs = Array.from({length})
        .map(() => generateFilename() + ':' + generateFileSizeBlocks())

    const hashes = await Promise.all(inputs.map(s => generateHash(s)))

    if(method === 'div')
        return hashes.map(hash => [truncate1024(hash, w), truncate1024(hash, w)])
    return hashes.map(hash => [truncateMod(hash, w), truncateMod(hash, h)])
}

function App() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if(!canvasRef.current) return

        const w = canvasRef.current.width = window.innerWidth;
        const h = canvasRef.current.height = window.innerHeight;
        console.log(w, h)

        const ctx = canvasRef.current.getContext('2d')
        if(!ctx) return;

        generateDots(1000, w, h, 'mod').then(dots => {
            dots.forEach(dot => {
                ctx.beginPath()
                ctx.arc(dot[0], h / 2, 1, 0, Math.PI * 2)
                ctx.closePath()
                ctx.fillStyle = "black"
                ctx.fill()
            })
        })
    }, [canvasRef]);

    return (
        <>
            <canvas style={{
                width: window.innerWidth,
                height: window.innerHeight,
                backgroundColor: 'rosybrown'
            }} ref={canvasRef}/>
        </>
    )
}

export default App
