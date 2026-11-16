import React from 'react';
import { X, Search, FileText, Download, User, Palette } from 'lucide-react';
import { Theme, Language, Chat } from '../types';

interface RoadmapUpdate {
  id: string;
  title: string;
  desc: string;
}

interface ModalProps {
  onClose: () => void;
}

export const UpdatesModal: React.FC<ModalProps & { items: RoadmapUpdate[], votes: Record<string, number>, onVote: (id: string) => void, t: any }> = ({ onClose, items, votes, onVote, t }) => (
  <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
    <div className="bg-secondary w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="p-8 flex items-center justify-between bg-tertiary/20">
        <div>
          <h3 className="text-xl font-black text-text-primary uppercase tracking-tighter">{t.roadmapTitle}</h3>
          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1">{t.voteForFeatures}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-tertiary rounded-xl text-text-secondary transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
        {items.map((update) => (
          <div key={update.id} className="p-5 rounded-3xl bg-tertiary/20 flex items-center justify-between group hover:bg-tertiary/40 transition-all">
            <div className="flex-1 pr-4">
              <h4 className="text-sm font-black text-text-primary uppercase tracking-tight">{update.title}</h4>
              <p className="text-xs text-text-secondary mt-1">{update.desc}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={() => onVote(update.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
              >
                <Search className="w-3 h-3" />
                {t.vote}
              </button>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                {votes[update.id] || 0} {t.votes}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="p-8 bg-tertiary/10">
        <p className="text-[9px] text-center text-text-secondary font-bold uppercase tracking-[0.2em]">
          {t.voteNote}
        </p>
      </div>
    </div>
  </div>
);

// Add more modal components here if needed...
