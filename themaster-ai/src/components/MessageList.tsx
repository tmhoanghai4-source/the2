
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MessageSquare, FileText, X, Paperclip, Brain, ChevronDown, ChevronRight, FolderCheck, Play, ArrowUpRight } from 'lucide-react';
import { Message, Theme, TranslationStrings, WorkspaceFile } from '../types';
import MarkdownRenderer, { DirectoryTreeBlock } from './MarkdownRenderer';
import TypingIndicator from './TypingIndicator';
import { FileBrandIcon } from './FileBrandIcon';
import { extractFilesFromMarkdown, downloadZipFromFiles, isDirectoryTreeText } from '../lib/fileGenerator';

interface MessageListProps {
  messages: Message[];
  isThinking: boolean;
  theme: Theme;
  t: TranslationStrings;
  selection: { text: string, x: number, y: number } | null;
  workspaceFiles?: WorkspaceFile[];
  onApplyFile?: (path: string, content: string) => void;
  onApplyAllFiles?: (files: { path: string; content: string }[]) => void;
  onOpenWorkspaceRunner?: () => void;
  onSelectSuggestion?: (prompt: string) => void;
  onVote: (id: string) => void;
  onCopy: (text: string) => void;
  onQuote: (text: string) => void;
  onCloseSelection: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

interface MessageItemProps {
  msg: Message;
  isLastMsg: boolean;
  isThinking: boolean;
  theme: Theme;
  isLight: boolean;
  t: TranslationStrings;
  attachedImages: Record<string, string>;
  workspaceFiles: WorkspaceFile[];
  isThoughtOpen: boolean;
  isAppliedAll: boolean;
  onToggleThought: (id: string, currentlyOpen: boolean) => void;
  onApplyFile?: (path: string, content: string) => void;
  onApplyAllFiles?: (msgId: string, files: { path: string; content: string }[]) => void;
  onOpenWorkspaceRunner?: () => void;
  onSelectSuggestion?: (prompt: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = React.memo(({
  msg,
  isLastMsg,
  isThinking,
  theme,
  isLight,
  t,
  attachedImages,
  workspaceFiles,
  isThoughtOpen,
  isAppliedAll,
  onToggleThought,
  onApplyFile,
  onApplyAllFiles,
  onOpenWorkspaceRunner,
  onSelectSuggestion,
}) => {
  const isCurrentlyStreamingThought = isLastMsg && isThinking && !msg.content;
  const isStreamingReply = isLastMsg && isThinking && msg.role === 'assistant';
  const hasThought = Boolean(msg.thought && msg.thought.trim().length > 0);

  const extractedFiles = useMemo(
    () => (msg.role === 'assistant' ? extractFilesFromMarkdown(msg.content) : []),
    [msg.role, msg.content]
  );

  const codeFilesForZip = useMemo(
    () => extractedFiles.filter(f => !f.filename.endsWith('.docx') && !f.filename.endsWith('.pptx') && !f.filename.endsWith('.pdf')),
    [extractedFiles]
  );

  const treeAttachments = useMemo(
    () => (msg.role === 'user' && msg.attachments ? msg.attachments.filter(att => att.textContent && isDirectoryTreeText(att.textContent)) : []),
    [msg.role, msg.attachments]
  );

  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
      <div className={`relative max-w-[88%] md:max-w-[78%] ${msg.role === 'assistant' ? 'w-full' : ''}`}>
        {msg.role === 'assistant' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5 mb-1 px-1">
              <div className="w-7 h-7 rounded-xl overflow-hidden bg-black/20 border border-white/10 flex items-center justify-center shadow-sm shrink-0">
                <img
                  src="/asset/TMlogo.png"
                  alt="TheMaster"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-xs font-bold text-text-primary">TheMaster</span>
            </div>

            {hasThought && (
              <div className={`rounded-2xl border overflow-hidden ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : theme === Theme.MATRIX
                  ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-200/80'
                  : 'bg-white/[0.025] border-white/10 text-text-secondary'
              }`}>
                <button
                  type="button"
                  onClick={() => onToggleThought(msg.id, isThoughtOpen)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-semibold transition-colors ${
                    isLight ? 'hover:bg-slate-100' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Brain size={14} className={isCurrentlyStreamingThought ? 'text-blue-400 animate-pulse' : 'text-blue-400'} />
                    <span>{t.thoughtProcess}</span>
                    {isCurrentlyStreamingThought && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping ml-1" />
                    )}
                  </div>
                  {isThoughtOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {isThoughtOpen && (
                  <div
                    className={`px-4 pb-3.5 pt-2 border-t text-xs leading-relaxed whitespace-pre-wrap font-mono max-h-64 overflow-y-auto ${
                      isLight ? 'border-slate-200 text-slate-600' : 'border-white/5 text-text-secondary/85'
                    }`}
                  >
                    {msg.thought}
                  </div>
                )}
              </div>
            )}

            {msg.content && (
              <div className="markdown-body">
                <div className={`p-5 md:p-6 rounded-3xl rounded-tl-sm border backdrop-blur-sm shadow-md relative ${
                  theme === Theme.MATRIX
                    ? 'bg-black/75 border-emerald-500/20'
                    : theme === Theme.CYBERPUNK
                    ? 'bg-slate-950/75 border-fuchsia-500/20'
                    : isLight
                    ? 'bg-white border-gray-200 shadow-gray-200/40 text-gray-900'
                    : 'bg-white/[0.03] border-white/10 shadow-black/25'
                }`}>
                  {msg.content.includes("MODERATION_BLOCKED") ? (
                    <div className="flex items-start gap-4 text-left p-1">
                      <div className="p-2.5 bg-red-500/10 rounded-xl text-red-500 shrink-0 border border-red-500/20">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="flex flex-col gap-1">
                        <h3 className="text-xs font-bold uppercase text-red-500 tracking-wider">
                          {t.blockedTitle}
                        </h3>
                        <p className="text-xs text-red-400 font-medium leading-relaxed">
                          {msg.content.replace("🔒 [MODERATION_BLOCKED]", "").replace("MODERATION_BLOCKED", "").trim() || t.blockedDefault}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <MarkdownRenderer
                      content={msg.content}
                      theme={theme}
                      t={t}
                      attachedImages={attachedImages}
                      workspaceFiles={workspaceFiles}
                      isStreaming={isStreamingReply}
                      onApplyFile={onApplyFile}
                    />
                  )}
                </div>
              </div>
            )}

            {!isStreamingReply && codeFilesForZip.length >= 1 && (
              <div className="flex flex-wrap items-center gap-2 px-1">
                <button
                  type="button"
                  onClick={() =>
                    downloadZipFromFiles(
                      `project_${msg.id.slice(-4)}.zip`,
                      codeFilesForZip.map(f => ({ path: f.filename, content: f.content }))
                    )
                  }
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors ${
                    isLight
                      ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800'
                      : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <FileBrandIcon type="zip" size={16} />
                  <span>{t.downloadZipPrefix} ({codeFilesForZip.length} {t.filesUnit})</span>
                </button>

                {onApplyAllFiles && (
                  <button
                    type="button"
                    onClick={() =>
                      onApplyAllFiles(
                        msg.id,
                        codeFilesForZip.map(f => ({ path: f.filename, content: f.content }))
                      )
                    }
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors ${
                      isAppliedAll
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : isLight
                        ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    <FolderCheck size={14} />
                    <span>{isAppliedAll ? t.workspaceApplied : t.workspaceApplyAll}</span>
                  </button>
                )}

                {onOpenWorkspaceRunner && (
                  <button
                    type="button"
                    onClick={onOpenWorkspaceRunner}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
                      isLight
                        ? 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-800'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-text-primary'
                    }`}
                  >
                    <Play size={13} className="text-emerald-500" />
                    <span>{t.workspaceRunApp}</span>
                  </button>
                )}
              </div>
            )}

            {msg.groundingSources && msg.groundingSources.length > 0 && (
              <div
                className={`mt-2 p-4 border rounded-2xl space-y-3 ${
                  isLight ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">{t.sourcesTitle}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {msg.groundingSources.map((source, sIdx) => (
                    <a
                      key={sIdx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex flex-col p-3 border rounded-xl transition-colors group/source ${
                        isLight ? 'bg-gray-50 hover:bg-gray-100 border-gray-200' : 'bg-white/5 hover:bg-white/10 border-white/5'
                      }`}
                    >
                      <span className="text-xs font-semibold text-text-primary mb-0.5 group-hover/source:text-blue-500 transition-colors line-clamp-1">{source.title}</span>
                      <span className="text-[10px] text-text-secondary line-clamp-1">{source.uri}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Next-step follow-up suggestions under latest completed assistant reply */}
            {!isThinking && isLastMsg && onSelectSuggestion && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
              <div className="pt-1.5 px-1 space-y-1.5">
                <div className="text-[11px] font-semibold text-text-secondary/75">
                  {t.nextStepSuggestionsTitle}
                </div>
                <div className="flex flex-wrap gap-2">
                  {msg.suggestedQuestions.map((sq, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectSuggestion(sq)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors text-left ${
                        isLight
                          ? 'bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-300 text-gray-800 hover:text-blue-700'
                          : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 hover:border-blue-500/40 text-text-primary'
                      }`}
                    >
                      <span>{sq}</span>
                      <ArrowUpRight size={12} className="text-blue-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {msg.role === 'user' && (() => {
          const trimmedUserContent = msg.content.trim();
          const fencedTreeMatch = trimmedUserContent.match(/^```(?:tree|dir|dirtree|filetree|ascii-tree)(?:\s+([^\n]*))?\n([\s\S]*?)```$/i);
          const plainUserTree = !trimmedUserContent.includes('```') && isDirectoryTreeText(trimmedUserContent);
          const imageAttachments = (msg.attachments || []).filter(att => att.mimeType?.startsWith('image/') && att.data);

          return (
            <div className="flex flex-col items-end gap-2">
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap justify-end gap-1.5">
                  {msg.attachments.map(att => (
                    <span
                      key={att.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-medium ${
                        isLight
                          ? 'bg-white border-gray-200 text-gray-700'
                          : 'bg-white/5 border-white/10 text-text-secondary'
                      }`}
                    >
                      <Paperclip size={11} />
                      {att.name}
                    </span>
                  ))}
                </div>
              )}

              {imageAttachments.length > 0 && (
                <div className="flex flex-wrap justify-end gap-2">
                  {imageAttachments.map(att => (
                    <img
                      key={att.id}
                      src={att.data.startsWith('data:') ? att.data : `data:${att.mimeType};base64,${att.data}`}
                      alt={att.name}
                      className="max-h-40 max-w-[220px] rounded-2xl border border-white/15 object-cover shadow-md"
                    />
                  ))}
                </div>
              )}

              {fencedTreeMatch ? (
                <div className="w-full max-w-xl text-left">
                  <DirectoryTreeBlock
                    treeText={fencedTreeMatch[2].trim()}
                    title={fencedTreeMatch[1]?.trim() || t.treeTitle}
                    appTheme={theme}
                    t={t}
                  />
                </div>
              ) : plainUserTree ? (
                <div className="w-full max-w-xl text-left">
                  <DirectoryTreeBlock
                    treeText={trimmedUserContent}
                    appTheme={theme}
                    t={t}
                  />
                </div>
              ) : (
                <div className={`px-5 py-3.5 text-white rounded-3xl rounded-tr-sm shadow-md font-medium leading-relaxed whitespace-pre-wrap ${
                  theme === Theme.MATRIX
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-800'
                    : theme === Theme.CYBERPUNK
                    ? 'bg-gradient-to-br from-fuchsia-600 to-pink-700'
                    : 'bg-gradient-to-br from-blue-600 to-indigo-700'
                }`}>
                  {msg.content}
                </div>
              )}

              {treeAttachments.map(att => (
                <div key={att.id} className="w-full max-w-xl text-left">
                  <DirectoryTreeBlock
                    treeText={att.textContent || ''}
                    title={att.name}
                    appTheme={theme}
                    t={t}
                  />
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
});

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isThinking, 
  theme, 
  t,
  selection,
  workspaceFiles = [],
  onApplyFile,
  onApplyAllFiles,
  onOpenWorkspaceRunner,
  onSelectSuggestion,
  onCopy, 
  onQuote,
  onCloseSelection,
  scrollRef,
  onScroll
}) => {
  const isLight = theme === Theme.LIGHT;
  const [thoughtToggles, setThoughtToggles] = useState<Record<string, boolean>>({});
  const [appliedAllMsgId, setAppliedAllMsgId] = useState<string | null>(null);

  const attachedImages = useMemo(() => {
    const map: Record<string, string> = {};
    for (const wf of workspaceFiles) {
      if (wf.dataUrl) {
        map[wf.path] = wf.dataUrl;
        map[wf.name] = wf.dataUrl;
        map[`asset/${wf.name}`] = wf.dataUrl;
        map[`attach://${wf.path}`] = wf.dataUrl;
        map[`attach://${wf.name}`] = wf.dataUrl;
      }
    }
    let imgIdx = 1;
    for (const m of messages) {
      for (const att of m.attachments || []) {
        if (att.mimeType?.startsWith('image/') && att.data) {
          const dataUri = att.data.startsWith('data:')
            ? att.data
            : `data:${att.mimeType};base64,${att.data}`;
          map[att.id] = dataUri;
          map[`attach://${att.id}`] = dataUri;
          if (att.name) {
            map[att.name] = dataUri;
            map[`attach://${att.name}`] = dataUri;
          }
          map[`attach://${imgIdx}`] = dataUri;
          imgIdx++;
        }
      }
    }
    return map;
  }, [messages, workspaceFiles]);

  const toggleThought = React.useCallback((id: string, currentlyOpen: boolean) => {
    setThoughtToggles(prev => ({ ...prev, [id]: !currentlyOpen }));
  }, []);

  const handleApplyAll = React.useCallback((msgId: string, files: { path: string; content: string }[]) => {
    if (!onApplyAllFiles) return;
    onApplyAllFiles(files);
    setAppliedAllMsgId(msgId);
    setTimeout(() => setAppliedAllMsgId(null), 2400);
  }, [onApplyAllFiles]);

  return (
    <div 
      ref={scrollRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto pt-24 pb-32 px-4 lg:px-0 no-scrollbar relative z-10"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {messages.length === 0 && !isThinking && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center text-center select-none relative z-10"
            >
              <div className={`w-20 h-20 rounded-3xl overflow-hidden flex items-center justify-center border shadow-xl ${
                theme === Theme.MATRIX 
                  ? 'bg-black/80 border-emerald-500/30 shadow-emerald-950/40' 
                  : theme === Theme.CYBERPUNK 
                  ? 'bg-slate-950/80 border-fuchsia-500/30' 
                  : isLight
                  ? 'bg-white border-gray-200 shadow-gray-200/60'
                  : 'bg-white/[0.04] border-white/10 shadow-black/50'
              }`}>
                <img
                  src="/asset/TMlogo.png"
                  alt="TheMaster"
                  className="w-full h-full object-cover select-none"
                  referrerPolicy="no-referrer"
                />
              </div>

              <h2 className={`mt-4 text-xs font-bold uppercase tracking-[0.3em] ${
                theme === Theme.MATRIX 
                  ? 'text-emerald-400/80' 
                  : theme === Theme.CYBERPUNK 
                  ? 'text-fuchsia-300' 
                  : isLight
                  ? 'text-slate-600'
                  : 'text-white/70'
              }`}>
                TheMaster
              </h2>
            </motion.div>
          </div>
        )}

        {messages.map((msg, msgIdx) => {
          const isLastMsg = msgIdx === messages.length - 1;
          const isCurrentlyStreamingThought = isLastMsg && isThinking && !msg.content;
          if (msg.role === 'assistant' && isLastMsg && isThinking && !msg.content && !msg.thought) {
            return null;
          }

          const isThoughtOpen = thoughtToggles[msg.id] !== undefined
            ? thoughtToggles[msg.id]
            : isCurrentlyStreamingThought;

          return (
            <MessageItem
              key={msg.id}
              msg={msg}
              isLastMsg={isLastMsg}
              isThinking={isThinking}
              theme={theme}
              isLight={isLight}
              t={t}
              attachedImages={attachedImages}
              workspaceFiles={workspaceFiles}
              isThoughtOpen={isThoughtOpen}
              isAppliedAll={appliedAllMsgId === msg.id}
              onToggleThought={toggleThought}
              onApplyFile={onApplyFile}
              onApplyAllFiles={onApplyAllFiles ? handleApplyAll : undefined}
              onOpenWorkspaceRunner={onOpenWorkspaceRunner}
              onSelectSuggestion={onSelectSuggestion}
            />
          );
        })}

        {isThinking && !(messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content) && (
          <div className="flex justify-start">
            <TypingIndicator t={t} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {selection && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            style={{ left: selection.x, top: selection.y }}
            className={`fixed z-50 -translate-x-1/2 flex items-center gap-1 p-1 rounded-2xl shadow-2xl backdrop-blur-md scale-90 lg:scale-100 border ${
              isLight ? 'bg-white border-gray-200' : 'bg-secondary border-white/10'
            }`}
          >
            <button 
              onClick={() => onQuote(selection.text)}
              className="p-2 hover:bg-white/5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2"
            >
              <MessageSquare size={12} />
              {t.quoteAction}
            </button>
            <div className="w-[1px] h-4 bg-white/10" />
            <button 
               onClick={() => onCopy(selection.text)}
               className="p-2 hover:bg-white/5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2"
            >
              <FileText size={12} />
              {t.copyAction}
            </button>
            <div className="w-[1px] h-4 bg-white/10" />
            <button 
               onClick={onCloseSelection}
               className="p-2 hover:bg-white/5 rounded-xl text-text-secondary hover:text-red-500 transition-colors"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(MessageList);
