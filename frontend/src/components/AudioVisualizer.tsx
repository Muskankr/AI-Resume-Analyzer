import React from 'react';

interface AudioVisualizerProps {
    isSpeaking: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isSpeaking }) => {
    return (
        <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 flex flex-col items-center justify-center overflow-hidden relative shadow-inner">

            {/* Decorative pulse when active */}
            {isSpeaking && (
                <div className="absolute inset-0 bg-blue-500/5 animate-pulse rounded-xl" />
            )}

            <div className="visualizer-bars w-full z-10">
                {[...Array(10)].map((_, i) => (
                    <div
                        key={i}
                        className={`vis-bar ${isSpeaking ? 'active' : 'idle'}`}
                        style={{
                            animationDelay: isSpeaking ? `${i * 0.05}s` : '0s',
                            background: isSpeaking
                                ? `linear-gradient(to top, #3b82f6, ${i % 2 === 0 ? '#10b981' : '#8b5cf6'})`
                                : '#334155'
                        }}
                    />
                ))}
            </div>

            <div className="mt-4 text-[10px] uppercase font-bold tracking-widest text-slate-500 font-mono z-10 flex gap-4">
                <span>FRQ: 44.1Khz</span>
                <span>AMP: {isSpeaking ? 'ACTIVE' : 'IDLE'}</span>
            </div>
        </div>
    );
};
