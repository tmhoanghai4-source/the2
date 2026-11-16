
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { customRenderer } from './customCreateElement';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';
import { ImageGenerator } from './ImageGenerator';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { FolderTree, Folder, FolderOpen, FileCode2, Copy, Check, Download, ChevronRight, ChevronDown, Play, Eye, Terminal, X, FolderCheck } from 'lucide-react';
import {
  downloadDocx,
  downloadPptx,
  downloadPdf,
  parsePptxContent,
  isDirectoryTreeText,
  triggerBlobDownload,
  resolveImageDisplaySrc,
} from '../lib/fileGenerator';
import { ChessProfileWidget } from './ChessProfileWidget';
import { FileBrandIcon } from './FileBrandIcon';
import { TranslationStrings, WorkspaceFile } from '../types';

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
});

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const customTheme = {
  ...vscDarkPlus,
  'function': {
    color: '#facc15', // Tailwind yellow-400
  },
  'class-name': {
    color: '#34d399', // Tailwind emerald-400
  },
  'keyword': {
    color: '#60a5fa', // Tailwind blue-400
  },
  'string': {
    color: '#fb923c', // Tailwind orange-400
  },
  'comment': {
    color: '#525252', // Neutral-600
    fontStyle: 'italic',
  }
};

const getSyntaxTheme = (appTheme?: string) => {
  switch (appTheme) {
    case 'matrix':
      return {
        ...customTheme,
        'keyword': { color: '#00ff00', fontWeight: 'bold' },
        'string': { color: '#008f11' },
        'comment': { color: '#003b00', fontStyle: 'italic' },
        'function': { color: '#00cc00' },
        'class-name': { color: '#00ff41' },
        'operator': { color: '#00ff41' }
      };
    case 'cyberpunk':
      return {
        ...customTheme,
        'keyword': { color: '#fdf500', fontWeight: 'bold' },
        'string': { color: '#ff00ff' },
        'comment': { color: '#00ff9f', fontStyle: 'italic' },
        'function': { color: '#3700ff' },
        'class-name': { color: '#ff0055' }
      };
    case 'light':
      return {
        ...customTheme,
      };
    default:
      return customTheme;
  }
};

declare global {
  interface Window {
    katex: any;
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    loadPyodide?: (options?: { indexURL?: string }) => Promise<any>;
    __tmPyodidePromise?: Promise<any>;
  }
}

export const getPyodideRuntime = async (): Promise<any> => {
  if (!window.loadPyodide) {
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-tm-pyodide="true"]') as HTMLScriptElement | null;
      if (existing) {
        if (window.loadPyodide) {
          resolve();
          return;
        }
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load Pyodide script')));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js';
      script.async = true;
      script.dataset.tmPyodide = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Pyodide runtime from CDN'));
      document.head.appendChild(script);
    });
  }

  if (!window.__tmPyodidePromise) {
    window.__tmPyodidePromise = window.loadPyodide!({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.5/full/',
    }).catch((err) => {
      window.__tmPyodidePromise = undefined;
      throw err;
    });
  }

  return window.__tmPyodidePromise;
};

interface MarkdownRendererProps {
  content: string;
  theme?: string;
  matrixMode?: boolean;
  matrixTrigger?: number;
  t?: TranslationStrings;
  attachedImages?: Record<string, string>;
  workspaceFiles?: WorkspaceFile[];
  isStreaming?: boolean;
  onApplyFile?: (path: string, content: string) => void;
}

const EXT_MAP: Record<string, string> = {
  python: "py", py: "py", typescript: "ts", ts: "ts",
  javascript: "js", js: "js", html: "html", css: "css",
  rust: "rs", go: "go", java: "java", cpp: "cpp", c: "c",
  sh: "sh", bash: "sh", sql: "sql"
};

const autoGenerateFileName = (language: string, code: string): string => {
  const lang = language.toLowerCase();
  const ext = EXT_MAP[lang] || "txt";
  
  const structuralMatch = code.match(/(?:def|function|class|func|int|void)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
  if (structuralMatch && structuralMatch[1] && !['main', 'int', 'void'].includes(structuralMatch[1])) {
    return `${structuralMatch[1].replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}.${ext}`;
  }
  
  if (code.toLowerCase().includes("hello world")) return `hello_world.${ext}`;
  if (lang === 'python' || lang === 'py') return `main.py`;
  if (lang === 'cpp' || lang === 'c') return `main.cpp`;
  return `main.${ext}`;
};

const MathRenderer: React.FC<{ math: string; block?: boolean }> = React.memo(({ math, block }) => {
  const [html, setHtml] = useState<string>('');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (window.katex) {
      try {
        const rendered = window.katex.renderToString(math, { displayMode: !!block, throwOnError: false });
        if (isMounted.current) setHtml(rendered);
      } catch (e) { 
        if (isMounted.current) setHtml(math); 
      }
    }
    return () => { isMounted.current = false; };
  }, [math, block]);

  return (
    <span 
      dangerouslySetInnerHTML={{ __html: html || math }} 
      className={block ? "block w-full text-center" : "inline-block"} 
    />
  );
});

const MermaidDiagram: React.FC<{ chart: string; theme: 'dark' | 'light' }> = React.memo(({ chart, theme }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const render = async () => {
      if (ref.current && chart) {
        try {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg: renderedSvg } = await mermaid.render(id, chart);
          if (isMounted.current) setSvg(renderedSvg);
        } catch (err) {
          console.error('Mermaid render error:', err);
        }
      }
    };
    render();
    return () => { isMounted.current = false; };
  }, [chart, theme]);

  return (
    <div className="my-8 p-6 bg-secondary/40 rounded-3xl border border-border-color flex justify-center overflow-x-auto shadow-2xl">
      <div ref={ref} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
});

const RechartsRenderer: React.FC<{ config: string; theme: 'dark' | 'light' }> = React.memo(({ config, theme }) => {
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const chartData = React.useMemo(() => {
    try {
      return JSON.parse(config);
    } catch (e) {
      return null;
    }
  }, [config]);

  if (!chartData) {
    return <div className="text-red-500 text-xs p-4 bg-red-500/10 rounded-xl border border-red-500/20">Chart Config Error: Invalid JSON</div>;
  }

  const { type, data, xAxis, yAxis, title } = chartData;
  const isDark = theme === 'dark';

  const handlePointClick = (data: any) => {
    if (data && (data.activePayload || data.name)) {
      const p = data.activePayload ? data.activePayload[0].payload : data;
      setSelectedPoint(p);
    }
  };

  const renderChart = () => {
    switch (type?.toLowerCase()) {
      case 'bar':
        return (
          <BarChart data={data} onClick={handlePointClick}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#ddd"} />
            <XAxis dataKey={xAxis} stroke={isDark ? "#666" : "#999"} fontSize={10} />
            <YAxis stroke={isDark ? "#666" : "#999"} fontSize={10} />
            <Tooltip 
              cursor={{ fill: isDark ? '#ffffff10' : '#00000010' }}
              contentStyle={{ backgroundColor: isDark ? '#111' : '#fff', border: `1px solid ${isDark ? '#333' : '#ddd'}`, borderRadius: '12px', fontSize: '12px', color: isDark ? '#fff' : '#000', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
            />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            <Bar dataKey={yAxis} fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={1500} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={data} onClick={handlePointClick}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#ddd"} />
            <XAxis dataKey={xAxis} stroke={isDark ? "#666" : "#999"} fontSize={10} />
            <YAxis stroke={isDark ? "#666" : "#999"} fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#111' : '#fff', border: `1px solid ${isDark ? '#333' : '#ddd'}`, borderRadius: '12px', fontSize: '12px', color: isDark ? '#fff' : '#000' }} />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            <Line type="monotone" dataKey={yAxis} stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4, strokeWidth: 2, stroke: isDark ? '#111' : '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} animationDuration={1500} />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={data} onClick={handlePointClick}>
            <defs>
              <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#ddd"} />
            <XAxis dataKey={xAxis} stroke={isDark ? "#666" : "#999"} fontSize={10} />
            <YAxis stroke={isDark ? "#666" : "#999"} fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#111' : '#fff', border: `1px solid ${isDark ? '#333' : '#ddd'}`, borderRadius: '12px', fontSize: '12px', color: isDark ? '#fff' : '#000' }} />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            <Area type="monotone" dataKey={yAxis} stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorY)" animationDuration={1500} />
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={8}
              dataKey={yAxis}
              nameKey={xAxis}
              onClick={(d) => handlePointClick(d)}
            >
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#111' : '#fff', border: `1px solid ${isDark ? '#333' : '#ddd'}`, borderRadius: '12px', fontSize: '12px', color: isDark ? '#fff' : '#000' }} />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          </PieChart>
        );
      default:
        return <div className="text-red-500 text-xs text-center p-4">Unsupported chart type: {type}</div>;
    }
  };

  return (
    <div className="my-8 p-8 bg-secondary/40 rounded-[2.5rem] border border-border-color shadow-2xl relative group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
      {title && <h4 className="text-sm font-black text-text-primary mb-8 text-center uppercase tracking-[0.3em] opacity-80">{title}</h4>}
      
      <div className="h-[300px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      <AnimatePresence>
        {selectedPoint && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-6 p-4 bg-tertiary/60 backdrop-blur-xl border border-white/5 rounded-2xl flex items-center justify-between animate-in fade-in zoom-in duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <span className="text-blue-500 font-black text-xs">VAL</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Point Insight</p>
                <p className="text-sm font-bold text-text-primary capitalize">{selectedPoint[xAxis]}: <span className="text-blue-400">{selectedPoint[yAxis]}</span></p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedPoint(null)}
              className="px-4 py-1.5 bg-secondary hover:bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest text-text-secondary transition-all"
            >
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

interface ParsedTreeItem {
  id: string;
  name: string;
  depth: number;
  isDir: boolean;
}

const parseAsciiTreeLines = (treeText: string): ParsedTreeItem[] => {
  const lines = treeText.split('\n').filter(l => l.trim().length > 0);
  return lines.map((line, idx) => {
    const connectorIdx = line.search(/[├└]──|\|--|`--/);
    let depth = 0;
    let cleanName = line.trim();
    if (connectorIdx !== -1) {
      depth = Math.max(1, Math.round(connectorIdx / 4) + 1);
      cleanName = line.slice(connectorIdx + 3).trim();
    } else {
      const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
      depth = leadingSpaces > 0 ? Math.max(1, Math.round(leadingSpaces / 2)) : 0;
    }
    const nextLine = lines[idx + 1] || '';
    const nextConnectorIdx = nextLine.search(/[├└]──|\|--|`--/);
    const nextDepth = nextConnectorIdx !== -1 ? Math.max(1, Math.round(nextConnectorIdx / 4) + 1) : 0;
    const isDir = cleanName.endsWith('/') || nextDepth > depth || (!cleanName.includes('.') && depth === 0);
    return {
      id: `${idx}-${cleanName}`,
      name: cleanName.replace(/\/$/, ''),
      depth,
      isDir,
    };
  });
};

export const DirectoryTreeBlock: React.FC<{ treeText: string; title?: string; appTheme?: string; t?: TranslationStrings }> = React.memo(({ treeText, title, appTheme, t }) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'ascii' | 'interactive'>('ascii');
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const isLight = appTheme === 'Light' || appTheme === 'light';
  const resolvedTitle = title || t?.treeTitle || 'Directory Tree';

  const items = React.useMemo(() => parseAsciiTreeLines(treeText), [treeText]);
  const lines = React.useMemo(() => treeText.trim().split('\n'), [treeText]);

  const copyTree = () => {
    navigator.clipboard.writeText(treeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTree = () => {
    const blob = new Blob([treeText], { type: 'text/plain;charset=utf-8' });
    triggerBlobDownload(blob, 'directory-tree.txt');
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const visibleItems = React.useMemo(() => {
    const out: ParsedTreeItem[] = [];
    let hiddenBelowDepth: number | null = null;
    for (const item of items) {
      if (hiddenBelowDepth !== null) {
        if (item.depth > hiddenBelowDepth) continue;
        hiddenBelowDepth = null;
      }
      out.push(item);
      if (item.isDir && collapsedIds[item.id]) {
        hiddenBelowDepth = item.depth;
      }
    }
    return out;
  }, [items, collapsedIds]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`my-5 rounded-2xl overflow-hidden border shadow-xl ${
        isLight
          ? 'bg-white border-gray-200'
          : 'bg-secondary border-white/10'
      }`}
    >
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isLight ? 'bg-gray-50 border-gray-200' : 'bg-tertiary/60 border-white/10'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shrink-0">
            <FolderTree size={14} />
          </div>
          <span className={`text-xs font-bold truncate ${isLight ? 'text-gray-800' : 'text-text-primary'}`}>
            {resolvedTitle}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
            TREE
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className={`flex p-0.5 rounded-lg border text-[10px] font-semibold ${
            isLight ? 'bg-gray-100 border-gray-200' : 'bg-black/30 border-white/10'
          }`}>
            <button
              type="button"
              onClick={() => setViewMode('ascii')}
              className={`px-2 py-1 rounded-md transition-colors ${
                viewMode === 'ascii'
                  ? 'bg-blue-600 text-white'
                  : isLight ? 'text-gray-600 hover:text-gray-900' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              ASCII
            </button>
            <button
              type="button"
              onClick={() => setViewMode('interactive')}
              className={`px-2 py-1 rounded-md transition-colors ${
                viewMode === 'interactive'
                  ? 'bg-blue-600 text-white'
                  : isLight ? 'text-gray-600 hover:text-gray-900' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t?.treeTabFolder || 'Folders'}
            </button>
          </div>

          <button
            type="button"
            onClick={copyTree}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
              isLight
                ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                : 'bg-white/5 border-white/10 text-text-secondary hover:text-text-primary hover:bg-white/10'
            }`}
            title={t?.copy || 'Copy'}
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span className="hidden sm:inline">{copied ? (t?.copiedShort || 'Copied') : (t?.copyShort || 'Copy')}</span>
          </button>

          <button
            type="button"
            onClick={downloadTree}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/20 text-[11px] font-semibold transition-all"
            title={t?.downloadFileTooltip || 'Download .txt'}
          >
            <Download size={13} />
            <span className="hidden sm:inline">.TXT</span>
          </button>
        </div>
      </div>

      {viewMode === 'ascii' ? (
        <div className={`overflow-x-auto max-h-[420px] p-4 font-mono text-xs leading-6 ${
          isLight ? 'bg-slate-900 text-emerald-300' : 'bg-[#0d0d10] text-emerald-300'
        }`}>
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span className="w-8 shrink-0 select-none text-right pr-3 text-slate-500 border-r border-slate-800 mr-3">
                {i + 1}
              </span>
              <span className="whitespace-pre">{line}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className={`overflow-auto max-h-[420px] p-4 font-mono text-xs space-y-1 ${
          isLight ? 'bg-white text-gray-800' : 'bg-[#0d0d10] text-zinc-200'
        }`}>
          {visibleItems.map((item) => {
            const isCollapsed = !!collapsedIds[item.id];
            return (
              <div
                key={item.id}
                onClick={() => item.isDir && toggleCollapse(item.id)}
                style={{ paddingLeft: `${item.depth * 18}px` }}
                className={`flex items-center gap-2 py-1 px-2 rounded-lg transition-colors ${
                  item.isDir
                    ? isLight
                      ? 'cursor-pointer hover:bg-gray-100 font-semibold text-gray-900'
                      : 'cursor-pointer hover:bg-white/5 font-semibold text-zinc-100'
                    : isLight ? 'text-gray-600' : 'text-zinc-400'
                }`}
              >
                {item.isDir ? (
                  <>
                    {isCollapsed ? <ChevronRight size={13} className="text-amber-500 shrink-0" /> : <ChevronDown size={13} className="text-amber-500 shrink-0" />}
                    {isCollapsed ? <Folder size={14} className="text-amber-400 shrink-0" /> : <FolderOpen size={14} className="text-amber-400 shrink-0" />}
                  </>
                ) : (
                  <>
                    <span className="w-[13px] shrink-0" />
                    <FileCode2 size={14} className="text-blue-400 shrink-0" />
                  </>
                )}
                <span className="truncate">{item.name}{item.isDir ? '/' : ''}</span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
});

const inferLanguage = (code: string): string => {
  const c = code.trim();
  if (c.startsWith('def ') || c.includes('import ') || c.includes('print(')) return 'python';
  if (c.startsWith('function ') || c.startsWith('const ') || c.startsWith('let ') || c.includes('console.log')) return 'javascript';
  if (c.startsWith('import React') || c.includes('interface ') || c.includes('enum ')) return 'typescript';
  if (c.startsWith('<!DOCTYPE html>') || c.includes('<html') || c.includes('<div')) return 'html';
  if (c.startsWith('#include') || c.includes('std::cout')) return 'cpp';
  if (c.startsWith('public class ') || c.includes('System.out.println')) return 'java';
  if (c.startsWith('<?php')) return 'php';
  if (c.startsWith('func ') && c.includes('fmt.')) return 'go';
  if (c.startsWith('SELECT ') || c.includes('FROM ') || c.includes('WHERE ')) return 'sql';
  if (c.startsWith('body {') || c.includes('margin:')) return 'css';
  return 'text';
};

const stripSimpleTypeScript = (source: string): string => {
  return source
    .replace(/^\s*(?:export\s+)?interface\s+[A-Za-z0-9_]+\s*\{[\s\S]*?\}\s*$/gm, '')
    .replace(/^\s*(?:export\s+)?type\s+[A-Za-z0-9_]+\s*=[^;]+;\s*$/gm, '')
    .replace(/\b(const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*[^=;\n]+(?==)/g, '$1 $2 ')
    .replace(/\s+as\s+[A-Za-z_$][A-Za-z0-9_$<>\[\]|&\s]*/g, '');
};

const CodeBlock: React.FC<{
  code: string;
  language?: string;
  filename: string;
  hasExplicitFilename?: boolean;
  appTheme?: string;
  t?: TranslationStrings;
  attachedImages?: Record<string, string>;
  workspaceFiles?: WorkspaceFile[];
  isStreaming?: boolean;
  onApplyFile?: (path: string, content: string) => void;
}> = React.memo(({ code, language, filename, hasExplicitFilename, appTheme, t, attachedImages, workspaceFiles = [], isStreaming, onApplyFile }) => {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [targetPath, setTargetPath] = useState(filename);
  const [blockSyntaxTheme, setBlockSyntaxTheme] = useState<'dark' | 'light'>(appTheme === 'light' ? 'light' : 'dark');
  const [showHighlighting] = useState(true);

  useEffect(() => {
    setTargetPath(filename);
  }, [filename]);

  const resolvedLanguage = language && language !== 'text' ? language : inferLanguage(code);
  const langLower = resolvedLanguage.toLowerCase();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);

  const editableWorkspaceFiles = React.useMemo(
    () => workspaceFiles.filter(f => !f.isBinary && f.path),
    [workspaceFiles]
  );

  const applyToTarget = (pathToApply: string) => {
    if (!onApplyFile) return;
    const clean = pathToApply.trim().replace(/^\/+/, '') || filename;
    onApplyFile(clean, code);
    setTargetPath(clean);
    setApplied(true);
    setShowTargetPicker(false);
    setTimeout(() => setApplied(false), 2200);
  };

  const displayTitle = filename || (resolvedLanguage ? `${resolvedLanguage.toUpperCase()}` : 'CODE');
  const displayCode = code;

  const copyCode = () => {
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pptxSpec = React.useMemo(() => {
    if (langLower === 'pptx' || filename.toLowerCase().endsWith('.pptx')) {
      return parsePptxContent(code);
    }
    return null;
  }, [code, langLower, filename]);

  const fileExtension = (filename.split('.').pop() || '').toLowerCase();
  const isDocDownload = fileExtension === 'docx' || fileExtension === 'pptx' || fileExtension === 'pdf' || langLower === 'pptx';

  const isPython = langLower === 'python' || langLower === 'py';
  const isJsTs = langLower === 'javascript' || langLower === 'js' || langLower === 'typescript' || langLower === 'ts';
  const isHtmlSvg = !isDocDownload && (langLower === 'html' || langLower === 'htm' || langLower === 'svg');
  const isRunnable = !isDocDownload && (isPython || isJsTs || isHtmlSvg);

  const formatRuntimeValue = (val: unknown): string => {
    if (typeof val === 'string') return val;
    if (val === undefined) return 'undefined';
    if (val === null) return 'null';
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  };

  const handleRunCode = async () => {
    if (isHtmlSvg) {
      setShowHtmlPreview(prev => !prev);
      setRunError(null);
      return;
    }

    setIsRunning(true);
    setRunOutput(null);
    setRunError(null);

    try {
      if (isPython) {
        const pyodide = await getPyodideRuntime();
        await pyodide.runPythonAsync(`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`);
        try {
          if (typeof pyodide.loadPackagesFromImports === 'function') {
            await pyodide.loadPackagesFromImports(code);
          }
        } catch {
          // Proceed even if an import is a local/custom module
        }
        const result = await pyodide.runPythonAsync(code);
        const stdout = pyodide.runPython('sys.stdout.getvalue()') as string;
        const stderr = pyodide.runPython('sys.stderr.getvalue()') as string;

        const parts: string[] = [];
        if (stdout && stdout.trimEnd()) parts.push(stdout.trimEnd());
        if (result !== undefined && result !== null && String(result) !== 'None') {
          parts.push(String(result));
        }
        if (stderr && stderr.trimEnd()) {
          setRunError(stderr.trimEnd());
        }
        setRunOutput(parts.length > 0 ? parts.join('\n') : (stderr ? '' : '(Executed successfully — no stdout)'));
      } else if (isJsTs) {
        const logs: string[] = [];
        const customConsole = {
          log: (...args: unknown[]) => logs.push(args.map(formatRuntimeValue).join(' ')),
          info: (...args: unknown[]) => logs.push(args.map(formatRuntimeValue).join(' ')),
          warn: (...args: unknown[]) => logs.push(`[WARN] ${args.map(formatRuntimeValue).join(' ')}`),
          error: (...args: unknown[]) => logs.push(`[ERROR] ${args.map(formatRuntimeValue).join(' ')}`),
        };
        const runnableJs = langLower === 'typescript' || langLower === 'ts' ? stripSimpleTypeScript(code) : code;
        const fn = new Function('console', runnableJs);
        const returned = await Promise.resolve(fn(customConsole));
        if (returned !== undefined) {
          logs.push(`=> ${formatRuntimeValue(returned)}`);
        }
        setRunOutput(logs.length > 0 ? logs.join('\n') : '(Executed successfully — no console output)');
      }
    } catch (err: any) {
      setRunError(err?.message || String(err));
    } finally {
      setIsRunning(false);
    }
  };

  const downloadFile = async () => {
    if (fileExtension === 'docx') {
      await downloadDocx(filename, code, attachedImages);
    } else if (fileExtension === 'pptx' || langLower === 'pptx') {
      await downloadPptx(filename || 'presentation.pptx', code, attachedImages);
    } else if (fileExtension === 'pdf') {
      await downloadPdf(filename, code);
    } else {
      const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
      triggerBlobDownload(blob, filename);
    }
  };

  const downloadPrefix = t?.downloadShort || 'SAVE';
  const docBrandType: 'pptx' | 'docx' | 'pdf' | null =
    fileExtension === 'pptx' || langLower === 'pptx'
      ? 'pptx'
      : fileExtension === 'docx'
      ? 'docx'
      : fileExtension === 'pdf'
      ? 'pdf'
      : null;

  const isLightBlock = appTheme === 'Light' || appTheme === 'light';

  if (isDocDownload && docBrandType) {
    const resolvedDocName =
      filename && filename.includes('.')
        ? filename
        : `${filename || 'document'}.${docBrandType}`;

    const docTypeLabel =
      docBrandType === 'pptx'
        ? t?.workspacePptxDoc || 'PowerPoint Presentation (.pptx)'
        : docBrandType === 'docx'
        ? t?.workspaceWordDoc || 'Word Document (.docx)'
        : t?.workspacePdfDoc || 'PDF Document (.pdf)';

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`my-4 rounded-2xl border overflow-hidden shadow-md ${
          isLightBlock
            ? 'bg-white border-gray-200'
            : 'bg-secondary/90 border-white/10'
        }`}
      >
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <FileBrandIcon type={docBrandType} size={40} className="shrink-0" />
            <div className="min-w-0">
              <div className={`text-sm font-bold truncate ${isLightBlock ? 'text-gray-900' : 'text-text-primary'}`}>
                {resolvedDocName}
              </div>
              <div className={`text-xs truncate ${isLightBlock ? 'text-gray-500' : 'text-text-secondary'}`}>
                {docTypeLabel}
                {pptxSpec && pptxSpec.slides.length > 0
                  ? ` • ${pptxSpec.slides.length} ${t?.slidesUnit || 'slides'}`
                  : ''}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={downloadFile}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Download size={14} />
            <span>{t?.workspaceDownloadDoc || 'Download File'}</span>
          </button>
        </div>

        {pptxSpec && pptxSpec.slides.length > 0 && (
          <div className={`px-4 pb-4 pt-3 border-t ${isLightBlock ? 'bg-gray-50 border-gray-200' : 'bg-black/25 border-white/10'}`}>
            <div className="flex items-center justify-between mb-2.5">
              <span className={`text-[11px] font-semibold ${isLightBlock ? 'text-gray-600' : 'text-text-secondary'}`}>
                {t?.slidePreview || 'Slide preview'}
              </span>
              {pptxSpec.title && (
                <span className="text-[11px] text-blue-500 font-semibold truncate max-w-[60%]">
                  {pptxSpec.title}
                </span>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {pptxSpec.slides.map((slide, sIdx) => {
                const rawSlideImg = slide.image || slide.images?.[0];
                const previewImgSrc = rawSlideImg ? resolveImageDisplaySrc(rawSlideImg, attachedImages) : '';
                return (
                  <div
                    key={sIdx}
                    className="min-w-[220px] max-w-[240px] rounded-xl bg-white text-slate-900 p-3 shadow-sm border border-slate-200 shrink-0 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="text-[10px] font-bold text-orange-600 uppercase mb-1">
                        Slide {sIdx + 1}
                      </div>
                      <div className="text-xs font-bold text-slate-900 line-clamp-2 mb-1.5">
                        {slide.title}
                      </div>
                      <ul className="space-y-0.5 text-[11px] text-slate-600 list-disc pl-4">
                        {(slide.bullets || []).slice(0, 3).map((b, bIdx) => (
                          <li key={bIdx} className="line-clamp-2">{b}</li>
                        ))}
                      </ul>
                    </div>
                    {previewImgSrc && (
                      <img
                        src={previewImgSrc}
                        alt={slide.title}
                        className="w-full h-20 object-cover rounded-lg border border-slate-200"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  const downloadButtonLabel = downloadPrefix;

  return (
    <div className="my-5 rounded-2xl overflow-hidden border border-border-color bg-secondary shadow-md group">
      {/* IDE Style Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-tertiary/60 border-b border-border-color">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 flex-shrink-0">
             <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
             <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
             <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
          <div className="h-4 w-[1px] bg-border-color mx-1 flex-shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <FileBrandIcon type="code" size={18} className="flex-shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-text-primary font-mono truncate">{displayTitle}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[9px] font-bold text-blue-400 uppercase">
                {resolvedLanguage}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onApplyFile && (
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  const exactExists = editableWorkspaceFiles.some(f => f.path === filename || f.name === filename);
                  if (hasExplicitFilename || exactExists || editableWorkspaceFiles.length === 0) {
                    applyToTarget(targetPath || filename);
                  } else {
                    setShowTargetPicker(v => !v);
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 ${
                  editableWorkspaceFiles.length > 0 ? 'rounded-l-xl border-r-0' : 'rounded-xl'
                } border text-[10px] font-bold uppercase transition-colors ${
                  applied
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-white/5 hover:bg-emerald-500/15 border-white/10 hover:border-emerald-500/40 text-text-secondary hover:text-emerald-400'
                }`}
                title={t?.workspaceApplyCode || 'Cập nhật vào Folder'}
              >
                {applied ? <Check size={13} /> : <FolderCheck size={13} />}
                <span className="hidden sm:inline">
                  {applied ? (t?.workspaceApplied || 'Đã cập nhật') : (t?.workspaceUpdateFileBtn || t?.workspaceApplyCode || 'Cập nhật')}
                </span>
              </button>
              {editableWorkspaceFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTargetPicker(v => !v)}
                  className="px-1.5 py-1.5 rounded-r-xl border border-white/10 bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                  title={t?.workspacePickTargetFile || 'Chọn file trong folder'}
                >
                  <ChevronDown size={13} />
                </button>
              )}
            </div>
          )}

          {isRunnable && (
            <button
              type="button"
              onClick={handleRunCode}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl transition-all shadow-sm text-[10px] font-bold uppercase"
              title={isHtmlSvg ? (t?.previewCode || 'Preview') : (t?.runCode || 'Run')}
            >
              {isRunning ? (
                <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : isHtmlSvg ? (
                <Eye size={13} />
              ) : (
                <Play size={13} />
              )}
              <span className="hidden sm:inline">
                {isRunning
                  ? (t?.runningCode || 'Running...')
                  : isHtmlSvg
                  ? (t?.previewCode || 'Preview')
                  : (t?.runCode || 'Run')}
              </span>
            </button>
          )}

          <button 
            onClick={copyCode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-text-secondary hover:text-blue-400 text-[10px] font-bold uppercase"
            title={t?.copy || 'Copy'}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span className="hidden sm:inline">{copied ? (t?.copiedShort || 'Copied') : (t?.copy || 'Copy')}</span>
          </button>

          <button 
            onClick={downloadFile}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all flex items-center gap-1.5 shadow-sm text-[10px] font-bold uppercase"
            title={t?.downloadFileTooltip || 'Download file'}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span className="hidden sm:inline">{downloadButtonLabel}</span>
          </button>
        </div>
      </div>

      {/* Inline target file chooser for updating folder files */}
      {showTargetPicker && onApplyFile && (
        <div className="px-4 py-2.5 bg-black/40 border-b border-border-color flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-semibold text-text-secondary">
            {t?.workspacePickTargetFile || 'File:'}
          </span>
          {editableWorkspaceFiles.length > 0 && (
            <select
              value={editableWorkspaceFiles.some(f => f.path === targetPath) ? targetPath : '__custom__'}
              onChange={(e) => {
                if (e.target.value !== '__custom__') setTargetPath(e.target.value);
              }}
              className="px-2.5 py-1 rounded-lg bg-secondary border border-white/10 text-xs font-mono text-text-primary outline-none"
            >
              {editableWorkspaceFiles.map(wf => (
                <option key={wf.path} value={wf.path}>
                  {wf.path}
                </option>
              ))}
              <option value="__custom__">+ Custom path...</option>
            </select>
          )}
          <input
            type="text"
            value={targetPath}
            onChange={(e) => setTargetPath(e.target.value)}
            placeholder="src/App.tsx"
            className="flex-1 min-w-[140px] px-2.5 py-1 rounded-lg bg-secondary border border-white/10 text-xs font-mono text-text-primary outline-none"
          />
          <button
            type="button"
            onClick={() => applyToTarget(targetPath)}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
          >
            {t?.workspaceUpdateFileBtn || 'Cập nhật'}
          </button>
        </div>
      )}
      
      {/* Content Area - lightweight pre while streaming, full highlight once idle */}
      <div 
        className="relative bg-[#111111] overflow-x-auto overflow-y-auto max-h-[500px]"
        style={{ scrollbarWidth: 'auto', msOverflowStyle: 'auto' }}
      >
        <div ref={codeRef} className="p-0 min-w-full">
          {isStreaming ? (
            <pre className="m-0 px-6 py-5 bg-transparent text-[0.85rem] leading-[1.45rem] font-mono text-zinc-200 whitespace-pre">
              <code>{displayCode}</code>
            </pre>
          ) : (
            <SyntaxHighlighter
              language={showHighlighting ? langLower : 'text'}
              style={getSyntaxTheme(blockSyntaxTheme)}
              showLineNumbers={true}
              lineNumberStyle={{
                minWidth: '2.5em',
                paddingRight: '1em',
                color: '#555555',
                userSelect: 'none',
                borderRight: '1px solid #222222',
                marginRight: '1em',
                textAlign: 'right'
              }}
              customStyle={{
                margin: 0,
                padding: '1.25rem 1.5rem',
                background: 'transparent',
                fontSize: '0.85rem',
                lineHeight: '1.45rem',
                fontFamily: 'inherit',
              }}
              codeTagProps={{
                style: {
                  fontFamily: 'inherit',
                }
              }}
            >
              {displayCode}
            </SyntaxHighlighter>
          )}
        </div>
      </div>

      {/* Live Execution Terminal / HTML Preview Output */}
      {(runOutput !== null || runError !== null || showHtmlPreview) && (
        <div className="border-t border-white/10 bg-[#09090b]">
          <div className="flex items-center justify-between px-4 py-2 bg-black/50 border-b border-white/5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              <Terminal size={13} />
              <span>{t?.outputLabel || 'Output'}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setRunOutput(null);
                setRunError(null);
                setShowHtmlPreview(false);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={11} />
              <span>{t?.clearOutput || 'Clear'}</span>
            </button>
          </div>

          {showHtmlPreview && isHtmlSvg ? (
            <div className="bg-white p-2">
              <iframe
                title={displayTitle}
                sandbox="allow-scripts"
                srcDoc={langLower === 'svg' ? `<!DOCTYPE html><html><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;">${code}</body></html>` : code}
                className="w-full h-80 border-0 rounded-lg bg-white"
              />
            </div>
          ) : (
            <div className="p-4 font-mono text-xs whitespace-pre-wrap break-words max-h-64 overflow-y-auto space-y-2">
              {runOutput && (
                <div className="text-emerald-300 leading-relaxed">{runOutput}</div>
              )}
              {runError && (
                <div className="text-red-400 leading-relaxed">{runError}</div>
              )}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[9999] flex flex-col p-4 md:p-8"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="flex-1 flex flex-col bg-[#1e1e1e] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/30 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs font-mono text-text-secondary ml-2 truncate max-w-[200px] md:max-w-md">
                    {displayTitle} — Full Height & Width View
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Theme toggler */}
                  <button 
                    onClick={() => setBlockSyntaxTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                    className={`p-2 rounded-xl border transition-all ${blockSyntaxTheme === 'dark' ? 'bg-white/5 border-white/5 text-text-secondary hover:text-yellow-400' : 'bg-blue-500 border-blue-400 text-white shadow-lg'}`}
                    title="Toggle Syntax Theme"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      {blockSyntaxTheme === 'dark' ? <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707.707M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/> : <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>}
                    </svg>
                  </button>

                  {/* Copy button */}
                  <button 
                    onClick={copyCode}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-text-secondary hover:text-blue-400 transition-all text-xs font-black uppercase tracking-widest"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    <span>{copied ? (t?.copiedShort || 'COPIED') : (t?.copyShort || 'COPY')}</span>
                  </button>

                  {/* Close button */}
                  <button 
                    onClick={() => setIsFullscreen(false)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 transition-all"
                    title="Exit Full View"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body Container with horizontal + vertical scroll support */}
              <div className="flex-1 overflow-auto p-6 md:p-8">
                <SyntaxHighlighter
                  language={showHighlighting ? resolvedLanguage.toLowerCase() : 'text'}
                  style={getSyntaxTheme(blockSyntaxTheme)}
                  showLineNumbers={true}
                  lineNumberStyle={{
                    minWidth: '2.5em',
                    paddingRight: '1em',
                    color: '#666',
                    userSelect: 'none',
                    borderRight: '1px solid #444',
                    marginRight: '1em',
                    textAlign: 'right'
                  }}
                  customStyle={{
                    margin: 0,
                    padding: 0,
                    background: 'transparent',
                    fontSize: '0.925rem',
                    lineHeight: '1.65rem',
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'inherit',
                    }
                  }}
                >
                  {displayCode}
                </SyntaxHighlighter>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

const REMARK_PLUGINS = [remarkGfm];

const RecursiveMatrix: React.FC<{ children: React.ReactNode; trigger?: number }> = ({ children, trigger }) => {
  const characters = '01';
  const [displayText, setDisplayText] = useState<string | null>(null);

  useEffect(() => {
    if (typeof children !== 'string') return;
    
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(
        children.split('').map((_, index) => {
          if (index < iteration) return children[index];
          return characters[Math.floor(Math.random() * characters.length)];
        }).join('')
      );
      iteration += children.length / 10;
      if (iteration >= children.length) {
        setDisplayText(children);
        clearInterval(interval);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [children, trigger]);

  if (typeof children === 'string') {
    return <span>{displayText || children}</span>;
  }

  return <>{children}</>;
};

const MatrixTextWrapper: React.FC<{ children: React.ReactNode; trigger?: number }> = ({ children, trigger }) => {
  return <RecursiveMatrix children={children} trigger={trigger} />;
};

const InteractiveCheckbox: React.FC<{ initialChecked: boolean }> = ({ initialChecked }) => {
  const [isChecked, setIsChecked] = useState(initialChecked);
  return (
    <label className="inline-flex items-center gap-2 mr-2 cursor-pointer align-middle relative group/check">
      <input 
        type="checkbox" 
        checked={isChecked} 
        onChange={() => setIsChecked(!isChecked)}
        className="appearance-none w-4.5 h-4.5 rounded-lg border-2 border-blue-500/30 checked:bg-blue-500 checked:border-blue-500 transition-all shadow-sm hover:border-blue-500/60"
      />
      {isChecked && (
        <motion.svg 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute w-3 h-3 text-white pointer-events-none left-[2px]" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="4"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </motion.svg>
      )}
    </label>
  );
};

const MarkdownTodoItem: React.FC<{ children?: React.ReactNode; checked?: boolean }> = React.memo(({ children, checked: initialChecked }) => {
  const [isChecked, setIsChecked] = useState(!!initialChecked);
  if (initialChecked !== undefined && initialChecked !== null) {
    return (
      <li className="flex items-start gap-2 my-1 list-none group/todo">
        <label className="relative flex items-center mt-1 cursor-pointer">
          <input 
            type="checkbox" 
            checked={isChecked} 
            onChange={() => setIsChecked(!isChecked)}
            className="peer appearance-none w-4.5 h-4.5 rounded-lg border-2 border-blue-500/30 checked:bg-blue-500 checked:border-blue-500 transition-all shadow-sm"
          />
          <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none left-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </label>
        <span className={`transition-all duration-300 font-medium ${isChecked ? 'text-text-secondary/40 line-through' : 'text-text-primary'}`}>
          {children}
        </span>
      </li>
    );
  }
  return <li className="mb-2 ml-4 list-disc marker:text-blue-500/50">{children}</li>;
});

const MarkdownLink: React.FC<{ href?: string; children?: React.ReactNode }> = React.memo(({ href, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <span className="relative inline-block group/link">
      <a 
        href={href} 
        target="_blank" 
        rel="noreferrer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-500/30 hover:decoration-blue-500 transition-all"
      >
        {children}
      </a>
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 p-3 bg-tertiary/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-[100] min-w-[200px] pointer-events-none">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Link Preview</span>
            <span className="text-[11px] text-text-primary truncate font-mono">{href}</span>
            <div className="mt-2 text-[9px] text-text-secondary italic">Open in new tab ↗</div>
          </div>
          <div className="absolute top-full left-4 border-8 border-transparent border-t-tertiary/95" />
        </div>
      )}
    </span>
  );
});

const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({ content, theme = 'dark', matrixMode, matrixTrigger, t, attachedImages, workspaceFiles = [], isStreaming = false, onApplyFile }) => {
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif',
    });
  }, [theme]);
  
  const subTheme = (theme === 'light' || theme === 'nature') ? 'light' : 'dark';
  
  const parts = React.useMemo(() => {
    if (!content) return [];
    return content.split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$|\$.*?\$)/g);
  }, [content]);

  const isChessRelated = React.useMemo(() => {
    if (!content) return false;
    return content.includes('chess.com/member/tm_kingreal') || content.toLowerCase().includes('tm_kingreal');
  }, [content]);

  const markdownComponents = React.useMemo(() => ({
    p: ({ children }: any) => {
      const processChildren = (child: any): any => {
        if (typeof child === 'string') {
          const textParts = child.split(/(\[[\sxX]\])/);
          if (textParts.length > 1) {
            return textParts.map((textPart, i) => {
              const checkboxMatch = textPart.match(/\[([\sxX])\]/);
              if (checkboxMatch) {
                const isCheckedInitial = checkboxMatch[1].toLowerCase() === 'x';
                return <InteractiveCheckbox key={i} initialChecked={isCheckedInitial} />;
              }
              return textPart;
            });
          }
        }
        return child;
      };

      return (
        <p className="mb-4 last:mb-0 leading-relaxed">
          {React.Children.map(children, processChildren)}
        </p>
      );
    },
    li: ({ children, checked }: any) => (
      <MarkdownTodoItem checked={checked}>{children}</MarkdownTodoItem>
    ),
    a: ({ href, children }: any) => (
      <MarkdownLink href={href}>{children}</MarkdownLink>
    ),
    strong: ({ children }: any) => {
      const text = typeof children === 'string' ? children : '';
      if (text === 'Bạn' || text === 'User') {
        return <strong className="font-black text-gray-500/80">Bạn</strong>;
      }
      if (text === 'TheMaster' || text === 'Tôi' || text === 'The Master') {
        return <strong className="font-black text-blue-500 shadow-sm shadow-blue-500/10">TheMaster</strong>;
      }
      return <strong className="font-black text-text-primary">{children}</strong>;
    },
    em: ({ children }: any) => {
      if (matrixMode) {
        return <em><MatrixTextWrapper trigger={matrixTrigger}>{children}</MatrixTextWrapper></em>;
      }
      return <em>{children}</em>;
    },
    img: ({ src, alt }: any) => {
      const resolved = resolveImageDisplaySrc(src || '', attachedImages);
      if (!resolved) return null;
      return (
        <img
          src={resolved}
          alt={alt || ''}
          className="my-3 max-w-full max-h-96 rounded-2xl border border-white/10 shadow-md object-contain"
        />
      );
    }
  }), [matrixMode, matrixTrigger, attachedImages]);

  if (!content) return null;

  return (
    <div className="flex flex-col gap-1">
      {parts.map((part, index) => {
        if (!part) return null;

        const partKey = `part-${index}-${part.length}`;

        if (part.startsWith('```')) {
          const firstNewLine = part.indexOf('\n');
          let rawLangLine = '';
          let codeBody = '';
          if (firstNewLine !== -1) {
            rawLangLine = part.substring(3, firstNewLine).trim();
            codeBody = part.substring(firstNewLine + 1, part.length - 3).trim();
          } else {
            rawLangLine = part.substring(3, part.length - 3).trim();
            codeBody = '';
          }

          let rawLang = 'text';
          let rawHeader = '';
          const firstSpace = rawLangLine.indexOf(' ');
          if (firstSpace !== -1) {
            rawLang = rawLangLine.substring(0, firstSpace).trim();
            rawHeader = rawLangLine.substring(firstSpace + 1).trim();
          } else {
            rawLang = rawLangLine;
          }

          const langLower = rawLang.toLowerCase();
          const resolvedLang = rawLang && rawLang !== 'text' ? rawLang : inferLanguage(codeBody);
          
          let metaFilename = '';
          const precedingText = index > 0 ? parts[index - 1] : '';
          const prefixMatch = precedingText.match(/FILENAME:\s*([^\s\n]+)/);
          if (prefixMatch) metaFilename = prefixMatch[1];
          
          const resolvedName = metaFilename || rawHeader || autoGenerateFileName(resolvedLang, codeBody);
            
            if (resolvedLang === 'vis_prompt' || resolvedLang === 'nano_banana') {
              return <ImageGenerator key={partKey} prompt={codeBody} />;
            }

            if (resolvedLang === 'mermaid') {
              return <MermaidDiagram key={partKey} chart={codeBody} theme={subTheme} />;
            }
            
            if (resolvedLang === 'recharts') {
              return <RechartsRenderer key={partKey} config={codeBody} theme={subTheme} />;
            }

            if (
              ['tree', 'dir', 'dirtree', 'filetree', 'ascii-tree'].includes(langLower) ||
              ((!langLower || ['text', 'plaintext', 'bash', 'sh'].includes(langLower)) && isDirectoryTreeText(codeBody))
            ) {
              return <DirectoryTreeBlock key={partKey} treeText={codeBody} title={metaFilename || rawHeader || t?.treeTitle} appTheme={theme} t={t} />;
            }

            return (
              <CodeBlock
                key={partKey}
                code={codeBody}
                language={resolvedLang}
                filename={resolvedName}
                hasExplicitFilename={Boolean(metaFilename || rawHeader)}
                appTheme={theme}
                t={t}
                attachedImages={attachedImages}
                workspaceFiles={workspaceFiles}
                isStreaming={isStreaming}
                onApplyFile={onApplyFile}
              />
            );
        }
        
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return (
            <div key={partKey} className="my-6 p-6 bg-secondary/20 rounded-3xl border border-border-color overflow-x-auto shadow-inner">
              <MathRenderer math={part.slice(2, -2).trim()} block />
            </div>
          );
        }
        
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          return <MathRenderer key={partKey} math={part.slice(1, -1).trim()} />;
        }
        
        // Use ReactMarkdown for text parts
        const displayMsg = part.replace(/FILENAME:\s*[^\s\n]+/g, '');
        if (!displayMsg.trim() && part.includes('FILENAME:')) return null;

        return (
          <div key={partKey} className="markdown-body text-text-primary leading-relaxed">
            <ReactMarkdown 
              remarkPlugins={REMARK_PLUGINS}
              components={markdownComponents}
            >
              {displayMsg}
            </ReactMarkdown>
          </div>
        );
      })}
      {isChessRelated && <ChessProfileWidget theme={theme} />}
    </div>
  );
});

export default MarkdownRenderer;
