
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KnowledgeNode, MemoryStats, TerminalLog, Theme } from '../types';
import { brain } from '../masterBrainService';
import MarkdownRenderer from './MarkdownRenderer';

interface MemoryVisualizerProps {
  nodes: KnowledgeNode[];
  stats: MemoryStats;
  onClose: () => void;
  onPrune: (id: string) => void;
  onTag: (id: string, tag: string) => void;
  onOpenInjector: () => void;
  theme: Theme;
  addTerminalLog: (message: string, type: TerminalLog['type']) => void;
}

const MemoryVisualizer: React.FC<MemoryVisualizerProps> = ({ 
  nodes, 
  stats, 
  onClose, 
  onPrune, 
  onTag, 
  onOpenInjector, 
  theme, 
  addTerminalLog 
}) => {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const [proximityWords, setProximityWords] = useState('');

  const filteredWithScoring = useMemo(() => {
    const searchTerm = search.toLowerCase().trim();
    
    const scored = nodes.map(node => {
      let score = 0;
      const content = node.content.toLowerCase();
      const tags = node.tags.map(t => t.toLowerCase());

      if (searchTerm) {
        if (content === searchTerm) score += 1000;
        if (content.includes(searchTerm)) score += 100;
        if (tags.some(t => t.includes(searchTerm))) score += 150;
        
        const words = searchTerm.split(/\s+/).filter(w => w.length > 2);
        words.forEach(word => {
          if (content.includes(word)) score += 50;
        });

        score += (node.confidence * 20);
      } else {
        score = node.timestamp / 1000000;
      }

      return { node, score };
    });

    return scored
      .filter(({ node }) => {
        let matchesProximity = true;
        if (isAdvancedSearch && proximityWords.trim() && proximityWords.includes(',')) {
          const parts = proximityWords.split(',').map(s => s.trim().toLowerCase());
          if (parts.length >= 2 && parts[0] && parts[1]) {
            const w1 = parts[0];
            const w2 = parts[1];
            const dist = parseInt(parts[2] || '10', 10);
            const txt = node.content.toLowerCase();
            if (!txt.includes(w1) || !txt.includes(w2)) matchesProximity = false;
            else {
                const words = txt.split(/\s+/);
                let foundClose = false;
                for (let i = 0; i < words.length; i++) {
                    if (words[i].includes(w1)) {
                        for (let j = Math.max(0, i - dist); j <= Math.min(words.length - 1, i + dist); j++) {
                            if (words[j].includes(w2)) {
                                foundClose = true;
                                break;
                            }
                        }
                    }
                    if (foundClose) break;
                }
                matchesProximity = foundClose;
            }
          }
        }

        const matchesSearch = searchTerm === '' || 
                             node.content.toLowerCase().includes(searchTerm) || 
                             node.tags.some(t => t.toLowerCase().includes(searchTerm));
        const matchesCategory = filterCategory === 'all' || node.category === filterCategory;
        const matchesDifficulty = filterDifficulty === 'all' || node.difficulty === filterDifficulty;

        const nodeDate = new Date(node.timestamp);
        const fromMatch = dateFrom ? nodeDate >= new Date(dateFrom) : true;
        const toDate = dateTo ? new Date(dateTo) : null;
        if (toDate) toDate.setDate(toDate.getDate() + 1);
        const toMatch = toDate ? nodeDate < toDate : true;

        return matchesSearch && matchesCategory && matchesDifficulty && matchesProximity && fromMatch && toMatch;
      })
      .sort((a, b) => b.score - a.score)
      .map(item => item.node);
  }, [nodes, search, filterCategory, filterDifficulty, dateFrom, dateTo, isAdvancedSearch, proximityWords]);

  const categories = Array.from(new Set(nodes.map(n => n.category)));

  const exportToJson = () => {
    const data = {
      model: "Phiên bản 2.3 (Bạn đồng hành)",
      exportedAt: new Date().toISOString(),
      nodes: nodes
    };
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `TheMaster_Knowledge_Package.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const exportToTxt = () => {
    const header = `SHADOWBRAIN KNOWLEDGE BANK\nXuất dữ liệu: ${new Date().toLocaleString()}\nTổng số nút: ${nodes.length}\n${'='.repeat(50)}\n\n`;
    const content = nodes.map((node, idx) => {
      return `[NODE #${idx + 1}]\nTimestamp: ${new Date(node.timestamp).toLocaleString()}\nCategory: ${node.category}\nDifficulty: ${node.difficulty}\nTags: ${node.tags.join(', ')}\nContent: ${node.content}\n${'-'.repeat(30)}\n`;
    }).join('\n');
    
    const element = document.createElement("a");
    const file = new Blob([header + content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `TheMaster_Memory.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleResetKnowledge = () => {
    const confirmation = window.prompt("XÁC NHẬN XÓA TRI THỨC:\nHành động này sẽ xóa vĩnh viễn TOÀN BỘ bộ não ShadowBrain. Đây là hành động không thể hoàn tác.\n\nVui lòng nhập 'RESET' để xác nhận:");
    if (confirmation === 'RESET') {
      brain.resetKnowledge();
      addTerminalLog('CRITICAL: SHADOWBRAIN FORMATTED. ALL MEMORY PURGED.', 'warn');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handlePruneDuplicates = () => {
    const deletedCount = brain.pruneDuplicates();
    alert(`Cleaned ${deletedCount} duplicate nodes from ShadowBrain memory.`);
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 lg:p-10">
      <motion.div 
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-6xl h-[90vh] bg-secondary/90 border border-white/10 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden glass-panel"
      >
        <div className="p-8 border-b border-white/5 shrink-0 flex flex-col gap-6">
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-text-primary">TheMaster Memory Shell</h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-secondary">Cognitive Node Synchronization</p>
                </div>
              </div>
              <div className="hidden lg:block h-10 w-[1px] bg-white/5 mx-2" />
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Total Nodes</span>
                  <span className="text-xl font-black text-text-primary">{stats.totalNodes}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active Core</span>
                  <span className="text-xl font-black text-text-primary">{stats.difficultyDist.critical + stats.difficultyDist.hard}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
               <button 
                 onClick={exportToTxt}
                 className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-600/20 group"
                 title="Export All Memory to TXT"
               >
                 <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                 <span className="text-[10px] font-black uppercase tracking-widest">Export TXT</span>
               </button>
               <button 
                 onClick={exportToJson}
                 className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/20 group"
                 title="Export All Memory to JSON"
               >
                 <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                 <span className="text-[10px] font-black uppercase tracking-widest">Export JSON</span>
               </button>
               <div className="h-8 w-[1px] bg-white/10 mx-2" />
               <button 
                 onClick={handlePruneDuplicates}
                 className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/50 text-blue-400 hover:text-white transition-all shadow-lg shadow-blue-600/20 group"
                 title="Clean Duplicate Knowledge"
               >
                 <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"></path><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                 <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Clean</span>
               </button>
               <button 
                 onClick={handleResetKnowledge}
                 className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 border border-red-500/50 text-red-400 hover:text-white transition-all shadow-lg shadow-red-600/20 group"
                 title="Reset ALL Knowledge"
               >
                 <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                 <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Reset</span>
               </button>
               <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all ml-1">
                 <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
               </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-4">
              <div className="flex-1 min-w-[200px] lg:min-w-[300px] relative group">
                <input 
                  type="text" 
                  placeholder="Search nodes or tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-12 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary group-hover:text-blue-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <select 
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="h-12 bg-white/5 border border-white/10 rounded-2xl pl-4 pr-10 text-[10px] font-black uppercase tracking-widest text-text-secondary focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer outline-none"
                  >
                    <option value="all">Category: All</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <button 
                    onClick={onOpenInjector}
                    className="absolute right-2 w-8 h-8 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white transition-all flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-500/20"
                    title="Thăng cấp tri thức nhanh"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                </div>
                <select 
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="h-12 bg-white/5 border border-white/10 rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest text-text-secondary focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer outline-none"
                >
                  <option value="all">Difficulty: All</option>
                  <option value="critical">Critical</option>
                  <option value="hard">Hard</option>
                  <option value="medium">Medium</option>
                  <option value="easy">Easy</option>
                </select>
                <button
                  onClick={() => setIsAdvancedSearch(!isAdvancedSearch)}
                  className={`h-12 px-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${isAdvancedSearch ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-white/5 border-white/10 text-text-secondary uppercase hover:bg-white/10'}`}
                >
                  Advanced
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isAdvancedSearch && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex flex-wrap lg:flex-nowrap items-center gap-4 pt-2 overflow-hidden"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest">From:</span>
                    <input 
                      type="date" 
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-text-primary focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest">To:</span>
                    <input 
                      type="date" 
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-text-primary focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-1 lg:ml-4">
                    <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest whitespace-nowrap">Proximity (w1,w2,dist):</span>
                    <input 
                      type="text" 
                      value={proximityWords}
                      onChange={(e) => setProximityWords(e.target.value)}
                      placeholder="e.g. error,catch,5"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-text-primary focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredWithScoring.map(node => (
                <motion.div 
                  key={node.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`p-6 rounded-[2rem] border transition-all ${
                    node.difficulty === 'critical' ? 'bg-red-500/5 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]' :
                    node.difficulty === 'hard' ? 'bg-orange-500/5 border-orange-500/20' :
                    node.difficulty === 'medium' ? 'bg-blue-500/5 border-blue-500/20' :
                    'bg-white/5 border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                      node.difficulty === 'critical' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                      node.difficulty === 'hard' ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' :
                      node.difficulty === 'medium' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' :
                      'bg-white/10 border-white/20 text-text-secondary'
                    }`}>
                      {node.difficulty}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50">
                      {new Date(node.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="space-y-4">
                     <p className="text-xs font-black text-text-secondary uppercase tracking-[0.1em]">{node.category}</p>
                     <div className="text-sm font-medium text-text-primary leading-relaxed line-clamp-3 opacity-90 overflow-hidden break-words">
                       {node.content}
                     </div>
                     <div className="flex flex-wrap gap-1.5 min-h-[20px]">
                        {node.tags.map(t => (
                          <span key={t} className="text-[8px] font-bold text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-md border border-emerald-500/20">#{t}</span>
                        ))}
                     </div>
                     <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <div className="flex gap-2">
                           <button 
                             onClick={() => {
                               const tag = prompt('Enter new tag:');
                               if (tag) onTag(node.id, tag);
                             }}
                             className="p-2 hover:bg-white/10 rounded-xl transition-all group"
                           >
                             <svg className="w-4 h-4 text-text-secondary group-hover:text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                           </button>
                        </div>
                        <button 
                          onClick={() => onPrune(node.id)}
                          className="p-2 hover:bg-red-500/10 rounded-xl transition-all group"
                        >
                           <svg className="w-4 h-4 text-text-secondary group-hover:text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                     </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MemoryVisualizer;
