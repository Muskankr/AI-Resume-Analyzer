import React, { useState } from 'react';
import { Volume2, VolumeX, RotateCcw, ShieldCheck, AlertCircle } from 'lucide-react';
import { CaptchaChallenge, generateCaptchaChallenge, verifyCaptchaAnswer } from '../../services/captchaEngine';
import { CaptchaCanvas } from './CaptchaCanvas';

interface AccessibleCaptchaProps {
    onVerifySuccess: () => void;
    onVerifyFailure: () => void;
}

export const AccessibleCaptcha: React.FC<AccessibleCaptchaProps> = ({
    onVerifySuccess,
    onVerifyFailure
}) => {
    const [challenge, setChallenge] = useState<CaptchaChallenge>(generateCaptchaChallenge());
    const [userInput, setUserInput] = useState<string>('');
    const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
    const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

    const handleRefresh = () => {
        setChallenge(generateCaptchaChallenge());
        setUserInput('');
        setStatusMessage(null);
    };

    const handlePlayAudio = () => {
        if (!('speechSynthesis' in window)) {
            alert("Speech synthesis audio challenge is not supported in this browser.");
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(challenge.audioPronunciationText);
        utterance.rate = 0.9;
        setIsPlayingAudio(true);
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const result = verifyCaptchaAnswer(challenge, userInput);
        if (result.isValid) {
            setStatusMessage({ text: result.message, isError: false });
            onVerifySuccess();
        } else {
            setStatusMessage({ text: result.message, isError: true });
            onVerifyFailure();
        }
    };

    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Accessible CAPTCHA Security
                </span>
                <button
                    type="button"
                    onClick={handleRefresh}
                    title="Refresh CAPTCHA Challenge"
                    className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Visual Canvas & Audio Controls */}
            <div className="flex items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800/80">
                <CaptchaCanvas text={challenge.questionText} />

                <button
                    type="button"
                    onClick={handlePlayAudio}
                    title="Audio Accessibility Reader"
                    aria-label="Listen to audio captcha question"
                    className={`p-3 rounded-2xl border transition-all ${
                        isPlayingAudio
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 animate-pulse'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                >
                    <Volume2 className="w-5 h-5" />
                </button>
            </div>

            {/* Form Input */}
            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                        Answer Verification Code:
                    </label>
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Type answer (e.g., 15)..."
                        aria-label="Enter captcha answer"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-colors"
                >
                    Verify CAPTCHA
                </button>
            </form>

            {statusMessage && (
                <div className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
                    statusMessage.isError
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                    {statusMessage.isError ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                    <span>{statusMessage.text}</span>
                </div>
            )}
        </div>
    );
};
