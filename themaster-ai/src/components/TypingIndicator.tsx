
import React from 'react';
import { TranslationStrings } from '../types';

const TypingIndicator: React.FC<{ t?: TranslationStrings }> = ({ t }) => (
  <div className="flex items-center gap-1.5 px-4 py-3 bg-secondary/60 backdrop-blur-md rounded-2xl w-fit shadow-sm border border-white/5">
    <div className="w-1.5 h-1.5 rounded-full bg-text-secondary/60 animate-[pulse_1.5s_infinite_0ms]" />
    <div className="w-1.5 h-1.5 rounded-full bg-text-secondary/60 animate-[pulse_1.5s_infinite_300ms]" />
    <div className="w-1.5 h-1.5 rounded-full bg-text-secondary/60 animate-[pulse_1.5s_infinite_600ms]" />
    <span className="text-[10px] ml-2 font-black uppercase tracking-[0.15em] text-text-secondary/60">
      {t?.processing || 'Thinking'}
    </span>
  </div>
);

export default TypingIndicator;
