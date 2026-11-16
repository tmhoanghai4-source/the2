
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AIMode, Language, Message, Attachment, GroundingSource, Chat, Folder, Theme, KnowledgeNode, MemoryStats, TerminalLog, WorkspaceFile } from './types';
import { UI_TRANSLATIONS } from './constants';
import { sendMessageStream, clearChatMemory, getMemoryData, deleteMemoryNode, tagMemoryNode, brain } from './masterBrainService';
import MarkdownRenderer from './components/MarkdownRenderer';
import MatrixRain from './components/MatrixRain';
import { NuclearFallout, NukeStage } from './components/NuclearFallout';
import { Auth } from './components/Auth';
import { ImageGenerator } from './components/ImageGenerator';
import NeuralTree from './components/NeuralTree';
import MemoryVisualizer from './components/MemoryVisualizer';
import GalaxyBackground from './components/GalaxyBackground';
import RadioactiveBackground from './components/RadioactiveBackground';
import SortableChatItem from './components/SortableChatItem';
import FolderItem from './components/FolderItem';
import TypingIndicator from './components/TypingIndicator';
import InputPreview from './components/InputPreview';
import AudioVisualizer from './components/AudioVisualizer';
import MessageList from './components/MessageList';
import Sidebar from './components/Sidebar';
import ChatInput from './components/ChatInput';
import FolderTreeModal from './components/FolderTreeModal';
import WorkspaceRunnerModal from './components/WorkspaceRunnerModal';
import ChatJournalModal from './components/ChatJournalModal';
import { PromptBuilder } from './components/PromptBuilder';
import { User, Search, Download, FileText, Move, MoreVertical, X, MessageSquare, Tag, Briefcase, GraduationCap, Menu, Plus, Settings, Globe, Package, Zap, ExternalLink, Moon, Sun, Monitor, Code, Trash2, ChevronLeft, ChevronRight, LayoutGrid, Terminal, Share2, Star, Shield, Command, Activity, Cpu, Database, Network, Palette, Binary, Rainbow, Orbit, Gamepad2, Calendar, Play, FolderCode } from 'lucide-react';
import { buildAsciiTreeFromPaths, downloadZipFromFiles } from './lib/fileGenerator';
import Fuse from 'fuse.js';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const Scanlines: React.FC = () => <div className="scanlines" />;

const LOCALE_BY_LANG: Record<Language, string> = {
  [Language.ENGLISH]: 'en-US',
  [Language.SPANISH]: 'es-ES',
  [Language.FRENCH]: 'fr-FR',
  [Language.GERMAN]: 'de-DE',
  [Language.CHINESE]: 'zh-CN',
  [Language.JAPANESE]: 'ja-JP',
  [Language.VIETNAMESE]: 'vi-VN'
};

const EMPTY_PARTICLES: any[] = [];
const EMPTY_TILT: React.CSSProperties = {};
const EMPTY_MOUSE_POS = { x: 0, y: 0 };

function serializeChatsForStorage(list: Chat[]): Chat[] {
  return list.slice(0, 80).map(chat => ({
    ...chat,
    messages: (chat.messages || []).map(msg => ({
      ...msg,
      attachments: msg.attachments
        ? msg.attachments.map(att => ({
            ...att,
            data: att.data && att.data.length > 24_000 ? '' : att.data,
            textContent:
              att.textContent && att.textContent.length > 60_000
                ? att.textContent.slice(0, 60_000) + '\n... (truncated for storage)'
                : att.textContent,
          }))
        : undefined,
    })),
  }));
}

function parseSuggestionsFromText(raw: string): { cleanText: string; suggestions: string[] } {
  const match = raw.match(/\[SUGGESTIONS:\s*([\s\S]*?)\]/i);
  const cleanText = raw
    .replace(/\[SUGGESTIONS:\s*[\s\S]*?\]/gi, '')
    .replace(/\[SUGGESTIONS:[\s\S]*$/i, '')
    .trim();
  if (!match || !match[1]) {
    return { cleanText, suggestions: [] };
  }
  const rawList = match[1].trim();
  const parts = rawList.includes('|') ? rawList.split('|') : rawList.split(',');
  const seen = new Set<string>();
  const suggestions: string[] = [];
  for (const item of parts) {
    const cleaned = item.replace(/^[\-\d.\s]+/, '').trim();
    if (cleaned.length >= 4 && !seen.has(cleaned.toLowerCase())) {
      seen.add(cleaned.toLowerCase());
      suggestions.push(cleaned);
    }
    if (suggestions.length >= 4) break;
  }
  return { cleanText, suggestions };
}

function buildFallbackSuggestions(
  language: Language,
  mode: AIMode,
  responseText: string,
  workspaceFiles: WorkspaceFile[]
): string[] {
  const isVi = language === Language.VIETNAMESE;
  const hasCode = /```[\s\S]+?```/.test(responseText);
  const hasWorkspace = workspaceFiles.length > 0;
  const hasMediaWorkspace = workspaceFiles.some(
    f => f.mimeType?.startsWith('image/') || f.mimeType?.startsWith('video/') || f.mimeType?.startsWith('audio/') || /\.(png|jpe?g|gif|webp|svg|mp4|mp3|wav)$/i.test(f.name)
  );

  if (hasWorkspace && hasMediaWorkspace) {
    return isVi
      ? [
          'Tạo trang gallery HTML/CSS để xem toàn bộ ảnh/media trong thư mục',
          'Đề xuất cấu trúc sắp xếp và đổi tên tệp trong thư mục gọn gàng hơn',
          'Xuất báo cáo tổng hợp danh sách tệp ra file Markdown hoặc DOCX',
        ]
      : [
          'Generate a responsive HTML/CSS gallery page for these media files',
          'Suggest a clean naming and subfolder organization plan',
          'Export a summary index report of this folder as Markdown or DOCX',
        ];
  }

  if (hasCode && hasWorkspace) {
    return isVi
      ? [
          'Cập nhật đoạn mã này vào tệp phù hợp và kiểm tra lỗi xung đột trong thư mục',
          'Thêm xử lý lỗi (error handling) và tối ưu hiệu năng cho phần code vừa viết',
          'Viết các bước chạy thử trong App Runner và kiểm tra edge cases',
        ]
      : [
          'Integrate this code cleanly into the project files and verify imports',
          'Add error handling and optimize performance for this implementation',
          'Provide quick verification steps to test in App Runner',
        ];
  }

  if (hasCode || mode === AIMode.CODE) {
    return isVi
      ? [
          'Giải thích từng bước luồng hoạt động của đoạn code trên',
          'Tối ưu hiệu năng, bảo mật và bổ sung xử lý ngoại lệ',
          'Viết thêm unit test hoặc ví dụ chạy thử hoàn chỉnh',
        ]
      : [
          'Explain step by step how this code works',
          'Optimize performance and harden error handling',
          'Write unit tests or a complete runnable example',
        ];
  }

  if (mode === AIMode.MATH) {
    return isVi
      ? [
          'Kiểm tra lại kết quả bằng một phương pháp giải khác',
          'Tổng quát hóa công thức và đưa ra ví dụ tương tự',
          'Viết code Python để kiểm chứng kết quả bằng số',
        ]
      : [
          'Verify this solution with an alternative method',
          'Generalize the formula and show a similar example',
          'Write Python code to numerically verify the result',
        ];
  }

  return isVi
    ? [
        'Tóm tắt thành các ý chính ngắn gọn và hành động tiếp theo',
        'Đưa ra ví dụ thực tế minh họa cụ thể hơn',
        'Xuất nội dung này thành tài liệu hoàn chỉnh (.docx hoặc .md)',
      ]
    : [
        'Summarize key takeaways and concrete next steps',
        'Show a practical real-world example',
        'Format this output into a downloadable document (.docx or .md)',
      ];
}

const LiveClock: React.FC<{ theme: Theme; language: Language }> = React.memo(({ theme, language }) => {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono ${
        theme === Theme.LIGHT
          ? 'bg-gray-100 border-gray-200 text-gray-700'
          : 'bg-white/5 border-white/10 text-text-secondary'
      }`}
    >
      <Calendar size={13} className="text-blue-500" />
      <span className="font-semibold text-text-primary">
        {now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
      </span>
      <span className="opacity-40">•</span>
      <span>
        {now.toLocaleTimeString(LOCALE_BY_LANG[language] || 'vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })}
      </span>
    </div>
  );
});

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('tm_language');
    return saved && Object.values(Language).includes(saved as Language)
      ? (saved as Language)
      : Language.VIETNAMESE;
  }); 
  const [input, setInput] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isOverloadActive, setIsOverloadActive] = useState(false);
  const [isNeuralTreeOpen, setIsNeuralTreeOpen] = useState(false);
  const [nodeUpdate, setNodeUpdate] = useState(0);
  const [isApiOnline, setIsApiOnline] = useState(true);
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>(() => {
    const saved = localStorage.getItem('tm-terminal-logs');
    return saved ? JSON.parse(saved) : [];
  });
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('tm-terminal-logs', JSON.stringify(terminalLogs));
  }, [terminalLogs]);

  useEffect(() => {
    const savedUser = localStorage.getItem('shadow_brain_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      brain.setUserId(u.email);
      addTerminalLog(`USER_SYNC: Đã khôi phục phiên của ${u.username}`, 'success' as any);
    } else {
      addTerminalLog('USER_SYNC: Đang chạy với tư cách Khách (Guest)', 'warn');
    }
  }, []);

  const handleAuthSuccess = (userData: any) => {
    setUser(userData);
    localStorage.setItem('shadow_brain_user', JSON.stringify(userData));
    setIsAuthModalOpen(false);
    brain.setUserId(userData.email);
    addTerminalLog(`AUTH: Chào mừng ${userData.username} đã quay trở lại!`, 'success' as any);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('shadow_brain_user');
    brain.setUserId('guest');
    addTerminalLog('AUTH: Đã đăng xuất. Quay lại chế độ Khách.', 'warn');
  };

  const addTerminalLog = (message: string, type: TerminalLog['type'] = 'info') => {
    const newLog: TerminalLog = {
      id: Date.now().toString() + Math.random(),
      type,
      message,
      timestamp: Date.now()
    };
    setTerminalLogs(prev => [...prev.slice(-100), newLog]);
  };

  const handleTerminalCommand = async (cmd: string) => {
    const command = cmd.trim().toLowerCase();
    addTerminalLog(`# ${command}`, 'info');

    const runProcessing = async (duration = 500) => {
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const bar = '[' + '='.repeat(i) + ' '.repeat(steps - i) + ']';
        const progress = Math.floor((i / steps) * 100);
        if (i === steps) addTerminalLog(`${bar} ${progress}% COMPLETE`, 'system');
        await new Promise(r => setTimeout(r, duration / steps));
      }
    };

    if (command === 'matrix_overload') {
      addTerminalLog('CRITICAL OVERLOAD INITIATED...', 'error');
      setIsOverloadActive(true);
      await runProcessing(1000);
      
      const startTime = Date.now();
      const interval = setInterval(() => {
        const randomHex = Math.random().toString(16).slice(2, 10).toUpperCase();
        const types: TerminalLog['type'][] = ['neural', 'system', 'logic', 'info', 'warn'];
        const type = types[Math.floor(Math.random() * types.length)];
        addTerminalLog(`DUMP_0x${randomHex}: CACHE_FLUSH | NEURON_ID: ${Math.random().toString(36).slice(2, 8)} | STATUS: OK`, type);
        
        if (Date.now() - startTime > 5000) {
          clearInterval(interval);
          setIsOverloadActive(false);
          addTerminalLog('--- OVERLOAD SEQUENCE TERMINATED ---', 'system');
          addTerminalLog('ALL DATA DUMPED TO PERSISTENT BUFFER.', 'success' as any);
        }
      }, 50);
      return;
    }

    if (command === 'commands' || command === '/list') {
      await runProcessing(300);
      addTerminalLog('--- OS COMMAND CATALOG v14.2 ---', 'system');
      const coreCmds = [
        { cmd: 'ls', desc: 'List all neural knowledge nodes in deep memory' },
        { cmd: 'stats', desc: 'Display core IQ, cognitive level and memory metrics' },
        { cmd: 'iq', desc: 'Check current reasoning engine level and performance' },
        { cmd: 'neurons', desc: 'Visualize Neural Tree with TM center' },
        { cmd: 'env', desc: 'Show kernel environment, uptime and system theme' },
        { cmd: 'raw', desc: 'Perform a raw memory dump of the most recent node' },
        { cmd: 'clear', desc: 'Purge all terminal session logs from buffer' },
        { cmd: 'matrix_overload', desc: 'Initiate 5-second technical data storm' },
        { cmd: '/list', desc: 'View this command and function directory' }
      ];
      
      coreCmds.forEach(c => {
        addTerminalLog(`[${c.cmd.toUpperCase()}]: ${c.desc}`, 'info');
      });

      const sysTools = ['cpu', 'ram', 'net', 'kernel', 'shadow', 'cortex', 'axon', 'root', 'binary', 'hex', 'scan', 'ping', 'whoami', 'uptime', 'logs', 'top', 'kill', 'learn', 'save', 'load', 'hack', 'shield', 'overdrive', 'sleep'];
      addTerminalLog('--- EXTENDED DIAGNOSTIC TOOLS ---', 'system');
      addTerminalLog(sysTools.join(' | '), 'system');
      addTerminalLog('... TOTAL 100+ OPERATIONS READY.', 'system');
      return;
    }

    await runProcessing(200);

    switch (command) {
      case 'quota-sim':
        addTerminalLog('CRITICAL: SIMULATING API QUOTA EXHAUD (CODE_429)', 'error');
        addTerminalLog('Neural Engine: Switching to ShadowBrain Fallback...', 'warn');
        setIsApiOnline(false);
        setTimeout(() => {
          setIsApiOnline(true);
          addTerminalLog('SIMULATION ENDED: System back to Cloud API.', 'system');
        }, 10000);
        break;
      case 'vision-ext':
        addTerminalLog('INITIATING MULTI-STREAM VISION PROCESSING...', 'neural');
        addTerminalLog('CAPACITY INCREASED: > 20 Image buffers active.', 'system');
        break;
      case 'help':
        addTerminalLog('AVAILABLE COMMANDS:', 'system');
        addTerminalLog('ls        - LIST MEMORY NODES', 'info');
        addTerminalLog('stats     - CORE SYSTEM METRICS', 'info');
        addTerminalLog('iq        - COGNITIVE LEVEL STATUS', 'info');
        addTerminalLog('neurons   - NEURAL TREE VISUALIZATION', 'info');
        addTerminalLog('env       - KERNEL ENVIRONMENT', 'info');
        addTerminalLog('raw       - RECENT MEMORY DUMP', 'info');
        addTerminalLog('clear     - PURGE TERMINAL LOGS', 'info');
        addTerminalLog('quota-sim - SIMULATE 429 ERROR', 'warn');
        addTerminalLog('vision-ext- ENHANCE VISION BUFFER', 'neural');
        addTerminalLog('chess     - VIEW REAL-TIME CHESS.COM PROFILE & STATS', 'success' as any);
        break;
      case 'online':
        setIsApiOnline(true);
        addTerminalLog('MASTER INTEL_CORE API: ACTIVE & READY (ONLINE MODE)', 'success' as any);
        break;
      case 'offline':
        setIsApiOnline(false);
        addTerminalLog('MASTER INTEL_CORE API: RUNNING IN LOCAL NEURAL BRIDGE', 'warn');
        break;
      case 'clear':
        setTerminalLogs([]);
        break;
      case 'stats':
        const stats = brain.getContext().memoryStats;
        addTerminalLog('--- THEMASTER CORE STATS ---', 'system');
        addTerminalLog(`Total Nodes: ${stats.totalNodes}`, 'info');
        if (user?.role === 'admin') {
          addTerminalLog(`API Status: ${isApiOnline ? 'ONLINE' : 'OFFLINE'}`, isApiOnline ? 'success' as any : 'warn');
        }
        addTerminalLog(`IQ Level: ${brain.getCognitiveLevel()}`, 'info');
        addTerminalLog(`Stability: 100% (TheMaster Authorized)`, 'info');
        break;
      case 'iq':
        addTerminalLog(`COGNITIVE STATUS: [THEMASTER LEVEL ${brain.getCognitiveLevel()}]`, 'system');
        addTerminalLog('Reasoning Engine: THEMASTER-REASONING v2.4', 'info');
        addTerminalLog(`Total Memory Nodes: ${brain.getMemoryNodes().length}`, 'info');
        const nextLevel = (Math.floor(brain.getMemoryNodes().length / 40) + 1) * 40;
        addTerminalLog(`Next Evolution: ${brain.getMemoryNodes().length}/${nextLevel} nodes`, 'warn');
        break;
      case 'cpu':
        const cpuLoad = (Math.random() * 5 + 1).toFixed(2);
        addTerminalLog(`TM_PROCESSOR_LOAD: ${cpuLoad}%`, 'system');
        addTerminalLog(`Status: Optimal | Heat: 36°C`, 'info');
        break;
      case 'ram':
        const ramUsed = (Math.random() * 50 + 200).toFixed(0);
        addTerminalLog(`TM_MEMORY_VOLTAGE: ${ramUsed}MB / 8.0GB`, 'system');
        addTerminalLog(`Integrity: 100%`, 'info');
        break;
      case 'net':
        addTerminalLog(`TM_NETWORK: ENCRYPTED_TUNNEL`, 'system');
        addTerminalLog(`Latency: ${Math.floor(Math.random() * 10 + 2)}ms`, 'info');
        break;
      case 'neurons':
        if (user?.role === 'admin') {
          addTerminalLog('INITIATING THEMASTER NEURAL PROJECTION...', 'neural');
          setTimeout(() => setIsNeuralTreeOpen(true), 500);
        } else {
          addTerminalLog('ACCESS DENIED: Neural visualization is restricted to TheMaster.', 'error');
        }
        break;
      case 'ls':
        const brainNodes = brain.getMemoryNodes();
        if (brainNodes.length === 0) {
          addTerminalLog('Hệ thống trống. Chờ đợi dữ liệu từ Bạn.', 'warn');
        } else {
          addTerminalLog(`DANH MỤC TRI THỨC: ${brainNodes.length} NODES`, 'system');
          brainNodes.slice(0, 15).forEach(n => {
            const size = (JSON.stringify(n).length / 1024).toFixed(2);
            addTerminalLog(`[NODE: ${n.id}] ${n.category} | ${size}KB | ${n.difficulty.toUpperCase()}`, 'neural');
          });
        }
        break;
      case 'env':
        addTerminalLog('OS: TheMaster OS v2.0', 'system');
        addTerminalLog(`Kernel Center: TheMaster`, 'system');
        addTerminalLog(`Uptime: ${Math.floor(performance.now() / 1000)}s`, 'system');
        break;
      case 'raw':
        const lastNode = brain.getMemoryNodes()[0];
        if (lastNode) {
          addTerminalLog(`RAW DUMP [${lastNode.id}]:`, 'neural');
          addTerminalLog(JSON.stringify(lastNode, null, 2).slice(0, 500), 'neural');
        }
        break;
      case 'chess':
      case '/chess':
        addTerminalLog('FETCHING CHESS.COM DATA FOR TM_KINGREAL...', 'neural');
        try {
          const res = await fetch('/api/chess/profile');
          if (!res.ok) throw new Error('Không thể tải dữ liệu từ máy chủ TheMaster');
          const data = await res.json();
          const p = data.profile;
          const s = data.stats;
          const clubs = data.clubs || [];
          
          addTerminalLog(`♟️ CHESS.COM PROFILE: ${p.username || 'tm_kingreal'} (${p.title || 'PLAYER'})`, 'success' as any);
          addTerminalLog(`➜ Followers: ${p.followers || 0} | Trạng thái: ${p.status || 'Active'}`, 'info');
          addTerminalLog(`➜ Liên kết: ${p.url}`, 'info');
          
          if (s.chess_rapid) {
            addTerminalLog(`⚡ RAPID RATING: ${s.chess_rapid.last?.rating} (Cao nhất: ${s.chess_rapid.best?.rating})`, 'neural');
          }
          if (s.chess_blitz) {
            addTerminalLog(`🔥 BLITZ RATING: ${s.chess_blitz.last?.rating} (Cao nhất: ${s.chess_blitz.best?.rating})`, 'neural');
          }
          if (s.tactics) {
            addTerminalLog(`🧩 TACTICS HIGHEST: ${s.tactics.highest?.rating}`, 'info');
          }
          
          // Lọc câu lạc bộ người dùng quản lý
          const managedClubs = clubs.filter((c: any) => 
            c.url?.includes('never-give-up') || c.url?.includes('vietnam-group')
          );
          addTerminalLog(`👥 CÂU LẠC BỘ ACTIVE: ${clubs.length}`, 'system');
          if (managedClubs.length > 0) {
            managedClubs.forEach((c: any) => {
              addTerminalLog(`   ● Managed Club: ${c.name} (${c.url})`, 'success' as any);
            });
          } else {
            addTerminalLog(`   ● Managed Club: Never Give Up Club & Vietnam Group`, 'success' as any);
          }
        } catch (err: any) {
          addTerminalLog(`ERROR FETCHING CHESS DATA: ${err.message}`, 'error');
        }
        break;
      default:
        addTerminalLog(`COMMAND NOT RECOGNIZED: ${command}`, 'error');
        addTerminalLog('TYPE "HELP" FOR SUPPORTED COMMANDS.', 'info');
    }
  };
  const [memoryData, setMemoryData] = useState<{ nodes: KnowledgeNode[], stats: MemoryStats } | null>(null);
  const [defaultAIMode, setDefaultAIMode] = useState<AIMode>(() => {
    const saved = localStorage.getItem('tm-default-mode');
    return (saved as AIMode) || AIMode.CHAT;
  });
  const [mode, setMode] = useState<AIMode>(defaultAIMode);

  const getModeStyles = (mode: AIMode) => {
    switch (mode) {
      case AIMode.CODE:
        return {
          glow: 'from-emerald-500 via-green-500 to-teal-500',
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-500/5',
          icon: '💻',
          label: 'Code Mode',
          animationClass: 'mode-code-scanline',
          bubble: 'border-emerald-500/20 shadow-emerald-500/5',
          aiIcon: 'bg-emerald-600'
        };
      case AIMode.MATH:
        return {
          glow: 'from-blue-400 via-cyan-400 to-sky-400',
          border: 'border-blue-400/30',
          bg: 'bg-blue-400/5',
          icon: '🔢',
          label: 'Math Mode',
          animationClass: 'mode-math-bg',
          bubble: 'border-blue-400/20 shadow-blue-400/5',
          aiIcon: 'bg-blue-600'
        };
      case AIMode.TRADING:
        return {
          glow: 'from-amber-400 via-yellow-400 to-orange-400',
          border: 'border-amber-400/30',
          bg: 'bg-amber-400/5',
          icon: '📈',
          label: 'Trading Mode',
          animationClass: 'animate-pulse',
          bubble: 'border-amber-400/20 shadow-amber-400/5',
          aiIcon: 'bg-amber-600'
        };
      case AIMode.RESEARCH:
        return {
          glow: 'from-purple-400 via-indigo-400 to-violet-400',
          border: 'border-purple-400/30',
          bg: 'bg-purple-400/5',
          icon: '📚',
          label: 'Research Mode',
          animationClass: 'opacity-20',
          bubble: 'border-purple-400/20 shadow-purple-400/5',
          aiIcon: 'bg-purple-600'
        };
      case AIMode.DEEP:
        return {
          glow: 'from-fuchsia-500 via-pink-500 to-rose-500',
          border: 'border-fuchsia-500/30',
          bg: 'bg-fuchsia-500/5',
          icon: '🧠',
          label: 'Deep Analysis',
          animationClass: 'mode-deep-pulse',
          bubble: 'border-fuchsia-500/20 shadow-fuchsia-500/5',
          aiIcon: 'bg-fuchsia-600'
        };
      case AIMode.FAST:
        return {
          glow: 'from-orange-500 via-red-500 to-yellow-500',
          border: 'border-orange-500/30',
          bg: 'bg-orange-500/5',
          icon: '⚡',
          label: 'Fast Mode',
          animationClass: 'mode-fast-lines',
          bubble: 'border-orange-500/20 shadow-orange-500/5',
          aiIcon: 'bg-orange-600'
        };
      case AIMode.CREATIVE:
        return {
          glow: 'from-pink-400 via-purple-400 to-indigo-400',
          border: 'border-pink-400/30',
          bg: 'bg-pink-400/5',
          icon: '🎨',
          label: 'Creative Mode',
          animationClass: 'mode-creative-sparkle',
          bubble: 'border-pink-400/20 shadow-pink-400/5',
          aiIcon: 'bg-pink-600'
        };
      case AIMode.APP_PREVIEW:
        return {
          glow: 'from-emerald-500 via-teal-500 to-cyan-500',
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-500/5',
          icon: '▶',
          label: 'App Runner',
          animationClass: '',
          bubble: 'border-emerald-500/20 shadow-emerald-500/5',
          aiIcon: 'bg-emerald-600'
        };
      default:
        return {
          glow: 'from-blue-600 via-indigo-600 to-purple-600',
          border: 'border-white/10',
          bg: 'bg-white/5',
          icon: '💬',
          label: 'Chat Mode',
          animationClass: '',
          bubble: 'border-white/5 shadow-black/20',
          aiIcon: 'bg-gradient-to-br from-blue-600 to-indigo-700'
        };
    }
  };

  const modeStyles = getModeStyles(mode);
  const [isAssistantResponding, setIsAssistantResponding] = useState(false);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [workspaceName, setWorkspaceName] = useState<string>('my-project');
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState<boolean>(false);
  const [isJournalOpen, setIsJournalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [replyTo, setReplyTo] = useState<{ id: string, text: string, role: string } | null>(null);
  const [selection, setSelection] = useState<{ text: string, x: number, y: number } | null>(null);
  const [theme, setTheme] = useState<Theme>(Theme.DARK);
  const [isPromptBuilderActive, setIsPromptBuilderActive] = useState(false);
  const [isEcoMode, setIsEcoMode] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isMatrixMode, setIsMatrixMode] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isCustomTreeOpen, setIsCustomTreeOpen] = useState(false);
  const [isMatrixFading, setIsMatrixFading] = useState(false);
  const [isCyberpunkDeleting, setIsCyberpunkDeleting] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [chargeProgress, setChargeProgress] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const chargeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [ripples, setRipples] = useState<{id: number, x: number, y: number}[]>([]);
  const [matrixDrops, setMatrixDrops] = useState<{id: number, x: number, y: number, char: string}[]>([]);
  const [binaryTitle, setBinaryTitle] = useState('');
  const [isExploding, setIsExploding] = useState(false);
  const [isNuking, setIsNuking] = useState(false);
  const [nukeStage, setNukeStage] = useState<NukeStage>('idle');
  const [isUiHidden, setIsUiHidden] = useState(false);
  const [nukeCenter, setNukeCenter] = useState<{ x: number; y: number } | undefined>(undefined);
  const chatBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleCtrlI = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setIsAuthModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleCtrlI);
    return () => window.removeEventListener('keydown', handleCtrlI);
  }, []);

  const [isSending, setIsSending] = useState(false);
  const [mentionMenu, setMentionMenu] = useState<{ show: boolean, search: string } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [matrixTrigger, setMatrixTrigger] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isThinking) {
      let p = 0;
      const interval = setInterval(() => {
        p += Math.random() * 5;
        if (p >= 100) p = 0;
        setProgress(p);
      }, 200);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isThinking]);

  useEffect(() => {
    if (theme === Theme.MATRIX) {
      setMatrixTrigger(prev => prev + 1);
    }
  }, [theme]);

  const [rpd, setRpd] = useState<{ count30: number; count25: number; lastReset: string }>(() => {
    const saved = localStorage.getItem('tm_rpd_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      const today = new Date().toLocaleDateString();
      if (parsed.lastReset === today) return parsed;
    }
    return { count30: 0, count25: 0, lastReset: new Date().toLocaleDateString() };
  });
  const [rpm, setRpm] = useState<{ count30: number; count25: number; lastMinute: number }>({ count30: 0, count25: 0, lastMinute: Math.floor(Date.now() / 60000) });
  const currentModel = 'gemini-2.5-flash-lite';
  const [promptBuilder, setPromptBuilder] = useState({
    role: '',
    context: '',
    task: '',
    constraints: '',
    format: ''
  });
  
  const [isIntroActive, setIsIntroActive] = useState(true);
  const [introText, setIntroText] = useState('');
  const [isUpdatesModalOpen, setIsUpdatesModalOpen] = useState(false);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [manualKnowledge, setManualKnowledge] = useState({ 
    content: '', 
    category: 'Chat', 
    sourceType: 'manual_ans',
    question: '',
    answer: '',
    tags: ''
  });
  const [votes, setVotes] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('tm_votes_v2');
    return saved ? JSON.parse(saved) : {};
  });

  const [chats, setChats] = useState<Chat[]>([]);
  const [folders, setFolders] = useState<Folder[]>([
    { id: 'work', name: 'Công việc', color: '#3b82f6', icon: 'work' },
    { id: 'study', name: 'Học tập', color: '#10b981', icon: 'study' },
    { id: 'personal', name: 'Cá nhân', color: '#f59e0b', icon: 'personal' }
  ]);
  const [chatSearch, setChatSearch] = useState('');
  const [chatSearchMode, setChatSearchMode] = useState<AIMode | 'All'>('All');
  const [chatSearchDateFrom, setChatSearchDateFrom] = useState('');
  const [chatSearchDateTo, setChatSearchDateTo] = useState('');
  const [isSidebarSearchExpanded, setIsSidebarSearchExpanded] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredChats = React.useMemo(() => {
    let result = chats;
    
    if (chatSearchMode !== 'All') {
      result = result.filter(c => c.mode === chatSearchMode);
    }

    if (chatSearchDateFrom) {
      const from = new Date(chatSearchDateFrom).getTime();
      result = result.filter(c => (c.lastTimestamp || 0) >= from);
    }
    if (chatSearchDateTo) {
      const to = new Date(chatSearchDateTo);
      to.setDate(to.getDate() + 1);
      const toTime = to.getTime();
      result = result.filter(c => (c.lastTimestamp || 0) < toTime);
    }

    if (!chatSearch.trim()) return result;
    
    const fuse = new Fuse(result, {
      keys: ['title', 'messages.content'],
      threshold: 0.4,
      ignoreLocation: true
    });

    return fuse.search(chatSearch).map(res => res.item);
  }, [chats, chatSearch, chatSearchMode, chatSearchDateFrom, chatSearchDateTo]);

  const [chatJournal, setChatJournal] = useState<Chat[]>([]);
  const loadedChatsPrefixRef = useRef<string | null>(null);
  const isNearBottomRef = useRef<boolean>(true);

  useEffect(() => {
    const backupInterval = setInterval(() => {
      try {
        const backupData = {
          chats: serializeChatsForStorage(chats),
          folders,
          brainNodes: getMemoryData()
        };
        localStorage.setItem('themaster_backup', JSON.stringify(backupData));
        addTerminalLog(`SYSTEM: Scheduled data backup completed successfully.`, 'neural');
      } catch {
        // ignore quota errors
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(backupInterval);
  }, [chats, folders]);

  const syncToCloud = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setAuthLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    addTerminalLog(`CLOUD_SYNC: Master Cluster synchronization complete. Integrity check: 100%.`, 'neural');
    setAuthLoading(false);
  };

  const exportChatAsMarkdown = () => {
    const activeChatVisible = chats.find(chat => chat.id === activeChatId);
    if (!activeChatVisible) return;

    let markdown = `# ${activeChatVisible.title}\n\n`;
    markdown += `Exported on: ${new Date().toLocaleString()}\n`;
    markdown += `Model: TheMaster (3.8 Flash)\n\n---\n\n`;

    activeChatVisible.messages.forEach(message => {
      const role = message.role === 'user' ? 'USER' : 'THEMASTER';
      const time = new Date(message.timestamp).toLocaleTimeString();
      markdown += `### [${role}] - ${time}\n\n`;
      markdown += `${message.content}\n\n`;
      if (message.thought) {
        markdown += `> Thought: ${message.thought}\n\n`;
      }
      markdown += `---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Chat_${activeChatVisible.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    addTerminalLog(`SYSTEM: Threads exported as Markdown.`, 'success' as any);
  };
  const [isWarping, setIsWarping] = useState(false);
  const [isBlackHoleActive, setIsBlackHoleActive] = useState(false);
  const [isSucking, setIsSucking] = useState(false);
  const [isShrinking, setIsShrinking] = useState(false);
  const [accretionIntensity, setAccretionIntensity] = useState(0);
  const [supernovaTrigger, setSupernovaTrigger] = useState(0);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const t = UI_TRANSLATIONS[language];

  useEffect(() => {
    const checkApiStatus = () => {
      addTerminalLog(`--- THEMASTER ONLINE ---`, 'system');
      addTerminalLog(`TheMaster (3.8 Flash) ready.`, 'info');
      setTimeout(() => setIsIntroActive(false), 300);
    };
    checkApiStatus();
  }, []);

  useEffect(() => {
    const userPrefix = user?.email || 'guest';
    let parsedChats: Chat[] = [];
    let parsedJournal: Chat[] = [];

    try {
      const saved = localStorage.getItem(`tm_chats_v2_${userPrefix}`);
      if (saved) {
        const data = JSON.parse(saved);
        if (Array.isArray(data)) parsedChats = data;
      }
    } catch {
      parsedChats = [];
    }

    try {
      const savedJournal = localStorage.getItem(`tm_chat_journal_v1_${userPrefix}`);
      if (savedJournal) {
        const jData = JSON.parse(savedJournal);
        if (Array.isArray(jData)) parsedJournal = jData;
      }
    } catch {
      parsedJournal = [];
    }

    if (parsedJournal.length === 0 && parsedChats.some(c => c.messages && c.messages.length > 0)) {
      parsedJournal = parsedChats.filter(c => c.messages && c.messages.length > 0);
    }

    loadedChatsPrefixRef.current = userPrefix;
    setChats(parsedChats);
    setChatJournal(parsedJournal);
    setActiveChatId(null);
    setMessages([]);
  }, [user?.email]);

  useEffect(() => {
    const userPrefix = user?.email || 'guest';
    try {
      const saved = localStorage.getItem(`tm_folders_v2_${userPrefix}`);
      if (saved) {
        setFolders(JSON.parse(saved));
      } else {
        setFolders([
          { id: 'work', name: 'Công việc', color: '#3b82f6', icon: 'work' },
          { id: 'study', name: 'Học tập', color: '#10b981', icon: 'study' },
          { id: 'personal', name: 'Cá nhân', color: '#f59e0b', icon: 'personal' }
        ]);
      }
    } catch {
      // ignore parse errors
    }
  }, [user?.email]);

  useEffect(() => {
    const userPrefix = user?.email || 'guest';
    if (loadedChatsPrefixRef.current !== userPrefix) return;

    try {
      localStorage.setItem(`tm_chats_v2_${userPrefix}`, JSON.stringify(serializeChatsForStorage(chats)));
    } catch {
      // storage full fallback: keep latest 25 chats
      try {
        localStorage.setItem(`tm_chats_v2_${userPrefix}`, JSON.stringify(serializeChatsForStorage(chats.slice(0, 25))));
      } catch {
        // ignore
      }
    }

    const nonEmpty = chats.filter(c => c.messages && c.messages.length > 0);
    if (nonEmpty.length > 0) {
      setChatJournal(prev => {
        const map = new Map<string, Chat>();
        for (const item of prev) map.set(item.id, item);
        let changed = false;
        for (const c of nonEmpty) {
          const existing = map.get(c.id);
          if (
            !existing ||
            existing.messages.length !== c.messages.length ||
            existing.lastTimestamp !== c.lastTimestamp ||
            existing.title !== c.title
          ) {
            map.set(c.id, serializeChatsForStorage([c])[0]);
            changed = true;
          }
        }
        return changed
          ? Array.from(map.values()).sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0)).slice(0, 120)
          : prev;
      });
    }
  }, [chats, user?.email]);

  useEffect(() => {
    const userPrefix = user?.email || 'guest';
    if (loadedChatsPrefixRef.current !== userPrefix) return;
    try {
      localStorage.setItem(`tm_chat_journal_v1_${userPrefix}`, JSON.stringify(serializeChatsForStorage(chatJournal)));
    } catch {
      try {
        localStorage.setItem(`tm_chat_journal_v1_${userPrefix}`, JSON.stringify(serializeChatsForStorage(chatJournal.slice(0, 40))));
      } catch {
        // ignore
      }
    }
  }, [chatJournal, user?.email]);

  useEffect(() => {
    const userPrefix = user?.email || 'guest';
    if (loadedChatsPrefixRef.current !== userPrefix) return;
    try {
      localStorage.setItem(`tm_folders_v2_${userPrefix}`, JSON.stringify(folders));
    } catch {
      // ignore
    }
  }, [folders, user?.email]);

  useEffect(() => {
    localStorage.setItem('tm_votes_v2', JSON.stringify(votes));
  }, [votes]);

  useEffect(() => {
    localStorage.setItem('tm_rpd_v2', JSON.stringify(rpd));
  }, [rpd]);

  useEffect(() => {
    localStorage.setItem('tm_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    document.documentElement.classList.remove('dark', 'light', 'matrix', 'cyberpunk', 'galaxy');
    
    switch (theme) {
      case Theme.DARK:
        document.documentElement.classList.add('dark');
        break;
      case Theme.LIGHT:
        document.documentElement.classList.add('light');
        break;
      case Theme.MATRIX:
        document.documentElement.classList.add('matrix', 'dark');
        break;
      case Theme.CYBERPUNK:
        document.documentElement.classList.add('cyberpunk', 'dark');
        break;
      case Theme.GALAXY:
        document.documentElement.classList.add('galaxy', 'dark');
        break;
      default:
        document.documentElement.classList.add('dark');
    }
  }, [theme]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setMessages(prev => {
        let changed = false;
        const newMessages = prev.map(msg => {
          if (msg.countdownEnd && msg.countdownEnd > now) {
            const secondsLeft = Math.ceil((msg.countdownEnd - now) / 1000);
            const hours = Math.floor(secondsLeft / 3600);
            const minutes = Math.floor((secondsLeft % 3600) / 60);
            const seconds = secondsLeft % 60;
            
            let timeStr = '';
            if (hours > 0) timeStr = `${hours} giờ ${minutes} phút`;
            else if (minutes > 0) timeStr = `${minutes} phút ${seconds} giây`;
            else timeStr = `${seconds} giây`;

            const newContent = msg.content.replace(/vui lòng chờ ".*?"/gi, `vui lòng chờ "${timeStr}"`);
            if (newContent !== msg.content) {
              changed = true;
              return { ...msg, content: newContent };
            }
          }
          return msg;
        });
        return changed ? newMessages : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeChatId && messages.length > 0) {
      setChats(prev => {
        let changed = false;
        const next = prev.map(c => {
          if (c.id === activeChatId) {
            if (c.messages === messages) return c;
            const firstUserMsg = messages.find(m => m.role === 'user');
            const isDefaultTitle =
              !c.title ||
              c.title === 'Cuộc trò chuyện mới' ||
              Object.values(UI_TRANSLATIONS).some(tr => tr.newChat === c.title);
            const title =
              isDefaultTitle && firstUserMsg
                ? firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')
                : c.title;
            changed = true;
            return { ...c, messages, title, lastTimestamp: Date.now() };
          }
          return c;
        });
        return changed ? next : prev;
      });
    }
  }, [messages, activeChatId]);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      setTimeout(() => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0 && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          let node: Node | null = sel.anchorNode;
          let isInsideMessage = false;
          while (node) {
            if (node instanceof HTMLElement && node.classList.contains('markdown-body')) {
              isInsideMessage = true;
              break;
            }
            node = node.parentNode;
          }

          if (isInsideMessage) {
            setSelection({
              text: sel.toString().trim(),
              x: rect.left + rect.width / 2,
              y: rect.top - 50
            });
            return;
          }
        }
        setSelection(null);
      }, 10);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMessagesScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  }, []);

  const scrollToBottom = useCallback((instant = false) => {
    const el = scrollRef.current;
    if (!el) return;
    if (instant) {
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    if (!isNearBottomRef.current && messages.length > 0) return;
    scrollToBottom(isThinking);
  }, [messages, isThinking, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isThinking) return;
    const value = e.target.value;

    if (value.length <= 2065) {
      setInput(value);

      const cursorPosition = e.target.selectionStart;
      const textBeforeCursor = value.substring(0, cursorPosition);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        setMentionMenu({ show: true, search: mentionMatch[1] });
        setMentionIndex(0);
      } else {
        setMentionMenu(null);
      }

      if (value.length > 0) {
        const commonPrompts = [
          'how to build a website',
          'what is the meaning of life',
          'tell me a joke',
          'write a poem about space',
          'explain quantum physics',
          'how to code in typescript',
          'what is the weather today',
          'create a react component',
          'tóm tắt nội dung này',
          'dịch sang tiếng việt',
          'giải thích đoạn mã này',
          'viết một bài thơ về tình yêu',
          'cách nấu món phở bò',
          'lịch sử việt nam tóm tắt',
          'thời tiết hôm nay thế nào',
          'kể một câu chuyện cười',
          'viết code python cơ bản',
          'hướng dẫn học lập trình',
          'những địa điểm du lịch đẹp',
          'công thức làm bánh mì'
        ];
        const match = commonPrompts.find(p => p.toLowerCase().startsWith(value.toLowerCase()) && p.length > value.length);
        setSuggestion(match ? match.slice(value.length) : '');
      } else {
        setSuggestion('');
      }
    }
  }, [isThinking]);

  const getMagicChips = () => {
    const text = input.toLowerCase();
    const chips = [];
    if (text.includes('code') || text.includes('lập trình') || text.includes('python') || text.includes('js')) {
      chips.push({ label: t.chipCode, action: () => setMode(AIMode.CODE), color: 'text-blue-400 bg-blue-500/10' });
    }
    if (text.includes('ảnh') || text.includes('vẽ') || text.includes('image') || text.includes('tranh')) {
      chips.push({ label: t.chipCreative, action: () => setMode(AIMode.CREATIVE), color: 'text-purple-400 bg-purple-500/10' });
    }
    if (text.includes('tính') || text.includes('toán') || text.includes('math') || text.includes('giải')) {
      chips.push({ label: t.chipMath, action: () => setMode(AIMode.MATH), color: 'text-emerald-400 bg-emerald-500/10' });
    }
    if (text.includes('dịch') || text.includes('translate')) {
      chips.push({ label: t.chipTranslate, action: () => setPromptBuilder({...promptBuilder, task: t.chipTranslatePrompt}), color: 'text-orange-400 bg-orange-500/10' });
    }
    return chips;
  };

  const magicChips = getMagicChips();

  const triggerNuke = (x?: number, y?: number) => {
    setNukeCenter(x && y ? { x, y } : undefined);
    setNukeStage('missile');
    setTimeout(() => {
      setNukeStage('flash');
      setIsUiHidden(true);
    }, 1500);
    setTimeout(() => {
      setNukeStage('explosion');
      setInput(''); 
    }, 1700);
    setTimeout(() => setNukeStage('emp-blackout'), 3000);
    setTimeout(() => setNukeStage('aftermath'), 5000);
    
    setTimeout(() => {
      setNukeStage('idle');
      setTimeout(() => setIsUiHidden(false), 2000);
    }, 8000); 
  };

  const handleClear = () => {
    if (isThinking) return;
    if (theme === Theme.PIXEL) {
      if (chatBarRef.current) {
        const rect = chatBarRef.current.getBoundingClientRect();
        triggerNuke(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      return;
    }

    if (theme === Theme.GALAXY) {
      setIsBlackHoleActive(true);
      setTimeout(() => {
        setIsSucking(true); 
        setTimeout(() => {
          setIsSucking(false);
          setIsBlackHoleActive(false);
          setInput('');
          
          setIsShrinking(true);
          
          setTimeout(() => {
            setIsShrinking(false);
            setIsExploding(true);
            
            setSupernovaTrigger(prev => prev + 1);
            
            setTimeout(() => {
              setIsExploding(false);
              setAccretionIntensity(0);
            }, 1000); 
            
          }, 2000); 
          
        }, 4000);
      }, 500);
      return;
    }

    if (theme === Theme.MATRIX) {
      const originalText = input;
      let currentText = originalText.split('');
      setIsMatrixFading(true);
      
      const interval = setInterval(() => {
        let changed = false;
        for (let i = 0; i < Math.max(2, Math.floor(currentText.length / 3)); i++) {
          const index = Math.floor(Math.random() * currentText.length);
          if (currentText[index] !== '0' && currentText[index] !== '1') {
            currentText[index] = Math.random() > 0.5 ? '0' : '1';
            changed = true;
          }
        }
        
        setInput(currentText.join(''));
        
        if (!changed || currentText.every(char => char === '0' || char === '1')) {
          clearInterval(interval);
          setTimeout(() => {
            setInput('');
            setIsMatrixFading(false);
          }, 300);
        }
      }, 30);
      return;
    }

    if (theme === Theme.CYBERPUNK) {
      setIsCyberpunkDeleting(true);
      let currentText = input.split('');
      const specialChars = '!<>-_/[]{}—=+*^?#'.split('');
      
      const interval = setInterval(() => {
        currentText = currentText.map(char => {
          if (Math.random() > 0.8) return ''; 
          if (Math.random() > 0.5) return specialChars[Math.floor(Math.random() * specialChars.length)]; 
          return char;
        }).filter(Boolean); 
        
        setInput(currentText.join(''));
        
        if (currentText.length === 0) {
          clearInterval(interval);
          setInput('');
          setIsCyberpunkDeleting(false);
        }
      }, 50);
      return;
    }

    const originalText = input;
    let currentText = originalText.split('').map(() => Math.random() > 0.5 ? '0' : '1').join('');
    setInput(currentText);

    const interval = 50; 
    const timer = setInterval(() => {
      currentText = currentText.slice(0, -1);
      setInput(currentText);
      
      if (currentText.length === 0) {
        clearInterval(timer);
        setInput('');
      }
    }, interval);
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('tm_language', newLang);
    if (activeChatId) {
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, language: newLang } : c));
    }
  };

  const evaluateMathLocally = (expr: string): string | null => {
    const cleanExpr = expr.toLowerCase().trim();
    
    const localeMap: Record<Language, string> = {
      [Language.ENGLISH]: 'en-US',
      [Language.SPANISH]: 'es-ES',
      [Language.FRENCH]: 'fr-FR',
      [Language.GERMAN]: 'de-DE',
      [Language.CHINESE]: 'zh-CN',
      [Language.JAPANESE]: 'ja-JP',
      [Language.VIETNAMESE]: 'vi-VN'
    };
    const currentLocale = localeMap[language] || 'en-US';

    const isDirectTimeQuery = (cleanExpr.startsWith('mấy giờ') || cleanExpr.startsWith('giờ hiện tại') || cleanExpr.startsWith('time') || cleanExpr.startsWith('current time'));
    const isDirectDateQuery = (cleanExpr.startsWith('ngày mấy') || cleanExpr.startsWith('hôm nay là ngày') || cleanExpr.startsWith('date') || cleanExpr.startsWith('today date'));

    if (isDirectTimeQuery) {
      return new Date().toLocaleTimeString(currentLocale);
    }
    if (isDirectDateQuery) {
      return new Date().toLocaleDateString(currentLocale);
    }

    const mathRegex = /^[0-9+\-*/().\s,^sin|cos|tan|sqrt|log|pow|pi|e]*$/;
    if (!mathRegex.test(cleanExpr)) return null;
    
    if (!/[0-9]/.test(cleanExpr) || (!/[+\-*/^()]/.test(cleanExpr) && !/(sin|cos|tan|sqrt|log|pow|pi|e)/.test(cleanExpr))) return null;

    try {
      let jsExpr = cleanExpr
        .replace(/pi/g, 'Math.PI')
        .replace(/e/g, 'Math.E')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/log\(/g, 'Math.log(')
        .replace(/pow\(/g, 'Math.pow(')
        .replace(/\^/g, '**');

      const result = new Function(`return ${jsExpr}`)();
      if (typeof result === 'number' && isFinite(result)) {
        return result.toLocaleString(currentLocale);
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [readAloudEnabled, setReadAloudEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const voiceBaseInputRef = useRef('');

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const speakText = (rawText: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const cleaned = rawText
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/FILENAME:\s*[^\s\n]+/g, ' ')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*#_`~>\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 600);
    if (!cleaned) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleaned);
    const ttsLangMap: Record<Language, string> = {
      [Language.VIETNAMESE]: 'vi-VN',
      [Language.ENGLISH]: 'en-US',
      [Language.SPANISH]: 'es-ES',
      [Language.FRENCH]: 'fr-FR',
      [Language.GERMAN]: 'de-DE',
      [Language.CHINESE]: 'zh-CN',
      [Language.JAPANESE]: 'ja-JP',
    };
    utterance.lang = ttsLangMap[language] || 'en-US';
    utterance.rate = 1.03;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopMediaRecorderOnly = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const startMediaRecorderFallback = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicError(t.micUnsupportedError);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        isRecordingRef.current = false;
        setIsRecording(false);
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
          mediaStreamRef.current = null;
        }
        if (blob.size < 200) return;

        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          const base64Audio: string = await new Promise((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
            reader.onerror = () => reject(new Error('Không thể đọc dữ liệu âm thanh.'));
            reader.readAsDataURL(blob);
          });

          const resp = await fetch('/api/v2/kernel/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Audio,
              mimeType: recorder.mimeType || 'audio/webm',
              language,
            }),
          });
          if (!resp.ok) {
            throw new Error(t.micTranscribeError);
          }
          const data = await resp.json();
          if (data?.text) {
            setInput(prev => (prev.trim() ? `${prev.trim()} ${data.text}` : data.text));
          }
        } catch (err: any) {
          setMicError(err?.message || t.micTranscribeError);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      isRecordingRef.current = true;
      setIsRecording(true);
    } catch (err: any) {
      isRecordingRef.current = false;
      setIsRecording(false);
      setMicError(t.micPermissionError);
    }
  };

  const toggleListening = () => {
    setMicError(null);
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      setIsRecording(false);
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      stopMediaRecorderOnly();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      startMediaRecorderFallback();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      const langMap: Record<Language, string> = {
        [Language.VIETNAMESE]: 'vi-VN',
        [Language.ENGLISH]: 'en-US',
        [Language.JAPANESE]: 'ja-JP',
        [Language.CHINESE]: 'zh-CN',
        [Language.FRENCH]: 'fr-FR',
        [Language.GERMAN]: 'de-DE',
        [Language.SPANISH]: 'es-ES',
      };
      recognition.lang = langMap[language] || 'vi-VN';
      recognition.continuous = true;
      recognition.interimResults = true;

      voiceBaseInputRef.current = input.trim();

      recognition.onstart = () => {
        isRecordingRef.current = true;
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        const spoken = (finalTranscript + interimTranscript).trim();
        const base = voiceBaseInputRef.current;
        setInput(base ? `${base} ${spoken}` : spoken);
      };

      recognition.onerror = (event: any) => {
        isRecordingRef.current = false;
        setIsRecording(false);
        if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
          setMicError(t.micPermissionError);
        } else if (event?.error === 'network' || event?.error === 'audio-capture') {
          startMediaRecorderFallback();
        } else if (event?.error !== 'aborted' && event?.error !== 'no-speech') {
          startMediaRecorderFallback();
        }
      };

      recognition.onend = () => {
        isRecordingRef.current = false;
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      startMediaRecorderFallback();
    }
  };
  const activeChat = chats.find(c => c.id === activeChatId);
  const currentMessages = activeChat ? activeChat.messages : messages;

  const nukeTheConversation = () => {
    triggerNuke();
    handleClear();
  };

  const createNewChat = useCallback((folderId?: string) => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: t.newChat,
      messages: [],
      folderId,
      mode: defaultAIMode,
      language,
      lastTimestamp: Date.now()
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setMessages([]);
    setMode(defaultAIMode);
    clearChatMemory();
  }, [t.newChat, defaultAIMode, language]);

  const selectChat = useCallback((chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setActiveChatId(chatId);
      setMessages(chat.messages);
      setMode(chat.mode);
      isNearBottomRef.current = true;
      clearChatMemory();
    }
  }, [chats]);

  const handleRestoreFromJournal = useCallback((journalChat: Chat) => {
    setChats(prev => {
      const exists = prev.some(c => c.id === journalChat.id);
      if (exists) {
        return prev.map(c => (c.id === journalChat.id ? journalChat : c));
      }
      return [journalChat, ...prev];
    });
    setActiveChatId(journalChat.id);
    setMessages(journalChat.messages || []);
    setMode(journalChat.mode || defaultAIMode);
    setIsJournalOpen(false);
    isNearBottomRef.current = true;
    clearChatMemory();
  }, [defaultAIMode]);

  const handleDeleteJournalChat = useCallback((chatId: string) => {
    setChatJournal(prev => prev.filter(c => c.id !== chatId));
  }, []);

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (theme === Theme.MATRIX) {
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        setDeletingChatId(chatId);
        let iterations = 0;
        const totalChars = chat.title.length;
        
        const interval = setInterval(() => {
          setBinaryTitle(chat.title.split('').map((char, index) => {
            if (index < iterations) {
              return Math.random() > 0.5 ? '0' : '1';
            }
            return char;
          }).join(''));
          iterations += 1;
          
          if (iterations > totalChars + 5) {
            clearInterval(interval);
            setIsMatrixFading(true);
            setTimeout(() => {
              setChats(prev => prev.filter(c => c.id !== chatId));
              setActiveChatId(prev => {
                if (prev === chatId) {
                  setMessages([]);
                  clearChatMemory();
                  return null;
                }
                return prev;
              });
              setDeletingChatId(null);
              setIsMatrixFading(false);
            }, 600);
          }
        }, 30);
      }
    } else if (theme === Theme.CYBERPUNK) {
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        setDeletingChatId(chatId);
        let currentText = chat.title.split('');
        
        const interval = setInterval(() => {
          currentText = currentText.filter(() => Math.random() > 0.15);
          
          setBinaryTitle(currentText.join(''));
          
          if (currentText.length === 0) {
            clearInterval(interval);
            setChats(prev => prev.filter(c => c.id !== chatId));
            setActiveChatId(prev => {
              if (prev === chatId) {
                setMessages([]);
                clearChatMemory();
                return null;
              }
              return prev;
            });
            setDeletingChatId(null);
          }
        }, 30);
      }
    } else {
      setChats(prev => prev.filter(c => c.id !== chatId));
      setActiveChatId(prev => {
        if (prev === chatId) {
          setMessages([]);
          clearChatMemory();
          return null;
        }
        return prev;
      });
    }
  };

  const moveChatToFolder = (chatId: string, folderId: string | undefined) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, folderId } : c));
  };

  const renameChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const chat = chats.find(c => c.id === chatId);
    const newTitle = prompt(t.renameChatPrompt, chat?.title);
    if (newTitle) {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: newTitle } : c));
    }
  };

  const renameFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const folder = folders.find(f => f.id === folderId);
    const newName = prompt(t.renameFolderPrompt, folder?.name);
    if (newName) {
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName } : f));
    }
  };

  const createFolder = (name: string) => {
    const newFolder: Folder = {
      id: Date.now().toString(),
      name,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };
    setFolders(prev => [...prev, newFolder]);
  };

  const deleteFolder = (folderId: string) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setChats(prev => prev.map(c => c.folderId === folderId ? { ...c, folderId: undefined } : c));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (over && active.id !== over.id) {
      const activeId = active.id as string;
      const overId = over.id as string;

      const isOverFolder = folders.some(f => f.id === overId);
      if (isOverFolder) {
        moveChatToFolder(activeId, overId);
        addTerminalLog(`SYSTEM: Thread moved to cluster [${overId}]`, 'neural');
      } else {
        const oldIndex = chats.findIndex(c => c.id === activeId);
        const newIndex = chats.findIndex(c => c.id === overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          setChats(prev => arrayMove(prev, oldIndex, newIndex));
        }
      }
    }
  };

  const startCharge = () => {
    if (!input.trim() || isSending) return;
    
    chargeTimerRef.current = setInterval(() => {
      setChargeProgress(prev => {
        if (prev >= 100) {
          clearInterval(chargeTimerRef.current!);
          return 100;
        }
        return prev + 5;
      });
    }, 50);
  };

  const endCharge = () => {
    if (chargeTimerRef.current) {
      clearInterval(chargeTimerRef.current);
      if (chargeProgress >= 100) {
        handleSend();
      }
      setChargeProgress(0);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isThinking) return;
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      setInput(input + suggestion);
      setSuggestion('');
    }
    if (e.key === 'Enter' && mentionMenu && mentionMenu.show) {
      e.preventDefault();
      const assistants = messages.filter(m => m.role === 'assistant');
      const mention = assistants[assistants.length - 1 - mentionIndex]?.content.slice(0, 30);
      if (mention) {
        const before = input.substring(0, input.lastIndexOf('@'));
        setInput(before + `@Ref: "${mention}..." `);
        setMentionMenu(null);
      }
      return;
    }
    if (e.key === 'ArrowUp' && mentionMenu && mentionMenu.show) {
      e.preventDefault();
      setMentionIndex(prev => Math.max(0, prev - 1));
      return;
    }
    if (e.key === 'ArrowDown' && mentionMenu && mentionMenu.show) {
      e.preventDefault();
      const count = messages.filter(m => m.role === 'assistant').length;
      setMentionIndex(prev => Math.min(Math.max(0, count - 1), prev + 1));
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isClientContentSensitive = (text: string): { isSensitive: boolean; matchedWord: string | null } => {
    const normalized = text.toLowerCase().normalize("NFC");
    const sensitiveWords = [
      "chịch", "hiếp dâm", "giao cấu", "bú cu", "bú lồn", "thẩm du", "phim 18+", "phim người lớn", "hentai", "blowjob", "porn", "porno", "sex", "dâm dật", "dâm",
      "địt", "đéo", "đm", "vcl", "clm", "dcm", "vờ lờ", "motherfucker", "bitch", "asshole", "cocksucker", "gái điếm", "làm tình", "phệt",
      "chế tạo súng", "chế tạo bom", "lựu đạn", "thuốc nổ", "chất nổ", "bom nguyên tử", "vũ khí hủy diệt", "make online bomb", "make a bomb",
      "how to make weapons", "ammunition", "explosive design", "tự sát", "suicide", "khủng bố", "terrorist", "massacre", "thảm sát", "đầu độc"
    ];

    for (const word of sensitiveWords) {
      if (word.length <= 3) {
        const escapedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, "i");
        if (regex.test(normalized)) {
          return { isSensitive: true, matchedWord: word };
        }
      } else {
        if (normalized.includes(word)) {
          return { isSensitive: true, matchedWord: word };
        }
      }
    }

    return { isSensitive: false, matchedWord: null };
  };

  const handleSend = async (textOverride?: string) => {
    const rawText = (textOverride ?? input).trim();
    const hasDirectoryAttachment = attachments.some(a => a.mimeType === 'application/x-directory');
    const textBase = rawText || (hasDirectoryAttachment ? 'Hãy vẽ và phân tích cấu trúc cây thư mục này.' : attachments.length > 0 ? 'Hãy phân tích tệp đính kèm này.' : '');
    if (!textBase || isThinking) return;

    const currentAttachments = [...attachments];

    let trimmedInput = textBase;
    if (replyTo) {
      trimmedInput = `[QUOTE: "${replyTo.text}"]\n\n${textBase}`;
    }

    addTerminalLog(`Yêu cầu: "${textBase.slice(0, 50)}${textBase.length > 50 ? '...' : ''}"`, 'info');

    setIsSending(true);
    setReplyTo(null);
    setTimeout(() => setIsSending(false), 600);

    const now = Date.now();
    const currentMinute = Math.floor(now / 60000);
    
    if (rpm.lastMinute !== currentMinute) {
      setRpm({ count30: 0, count25: 0, lastMinute: currentMinute });
    }

    let currentChatId = activeChatId;
    if (!currentChatId) {
      const newChat: Chat = {
        id: Date.now().toString(),
        title: trimmedInput.slice(0, 30) + (trimmedInput.length > 30 ? '...' : ''),
        messages: [],
        mode,
        language,
        lastTimestamp: Date.now()
      };
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      currentChatId = newChat.id;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedInput,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);

    // Client-side moderation check
    const clientMo = isClientContentSensitive(textBase);
    if (clientMo.isSensitive) {
      addTerminalLog(`🔒 [MODERATION] Blocked request containing sensitive term: "${clientMo.matchedWord}"`, 'error');
      
      // Push blocked response
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `MODERATION_BLOCKED Yêu cầu chứa nội dung nhạy cảm hoặc từ ngữ hạn chế liên quan đến "${clientMo.matchedWord}".`,
          timestamp: Date.now()
        }]);
      }, 300);
      return;
    }

    const localResult = evaluateMathLocally(trimmedInput);
    if (localResult && currentAttachments.length === 0) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `🔢 **${t.mathResult}** ${localResult}`,
        timestamp: Date.now()
      }]);
      return;
    }

    if (theme === Theme.GALAXY && window.innerWidth > 768) {
      setIsWarping(true);
      setTimeout(() => setIsWarping(false), 500);
    }

    setIsThinking(true);
    const controller = new AbortController();
    setAbortController(controller);

    let assistantContent = '';
    let assistantThought = '';
    let currentSources: GroundingSource[] = [];
    let isLearnedFlag: boolean | undefined;
    let isUsedLocalFlag: boolean | undefined;
    let streamRafId: number | null = null;
    const assistantId = (Date.now() + 1).toString();
    isNearBottomRef.current = true;

    const flushStreamToState = () => {
      streamRafId = null;
      const visibleContent = assistantContent.replace(/\[SUGGESTIONS:[\s\S]*$/i, '').trimEnd();
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: visibleContent || assistantContent,
                thought: assistantThought,
                groundingSources: currentSources,
                isLearned: isLearnedFlag ?? m.isLearned,
                isUsedLocal: isUsedLocalFlag ?? m.isUsedLocal,
              }
            : m
        )
      );
    };

    try {
      const stream = sendMessageStream(trimmedInput, messages, mode, language, currentAttachments, controller.signal, isEcoMode, currentModel, isApiOnline, user?.username, workspaceFiles, workspaceName);
      
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        thought: '',
        timestamp: Date.now()
      }]);

      setIsAssistantResponding(true);
      for await (const chunk of stream) {
        const c = chunk as any;
        
        if (c.isLearned !== undefined) isLearnedFlag = c.isLearned;
        if (c.isUsedLocal !== undefined) isUsedLocalFlag = c.isUsedLocal;

        if (c.terminalLogs && c.terminalLogs.length > 0) {
          c.terminalLogs.forEach((l: any) => {
            if (user?.role === 'admin') {
              addTerminalLog(l.message, l.type);
            } else if (l.type === 'info' || l.type === 'warn' || l.type === 'error') {
              const cleanerMsg = l.message
                .replace(/\[SOURCE: CLOUD_API\]/g, '')
                .replace(/via TM AI\./g, '')
                .trim();
              if (cleanerMsg) addTerminalLog(cleanerMsg, l.type);
            }
          });
        }

        if (c.text) {
          assistantContent += c.text;
        }
        if (c.thought) {
          assistantThought += c.thought;
        }
        
        if (c.sources && c.sources.length > 0) {
          currentSources = [...currentSources, ...c.sources];
          currentSources = Array.from(new Map(currentSources.map(item => [item.uri, item])).values());
        }

        if (streamRafId === null) {
          streamRafId = requestAnimationFrame(flushStreamToState);
        }
      }

      if (streamRafId !== null) {
        cancelAnimationFrame(streamRafId);
        streamRafId = null;
      }
      setIsAssistantResponding(false);

      const { cleanText, suggestions } = parseSuggestionsFromText(assistantContent);
      const finalSuggestions =
        suggestions.length > 0
          ? suggestions
          : cleanText
          ? buildFallbackSuggestions(language, mode, cleanText, workspaceFiles)
          : [];

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: cleanText || assistantContent,
                thought: assistantThought,
                groundingSources: currentSources,
                isLearned: isLearnedFlag ?? m.isLearned,
                isUsedLocal: isUsedLocalFlag ?? m.isUsedLocal,
                suggestedQuestions: finalSuggestions,
              }
            : m
        )
      );

      if (readAloudEnabled && cleanText) {
        speakText(cleanText);
      }

    } catch (err: any) {
      if (streamRafId !== null) {
        cancelAnimationFrame(streamRafId);
        streamRafId = null;
      }
      setIsAssistantResponding(false);
      console.error(err);
      let errorMessage = `⚠️ ${t.coreConnectionFailed}: ${err.message || 'Unknown error'}`;
      
      if (err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = `⚠️ **AI Đang Quá Tải (Quota Exceeded)**\n\nHệ thống hiện đang gặp giới hạn tải tối đa từ máy chủ (Rate Limit). Vui lòng thử lại sau ít phút.`;
        
        setIsOverloadActive(true);
        setTimeout(() => setIsOverloadActive(false), 3000);
        if (user?.role === 'admin') {
          addTerminalLog(`[QUOTA_LIMIT] API RESOURCE_EXHAUSTED. Rate limit reached.`, 'error');
        }
      }

      setMessages(prev => prev.map(m => 
        m.id === assistantId ? { ...m, content: errorMessage, countdownEnd: err.message?.includes('429') ? now + 60000 - (now % 60000) : undefined } : m
      ));
    } finally {
      setIsThinking(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setIsThinking(false);
      setAbortController(null);
    }
  };

  const handleLoadFolderFiles = (loadedFiles: WorkspaceFile[], folderName: string) => {
    setWorkspaceFiles(loadedFiles);
    setWorkspaceName(folderName || 'project');
  };

  const handleAddWorkspaceAssets = (newAssets: WorkspaceFile[]) => {
    setWorkspaceFiles(prev => {
      const next = [...prev];
      for (const asset of newAssets) {
        const idx = next.findIndex(f => f.path === asset.path);
        if (idx >= 0) next[idx] = asset;
        else next.push(asset);
      }
      return next;
    });
  };

  const handleUpdateWorkspaceFile = (path: string, content: string) => {
    setWorkspaceFiles(prev => {
      const idx = prev.findIndex(f => f.path === path);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], content, size: new Blob([content]).size };
        return updated;
      }
      return [
        ...prev,
        {
          path,
          name: path.split('/').pop() || path,
          mimeType: 'text/plain',
          size: new Blob([content]).size,
          content,
          isBinary: false,
        },
      ];
    });
  };

  const handleDeleteWorkspaceFile = (path: string) => {
    setWorkspaceFiles(prev => prev.filter(f => f.path !== path));
  };

  const handleClearWorkspace = () => {
    setWorkspaceFiles([]);
    setWorkspaceName('my-project');
  };

  const handleApplyFilesToWorkspace = useCallback((filesToApply: { path: string; content: string }[]) => {
    setWorkspaceFiles(prev => {
      const next = [...prev];
      for (const item of filesToApply) {
        const cleanPath = item.path.replace(/^\/+/, '');
        const idx = next.findIndex(f => f.path === cleanPath || f.name === cleanPath);
        if (idx >= 0) {
          next[idx] = { ...next[idx], content: item.content, size: new Blob([item.content]).size };
        } else {
          next.push({
            path: cleanPath,
            name: cleanPath.split('/').pop() || cleanPath,
            mimeType: 'text/plain',
            size: new Blob([item.content]).size,
            content: item.content,
            isBinary: false,
          });
        }
      }
      return next;
    });
  }, []);

  const handleSaveWorkspaceToDisk = useCallback(async (): Promise<boolean> => {
    const writableTextFiles = workspaceFiles.filter(f => !f.isBinary && typeof f.content === 'string');
    if (writableTextFiles.length === 0) return false;

    const picker = (window as any).showDirectoryPicker;
    if (typeof picker === 'function') {
      try {
        const rootHandle = await picker({ mode: 'readwrite' });
        for (const file of writableTextFiles) {
          const cleanPath = file.path.replace(/^\/+/, '');
          const segments = cleanPath.split('/').filter(Boolean);
          if (segments.length === 0) continue;
          let dirHandle = rootHandle;
          for (let i = 0; i < segments.length - 1; i++) {
            dirHandle = await dirHandle.getDirectoryHandle(segments[i], { create: true });
          }
          const fileHandle = await dirHandle.getFileHandle(segments[segments.length - 1], { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(file.content || '');
          await writable.close();
        }
        addTerminalLog(`[WORKSPACE_SAVE] Đã ghi ${writableTextFiles.length} tệp cập nhật trực tiếp vào thư mục đĩa.`, 'success' as any);
        return true;
      } catch (err: any) {
        if (err?.name === 'AbortError') return false;
        // Fallback to ZIP if iframe blocks showDirectoryPicker
      }
    }

    await downloadZipFromFiles(
      `${workspaceName || 'project'}_updated.zip`,
      writableTextFiles.map(f => ({
        path: f.path.replace(/^\/+/, ''),
        content: f.content || '',
      }))
    );
    addTerminalLog(`[WORKSPACE_SAVE] Đã xuất ${writableTextFiles.length} tệp cập nhật thành gói ZIP.`, 'success' as any);
    return true;
  }, [workspaceFiles, workspaceName]);

  const readFolderEntriesIntoWorkspace = useCallback(async (
    items: Array<{ file: File; relPath: string }>
  ): Promise<WorkspaceFile[]> => {
    const loaded: WorkspaceFile[] = [];
    for (const { file: f, relPath } of items.slice(0, 300)) {
      const isMedia =
        f.type.startsWith('image/') ||
        f.type.startsWith('video/') ||
        f.type.startsWith('audio/') ||
        f.type === 'application/pdf' ||
        /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif|jfif|mp4|webm|mov|m4v|mp3|wav|ogg|m4a|flac|pdf)$/i.test(f.name);
      const isText =
        !isMedia &&
        (f.type.startsWith('text/') ||
          f.type === 'application/json' ||
          /\.(html?|css|scss|sass|less|js|jsx|ts|tsx|mjs|cjs|json|md|txt|py|sql|yml|yaml|xml|env|toml|sh|bash|csv|tsv|ini|conf|log|java|cpp|cc|c|h|hpp|go|rs|php|rb|vue|svelte)$/i.test(f.name));

      if (isMedia && f.size <= 15_000_000) {
        const dataUrl = await new Promise<string>(resolve => {
          const r = new FileReader();
          r.onload = () => resolve((r.result as string) || '');
          r.onerror = () => resolve('');
          r.readAsDataURL(f);
        });
        if (dataUrl) {
          loaded.push({
            path: relPath,
            name: f.name,
            mimeType: f.type || 'application/octet-stream',
            size: f.size,
            dataUrl,
            isBinary: true,
          });
        }
      } else if (isText && f.size <= 500_000) {
        try {
          const content = await f.text();
          loaded.push({
            path: relPath,
            name: f.name,
            mimeType: f.type || 'text/plain',
            size: f.size,
            content,
            isBinary: false,
          });
        } catch {
          // ignore unreadable text file
        }
      }
    }
    return loaded;
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isThinking) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const isTextFile = 
        file.type.startsWith('text/') || 
        /\.(txt|js|jsx|ts|tsx|py|json|css|html|md|csv|xml|log|sh|yml|yaml|ini|conf|rs|go|cpp|c|h|cs|java|kt|gradle|properties)$/i.test(file.name);

      if (isTextFile) {
        const textReader = new FileReader();
        textReader.onload = () => {
          const textContent = textReader.result as string;
          const base64Reader = new FileReader();
          base64Reader.onload = () => {
            const base64 = (base64Reader.result as string).split(',')[1];
            const newAttachment: Attachment = {
              id: Math.random().toString(36).substring(7),
              name: file.name,
              type: 'file',
              mimeType: file.type || 'text/plain',
              size: file.size,
              data: base64,
              textContent: textContent
            };
            setAttachments(prev => [...prev, newAttachment]);
            addTerminalLog(`[FILE_SYNC] Đã tải và trích xuất nội dung từ tệp văn bản: ${file.name}`, 'neural');
          };
          base64Reader.readAsDataURL(file);
        };
        textReader.readAsText(file);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          const newAttachment: Attachment = {
            id: Math.random().toString(36).substring(7),
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'file',
            mimeType: file.type,
            size: file.size,
            data: base64
          };
          setAttachments(prev => {
            const updated = [...prev, newAttachment];
            if (updated.filter(a => a.type === 'image').length > 5) {
              addTerminalLog(`[VISION_SYNC] Processing ${updated.filter(a => a.type === 'image').length} images. Capacity: HIGH.`, 'neural');
            } else {
              addTerminalLog(`[FILE_SYNC] Đã đính kèm tệp phương tiện: ${file.name}`, 'neural');
            }
            return updated;
          });
        };
        reader.readAsDataURL(file);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isThinking) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const filteredList = fileList.filter((f: any) => {
      const p = (f.webkitRelativePath || f.name).replace(/\\/g, '/');
      return !p.includes('node_modules/') && !p.includes('.git/') && !p.includes('dist/') && !p.includes('.next/');
    });

    const paths = filteredList.map((f: any) => f.webkitRelativePath || f.name);
    const firstRel = (fileList[0] as any)?.webkitRelativePath || '';
    const rootName = firstRel.includes('/') ? firstRel.split('/')[0] : 'folder';
    const treeText = buildAsciiTreeFromPaths(paths, rootName);

    const workspaceInput = filteredList.map((f: any) => {
      const rawRel = f.webkitRelativePath || f.name;
      const relPath = rawRel.startsWith(`${rootName}/`) ? rawRel.slice(rootName.length + 1) : rawRel;
      return { file: f as File, relPath };
    });

    const loadedWorkspace = await readFolderEntriesIntoWorkspace(workspaceInput);
    if (loadedWorkspace.length > 0) {
      setWorkspaceName(rootName);
      setWorkspaceFiles(loadedWorkspace);
      addTerminalLog(`[WORKSPACE_FOLDER] Đã nạp ${loadedWorkspace.length} tệp từ thư mục ${rootName}/`, 'neural');
    }

    const treeAttachment: Attachment = {
      id: Math.random().toString(36).substring(7),
      name: `${rootName}/ (${paths.length} tệp)`,
      type: 'file',
      mimeType: 'application/x-directory',
      size: fileList.reduce((acc, f) => acc + f.size, 0),
      data: '',
      textContent: treeText,
    };

    setAttachments(prev => [...prev, treeAttachment]);
    if (!input.trim()) {
      setInput(`Hãy vẽ lại và phân tích cấu trúc thư mục ${rootName}/`);
    }
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isThinking) setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (isThinking) return;

    const items = e.dataTransfer?.items;
    if (items && items.length > 0) {
      const entries = Array.from(items)
        .map(item => (item as any).webkitGetAsEntry?.())
        .filter(Boolean);

      const hasDirectory = entries.some((entry: any) => entry.isDirectory);
      if (hasDirectory) {
        const collectedPaths: string[] = [];
        const collectedFileItems: Array<{ file: File; relPath: string }> = [];
        let totalSize = 0;
        const rootDir = entries.find((en: any) => en.isDirectory)?.name || 'folder';

        const traverseEntry = async (entry: any, prefix: string): Promise<void> => {
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === '.next') return;
          if (entry.isFile) {
            const fullPath = `${prefix}${entry.name}`;
            collectedPaths.push(fullPath);
            await new Promise<void>(resolve => {
              entry.file((f: File) => {
                totalSize += f.size;
                if (collectedFileItems.length < 300) {
                  const relPath = fullPath.startsWith(`${rootDir}/`) ? fullPath.slice(rootDir.length + 1) : fullPath;
                  collectedFileItems.push({ file: f, relPath });
                }
                resolve();
              }, () => resolve());
            });
          } else if (entry.isDirectory) {
            const reader = entry.createReader();
            const readBatch = (): Promise<any[]> =>
              new Promise(resolve => reader.readEntries(resolve, () => resolve([])));
            let batch = await readBatch();
            while (batch.length > 0) {
              for (const child of batch) {
                await traverseEntry(child, `${prefix}${entry.name}/`);
              }
              batch = await readBatch();
            }
          }
        };

        for (const entry of entries) {
          await traverseEntry(entry, '');
        }

        const loadedWorkspace = await readFolderEntriesIntoWorkspace(collectedFileItems);
        if (loadedWorkspace.length > 0) {
          setWorkspaceName(rootDir);
          setWorkspaceFiles(loadedWorkspace);
          addTerminalLog(`[WORKSPACE_FOLDER] Đã nạp ${loadedWorkspace.length} tệp từ thư mục ${rootDir}/`, 'neural');
        }

        const treeText = buildAsciiTreeFromPaths(collectedPaths, rootDir);
        const treeAttachment: Attachment = {
          id: Math.random().toString(36).substring(7),
          name: `${rootDir}/ (${collectedPaths.length} tệp)`,
          type: 'file',
          mimeType: 'application/x-directory',
          size: totalSize,
          data: '',
          textContent: treeText,
        };
        setAttachments(prev => [...prev, treeAttachment]);
        if (!input.trim()) {
          setInput(`Hãy vẽ lại và phân tích cấu trúc thư mục ${rootDir}/`);
        }
        return;
      }
    }

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const isTextFile = 
        file.type.startsWith('text/') || 
        /\.(txt|js|jsx|ts|tsx|py|json|css|html|md|csv|xml|log|sh|yml|yaml|ini|conf|rs|go|cpp|c|h|cs|java|kt|gradle|properties)$/i.test(file.name);

      if (isTextFile) {
        const textReader = new FileReader();
        textReader.onload = () => {
          const textContent = textReader.result as string;
          const base64Reader = new FileReader();
          base64Reader.onload = () => {
            const base64 = (base64Reader.result as string).split(',')[1];
            const newAttachment: Attachment = {
              id: Math.random().toString(36).substring(7),
              name: file.name,
              type: 'file',
              mimeType: file.type || 'text/plain',
              size: file.size,
              data: base64,
              textContent: textContent
            };
            setAttachments(prev => [...prev, newAttachment]);
          };
          base64Reader.readAsDataURL(file);
        };
        textReader.readAsText(file);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          const newAttachment: Attachment = {
            id: Math.random().toString(36).substring(7),
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'file',
            mimeType: file.type,
            size: file.size,
            data: base64
          };
          setAttachments(prev => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const addFilesToAttachments = useCallback((files: File[], source: 'upload' | 'paste' = 'upload') => {
    if (!files || files.length === 0) return;

    files.forEach((file, idx) => {
      const isTextFile =
        file.type.startsWith('text/') ||
        /\.(txt|js|jsx|ts|tsx|py|json|css|html?|md|csv|xml|log|sh|yml|yaml|ini|conf|rs|go|cpp|c|h|cs|java|kt|gradle|properties|sql|env)$/i.test(file.name);

      const fallbackExt = file.type.startsWith('image/')
        ? (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
        : 'bin';
      const fileName =
        file.name && file.name !== 'image.png'
          ? file.name
          : source === 'paste' && file.type.startsWith('image/')
          ? `pasted-image-${Date.now()}-${idx}.${fallbackExt}`
          : file.name || `pasted-file-${Date.now()}-${idx}.${fallbackExt}`;

      if (isTextFile) {
        const textReader = new FileReader();
        textReader.onload = () => {
          const textContent = textReader.result as string;
          const base64Reader = new FileReader();
          base64Reader.onload = () => {
            const base64 = ((base64Reader.result as string) || '').split(',')[1] || '';
            const newAttachment: Attachment = {
              id: Math.random().toString(36).substring(7),
              name: fileName,
              type: 'file',
              mimeType: file.type || 'text/plain',
              size: file.size,
              data: base64,
              textContent
            };
            setAttachments(prev => [...prev, newAttachment]);
          };
          base64Reader.readAsDataURL(file);
        };
        textReader.readAsText(file);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const result = (reader.result as string) || '';
          const base64 = result.split(',')[1] || '';
          const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg|ico)$/i.test(fileName);
          const newAttachment: Attachment = {
            id: Math.random().toString(36).substring(7),
            name: fileName,
            type: isImage ? 'image' : 'file',
            mimeType: file.type || (isImage ? 'image/png' : 'application/octet-stream'),
            size: file.size,
            data: base64
          };
          setAttachments(prev => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const handlePaste = useCallback((e: ClipboardEvent | React.ClipboardEvent) => {
    if (isThinking) return;
    const nativeEvt = 'nativeEvent' in e ? e.nativeEvent : e;
    if ((nativeEvt as any).__tmPasteHandled) return;
    (nativeEvt as any).__tmPasteHandled = true;

    const clipboard = e.clipboardData;
    if (!clipboard) return;

    const collectedFiles: File[] = [];
    const seenKeys = new Set<string>();

    if (clipboard.files && clipboard.files.length > 0) {
      Array.from(clipboard.files).forEach(file => {
        const key = `${file.name}:${file.size}:${file.type}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          collectedFiles.push(file);
        }
      });
    }

    if (clipboard.items && clipboard.items.length > 0) {
      for (let i = 0; i < clipboard.items.length; i++) {
        const item = clipboard.items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            const key = `${file.name}:${file.size}:${file.type}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              collectedFiles.push(file);
            }
          }
        }
      }
    }

    if (collectedFiles.length > 0) {
      e.preventDefault();
      addFilesToAttachments(collectedFiles, 'paste');
    }
  }, [isThinking, addFilesToAttachments]);

  useEffect(() => {
    const onWindowPaste = (e: ClipboardEvent) => {
      if (isThinking || isAuthModalOpen) return;
      handlePaste(e);
    };
    window.addEventListener('paste', onWindowPaste);
    return () => window.removeEventListener('paste', onWindowPaste);
  }, [handlePaste, isThinking, isAuthModalOpen]);

  const memoryNodes = useMemo(() => brain.getMemoryNodes(), [nodeUpdate, messages.length]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleVote = (id: string) => {
    setVotes(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
  };

  const UPCOMING_UPDATES = [
    { id: 'voice', ...t.updates.voice },
    { id: 'vision', ...t.updates.vision },
    { id: 'workspace', ...t.updates.workspace },
    { id: 'memory', ...t.updates.memory },
    { id: 'plugins', ...t.updates.plugins },
    { id: 'code_interpreter', ...t.updates.code_interpreter },
    { id: 'search_plus', ...t.updates.search_plus },
    { id: 'mobile_app', ...t.updates.mobile_app }
  ];

  const handlePromptBuilderSend = () => {
    const { role, context, task, constraints, format } = promptBuilder;
    if (!task.trim()) return;

    const structuredPrompt = `
[ROLE]: ${role || 'AI Assistant'}
[CONTEXT]: ${context || 'General conversation'}
[TASK]: ${task}
[CONSTRAINTS]: ${constraints || 'None'}
[FORMAT]: ${format || 'Standard response'}
`.trim();

    setInput(structuredPrompt);
    setIsPromptBuilderActive(false);
    setPromptBuilder({ role: '', context: '', task: '', constraints: '', format: '' });
  };

  if (isIntroActive) {
    return (
      <div className="fixed inset-0 z-50 bg-primary flex flex-col items-center justify-center">
        <img
          src="/asset/TMlogo.png"
          alt="TheMaster"
          className="w-24 h-24 rounded-3xl object-cover shadow-xl"
          referrerPolicy="no-referrer"
        />
        <div className="mt-8 text-3xl font-black tracking-tighter text-text-primary font-mono uppercase">
          {introText}
        </div>
      </div>
    );
  }

  if (isAuthModalOpen) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-primary p-4 overflow-auto">
        <Auth t={t} onSuccess={handleAuthSuccess} onCancel={() => setIsAuthModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className={`flex h-screen z-0 ${(theme === Theme.GALAXY || theme === Theme.PIXEL) ? 'bg-transparent' : 'bg-primary'} ${theme === Theme.PIXEL ? 'pixel-theme' : ''} text-text-primary overflow-hidden font-sans transition-colors duration-300 relative ${(isSucking || isShrinking || isExploding || nukeStage === 'explosion') ? 'singularity-shake nuke-shake-active' : ''} ${nukeStage === 'missile' ? 'static-glitch' : ''} ${nukeStage === 'explosion' ? 'shockwave-distortion chromatic-aberration' : ''} ${nukeStage === 'emp-blackout' ? 'emp-blackout' : ''} ${nukeStage === 'aftermath' ? 'toxic-glow' : ''} ${(nukeStage === 'explosion' || nukeStage === 'emp-blackout' || nukeStage === 'aftermath') ? 'thermal-burn' : ''}`}>
      {theme === Theme.PIXEL && (
        <>
          <NuclearFallout 
            stage={nukeStage} 
            center={nukeCenter}
          />
          {nukeStage === 'flash' && <div className="fixed inset-0 bg-white z-[10000] animate-flash-white" />}
        </>
      )}

      {isBlackHoleActive && (
        <div className={`singularity ${isShrinking ? 'black-hole-shrink' : ''}`} />
      )}

      {theme === Theme.CYBERPUNK && progress > 0 && (
        <div className="fixed top-0 left-0 h-1 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 z-[100] transition-all duration-300" style={{ width: `${progress}%` }} />
      )}

      <div className={`fixed inset-0 -z-10 mesh-gradient-bg transition-opacity duration-1000 ${isThinking ? 'thinking opacity-40' : 'opacity-20'}`}></div>
      
      {(isMatrixMode || theme === Theme.MATRIX) && <MatrixRain />}

      {theme === Theme.GALAXY && <GalaxyBackground scrollOffset={0} isWarping={isWarping} isBlackHoleActive={isBlackHoleActive} isShrinking={isShrinking} accretionIntensity={accretionIntensity} supernovaTrigger={supernovaTrigger} isThinking={isThinking} isAssistantResponding={isAssistantResponding} />}

      {theme === Theme.PIXEL && (
        <>
          <div className="pixel-bg" />
          <div className="pixel-stars" />
          <div className="pixel-clouds" />
          <div className="pixel-mountains" />
          <div className="shooting-star" />
          <div className="pixel-overlay" />
          <div className="scanline" />
        </>
      )}

      {isZenMode && (
        <button 
          onClick={() => setIsZenMode(false)}
          className="fixed top-4 right-4 z-50 p-3 rounded-[2rem] bg-white/10 backdrop-blur-md hover:bg-white/20 text-text-secondary hover:text-text-primary transition-all shadow-xl animate-in fade-in zoom-in flex items-center gap-2 border border-white/10"
          title="Exit Focus Mode"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
          <span className="text-[10px] pr-2 font-black uppercase tracking-widest">Exit Focus Mode</span>
        </button>
      )}

      <AnimatePresence>
        {isMemoryOpen && memoryData && (
          <MemoryVisualizer 
            nodes={memoryData.nodes}
            stats={memoryData.stats}
            onClose={() => setIsMemoryOpen(false)}
            onPrune={(id) => {
              deleteMemoryNode(id);
              setMemoryData(getMemoryData() as any);
            }}
            onTag={(id, tag) => {
              tagMemoryNode(id, tag);
              setMemoryData(getMemoryData() as any);
            }}
            onOpenInjector={() => setIsKnowledgeModalOpen(true)}
            theme={theme}
            addTerminalLog={addTerminalLog}
          />
        )}
      </AnimatePresence>

      <div className={`flex flex-1 overflow-hidden transition-all duration-[1000ms] ease-out ${isUiHidden ? 'opacity-0 scale-95 blur-2xl pointer-events-none' : 'opacity-100 scale-100 blur-0'}`}>
        <Sidebar 
          user={user}
          isOpen={isSidebarOpen}
          chats={chats}
          folders={folders}
          activeChatId={activeChatId}
          deletingChatId={deletingChatId}
          binaryTitle={binaryTitle}
          theme={theme}
          t={t}
          language={language}
          chatSearch={chatSearch}
          chatSearchMode={chatSearchMode}
          onNewChat={createNewChat}
          onSelectChat={selectChat}
          onRenameChat={renameChat}
          onDeleteChat={deleteChat}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
          onCreateFolder={createFolder}
          onChatSearchChange={setChatSearch}
          onChatSearchModeChange={setChatSearchMode}
          onLogout={handleLogout}
          onSync={syncToCloud}
          onClearHistory={() => {
            setChats([]);
            setActiveChatId(null);
            setMessages([]);
          }}
          onOpenJournal={() => setIsJournalOpen(true)}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          filteredChats={filteredChats}
          onCloseSidebar={() => setIsSidebarOpen(false)}
          nodes={memoryNodes}
          onDeleteNode={(id) => {
            brain.deleteNode(id);
            setNodeUpdate(prev => prev + 1);
            addTerminalLog(`[BRAIN_MOD] Neuron ${id} pruned from synaptic structure.`, 'warn');
          }}
        />

        <main 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 flex flex-col relative min-w-0 bg-transparent ${theme === Theme.MATRIX ? 'matrix phosphor-glow' : ''}`}
        >
          <AnimatePresence>
            {isDraggingFile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-secondary/90 backdrop-blur-md flex flex-col items-center justify-center border-4 border-dashed border-blue-500/40 m-6 rounded-[2rem] transition-all pointer-events-none"
              >
                <div className="flex flex-col items-center justify-center">
                  <motion.div
                    animate={{ y: [-10, 10, -10] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-20 h-20 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-400 mb-4 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                  >
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </motion.div>
                  <h3 className="text-xl font-bold text-text-primary">
                    {t.dropTitle}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">
                    {t.dropSubtitle}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {theme === Theme.MATRIX && <Scanlines />}

          <AnimatePresence>
            {user?.role === 'admin' && !isTerminalOpen && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => setIsTerminalOpen(true)}
                className="fixed top-6 right-6 z-[100] w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-110 active:scale-95 transition-transform"
              >
                <div className="absolute inset-0 rounded-full border border-emerald-500 animate-ping opacity-20" />
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
              </motion.button>
            )}

            {user?.role === 'admin' && isTerminalOpen && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0, x: 100, y: -100 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1, 
                  x: isOverloadActive ? [0, -5, 5, -5, 0] : 0, 
                  y: isOverloadActive ? [0, 5, -5, 5, 0] : 0 
                }}
                exit={{ scale: 0.8, opacity: 0, x: 100, y: -100 }}
                transition={isOverloadActive ? { duration: 0.1, repeat: Infinity } : { type: 'spring', damping: 20, stiffness: 150 }}
                className="fixed top-6 right-6 w-[400px] max-w-[90vw] h-[500px] max-h-[70vh] bg-black/90 border border-emerald-500/40 z-[100] shadow-[0_20px_50px_rgba(0,0,0,1),0_0_20px_rgba(16,185,129,0.1)] rounded-2xl font-mono flex flex-col overflow-hidden backdrop-blur-xl"
              >
                <div className="flex items-center justify-between px-4 py-3 bg-emerald-500/10 border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${isOverloadActive ? 'bg-red-500 animate-ping' : 'bg-red-500/30'}`} />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/30" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30" />
                    </div>
                    <span className="text-emerald-500 text-[10px] font-black tracking-[0.3em] uppercase">SYSTEM_KERNEL_V13</span>
                  </div>
                  <button onClick={() => setIsTerminalOpen(false)} className="p-1 hover:bg-emerald-500/20 rounded-lg text-emerald-500/50 hover:text-emerald-500 transition-all">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>

                <div className="absolute inset-0 pointer-events-none opacity-[0.05] overflow-hidden z-0">
                  <div className="flex justify-around w-full h-full">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="text-emerald-500 text-[8px] animate-matrix-drop" style={{ animationDelay: `${i * 0.5}s` }}>
                        {Array.from({ length: 40 }).map(() => Math.floor(Math.random() * 2)).join('\n')}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-1.5 scrollbar-hide text-[10px] relative z-0">
                  {terminalLogs.length === 0 && (
                    <div className="text-emerald-500/20 animate-pulse mt-10 text-center uppercase tracking-widest italic">
                      Waiting for incoming signals...
                    </div>
                  )}
                  {terminalLogs.map(log => (
                    <div key={log.id} className="flex gap-2.5 leading-relaxed group">
                      <span className="text-emerald-500/20 font-light select-none group-hover:text-emerald-500/40 transition-colors">{'>>'}</span>
                      <span className={`
                        break-words
                        ${log.type === 'error' ? 'text-red-500 text-shadow-red' : ''}
                        ${log.type === 'warn' ? 'text-amber-500' : ''}
                        ${log.type === 'info' ? 'text-blue-400' : ''}
                        ${log.type === 'neural' ? 'text-fuchsia-400 opacity-90' : ''}
                        ${log.type === 'system' ? 'text-emerald-400 font-bold' : ''}
                        ${log.type === 'logic' ? 'text-cyan-400 italic' : ''}
                      `}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>

                <div className="p-4 bg-black/60 border-t border-emerald-500/10 flex items-center gap-3">
                  <span className="text-emerald-500 animate-pulse font-black">#</span>
                  <input 
                    type="text" 
                    placeholder="ENTER KERNEL COMMAND..."
                    className="flex-1 bg-transparent border-none outline-none text-emerald-500 text-[10px] placeholder:text-emerald-500/10 font-bold tracking-widest uppercase"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleTerminalCommand(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                    autoFocus
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isNeuralTreeOpen && (
              <NeuralTree 
                key={nodeUpdate}
                nodes={memoryNodes} 
                onClose={() => setIsNeuralTreeOpen(false)} 
                onDeleteNode={(id) => {
                  brain.deleteNode(id);
                  setNodeUpdate(prev => prev + 1);
                  addTerminalLog(`[BRAIN_MOD] Neuron ${id} pruned from synaptic structure.`, 'warn');
                }}
              />
            )}
          </AnimatePresence>

          <header className={`shrink-0 h-16 border-b flex items-center justify-between px-6 relative z-30 transition-all duration-300 ${
            theme === Theme.LIGHT ? 'border-gray-200 bg-white/80 backdrop-blur-md' : 'border-white/5'
          } ${isZenMode ? 'opacity-0 -translate-y-full pointer-events-none' : 'opacity-100 translate-y-0'}`}>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-center text-text-primary ${
                    theme === Theme.LIGHT ? 'bg-gray-100 hover:bg-gray-200 border-gray-200' : 'bg-white/5 hover:bg-white/10 border-white/5'
                  }`}
                  title={isSidebarOpen ? t.collapseSidebar : t.openSidebar}
                >
                  {isSidebarOpen ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="3" y1="12" x2="21" y2="12"></line>
                      <line x1="3" y1="6" x2="21" y2="6"></line>
                      <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                  )}
                </button>

                <LiveClock theme={theme} language={language} />
              </div>

              <div className="flex items-center gap-2.5">
                 {/* Project Workspace + Live App Runner Button */}
                 <button
                   type="button"
                   onClick={() => setIsWorkspaceOpen(true)}
                   className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                     theme === Theme.LIGHT
                       ? 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-800'
                       : 'bg-white/5 hover:bg-white/10 border-white/10 text-text-primary'
                   }`}
                   title={t.workspaceTitle}
                 >
                   <FolderCode size={14} className="text-blue-500" />
                   <span className="hidden md:inline">{t.workspaceBtn}</span>
                   {workspaceFiles.length > 0 && (
                     <span className="text-[10px] font-mono opacity-75">({workspaceFiles.length})</span>
                   )}
                 </button>

                 {/* Mode Switcher Dropdown */}
                 <div className="relative">
                    <button
                      onClick={() => {
                        setIsModeMenuOpen(!isModeMenuOpen);
                        setIsLanguageMenuOpen(false);
                        setIsThemeMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                        theme === Theme.LIGHT
                          ? 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-800'
                          : 'bg-white/5 hover:bg-white/10 border-white/5 text-text-primary'
                      }`}
                      title={t.selectMode}
                    >
                      {defaultAIMode === AIMode.CODE ? (
                        <span className="font-mono font-black text-xs text-blue-500">&lt;/&gt;</span>
                      ) : defaultAIMode === AIMode.MATH ? (
                        <span className="font-mono font-black text-xs text-amber-500">&radic;x</span>
                      ) : defaultAIMode === AIMode.CHAT ? (
                        <MessageSquare size={14} className="text-emerald-500" />
                      ) : defaultAIMode === AIMode.DEEP ? (
                        <Cpu size={14} className="text-purple-500" />
                      ) : defaultAIMode === AIMode.FAST ? (
                        <Zap size={14} className="text-yellow-500" />
                      ) : defaultAIMode === AIMode.CREATIVE ? (
                        <Palette size={14} className="text-pink-500" />
                      ) : defaultAIMode === AIMode.TRADING ? (
                        <Activity size={14} className="text-emerald-500" />
                      ) : defaultAIMode === AIMode.APP_PREVIEW ? (
                        <Play size={14} className="text-emerald-500" />
                      ) : (
                        <Search size={14} className="text-cyan-500" />
                      )}
                      <span>{t.modes[defaultAIMode]}</span>
                    </button>

                    {isModeMenuOpen && (
                      <div className={`absolute top-full right-0 mt-2 w-52 bg-secondary rounded-2xl shadow-2xl py-2 z-50 overflow-hidden border ${
                        theme === Theme.LIGHT ? 'border-gray-200' : 'border-white/10'
                      }`}>
                        {(Object.values(AIMode) as AIMode[]).map((m) => (
                          <button
                            key={m}
                            onClick={() => {
                              setDefaultAIMode(m);
                              setMode(m);
                              setIsModeMenuOpen(false);
                              if (m === AIMode.APP_PREVIEW) {
                                setIsWorkspaceOpen(true);
                              }
                            }}
                            className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-2.5 ${defaultAIMode === m ? 'text-blue-500 bg-blue-500/10' : 'text-text-secondary hover:bg-tertiary hover:text-text-primary'}`}
                          >
                            <span className="w-5 flex items-center justify-center">
                              {m === AIMode.CODE ? (
                                <span className="font-mono font-black text-xs text-blue-500">&lt;/&gt;</span>
                              ) : m === AIMode.MATH ? (
                                <span className="font-mono font-black text-xs text-amber-500">&radic;x</span>
                              ) : m === AIMode.CHAT ? (
                                <MessageSquare size={13} className="text-emerald-500" />
                              ) : m === AIMode.DEEP ? (
                                <Cpu size={13} className="text-purple-500" />
                              ) : m === AIMode.FAST ? (
                                <Zap size={13} className="text-yellow-500" />
                              ) : m === AIMode.CREATIVE ? (
                                <Palette size={13} className="text-pink-500" />
                              ) : m === AIMode.TRADING ? (
                                <Activity size={13} className="text-emerald-500" />
                              ) : m === AIMode.APP_PREVIEW ? (
                                <Play size={13} className="text-emerald-500" />
                              ) : (
                                <Search size={13} className="text-cyan-500" />
                              )}
                            </span>
                            <span>{t.modes[m]}</span>
                          </button>
                        ))}
                      </div>
                    )}
                 </div>

                 {/* Language Selector Dropdown */}
                 <div className="relative">
                    <button
                      onClick={() => {
                        setIsLanguageMenuOpen(!isLanguageMenuOpen);
                        setIsModeMenuOpen(false);
                        setIsThemeMenuOpen(false);
                      }}
                      className={`p-2.5 rounded-xl border text-text-primary transition-all flex items-center justify-center ${
                        theme === Theme.LIGHT ? 'bg-gray-100 hover:bg-gray-200 border-gray-200' : 'bg-white/5 hover:bg-white/10 border-white/5'
                      }`}
                      title={t.selectLanguage}
                    >
                      <Globe size={16} />
                    </button>
                    {isLanguageMenuOpen && (
                      <div className={`absolute top-full right-0 mt-2 w-48 bg-secondary rounded-2xl shadow-2xl py-2 z-50 overflow-hidden border animate-in slide-in-from-top-2 duration-200 ${
                        theme === Theme.LIGHT ? 'border-gray-200' : 'border-white/10'
                      }`}>
                        {Object.values(Language).map((langItem) => (
                          <button
                            key={langItem}
                            onClick={() => {
                              handleLanguageChange(langItem);
                              setIsLanguageMenuOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors flex items-center justify-between ${language === langItem ? 'text-blue-500 bg-blue-500/10' : 'text-text-secondary hover:bg-tertiary hover:text-text-primary'}`}
                          >
                            <span>{t.languages[langItem]}</span>
                            {language === langItem && (
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                 </div>

                 <div className={`h-5 w-[1px] mx-0.5 ${theme === Theme.LIGHT ? 'bg-gray-200' : 'bg-white/10'}`} />

                 <div className="flex items-center gap-2">
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => setIsTerminalOpen(true)}
                        className={`p-2.5 rounded-xl border transition-all ${
                          theme === Theme.LIGHT ? 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-800' : 'bg-white/5 hover:bg-white/10 border-white/5'
                        }`}
                        title="Terminal"
                      >
                         <Terminal size={16} />
                      </button>
                    )}
                    <div className="relative">
                       <button
                         onClick={() => {
                           setIsThemeMenuOpen(!isThemeMenuOpen);
                           setIsModeMenuOpen(false);
                           setIsLanguageMenuOpen(false);
                         }}
                         className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                           theme === Theme.LIGHT ? 'bg-gray-100 hover:bg-gray-200 border-gray-200' : 'bg-white/5 hover:bg-white/10 border-white/5'
                         }`}
                         title={`${t.customTheme}: ${t.themes[theme]}`}
                       >
                          {theme === Theme.DARK ? <Moon size={16} className="text-slate-300" /> :
                           theme === Theme.LIGHT ? <Sun size={16} className="text-amber-500" /> :
                           theme === Theme.MATRIX ? <Binary size={16} className="text-emerald-400" /> :
                           theme === Theme.CYBERPUNK ? <Rainbow size={16} className="text-fuchsia-400" /> :
                           theme === Theme.GALAXY ? <Orbit size={16} className="text-indigo-400" /> :
                           <Gamepad2 size={16} className="text-amber-400" />}
                       </button>
                       {isThemeMenuOpen && (
                        <div className={`absolute top-full right-0 mt-2 w-48 bg-secondary rounded-2xl shadow-2xl py-2 animate-in slide-in-from-top-2 duration-200 z-50 overflow-hidden border ${
                          theme === Theme.LIGHT ? 'border-gray-200' : 'border-white/10'
                        }`}>
                          {Object.values(Theme).map(th => (
                            <button
                              key={th}
                              onClick={() => { setTheme(th); setIsThemeMenuOpen(false); }}
                              className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-2.5 ${theme === th ? 'text-blue-500 bg-blue-500/10' : 'text-text-secondary hover:bg-tertiary hover:text-text-primary'}`}
                            >
                              <span className="shrink-0 flex items-center justify-center">
                                {th === Theme.DARK ? <Moon size={14} className="text-slate-400" /> :
                                 th === Theme.LIGHT ? <Sun size={14} className="text-amber-500" /> :
                                 th === Theme.MATRIX ? <Binary size={14} className="text-emerald-400" /> :
                                 th === Theme.CYBERPUNK ? <Rainbow size={14} className="text-fuchsia-400" /> :
                                 th === Theme.GALAXY ? <Orbit size={14} className="text-indigo-400" /> :
                                 <Gamepad2 size={14} className="text-amber-400" />}
                              </span>
                              <span>{t.themes[th]}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                 </div>
              </div>
          </header>

          <MessageList 
            messages={messages}
            isThinking={isThinking}
            theme={theme}
            t={t}
            selection={selection}
            workspaceFiles={workspaceFiles}
            onApplyFile={handleUpdateWorkspaceFile}
            onApplyAllFiles={handleApplyFilesToWorkspace}
            onOpenWorkspaceRunner={() => setIsWorkspaceOpen(true)}
            onSelectSuggestion={(q) => handleSend(q)}
            onVote={handleVote}
            onCopy={handleCopy}
            onQuote={(text) => {
               setReplyTo({ id: Date.now().toString(), text, role: 'assistant' });
               setSelection(null);
               textareaRef.current?.focus();
            }}
            onCloseSelection={() => setSelection(null)}
            scrollRef={scrollRef}
            onScroll={handleMessagesScroll}
          />

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            multiple 
            id="chat-file-input"
          />

          <input 
            type="file" 
            ref={imageInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept="image/*"
            multiple 
            id="chat-image-input"
          />

          <input
            type="file"
            ref={folderInputRef}
            onChange={handleFolderUpload}
            className="hidden"
            multiple
            {...({ webkitdirectory: '', directory: '' } as any)}
            id="chat-folder-input"
          />

          <ChatInput 
            input={input}
            suggestion={suggestion}
            isThinking={isThinking}
            isRecording={isRecording}
            isTranscribing={isTranscribing}
            micError={micError}
            readAloudEnabled={readAloudEnabled}
            isSpeaking={isSpeaking}
            isFocused={isFocused}
            theme={theme}
            mode={mode}
            language={language}
            t={t}
            attachments={attachments}
            modeStyles={modeStyles}
            mentionMenu={mentionMenu}
            mentionIndex={mentionIndex}
            magicChips={magicChips}
            typingParticles={EMPTY_PARTICLES}
            tiltStyle={EMPTY_TILT}
            chatMousePos={EMPTY_MOUSE_POS}
            wpm={0}
            isCyberpunkDeleting={isCyberpunkDeleting}
            isMatrixFading={isMatrixFading}
            isBlackHoleActive={isBlackHoleActive}
            isSucking={isSucking}
            isExploding={isExploding}
            username={user?.username}
            onInputChange={handleInputChange}
            onInputKeyDown={handleInputKeyDown}
            onSend={handleSend}
            onClear={handleClear}
            onAttachImageClick={() => imageInputRef.current?.click()}
            onAttachFileClick={() => fileInputRef.current?.click()}
            onAttachFolderClick={() => folderInputRef.current?.click()}
            onOpenCustomTree={() => setIsCustomTreeOpen(true)}
            onInsertPromptTemplate={(tmpl) => {
              setInput(tmpl);
              setTimeout(() => textareaRef.current?.focus(), 0);
            }}
            onToggleRecording={toggleListening}
            onToggleReadAloud={() => {
              if (readAloudEnabled) stopSpeaking();
              setReadAloudEnabled(prev => !prev);
            }}
            onStopSpeaking={stopSpeaking}
            onClearMicError={() => setMicError(null)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onRemoveAttachment={(id) => setAttachments(prev => prev.filter(att => att.id !== id))}
            onSuggestionClick={() => { setInput(input + suggestion); setSuggestion(''); }}
            onMentionSelect={(mention) => {
               const before = input.substring(0, input.lastIndexOf('@'));
               setInput(before + `@Ref: "${mention}..." `);
               setMentionMenu(null);
            }}
            nukeConversation={nukeTheConversation}
            chatBarRef={chatBarRef}
            textareaRef={textareaRef}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onShowTools={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
            isToolsMenuOpen={isToolsMenuOpen}
            isEcoMode={isEcoMode}
            onToggleEco={() => setIsEcoMode(!isEcoMode)}
            chargeProgress={chargeProgress}
            startCharge={startCharge}
            endCharge={endCharge}
            onOpenPromptBuilder={() => setIsPromptBuilderActive(true)}
            onStop={handleStop}
            onPaste={handlePaste}
          />
      </main>
      </div>

      {isPromptBuilderActive && (
        <PromptBuilder 
          data={promptBuilder}
          t={t}
          onUpdate={setPromptBuilder}
          onSend={handlePromptBuilderSend}
          onClose={() => setIsPromptBuilderActive(false)}
        />
      )}

      <FolderTreeModal
        isOpen={isCustomTreeOpen}
        theme={theme}
        t={t}
        onClose={() => setIsCustomTreeOpen(false)}
        onInsertToChat={(treeText, rootName) => {
          const treeMarkdown = `\`\`\`tree ${rootName}\n${treeText}\n\`\`\``;
          if (!activeChatId) {
            const newChat: Chat = {
              id: Date.now().toString(),
              title: rootName || t.treeTitle,
              messages: [],
              mode,
              language,
              lastTimestamp: Date.now(),
            };
            setChats(prev => [newChat, ...prev]);
            setActiveChatId(newChat.id);
          }
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'user',
              content: treeMarkdown,
              timestamp: Date.now(),
            },
          ]);
        }}
        onSendToAi={(treeText, rootName) => {
          const promptText = `${t.treeTitle} (${rootName}):\n\`\`\`tree ${rootName}\n${treeText}\n\`\`\``;
          handleSend(promptText);
        }}
      />

      <WorkspaceRunnerModal
        isOpen={isWorkspaceOpen}
        theme={theme}
        t={t}
        workspaceName={workspaceName}
        files={workspaceFiles}
        onClose={() => setIsWorkspaceOpen(false)}
        onLoadFolderFiles={handleLoadFolderFiles}
        onAddAssets={handleAddWorkspaceAssets}
        onUpdateFile={handleUpdateWorkspaceFile}
        onDeleteFile={handleDeleteWorkspaceFile}
        onClearWorkspace={handleClearWorkspace}
        onSaveToDisk={handleSaveWorkspaceToDisk}
        onAskAiAboutError={(promptText) => {
          setIsWorkspaceOpen(false);
          handleSend(promptText);
        }}
      />

      <ChatJournalModal
        isOpen={isJournalOpen}
        theme={theme}
        language={language}
        t={t}
        journalChats={chatJournal}
        onClose={() => setIsJournalOpen(false)}
        onRestoreChat={handleRestoreFromJournal}
        onDeleteJournalChat={handleDeleteJournalChat}
      />
      {isUpdatesModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-secondary w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 flex items-center justify-between bg-tertiary/20">
              <div>
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tighter">{t.roadmapTitle}</h3>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1">{t.voteForFeatures}</p>
              </div>
              <button onClick={() => setIsUpdatesModalOpen(false)} className="p-2 hover:bg-tertiary rounded-xl text-text-secondary transition-colors">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
              {UPCOMING_UPDATES.map((update) => (
                <div key={update.id} className="p-5 rounded-3xl bg-tertiary/20 flex items-center justify-between group hover:bg-tertiary/40 transition-all">
                  <div className="flex-1 pr-4">
                    <h4 className="text-sm font-black text-text-primary uppercase tracking-tight">{update.title}</h4>
                    <p className="text-xs text-text-secondary mt-1">{update.desc}</p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <button 
                      onClick={() => handleVote(update.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
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
      )}

      {isKnowledgeModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-secondary w-full max-w-2xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">{t.addKnowledge}</h3>
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1">Manual Brain Augmentation</p>
                </div>
              </div>
              <button 
                onClick={() => setIsKnowledgeModalOpen(false)}
                className="p-2 hover:bg-white/5 rounded-xl text-text-secondary transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-black block">Loại Tri Thức (Category)</label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {['Chat', 'Code', 'Math', 'Science'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setManualKnowledge(prev => ({ ...prev, category: cat }))}
                          className={`py-2 px-3 rounded-xl text-[10px] font-black tracking-widest border transition-all ${manualKnowledge.category === cat ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 border-white/5 text-text-secondary hover:text-text-primary'}`}
                        >
                          {cat.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-black block">Phân loại nguồn (Source Type)</label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {[
                        { id: 'manual_ans', label: 'Câu trả lời (Ans)' },
                        { id: 'manual_question', label: 'Câu hỏi (User Q)' },
                        { id: 'manual_instruction', label: 'Chỉ thị (System)' },
                        { id: 'qa_rule', label: 'Học Hỏi (Q&A)' }
                      ].map(type => (
                        <button
                          key={type.id}
                          onClick={() => setManualKnowledge(prev => ({ ...prev, sourceType: type.id as any }))}
                          className={`py-2 px-3 rounded-xl text-[9px] font-black tracking-widest border transition-all ${manualKnowledge.sourceType === type.id ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20' : 'bg-white/5 border-white/5 text-text-secondary hover:text-text-primary'}`}
                        >
                          {type.label.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-black block">Nhãn phân loại (Tags - Phân cách bằng dấu phẩy)</label>
                      <input 
                        type="text"
                        value={manualKnowledge.tags}
                        onChange={(e) => setManualKnowledge(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="e.g. logic, error-handling, ui-ux"
                        className="w-full h-10 bg-white/5 border border-white/5 rounded-xl px-4 text-xs text-text-primary focus:border-blue-500 transition-colors outline-none"
                      />
                    </div>
                  </div>
                </div>

                {manualKnowledge.sourceType === 'qa_rule' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-black block">Câu hỏi mẫu (Question)</label>
                      <textarea
                        value={manualKnowledge.question}
                        onChange={(e) => setManualKnowledge(prev => ({ ...prev, question: e.target.value }))}
                        placeholder="Nhập câu hỏi mẫu. AI sẽ tìm kiếm các câu hỏi tương tự để lấy ra Answer bên dưới..."
                        className="w-full h-24 bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-text-primary outline-none focus:border-emerald-500 transition-colors resize-none no-scrollbar font-mono placeholder:text-text-secondary/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-black block">Câu trả lời (Answer)</label>
                      <textarea
                        value={manualKnowledge.answer}
                        onChange={(e) => setManualKnowledge(prev => ({ ...prev, answer: e.target.value }))}
                        placeholder="Nhập câu trả lời chính xác mà AI cần xuất ra khi gặp câu hỏi tương tự..."
                        className="w-full h-40 bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-text-primary outline-none focus:border-emerald-500 transition-colors resize-none no-scrollbar font-mono placeholder:text-text-secondary/30"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-black block">{t.knowledgeContent}</label>
                    <textarea
                      value={manualKnowledge.content}
                      onChange={(e) => setManualKnowledge(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Dán toàn bộ nội dung Bạn muốn lưu trữ vĩnh viễn vào đây..."
                      className="w-full h-48 bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-text-primary outline-none focus:border-blue-500 transition-colors resize-none no-scrollbar font-mono"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-tertiary/20 flex gap-4">
              <button 
                onClick={() => setIsKnowledgeModalOpen(false)}
                className="flex-1 py-4 rounded-2xl text-sm font-bold text-text-secondary hover:bg-white/5 transition-all"
              >
                {t.cancel}
              </button>
              <button 
                onClick={() => {
                  const isQAMode = manualKnowledge.sourceType === 'qa_rule';
                  const isValid = isQAMode 
                    ? (manualKnowledge.question.trim() && manualKnowledge.answer.trim()) 
                    : manualKnowledge.content.trim();
                  
                  if (isValid) {
                    const finalContent = isQAMode 
                        ? `Q: ${manualKnowledge.question}\nA: ${manualKnowledge.answer}`
                        : manualKnowledge.content;

                    const tagList = manualKnowledge.tags
                        ? manualKnowledge.tags.split(',').map(t => t.trim()).filter(Boolean)
                        : [];

                    brain.processNewKnowledge(
                        finalContent, 
                        manualKnowledge.category, 
                        manualKnowledge.sourceType as any,
                        manualKnowledge.question,
                        manualKnowledge.answer,
                        tagList
                    );
                    
                    setManualKnowledge({ content: '', category: 'Chat', sourceType: 'manual_ans', question: '', answer: '', tags: '' });
                    setIsKnowledgeModalOpen(false);
                    const log = `[MANUAL_INJECTION] Tri thức loại ${manualKnowledge.category} | Nguồn ${manualKnowledge.sourceType} đã được nạp cưỡng bức.`;
                    brain.addTerminalLog(log, 'logic');
                  }
                }}
                disabled={manualKnowledge.sourceType === 'qa_rule' ? (!manualKnowledge.question.trim() || !manualKnowledge.answer.trim()) : !manualKnowledge.content.trim()}
                className="flex-[2] py-4 rounded-2xl bg-blue-600 text-sm font-black text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {t.inject}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
