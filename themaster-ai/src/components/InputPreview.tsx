
import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { Theme } from '../types';

interface InputPreviewProps {
  content: string;
  theme: Theme;
}

const InputPreview: React.FC<InputPreviewProps> = ({ content, theme }) => {
  if (!content) return null;
  return (
    <div className="px-6 py-4 bg-tertiary/20 backdrop-blur-xl border border-white/5 rounded-3xl mb-4 animate-in slide-in-from-bottom-2 fade-in duration-300 max-h-48 overflow-y-auto no-scrollbar group select-none">
      <div className="flex items-center justify-between mb-2">
         <div className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50">Draft Preview</div>
         <div className="text-[8px] font-bold text-blue-500/50 bg-blue-500/5 px-2 py-0.5 rounded-full border border-blue-500/10">Markdown Live</div>
      </div>
      <div className="opacity-80">
        <MarkdownRenderer content={content} theme={theme} />
      </div>
    </div>
  );
};

export default InputPreview;
