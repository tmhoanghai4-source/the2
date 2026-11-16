import React from 'react';
import { X } from 'lucide-react';
import { PromptBuilderData, TranslationStrings } from '../types';

interface PromptBuilderProps {
  data: PromptBuilderData;
  t: TranslationStrings;
  onUpdate: (data: PromptBuilderData) => void;
  onSend: () => void;
  onClose: () => void;
}

export const PromptBuilder: React.FC<PromptBuilderProps> = ({ data, t, onUpdate, onSend, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-secondary w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 flex items-center justify-between bg-tertiary/20">
          <div>
            <h3 className="text-xl font-black text-text-primary uppercase tracking-tighter">{t.promptBuilder}</h3>
            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1">{t.promptBuilderDesc}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-tertiary rounded-xl text-text-secondary transition-colors">
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.promptBuilderRole}</label>
              <input 
                type="text" 
                placeholder={t.promptBuilderRolePh}
                value={data.role}
                onChange={e => onUpdate({...data, role: e.target.value})}
                className="w-full bg-tertiary/50 rounded-2xl px-4 py-3 text-sm outline-none transition-all text-text-primary placeholder-text-secondary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.promptBuilderContext}</label>
              <input 
                type="text" 
                placeholder={t.promptBuilderContextPh}
                value={data.context}
                onChange={e => onUpdate({...data, context: e.target.value})}
                className="w-full bg-tertiary/50 rounded-2xl px-4 py-3 text-sm outline-none transition-all text-text-primary placeholder-text-secondary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.promptBuilderTask}</label>
            <textarea 
              placeholder={t.promptBuilderTaskPh}
              value={data.task}
              onChange={e => onUpdate({...data, task: e.target.value})}
              className="w-full bg-tertiary/50 rounded-2xl px-4 py-3 text-sm outline-none transition-all min-h-[120px] resize-none text-text-primary placeholder-text-secondary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.promptBuilderConstraints}</label>
            <textarea 
              placeholder={t.promptBuilderConstraintsPh}
              value={data.constraints}
              onChange={e => onUpdate({...data, constraints: e.target.value})}
              className="w-full bg-tertiary/50 rounded-2xl px-4 py-3 text-sm outline-none transition-all min-h-[80px] resize-none text-text-primary placeholder-text-secondary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.promptBuilderFormat}</label>
            <input 
              type="text" 
              placeholder={t.promptBuilderFormatPh}
              value={data.format}
              onChange={e => onUpdate({...data, format: e.target.value})}
              className="w-full bg-tertiary/50 rounded-2xl px-4 py-3 text-sm outline-none transition-all text-text-primary placeholder-text-secondary"
            />
          </div>
        </div>

        <div className="p-8 bg-tertiary/20 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl text-sm font-bold text-text-secondary hover:bg-tertiary transition-all"
          >
            {t.cancel}
          </button>
          <button 
            onClick={onSend}
            disabled={!data.task.trim()}
            className="flex-[2] py-4 rounded-2xl bg-blue-600 text-sm font-black text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:grayscale"
          >
            {t.promptBuilderSubmit}
          </button>
        </div>
      </div>
    </div>
  );
};
