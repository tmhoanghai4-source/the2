import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  LogOut,
  Trash2,
  History,
  HardDrive,
  X,
  Brain,
  Search,
  Calendar,
  MessageSquare,
  Copy,
  Check,
  FolderPlus,
  BookOpen,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Chat, Folder, Theme, AIMode, KnowledgeNode, TranslationStrings, Language } from "../types";
import FolderItem from "./FolderItem";
import SortableChatItem from "./SortableChatItem";

interface SidebarProps {
  user: any;
  isOpen: boolean;
  chats: Chat[];
  folders: Folder[];
  activeChatId: string | null;
  deletingChatId: string | null;
  binaryTitle: string;
  theme: Theme;
  t: TranslationStrings;
  language: Language;
  chatSearch: string;
  chatSearchMode: AIMode | "All";
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onRenameChat: (id: string, e: React.MouseEvent) => void;
  onDeleteChat: (id: string, e: React.MouseEvent) => void;
  onRenameFolder: (id: string, e: React.MouseEvent) => void;
  onDeleteFolder: (id: string) => void;
  onCreateFolder?: (name: string) => void;
  onChatSearchChange: (val: string) => void;
  onChatSearchModeChange: (mode: AIMode | "All") => void;
  onLogout: () => void;
  onSync: () => void;
  onClearHistory: () => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragStart: (event: DragStartEvent) => void;
  filteredChats: Chat[];
  onCloseSidebar?: () => void;
  nodes?: KnowledgeNode[];
  onDeleteNode?: (id: string) => void;
  onOpenJournal?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  user,
  isOpen,
  chats,
  folders,
  activeChatId,
  deletingChatId,
  binaryTitle,
  theme,
  t,
  language,
  chatSearch,
  chatSearchMode,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  onRenameFolder,
  onDeleteFolder,
  onCreateFolder,
  onChatSearchChange,
  onChatSearchModeChange,
  onLogout,
  onSync,
  onClearHistory,
  onDragEnd,
  onDragStart,
  filteredChats,
  onCloseSidebar,
  nodes = [],
  onDeleteNode,
  onOpenJournal,
}) => {
  const [activeTab, setActiveTab2] = React.useState<"threads" | "knowledge">("threads");
  const [knowledgeSearch, setKnowledgeSearch] = React.useState("");
  const [activeNodeDetail, setActiveNodeDetail] = React.useState<KnowledgeNode | null>(null);
  const [copied, setCopied] = React.useState(false);

  const isAdmin = user?.role === "admin";
  const currentTab = isAdmin ? activeTab : "threads";
  const isLight = theme === Theme.LIGHT;
  const localeMap: Record<Language, string> = {
    [Language.ENGLISH]: 'en-US',
    [Language.SPANISH]: 'es-ES',
    [Language.FRENCH]: 'fr-FR',
    [Language.GERMAN]: 'de-DE',
    [Language.CHINESE]: 'zh-CN',
    [Language.JAPANESE]: 'ja-JP',
    [Language.VIETNAMESE]: 'vi-VN'
  };
  const localizedFolders = React.useMemo(() => {
    return folders.map((folder) => {
      if (folder.id === 'work' && ['Công việc', 'Work', 'Trabajo', 'Travail', 'Arbeit', '工作', '仕事'].includes(folder.name)) {
        return { ...folder, name: t.defaultFolderWork };
      }
      if (folder.id === 'study' && ['Học tập', 'Study', 'Estudio', 'Études', 'Lernen', '学习', '学習'].includes(folder.name)) {
        return { ...folder, name: t.defaultFolderStudy };
      }
      if (folder.id === 'personal' && ['Cá nhân', 'Personal', 'Privé', 'Personnel', 'Privat', '个人', '個人'].includes(folder.name)) {
        return { ...folder, name: t.defaultFolderPersonal };
      }
      return folder;
    });
  }, [folders, t.defaultFolderWork, t.defaultFolderStudy, t.defaultFolderPersonal]);

  const chatsByFolder = React.useMemo(() => {
    const map: Record<string, Chat[]> = {};
    for (const f of localizedFolders) {
      map[f.id] = [];
    }
    for (const c of filteredChats) {
      if (c.folderId && map[c.folderId]) {
        map[c.folderId].push(c);
      }
    }
    return map;
  }, [localizedFolders, filteredChats]);

  const uncategorizedChats = React.useMemo(
    () => filteredChats.filter((c) => !c.folderId),
    [filteredChats]
  );

  const uncategorizedIds = React.useMemo(
    () => uncategorizedChats.map((c) => c.id),
    [uncategorizedChats]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Filter existing knowledge/memory nodes by search query or category
  const filteredNodes = React.useMemo(() => {
    if (!knowledgeSearch.trim()) return nodes;
    const query = knowledgeSearch.toLowerCase();
    return nodes.filter((node) => {
      // search in category
      if (node.category?.toLowerCase().includes(query)) return true;
      // search in tags
      if (node.tags?.some((tag) => tag.toLowerCase().includes(query))) return true;
      // search in main text/content
      if (node.content?.toLowerCase().includes(query)) return true;
      // search in question/answer mapping
      if (node.question?.toLowerCase().includes(query)) return true;
      if (node.answer?.toLowerCase().includes(query)) return true;
      return false;
    });
  }, [nodes, knowledgeSearch]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{
          x: isOpen ? 0 : -320,
          width: isOpen ? 320 : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 220, damping: 28 }}
        className={`relative flex flex-col bg-secondary border-r h-full overflow-hidden z-20 shrink-0 ${
          isLight ? "border-gray-200" : "border-white/5"
        }`}
      >
        <div className="p-5 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl overflow-hidden bg-black/20 border border-white/10 flex items-center justify-center shadow-md shrink-0">
                <img
                  src="/asset/TMlogo.png"
                  alt="TheMaster"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm font-black uppercase tracking-tight text-text-primary">
                  TheMaster
                </h1>
              </div>
            </div>
            {onCloseSidebar && (
              <button
                onClick={onCloseSidebar}
                className={`p-2 rounded-xl border text-text-secondary hover:text-text-primary transition-all ${
                  isLight ? "hover:bg-gray-100 border-gray-200" : "hover:bg-white/5 border-white/5"
                }`}
                title={t.collapseSidebar}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* New Session Action */}
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all shadow-lg shadow-blue-600/20 mb-5 group overflow-hidden relative shrink-0"
          >
            <div className="flex items-center gap-2.5 relative z-10">
              <Plus
                size={17}
                strokeWidth={2.5}
                className="group-hover:rotate-90 transition-transform duration-300"
              />
              <span className="text-xs font-bold tracking-wide">
                {t.newChat}
              </span>
            </div>
          </button>

          {/* Tab Selection */}
          {isAdmin && (
            <div className={`flex p-1 rounded-xl mb-5 border shrink-0 ${
              isLight ? "bg-gray-100 border-gray-200" : "bg-black/40 border-white/5"
            }`}>
              <button
                onClick={() => setActiveTab2("threads")}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
                  currentTab === "threads"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <MessageSquare size={12} />
                {t.conversationsTab}
              </button>
              <button
                onClick={() => setActiveTab2("knowledge")}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
                  currentTab === "knowledge"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Brain size={12} />
                {t.knowledgeTab}
              </button>
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-0">
            {currentTab === "threads" ? (
              /* Threads View */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className="flex items-center gap-2">
                    <History size={14} className="text-text-secondary" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      {t.recentChats}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {onOpenJournal && (
                      <button
                        type="button"
                        onClick={onOpenJournal}
                        className="p-1.5 hover:bg-blue-500/10 text-text-secondary hover:text-blue-500 rounded-lg transition-all"
                        title={t.chatJournalBtn}
                      >
                        <BookOpen size={14} />
                      </button>
                    )}
                    {onCreateFolder && (
                      <button
                        type="button"
                        onClick={() => {
                          const name = prompt(t.newFolderPrompt);
                          if (name && name.trim()) {
                            onCreateFolder(name.trim());
                          }
                        }}
                        className="p-1.5 hover:bg-blue-500/10 text-text-secondary hover:text-blue-500 rounded-lg transition-all"
                        title={t.newFolderPrompt}
                      >
                        <FolderPlus size={14} />
                      </button>
                    )}
                    <button
                      onClick={onClearHistory}
                      className="p-1 px-2 hover:bg-red-500/10 text-[10px] font-bold text-text-secondary hover:text-red-500 rounded-lg transition-all"
                    >
                      {t.clearAll}
                    </button>
                  </div>
                </div>

                <div className="mb-3 px-1 relative group">
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={chatSearch}
                    onChange={(e) => onChatSearchChange(e.target.value)}
                    className={`w-full border rounded-xl px-3.5 py-2 text-xs transition-all outline-none text-text-primary ${
                      isLight
                        ? "bg-gray-100 border-gray-200 placeholder:text-gray-400 focus:border-blue-400"
                        : "bg-tertiary/50 border-white/5 placeholder:text-text-secondary/45 focus:border-blue-500/30"
                    }`}
                  />
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar pb-6 space-y-2">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onDragEnd}
                    onDragStart={onDragStart}
                  >
                    {localizedFolders.map((folder) => (
                      <FolderItem
                        key={folder.id}
                        folder={folder}
                        isOver={false}
                        onRename={onRenameFolder}
                        onDelete={onDeleteFolder}
                        chats={chatsByFolder[folder.id] || []}
                        activeChatId={activeChatId}
                        deletingChatId={deletingChatId}
                        binaryTitle={binaryTitle}
                        theme={theme}
                        onSelectChat={onSelectChat}
                        onRenameChat={onRenameChat}
                        onDeleteChat={onDeleteChat}
                      />
                    ))}

                    <div className={`pt-3 border-t pb-1.5 ${isLight ? "border-gray-200" : "border-white/5"}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary/60 px-2">
                        {t.uncategorized}
                      </span>
                    </div>
                    <SortableContext
                      items={uncategorizedIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {uncategorizedChats.map((chat) => (
                        <SortableChatItem
                          key={chat.id}
                          chat={chat}
                          activeChatId={activeChatId}
                          deletingChatId={deletingChatId}
                          binaryTitle={binaryTitle}
                          theme={theme}
                          onSelect={onSelectChat}
                          onRename={onRenameChat}
                          onDelete={onDeleteChat}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            ) : (
              /* Knowledge View */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <Brain size={14} className="text-text-secondary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">
                      Synaptic Engrams
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-white/5 px-2 py-0.5 rounded-lg border border-white/5 text-indigo-400">
                    {filteredNodes.length} NODES
                  </span>
                </div>

                <div className="mb-4 px-2 relative group">
                  <input
                    type="text"
                    placeholder="Search memory category/content..."
                    value={knowledgeSearch}
                    onChange={(e) => setKnowledgeSearch(e.target.value)}
                    className="w-full bg-tertiary/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs placeholder:text-text-secondary/35 focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-text-primary"
                  />
                  <div className="absolute right-4 top-3 text-text-secondary/30">
                    <Search size={14} />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar pb-6 space-y-2.5 pr-1">
                  <AnimatePresence>
                    {filteredNodes.length > 0 ? (
                      filteredNodes.map((node) => {
                        let difficultyColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/10";
                        if (node.difficulty === "medium") {
                          difficultyColor = "bg-blue-500/10 text-blue-400 border-blue-500/10";
                        } else if (node.difficulty === "hard") {
                          difficultyColor = "bg-amber-500/10 text-amber-500 border-amber-500/10";
                        } else if (node.difficulty === "critical") {
                          difficultyColor = "bg-rose-500/10 text-rose-500 border-rose-500/10";
                        }

                        return (
                          <motion.div
                            key={node.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="p-3 bg-tertiary/30 hover:bg-tertiary/60 border border-white/5 hover:border-indigo-500/25 rounded-2xl transition-all cursor-pointer group flex flex-col gap-2 relative overflow-hidden"
                            onClick={() => setActiveNodeDetail(node)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-black uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                                #{node.category || "GENERAL"}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded border ${difficultyColor}`}>
                                  {node.difficulty?.toUpperCase()}
                                </span>
                                {onDeleteNode && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteNode(node.id);
                                    }}
                                    className="p-1 hover:bg-red-500/15 text-text-secondary/60 hover:text-red-500 rounded-lg transition-colors"
                                    title="Prune node"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-[10.5px] text-text-primary/90 font-medium leading-normal line-clamp-2">
                              {node.content || node.question || "Blank engram"}
                            </p>

                            {node.tags && node.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {node.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className="text-[7px] font-bold text-text-secondary/50 bg-white/5 px-1.5 py-0.5 rounded">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-text-secondary/20 mb-2 flex justify-center">
                          <HardDrive size={24} />
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary/30">
                          No Engrams Match Query
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* Authenticated User Status Footer (Login opened strictly via Ctrl+I) */}
          {user && (
            <div className={`pt-4 border-t flex flex-col gap-3 shrink-0 ${isLight ? "border-gray-200" : "border-white/5"}`}>
              <div className={`flex items-center justify-between p-3 rounded-2xl border group ${
                isLight ? "bg-gray-50 border-gray-200" : "bg-tertiary/30 border-white/5"
              }`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-500 font-black text-xs shrink-0">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-bold text-text-primary truncate">
                      {user.username}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-semibold text-emerald-500">
                        {t.loggedInStatus}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 hover:bg-red-500/10 text-text-secondary hover:text-red-500 rounded-xl transition-all opacity-70 group-hover:opacity-100"
                  title={t.logout}
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Floating Center Overlay Modal for Detailed Node View */}
      <AnimatePresence>
        {activeNodeDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-secondary/95 border border-indigo-500/20 w-full max-w-lg rounded-[2.5rem] overflow-hidden flex flex-col p-8 shadow-2xl relative"
            >
              <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-black uppercase tracking-wider font-mono px-2.5 py-1 rounded bg-indigo-500/15 border border-indigo-500/20 text-indigo-400">
                      #{activeNodeDetail.category || "GENERAL"}
                    </span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                      activeNodeDetail.difficulty === "critical"
                        ? "bg-rose-500/10 text-rose-500 border-rose-500/10"
                        : activeNodeDetail.difficulty === "hard"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/10"
                        : activeNodeDetail.difficulty === "medium"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/10"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/10"
                    }`}>
                      {activeNodeDetail.difficulty || "easy"} LIMIT
                    </span>
                  </div>
                  <h3 className="text-base font-black text-text-primary uppercase tracking-tight">
                    Neural Engram Explorer
                  </h3>
                </div>
                <button
                  onClick={() => setActiveNodeDetail(null)}
                  className="p-2 hover:bg-white/5 rounded-xl border border-white/5 text-text-secondary hover:text-text-primary transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[50vh] pr-1 space-y-4 no-scrollbar">
                {activeNodeDetail.question && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-black uppercase text-indigo-400/70 tracking-widest">
                      SYNAPSE QUERY / FOCUS
                    </h4>
                    <p className="text-xs text-text-primary font-bold bg-white/5 p-3 rounded-xl border border-white/5">
                      {activeNodeDetail.question}
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-black uppercase text-indigo-400/70 tracking-widest">
                    SOLVENT CONTENT / MEMORY DATA
                  </h4>
                  <div className="text-xs text-text-secondary leading-relaxed bg-black/35 p-4 rounded-xl border border-white/5 font-mono whitespace-pre-wrap select-text selection:bg-indigo-500/30">
                    {activeNodeDetail.content || activeNodeDetail.answer}
                  </div>
                </div>

                {activeNodeDetail.tags && activeNodeDetail.tags.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-black uppercase text-indigo-400/70 tracking-widest">
                      NEURAL LABELS
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {activeNodeDetail.tags.map((tag) => (
                        <span key={tag} className="text-[9px] font-bold text-text-primary/70 bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/10">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-text-secondary/50 font-mono mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>
                      {new Date(activeNodeDetail.timestamp).toLocaleString(localeMap[language] || 'en-US')}
                    </span>
                  </div>
                  <span>ID: {activeNodeDetail.id.slice(0, 8)}...</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  onClick={() => handleCopy(activeNodeDetail.content || activeNodeDetail.answer || "")}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  {copied ? (
                    <>
                      <Check size={14} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy Content
                    </>
                  )}
                </button>
                <button
                  onClick={() => setActiveNodeDetail(null)}
                  className="px-6 py-3 rounded-xl border border-white/5 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest text-text-secondary transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default React.memo(Sidebar);
