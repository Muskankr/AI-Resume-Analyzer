import React, { useEffect, useRef } from 'react';

interface CaptchaCanvasProps {
    text: string;
}

export const CaptchaCanvas: React.FC<CaptchaCanvasProps> = ({ text }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear Background
        ctx.fillStyle = '#0f172a'; // slate-900
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Noise Lines
        for (let i = 0; i < 6; i++) {
            ctx.strokeStyle = `rgba(99, 102, 241, ${Math.random() * 0.4 + 0.2})`;
            ctx.beginPath();
            ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.stroke();
        }

        // Draw Text
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#38bdf8'; // sky-400
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }, [text]);

    return (
        <canvas
            ref={canvasRef}
            width={180}
            height={50}
            className="rounded-xl border border-slate-800 shadow-inner"
        />
    );
};
