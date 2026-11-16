import React, { useMemo, useState } from 'react';
import { BookOpen, Search, X, Download, RotateCcw, Trash2, MessageSquare, Calendar } from 'lucide-react';
import { Chat, Language, Theme, TranslationStrings } from '../types';
import { triggerBlobDownload } from '../lib/fileGenerator';

interface ChatJournalModalProps {
  isOpen: boolean;
  theme: Theme;
  language: Language;
  t: TranslationStrings;
  journalChats: Chat[];
  onClose: () => void;
  onRestoreChat: (chat: Chat) => void;
  onDeleteJournalChat: (chatId: string) => void;
}

const LOCALE_MAP: Record<Language, string> = {
  [Language.ENGLISH]: 'en-US',
  [Language.SPANISH]: 'es-ES',
  [Language.FRENCH]: 'fr-FR',
  [Language.GERMAN]: 'de-DE',
  [Language.CHINESE]: 'zh-CN',
  [Language.JAPANESE]: 'ja-JP',
  [Language.VIETNAMESE]: 'vi-VN',
};

const ChatJournalModal: React.FC<ChatJournalModalProps> = ({
  isOpen,
  theme,
  language,
  t,
  journalChats,
  onClose,
  onRestoreChat,
  onDeleteJournalChat,
}) => {
  const isLight = theme === Theme.LIGHT;
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sortedChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...journalChats].sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
    if (!q) return list;
    return list.filter(
      c =>
        c.title?.toLowerCase().includes(q) ||
        c.messages.some(m => m.content?.toLowerCase().includes(q))
    );
  }, [journalChats, search]);

  const selectedChat = useMemo(
    () => sortedChats.find(c => c.id === selectedId) || sortedChats[0] || null,
    [sortedChats, selectedId]
  );

  if (!isOpen) return null;

  const locale = LOCALE_MAP[language] || 'vi-VN';

  const exportMarkdown = (chat: Chat) => {
    let md = `# ${chat.title}\n\n`;
    md += `- Mode: ${chat.mode}\n`;
    md += `- Updated: ${new Date(chat.lastTimestamp || Date.now()).toLocaleString(locale)}\n\n---\n\n`;
    for (const m of chat.messages) {
      const role = m.role === 'user' ? 'USER' : 'THEMASTER';
      const time = new Date(m.timestamp || Date.now()).toLocaleTimeString(locale);
      md += `### [${role}] - ${time}\n\n${m.content}\n\n`;
      if (m.thought) md += `> ${m.thought}\n\n`;
      md += `---\n\n`;
    }
    triggerBlobDownload(
      new Blob([md], { type: 'text/markdown;charset=utf-8' }),
      `nhatky_${(chat.title || 'chat').replace(/[^a-z0-9]/gi, '_')}.md`
    );
  };

  const exportJson = (chat: Chat) => {
    triggerBlobDownload(
      new Blob([JSON.stringify(chat, null, 2)], { type: 'application/json;charset=utf-8' }),
      `nhatky_${(chat.title || 'chat').replace(/[^a-z0-9]/gi, '_')}.json`
    );
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
      <div
        className={`w-full max-w-5xl h-[85vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
          isLight
            ? 'bg-white border-gray-200 text-gray-900'
            : 'bg-secondary border-white/10 text-text-primary'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
            isLight ? 'bg-gray-50 border-gray-200' : 'bg-tertiary/40 border-white/10'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-600/15 border border-blue-500/25 text-blue-500">
              <BookOpen size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate">{t.chatJournalTitle}</h3>
              <p className="text-[11px] text-text-secondary">
                {journalChats.length} {t.conversationsTab.toLowerCase()}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isLight ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-text-secondary'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Split */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3">
          {/* Left: Entry List */}
          <div
            className={`border-r flex flex-col min-h-0 ${
              isLight ? 'border-gray-200 bg-gray-50/70' : 'border-white/10 bg-black/20'
            }`}
          >
            <div className="p-3 border-b border-inherit">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-text-secondary/50" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t.chatJournalSearchPh}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none ${
                    isLight
                      ? 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'
                      : 'bg-tertiary/60 border-white/10 text-text-primary placeholder:text-text-secondary/50'
                  }`}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {sortedChats.length === 0 ? (
                <div className="text-center py-12 px-4 text-xs text-text-secondary">
                  {t.chatJournalEmpty}
                </div>
              ) : (
                sortedChats.map(chat => {
                  const active = selectedChat?.id === chat.id;
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => setSelectedId(chat.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors ${
                        active
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : isLight
                          ? 'bg-white border-gray-200 hover:bg-gray-100 text-gray-900'
                          : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.07] text-text-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold truncate">{chat.title || t.newChat}</span>
                        <span
                          className={`text-[10px] font-mono shrink-0 ${
                            active ? 'text-blue-100' : 'text-text-secondary'
                          }`}
                        >
                          {chat.messages.length}
                        </span>
                      </div>
                      <div
                        className={`text-[10px] flex items-center gap-1.5 ${
                          active ? 'text-blue-100/90' : 'text-text-secondary'
                        }`}
                      >
                        <Calendar size={10} />
                        <span>
                          {new Date(chat.lastTimestamp || Date.now()).toLocaleString(locale, {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>·</span>
                        <span>{t.modes[chat.mode] || chat.mode}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Transcript Preview */}
          <div className="md:col-span-2 flex flex-col min-h-0">
            {selectedChat ? (
              <>
                <div
                  className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
                    isLight ? 'bg-white border-gray-200' : 'bg-black/25 border-white/10'
                  }`}
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold truncate">{selectedChat.title || t.newChat}</h4>
                    <span className="text-[11px] text-text-secondary">
                      {selectedChat.messages.length} {t.chatJournalMessagesUnit} ·{' '}
                      {new Date(selectedChat.lastTimestamp || Date.now()).toLocaleString(locale)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onRestoreChat(selectedChat);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <RotateCcw size={12} />
                      <span>{t.chatJournalRestore}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => exportMarkdown(selectedChat)}
                      className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 ${
                        isLight
                          ? 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-800'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-text-primary'
                      }`}
                    >
                      <Download size={12} />
                      <span>{t.chatJournalExportMd}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => exportJson(selectedChat)}
                      className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 ${
                        isLight
                          ? 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-800'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-text-primary'
                      }`}
                    >
                      <Download size={12} />
                      <span>{t.chatJournalExportJson}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteJournalChat(selectedChat.id)}
                      className="p-1.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10"
                      title={t.chatJournalClear}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {selectedChat.messages.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                        m.role === 'user'
                          ? isLight
                            ? 'bg-blue-50 border-blue-200 text-gray-900 ml-8'
                            : 'bg-blue-600/15 border-blue-500/25 text-text-primary ml-8'
                          : isLight
                          ? 'bg-gray-50 border-gray-200 text-gray-800 mr-8'
                          : 'bg-white/[0.03] border-white/10 text-text-primary mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                        <span>{m.role === 'user' ? 'User' : 'TheMaster'}</span>
                        <span>
                          {new Date(m.timestamp || Date.now()).toLocaleTimeString(locale, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-secondary gap-2">
                <MessageSquare size={28} className="opacity-30" />
                <p className="text-xs">{t.chatJournalEmpty}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChatJournalModal);
