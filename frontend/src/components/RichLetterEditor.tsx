import React from 'react';
import { Download, Copy, Edit2, CheckCircle2 } from 'lucide-react';

interface RichLetterEditorProps {
    content: string;
    onChange: (val: string) => void;
    onDownload: () => void;
}

export const RichLetterEditor: React.FC<RichLetterEditorProps> = ({ content, onChange, onDownload }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-full bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-800/80">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                    <Edit2 size={16} className="text-purple-400" />
                    Letter Editor
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-slate-700/50 hover:bg-slate-700 text-slate-300"
                    >
                        {copied ? <CheckCircle2 size={15} className="text-green-400" /> : <Copy size={15} />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                        onClick={onDownload}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30"
                    >
                        <Download size={15} />
                        Export Text
                    </button>
                </div>
            </div>

            <div className="flex-1 p-0 relative group">
                <textarea
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    className="rich-editor-content w-full h-full min-h-[500px] p-6 bg-transparent resize-none focus:outline-none focus:bg-slate-800/30 transition-colors"
                    placeholder="Your generated cover letter will appear here..."
                />
                <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-transparent group-focus-within:ring-purple-500/20 rounded-b-2xl transition-all" />
            </div>
        </div>
    );
};
