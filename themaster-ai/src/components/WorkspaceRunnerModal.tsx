import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderOpen,
  ImagePlus,
  Play,
  RotateCw,
  Monitor,
  Smartphone,
  Trash2,
  X,
  FileCode2,
  Image as ImageIcon,
  Download,
  Copy,
  Check,
  Terminal,
  Plus,
  Archive,
  Send,
  HardDriveDownload,
} from 'lucide-react';
import { Theme, TranslationStrings, WorkspaceFile } from '../types';
import { downloadZipFromFiles, triggerBlobDownload } from '../lib/fileGenerator';
import { getPyodideRuntime } from './MarkdownRenderer';

interface WorkspaceRunnerModalProps {
  isOpen: boolean;
  theme: Theme;
  t: TranslationStrings;
  workspaceName: string;
  files: WorkspaceFile[];
  onClose: () => void;
  onLoadFolderFiles: (files: WorkspaceFile[], folderName: string) => void;
  onAddAssets: (assets: WorkspaceFile[]) => void;
  onUpdateFile: (path: string, content: string) => void;
  onDeleteFile: (path: string) => void;
  onClearWorkspace: () => void;
  onSaveToDisk?: () => Promise<boolean>;
  onAskAiAboutError?: (promptText: string) => void;
}

const isAssetPath = (path: string) => {
  const lower = path.toLowerCase();
  return (
    lower.startsWith('assets/') ||
    lower.startsWith('asset/') ||
    lower.startsWith('public/assets/') ||
    lower.includes('/assets/') ||
    /\.(png|jpe?g|gif|webp|svg|ico|bmp)$/i.test(lower)
  );
};

const replaceAssetReferences = (source: string, assetMap: Record<string, string>): string => {
  if (!source || Object.keys(assetMap).length === 0) return source;
  let result = source;
  const entries = Object.entries(assetMap).sort((a, b) => b[0].length - a[0].length);
  for (const [key, dataUrl] of entries) {
    if (!key || !dataUrl) continue;
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match './assets/x', '/assets/x', 'assets/x', or 'attach://assets/x' inside quotes or CSS url()
    const regex = new RegExp(`(['"\`(])(?:attach:\\/\\/|\\.\\/|\\/)?${escaped}(['"\`)])`, 'g');
    result = result.replace(regex, `$1${dataUrl}$2`);
  }
  return result;
};

const isMediaPath = (path: string, mime?: string) => {
  const lower = path.toLowerCase();
  return (
    mime?.startsWith('image/') ||
    mime?.startsWith('video/') ||
    mime?.startsWith('audio/') ||
    /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif|jfif|mp4|webm|mov|m4v|mp3|wav|ogg|m4a|flac)$/i.test(lower)
  );
};

const buildVirtualAppHtml = (
  files: WorkspaceFile[],
  workspaceName = 'folder'
): { html: string; mode: 'web' | 'python' | 'gallery' | 'explorer' | 'none'; pythonEntry?: WorkspaceFile } => {
  if (files.length === 0) {
    return { html: '', mode: 'none' };
  }

  const assetMap: Record<string, string> = {};
  for (const f of files) {
    if (f.dataUrl) {
      assetMap[f.path] = f.dataUrl;
      assetMap[f.name] = f.dataUrl;
      const strippedPublic = f.path.replace(/^public\//, '');
      assetMap[strippedPublic] = f.dataUrl;
      if (!f.path.startsWith('asset/') && !f.path.startsWith('assets/') && f.mimeType?.startsWith('image/')) {
        assetMap[`asset/${f.name}`] = f.dataUrl;
        assetMap[`assets/${f.name}`] = f.dataUrl;
      }
    }
  }

  const consoleBridgeScript = `
<script>
(function(){
  const post = (level, args) => {
    try {
      const text = Array.from(args).map(a => {
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a); } catch { return String(a); }
      }).join(' ');
      window.parent.postMessage({ type: '__TM_RUNNER_LOG__', level, text }, '*');
    } catch {}
  };
  const origLog = console.log, origWarn = console.warn, origErr = console.error;
  console.log = (...a) => { post('log', a); origLog.apply(console, a); };
  console.warn = (...a) => { post('warn', a); origWarn.apply(console, a); };
  console.error = (...a) => { post('error', a); origErr.apply(console, a); };
  window.addEventListener('error', (e) => post('error', [e.message || 'Runtime error']));
  window.addEventListener('unhandledrejection', (e) => post('error', [e.reason?.message || String(e.reason || 'Unhandled rejection')]));
})();
</script>`;

  const htmlFile =
    files.find(f => f.path.toLowerCase() === 'index.html') ||
    files.find(f => f.path.toLowerCase() === 'public/index.html') ||
    files.find(f => f.path.toLowerCase().endsWith('.html'));

  const codeModules = files.filter(
    f => !f.isBinary && /\.(jsx|tsx|js|ts|mjs)$/i.test(f.path) && !f.path.toLowerCase().includes('vite.config')
  );
  const cssFiles = files.filter(f => !f.isBinary && /\.css$/i.test(f.path));

  const hasReactOrTsx = codeModules.some(
    f =>
      /\.(tsx|jsx|ts)$/i.test(f.path) ||
      (f.content || '').includes('from "react"') ||
      (f.content || '').includes("from 'react'") ||
      (f.content || '').includes('ReactDOM')
  );

  // Case 1: Plain HTML + CSS + JS project without React/JSX/TSX module bundling needed
  if (htmlFile && !hasReactOrTsx) {
    let html = htmlFile.content || '';
    const combinedCss = cssFiles.map(c => replaceAssetReferences(c.content || '', assetMap)).join('\n');
    const combinedJs = codeModules.map(j => replaceAssetReferences(j.content || '', assetMap)).join('\n');

    html = replaceAssetReferences(html, assetMap);
    // Strip external relative stylesheet/script tags we're inlining so iframe doesn't 404
    html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]+href=["'](?!https?:\/\/)[^"']+["'][^>]*>/gi, '');
    html = html.replace(/<script[^>]+src=["'](?!https?:\/\/)[^"']+["'][^>]*>\s*<\/script>/gi, '');

    const styleInject = combinedCss ? `<style>${combinedCss}</style>` : '';
    const scriptInject = combinedJs ? `<script>${combinedJs}</script>` : '';

    if (html.includes('</head>')) {
      html = html.replace('</head>', `${consoleBridgeScript}${styleInject}</head>`);
    } else {
      html = `<!DOCTYPE html><html><head>${consoleBridgeScript}${styleInject}</head><body>${html}</body></html>`;
    }

    if (scriptInject) {
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${scriptInject}</body>`);
      } else {
        html += scriptInject;
      }
    }
    return { html, mode: 'web' };
  }

  // Case 2: React / TypeScript / JSX / Vite-style web project OR JS app
  if (hasReactOrTsx || codeModules.length > 0 || htmlFile) {
    const virtualFilesObj: Record<string, string> = {};
    for (const m of codeModules) {
      virtualFilesObj[m.path] = replaceAssetReferences(m.content || '', assetMap);
    }

    const entryPath =
      codeModules.find(f => /^(src\/)?main\.(tsx|jsx|ts|js)$/i.test(f.path))?.path ||
      codeModules.find(f => /^(src\/)?index\.(tsx|jsx|ts|js)$/i.test(f.path))?.path ||
      codeModules.find(f => /^(src\/)?App\.(tsx|jsx|ts|js)$/i.test(f.path))?.path ||
      codeModules[0]?.path ||
      '';

    const combinedCss = cssFiles
      .map(c => replaceAssetReferences((c.content || '').replace(/@import\s+["']tailwindcss["'];?/g, ''), assetMap))
      .join('\n');

    const titleMatch = htmlFile?.content?.match(/<title>([^<]+)<\/title>/i);
    const docTitle = titleMatch?.[1] || 'App Preview';

    const runnerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${docTitle}</title>
  ${consoleBridgeScript}
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
    ${combinedCss}
  </style>
</head>
<body class="bg-slate-950 text-white">
  <div id="root"></div>
  <div id="app"></div>
  <script>
    (function() {
      const FILES = ${JSON.stringify(virtualFilesObj)};
      const ENTRY = ${JSON.stringify(entryPath)};
      const MODULE_CACHE = {};

      function normalizePath(base, rel) {
        if (rel.startsWith('@/')) {
          rel = 'src/' + rel.slice(2);
        } else if (rel.startsWith('./') || rel.startsWith('../')) {
          const stack = base.split('/').slice(0, -1);
          for (const part of rel.split('/')) {
            if (part === '.' || !part) continue;
            if (part === '..') stack.pop();
            else stack.push(part);
          }
          rel = stack.join('/');
        } else {
          rel = rel.replace(/^\\/+/, '');
        }
        const candidates = [
          rel,
          rel + '.tsx', rel + '.ts', rel + '.jsx', rel + '.js',
          rel + '/index.tsx', rel + '/index.ts', rel + '/index.jsx', rel + '/index.js'
        ];
        for (const c of candidates) {
          if (Object.prototype.hasOwnProperty.call(FILES, c)) return c;
        }
        return null;
      }

      const reactShim = Object.assign({}, window.React, { default: window.React });
      const reactDomShim = Object.assign({}, window.ReactDOM, { default: window.ReactDOM });
      const lucideFallback = new Proxy({}, {
        get: (_, prop) => function Icon(props) {
          return window.React.createElement('span', {
            style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', opacity: 0.85 },
            title: String(prop),
            ...props
          }, '◆');
        }
      });

      function requireModule(currentPath, specifier) {
        if (specifier === 'react') return reactShim;
        if (specifier === 'react-dom' || specifier === 'react-dom/client') return reactDomShim;
        if (specifier === 'lucide-react') return lucideFallback;
        if (specifier.endsWith('.css')) return {};
        const resolved = normalizePath(currentPath, specifier);
        if (!resolved) {
          throw new Error('Cannot resolve module "' + specifier + '" from ' + currentPath);
        }
        return loadModule(resolved);
      }

      function loadModule(path) {
        if (MODULE_CACHE[path]) return MODULE_CACHE[path].exports;
        const source = FILES[path];
        const mod = { exports: {} };
        MODULE_CACHE[path] = mod;
        const transformed = Babel.transform(source, {
          filename: path,
          presets: ['react', 'typescript', ['env', { modules: 'commonjs' }]]
        }).code;
        const fn = new Function('require', 'module', 'exports', 'React', 'ReactDOM', transformed);
        fn((spec) => requireModule(path, spec), mod, mod.exports, window.React, window.ReactDOM);
        return mod.exports;
      }

      try {
        if (!ENTRY) throw new Error('No runnable entry file found');
        const exported = loadModule(ENTRY);
        const rootEl = document.getElementById('root');
        if (rootEl && !rootEl.hasChildNodes() && exported && (exported.default || typeof exported === 'function')) {
          const Comp = exported.default || exported;
          if (typeof Comp === 'function') {
            const root = window.ReactDOM.createRoot ? window.ReactDOM.createRoot(rootEl) : null;
            if (root) root.render(window.React.createElement(Comp));
            else window.ReactDOM.render(window.React.createElement(Comp), rootEl);
          }
        }
      } catch (err) {
        console.error(err.message || err);
        document.getElementById('root').innerHTML =
          '<div style="padding:20px;font-family:monospace;color:#f87171;background:#18181b;min-height:100vh;">' +
          '<strong>App Runner Error:</strong><pre style="white-space:pre-wrap;margin-top:8px;">' +
          String(err && err.stack ? err.stack : err) + '</pre></div>';
      }
    })();
  </script>
</body>
</html>`;
    return { html: runnerHtml, mode: 'web' };
  }

  // Case 3: Python project
  const pyEntry = files.find(f => /^(main|app|index)\.py$/i.test(f.path)) || files.find(f => /\.py$/i.test(f.path));
  if (pyEntry) {
    return { html: '', mode: 'python', pythonEntry: pyEntry };
  }

  // Case 4: Image / Media Folder -> Interactive Gallery & Lightbox App
  const mediaItems = files.filter(f => f.dataUrl && isMediaPath(f.path, f.mimeType));
  if (mediaItems.length > 0) {
    const serializedMedia = JSON.stringify(
      mediaItems.map(m => ({
        path: m.path,
        name: m.name,
        mime: m.mimeType || 'image/png',
        size: m.size,
        src: m.dataUrl,
        kind: m.mimeType?.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(m.name)
          ? 'video'
          : m.mimeType?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac)$/i.test(m.name)
          ? 'audio'
          : 'image',
        folder: m.path.includes('/') ? m.path.split('/').slice(0, -1).join('/') : 'root',
      }))
    );

    const galleryHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${workspaceName} — Media Gallery</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0b0d12; color: #f4f4f5; }
  header { position: sticky; top: 0; z-index: 20; background: rgba(11,13,18,.92); backdrop-filter: blur(8px); border-bottom: 1px solid #27272a; padding: 12px 18px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
  .title { font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
  .badge { font-size: 11px; color: #93c5fd; background: rgba(59,130,246,.15); padding: 2px 8px; border-radius: 8px; }
  .controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  select, input, button { background: #18181b; color: #f4f4f5; border: 1px solid #27272a; border-radius: 10px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
  button:hover { border-color: #3b82f6; }
  button.primary { background: #2563eb; border-color: #2563eb; font-weight: 600; }
  .grid { padding: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
  .card { background: #14161d; border: 1px solid #27272a; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: transform .15s, border-color .15s; cursor: pointer; }
  .card:hover { transform: translateY(-2px); border-color: #3b82f6; }
  .thumb { height: 150px; background: #090a0f; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .thumb img, .thumb video { width: 100%; height: 100%; object-fit: cover; }
  .meta { padding: 8px 10px; font-size: 11px; }
  .name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { color: #a1a1aa; font-size: 10px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .modal { position: fixed; inset: 0; background: rgba(0,0,0,.92); display: none; flex-direction: column; z-index: 50; }
  .modal.open { display: flex; }
  .mhead { padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #27272a; font-size: 13px; }
  .mbody { flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px; position: relative; overflow: hidden; }
  .mbody img, .mbody video { max-width: 92vw; max-height: 78vh; border-radius: 12px; object-fit: contain; }
  .nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(24,24,27,.85); border: 1px solid #3f3f46; width: 40px; height: 40px; border-radius: 99px; font-size: 18px; display: flex; align-items: center; justify-content: center; }
  .prev { left: 16px; }
  .next { right: 16px; }
</style>
</head>
<body>
  <header>
    <div class="title"><span>${workspaceName}/</span><span class="badge" id="countBadge"></span></div>
    <div class="controls">
      <input id="q" type="text" placeholder="Filter by filename..." />
      <select id="folderFilter"><option value="all">All folders</option></select>
      <button id="slideBtn" class="primary">Slideshow</button>
    </div>
  </header>
  <div class="grid" id="grid"></div>
  <div class="modal" id="modal">
    <div class="mhead">
      <span id="mTitle" style="font-family:monospace"></span>
      <div style="display:flex;gap:8px">
        <button id="copyPathBtn">Copy path</button>
        <button id="closeBtn">Close (Esc)</button>
      </div>
    </div>
    <div class="mbody">
      <button class="nav prev" id="prevBtn">&#8249;</button>
      <div id="stage"></div>
      <button class="nav next" id="nextBtn">&#8250;</button>
    </div>
  </div>
<script>
  const ITEMS = ${serializedMedia};
  const grid = document.getElementById('grid');
  const qEl = document.getElementById('q');
  const fEl = document.getElementById('folderFilter');
  const modal = document.getElementById('modal');
  const stage = document.getElementById('stage');
  const mTitle = document.getElementById('mTitle');
  const countBadge = document.getElementById('countBadge');
  let filtered = ITEMS;
  let currentIdx = -1;
  let slideTimer = null;

  const folders = Array.from(new Set(ITEMS.map(i => i.folder)));
  folders.forEach(fd => {
    const opt = document.createElement('option');
    opt.value = fd; opt.textContent = fd;
    fEl.appendChild(opt);
  });

  function render() {
    const q = qEl.value.trim().toLowerCase();
    const fd = fEl.value;
    filtered = ITEMS.filter(i => (fd === 'all' || i.folder === fd) && (!q || i.path.toLowerCase().includes(q)));
    countBadge.textContent = filtered.length + ' items';
    grid.innerHTML = '';
    filtered.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'card';
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      if (item.kind === 'video') {
        const v = document.createElement('video'); v.src = item.src; v.muted = true; thumb.appendChild(v);
      } else if (item.kind === 'audio') {
        thumb.innerHTML = '<div style="font-size:28px;opacity:.75">&#9835;</div>';
      } else {
        const img = document.createElement('img'); img.src = item.src; img.loading = 'lazy'; img.alt = item.name; thumb.appendChild(img);
      }
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = '<div class="name"></div><div class="sub"></div>';
      meta.querySelector('.name').textContent = item.name;
      meta.querySelector('.sub').textContent = item.path + ' · ' + Math.max(1, Math.round(item.size / 1024)) + ' KB';
      card.appendChild(thumb);
      card.appendChild(meta);
      card.onclick = () => openModal(idx);
      grid.appendChild(card);
    });
  }

  function openModal(idx) {
    if (filtered.length === 0) return;
    currentIdx = ((idx % filtered.length) + filtered.length) % filtered.length;
    const item = filtered[currentIdx];
    mTitle.textContent = item.path;
    stage.innerHTML = '';
    if (item.kind === 'video') {
      const v = document.createElement('video'); v.src = item.src; v.controls = true; v.autoplay = true; stage.appendChild(v);
    } else if (item.kind === 'audio') {
      const a = document.createElement('audio'); a.src = item.src; a.controls = true; a.autoplay = true; a.style.width = '360px'; stage.appendChild(a);
    } else {
      const img = document.createElement('img'); img.src = item.src; img.alt = item.name; stage.appendChild(img);
    }
    modal.classList.add('open');
  }

  function closeModal() {
    modal.classList.remove('open');
    stage.innerHTML = '';
    if (slideTimer) { clearInterval(slideTimer); slideTimer = null; document.getElementById('slideBtn').textContent = 'Slideshow'; }
  }

  document.getElementById('closeBtn').onclick = closeModal;
  document.getElementById('prevBtn').onclick = () => openModal(currentIdx - 1);
  document.getElementById('nextBtn').onclick = () => openModal(currentIdx + 1);
  document.getElementById('copyPathBtn').onclick = () => {
    if (currentIdx >= 0) navigator.clipboard?.writeText(filtered[currentIdx].path);
  };
  document.getElementById('slideBtn').onclick = () => {
    if (slideTimer) {
      clearInterval(slideTimer); slideTimer = null;
      document.getElementById('slideBtn').textContent = 'Slideshow';
    } else {
      openModal(Math.max(0, currentIdx));
      document.getElementById('slideBtn').textContent = 'Stop';
      slideTimer = setInterval(() => openModal(currentIdx + 1), 2500);
    }
  };
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') openModal(currentIdx - 1);
    if (e.key === 'ArrowRight') openModal(currentIdx + 1);
  });
  qEl.oninput = render;
  fEl.onchange = render;
  render();
</script>
</body>
</html>`;
    return { html: galleryHtml, mode: 'gallery' };
  }

  // Case 5: Document / PDF / Data / Mixed Folder Explorer
  if (files.length > 0) {
    const explorerEntries = files.slice(0, 120).map(f => ({
      path: f.path,
      name: f.name,
      mime: f.mimeType || 'text/plain',
      size: f.size,
      content: (f.content || '').slice(0, 60000),
      dataUrl: f.dataUrl || '',
    }));

    const explorerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${workspaceName} — Folder Runner</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0b0d12; color: #f4f4f5; display: flex; height: 100vh; }
  aside { width: 260px; border-right: 1px solid #27272a; background: #11131a; overflow-y: auto; padding: 10px; }
  .hdr { font-size: 12px; font-weight: 700; padding: 6px 8px 10px; color: #93c5fd; border-bottom: 1px solid #27272a; margin-bottom: 8px; }
  .item { width: 100%; text-align: left; background: transparent; color: #d4d4d8; border: 0; padding: 7px 10px; border-radius: 8px; font-family: monospace; font-size: 11px; cursor: pointer; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .item:hover { background: #1e222d; }
  .item.active { background: #2563eb; color: #fff; }
  main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .top { padding: 10px 16px; border-bottom: 1px solid #27272a; font-family: monospace; font-size: 12px; color: #a1a1aa; }
  .view { flex: 1; overflow: auto; padding: 16px; }
  pre { margin: 0; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; line-height: 1.6; white-space: pre-wrap; color: #e4e4e7; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th, td { border: 1px solid #27272a; padding: 6px 10px; text-align: left; }
  th { background: #18181b; }
</style>
</head>
<body>
  <aside>
    <div class="hdr">${workspaceName}/ (${explorerEntries.length})</div>
    <div id="list"></div>
  </aside>
  <main>
    <div class="top" id="pathBar"></div>
    <div class="view" id="viewer"></div>
  </main>
<script>
  const FILES = ${JSON.stringify(explorerEntries)};
  const list = document.getElementById('list');
  const viewer = document.getElementById('viewer');
  const pathBar = document.getElementById('pathBar');

  function select(idx) {
    const f = FILES[idx];
    if (!f) return;
    Array.from(list.children).forEach((el, i) => el.classList.toggle('active', i === idx));
    pathBar.textContent = f.path + ' (' + Math.max(1, Math.round(f.size / 1024)) + ' KB)';
    viewer.innerHTML = '';
    if (f.dataUrl && f.mime === 'application/pdf') {
      const emb = document.createElement('iframe'); emb.src = f.dataUrl; emb.style.width = '100%'; emb.style.height = '100%'; emb.style.border = '0';
      viewer.appendChild(emb);
    } else if (f.name.toLowerCase().endsWith('.svg') && f.content) {
      viewer.innerHTML = '<div style="background:#fff;padding:16px;border-radius:12px;display:inline-block">' + f.content + '</div>';
    } else if (f.name.toLowerCase().endsWith('.csv') && f.content) {
      const rows = f.content.trim().split(/\\r?\\n/).slice(0, 200);
      const table = document.createElement('table');
      rows.forEach((r, ri) => {
        const tr = document.createElement('tr');
        r.split(',').forEach(cell => {
          const el = document.createElement(ri === 0 ? 'th' : 'td');
          el.textContent = cell.replace(/^"|"$/g, '');
          tr.appendChild(el);
        });
        table.appendChild(tr);
      });
      viewer.appendChild(table);
    } else if (f.name.toLowerCase().endsWith('.json') && f.content) {
      const pre = document.createElement('pre');
      try { pre.textContent = JSON.stringify(JSON.parse(f.content), null, 2); } catch { pre.textContent = f.content; }
      viewer.appendChild(pre);
    } else {
      const pre = document.createElement('pre');
      pre.textContent = f.content || '(Binary file)';
      viewer.appendChild(pre);
    }
  }

  FILES.forEach((f, idx) => {
    const btn = document.createElement('button');
    btn.className = 'item';
    btn.textContent = f.path;
    btn.onclick = () => select(idx);
    list.appendChild(btn);
  });
  if (FILES.length > 0) select(0);
</script>
</body>
</html>`;
    return { html: explorerHtml, mode: 'explorer' };
  }

  return { html: '', mode: 'none' };
};

const WorkspaceRunnerModal: React.FC<WorkspaceRunnerModalProps> = ({
  isOpen,
  theme,
  t,
  workspaceName,
  files,
  onClose,
  onLoadFolderFiles,
  onAddAssets,
  onUpdateFile,
  onDeleteFile,
  onClearWorkspace,
  onSaveToDisk,
  onAskAiAboutError,
}) => {
  const isLight = theme === Theme.LIGHT;
  const folderPickerRef = useRef<HTMLInputElement>(null);
  const assetPickerRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'runner' | 'files' | 'assets'>('runner');
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [reloadSeed, setReloadSeed] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<{ level: string; text: string }[]>([]);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [newFilePath, setNewFilePath] = useState('');
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [isPyRunning, setIsPyRunning] = useState(false);
  const [pyOutput, setPyOutput] = useState<string | null>(null);
  const [pyError, setPyError] = useState<string | null>(null);
  const [savedToDisk, setSavedToDisk] = useState(false);

  React.useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.type === '__TM_RUNNER_LOG__') {
        setConsoleLogs(prev => [...prev.slice(-60), { level: ev.data.level || 'log', text: String(ev.data.text || '') }]);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const codeFiles = useMemo(() => files.filter(f => !f.isBinary && typeof f.content === 'string'), [files]);
  const assetFiles = useMemo(
    () => files.filter(f => isMediaPath(f.path, f.mimeType) || isAssetPath(f.path)),
    [files]
  );

  const selectedFile = useMemo(
    () => files.find(f => f.path === selectedPath) || codeFiles[0] || files[0] || null,
    [files, codeFiles, selectedPath]
  );

  const builtApp = useMemo(() => buildVirtualAppHtml(files, workspaceName), [files, workspaceName, reloadSeed]);

  const handleRunPythonProject = async (pyFile: WorkspaceFile) => {
    setIsPyRunning(true);
    setPyOutput(null);
    setPyError(null);
    try {
      const pyodide = await getPyodideRuntime();
      await pyodide.runPythonAsync(`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`);
      try {
        if (typeof pyodide.loadPackagesFromImports === 'function') {
          await pyodide.loadPackagesFromImports(pyFile.content || '');
        }
      } catch {
        // Ignore non-PyPI local module names
      }
      const res = await pyodide.runPythonAsync(pyFile.content || '');
      const stdout = pyodide.runPython('sys.stdout.getvalue()') as string;
      const stderr = pyodide.runPython('sys.stderr.getvalue()') as string;
      const parts: string[] = [];
      if (stdout?.trimEnd()) parts.push(stdout.trimEnd());
      if (res !== undefined && res !== null && String(res) !== 'None') parts.push(String(res));
      if (stderr?.trimEnd()) setPyError(stderr.trimEnd());
      setPyOutput(parts.length > 0 ? parts.join('\n') : (stderr ? '' : '(Executed successfully)'));
    } catch (err: any) {
      setPyError(err?.message || String(err));
    } finally {
      setIsPyRunning(false);
    }
  };

  const handleFolderPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    const loaded: WorkspaceFile[] = [];
    const firstRel = (list[0] as any).webkitRelativePath || '';
    const detectedRoot = firstRel.includes('/') ? firstRel.split('/')[0] : 'my-project';

    for (const file of Array.from(list).slice(0, 300)) {
      const rawRel = (file as any).webkitRelativePath || file.name;
      if (rawRel.includes('node_modules/') || rawRel.includes('.git/') || rawRel.includes('dist/')) continue;

      const cleanPath = rawRel.includes('/') ? rawRel.split('/').slice(1).join('/') : rawRel;
      if (!cleanPath) continue;

      const isMediaOrPdf =
        isMediaPath(file.name, file.type) ||
        file.type === 'application/pdf' ||
        /\.pdf$/i.test(file.name);
      const isText =
        (!isMediaOrPdf || /\.svg$/i.test(file.name)) &&
        (file.type.startsWith('text/') ||
          /\.(txt|js|jsx|ts|tsx|mjs|cjs|py|json|css|scss|html?|md|csv|xml|yml|yaml|sh|sql|env|svg)$/i.test(file.name));

      if (isMediaOrPdf && file.size <= 15 * 1024 * 1024) {
        const dataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result || ''));
          r.onerror = () => resolve('');
          r.readAsDataURL(file);
        });
        let textContent: string | undefined;
        if (/\.svg$/i.test(file.name)) {
          try { textContent = await file.text(); } catch {}
        }
        loaded.push({
          path: cleanPath,
          name: file.name,
          mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
          size: file.size,
          dataUrl,
          content: textContent,
          isBinary: !textContent,
        });
      } else if (isText && file.size <= 500_000) {
        const text = await file.text();
        loaded.push({
          path: cleanPath,
          name: file.name,
          mimeType: file.type || 'text/plain',
          size: file.size,
          content: text,
          isBinary: false,
        });
      }
    }

    onLoadFolderFiles(loaded, detectedRoot);
    setActiveTab('runner');
    setConsoleLogs([]);
    setPyOutput(null);
    setPyError(null);
    setReloadSeed(s => s + 1);
    if (folderPickerRef.current) folderPickerRef.current.value = '';
  };

  const handleAssetPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    const newAssets: WorkspaceFile[] = [];
    for (const file of Array.from(list)) {
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ''));
        r.readAsDataURL(file);
      });
      newAssets.push({
        path: `asset/${file.name}`,
        name: file.name,
        mimeType: file.type || 'image/png',
        size: file.size,
        dataUrl,
        isBinary: true,
      });
    }

    onAddAssets(newAssets);
    setActiveTab('assets');
    if (assetPickerRef.current) assetPickerRef.current.value = '';
  };

  const handleDownloadZip = async () => {
    const textEntries = files
      .filter(f => !f.isBinary && typeof f.content === 'string')
      .map(f => ({ path: f.path, content: f.content || '' }));
    if (textEntries.length > 0) {
      await downloadZipFromFiles(`${workspaceName || 'project'}.zip`, textEntries);
    }
  };

  const copyAssetRef = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1600);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.16 }}
            className={`w-full max-w-6xl h-[88vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
              isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-secondary border-white/10 text-text-primary'
            }`}
          >
            {/* Top Toolbar */}
            <div className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${
              isLight ? 'bg-gray-50 border-gray-200' : 'bg-tertiary/40 border-white/10'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-blue-600/15 border border-blue-500/25 text-blue-500 shrink-0">
                  <FolderOpen size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate">{t.workspaceTitle}</h3>
                  <div className="text-[11px] text-text-secondary flex items-center gap-1.5">
                    <span className="font-mono font-semibold">{workspaceName || 'workspace'}</span>
                    <span>·</span>
                    <span>{files.length} {t.filesUnit}</span>
                  </div>
                </div>
              </div>

              {/* Segmented Tabs */}
              <div className={`flex items-center gap-1 p-1 rounded-xl border ${
                isLight ? 'bg-gray-100 border-gray-200' : 'bg-black/30 border-white/10'
              }`}>
                <button
                  type="button"
                  onClick={() => setActiveTab('runner')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    activeTab === 'runner'
                      ? 'bg-blue-600 text-white'
                      : isLight ? 'text-gray-600 hover:text-gray-900' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Play size={13} />
                  <span>{t.workspaceRunApp}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('files')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    activeTab === 'files'
                      ? 'bg-blue-600 text-white'
                      : isLight ? 'text-gray-600 hover:text-gray-900' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <FileCode2 size={13} />
                  <span>{t.workspaceFilesTab} ({codeFiles.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('assets')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    activeTab === 'assets'
                      ? 'bg-blue-600 text-white'
                      : isLight ? 'text-gray-600 hover:text-gray-900' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <ImageIcon size={13} />
                  <span>{t.workspaceAssetsTab} ({assetFiles.length})</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={folderPickerRef}
                  type="file"
                  className="hidden"
                  multiple
                  {...({ webkitdirectory: '', directory: '' } as any)}
                  onChange={handleFolderPicked}
                />
                <input
                  ref={assetPickerRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAssetPicked}
                />

                <button
                  type="button"
                  onClick={() => folderPickerRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap"
                >
                  <FolderOpen size={14} />
                  <span>{t.workspaceLoadFolder}</span>
                </button>

                <button
                  type="button"
                  onClick={() => assetPickerRef.current?.click()}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    isLight
                      ? 'bg-white hover:bg-gray-100 border-gray-200 text-gray-800'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-text-primary'
                  }`}
                >
                  <ImagePlus size={14} className="text-emerald-400" />
                  <span>{t.workspaceAddAsset}</span>
                </button>

                {files.length > 0 && onSaveToDisk && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await onSaveToDisk();
                      if (ok) {
                        setSavedToDisk(true);
                        setTimeout(() => setSavedToDisk(false), 2200);
                      }
                    }}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      savedToDisk
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : isLight
                        ? 'bg-white hover:bg-gray-100 border-gray-200 text-gray-800'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-text-primary'
                    }`}
                    title={t.workspaceSaveDisk}
                  >
                    {savedToDisk ? <Check size={14} /> : <HardDriveDownload size={14} className="text-blue-400" />}
                    <span className="hidden lg:inline">{savedToDisk ? t.workspaceSavedDisk : t.workspaceSaveDisk}</span>
                  </button>
                )}

                {codeFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    className={`p-2 rounded-xl border transition-all ${
                      isLight
                        ? 'bg-white hover:bg-gray-100 border-gray-200 text-gray-700'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-text-secondary hover:text-text-primary'
                    }`}
                    title={t.downloadZipPrefix}
                  >
                    <Archive size={15} />
                  </button>
                )}

                {files.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearWorkspace}
                    className="p-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                    title={t.workspaceClear}
                  >
                    <Trash2 size={15} />
                  </button>
                )}

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
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 flex flex-col">
              {activeTab === 'runner' && (
                <div className="flex-1 flex flex-col min-h-0">
                  {builtApp.mode === 'none' ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <Play size={26} />
                      </div>
                      <p className="text-sm font-medium text-text-secondary max-w-md">
                        {files.length === 0 ? t.workspaceEmpty : t.appRunnerNoEntry}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => folderPickerRef.current?.click()}
                          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2"
                        >
                          <FolderOpen size={15} />
                          <span>{t.workspaceLoadFolder}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => assetPickerRef.current?.click()}
                          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                            isLight ? 'bg-gray-100 border-gray-200 text-gray-800' : 'bg-white/5 border-white/10 text-text-primary'
                          }`}
                        >
                          <ImagePlus size={15} className="text-emerald-400" />
                          <span>{t.workspaceAddAsset}</span>
                        </button>
                      </div>
                    </div>
                  ) : builtApp.mode === 'python' && builtApp.pythonEntry ? (
                    <div className="flex-1 flex flex-col p-6 gap-4 overflow-auto">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-mono font-bold text-emerald-400">
                          Python Entry: {builtApp.pythonEntry.path}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isPyRunning}
                            onClick={() => handleRunPythonProject(builtApp.pythonEntry!)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5"
                          >
                            <Play size={13} />
                            <span>{isPyRunning ? t.runningCode : t.runCode}</span>
                          </button>
                          {onAskAiAboutError && (
                            <button
                              type="button"
                              onClick={() => {
                                onAskAiAboutError(`Hãy kiểm tra và nâng cấp file ${builtApp.pythonEntry?.path} trong thư mục dự án của tôi.`);
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5"
                            >
                              <Send size={13} />
                              <span>{t.customTreeSendAi}</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <pre className="p-4 rounded-2xl bg-black/50 border border-white/10 text-xs font-mono text-emerald-200 overflow-auto flex-1">
                        {builtApp.pythonEntry.content}
                      </pre>
                      {(pyOutput !== null || pyError !== null) && (
                        <div className="rounded-2xl bg-[#09090b] border border-white/10 p-4 font-mono text-xs max-h-48 overflow-y-auto space-y-1.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                            {t.outputLabel}
                          </div>
                          {pyOutput && <pre className="text-emerald-300 whitespace-pre-wrap">{pyOutput}</pre>}
                          {pyError && <pre className="text-red-400 whitespace-pre-wrap">{pyError}</pre>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                      {/* Runner Controls */}
                      <div className={`px-4 py-2 border-b flex items-center justify-between gap-2 ${
                        isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/25 border-white/10'
                      }`}>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setConsoleLogs([]);
                              setReloadSeed(s => s + 1);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                              isLight ? 'hover:bg-gray-200 text-gray-700' : 'hover:bg-white/10 text-text-secondary hover:text-white'
                            }`}
                          >
                            <RotateCw size={13} />
                            <span>{t.appRunnerReload}</span>
                          </button>
                          <div className={`flex p-0.5 rounded-lg border ${
                            isLight ? 'bg-white border-gray-200' : 'bg-black/40 border-white/10'
                          }`}>
                            <button
                              type="button"
                              onClick={() => setViewportMode('desktop')}
                              className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${
                                viewportMode === 'desktop' ? 'bg-blue-600 text-white' : 'text-text-secondary'
                              }`}
                            >
                              <Monitor size={13} />
                              <span className="hidden sm:inline">{t.appRunnerDesktop}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewportMode('mobile')}
                              className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${
                                viewportMode === 'mobile' ? 'bg-blue-600 text-white' : 'text-text-secondary'
                              }`}
                            >
                              <Smartphone size={13} />
                              <span className="hidden sm:inline">{t.appRunnerMobile}</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowConsole(prev => !prev)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border ${
                              showConsole
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : isLight ? 'border-gray-200 text-gray-700' : 'border-white/10 text-text-secondary'
                            }`}
                          >
                            <Terminal size={13} />
                            <span>{t.appRunnerConsole} ({consoleLogs.length})</span>
                          </button>
                        </div>
                      </div>

                      {/* Sandboxed Iframe Preview */}
                      <div className="flex-1 min-h-0 bg-zinc-900/60 flex items-center justify-center p-2 overflow-hidden">
                        <iframe
                          key={reloadSeed}
                          title="Live App Runner"
                          sandbox="allow-scripts allow-forms allow-modals"
                          srcDoc={builtApp.html}
                          className={`bg-white border border-white/10 shadow-2xl transition-all duration-200 ${
                            viewportMode === 'mobile'
                              ? 'w-[390px] max-w-full h-full rounded-3xl'
                              : 'w-full h-full rounded-xl'
                          }`}
                        />
                      </div>

                      {showConsole && (
                        <div className="h-36 border-t border-white/10 bg-[#09090b] p-3 overflow-y-auto font-mono text-xs space-y-1">
                          {consoleLogs.length === 0 ? (
                            <div className="text-zinc-500">No console logs yet.</div>
                          ) : (
                            consoleLogs.map((entry, idx) => (
                              <div
                                key={idx}
                                className={
                                  entry.level === 'error'
                                    ? 'text-red-400'
                                    : entry.level === 'warn'
                                    ? 'text-amber-400'
                                    : 'text-emerald-300'
                                }
                              >
                                {entry.text}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'files' && (
                <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3">
                  {/* File List */}
                  <div className={`border-r p-3 overflow-y-auto space-y-1.5 ${
                    isLight ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-black/20'
                  }`}>
                    <div className="flex items-center justify-between px-1 pb-2">
                      <span className="text-xs font-bold text-text-secondary">
                        {workspaceName || 'project'}/
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingFile(v => !v)}
                        className="p-1 rounded-lg hover:bg-blue-500/15 text-blue-400"
                        title="New file"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {isAddingFile && (
                      <div className="flex gap-1 pb-2">
                        <input
                          type="text"
                          value={newFilePath}
                          onChange={e => setNewFilePath(e.target.value)}
                          placeholder="src/newFile.ts"
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const p = newFilePath.trim().replace(/^\/+/, '');
                            if (p) {
                              onUpdateFile(p, '');
                              setSelectedPath(p);
                              setNewFilePath('');
                              setIsAddingFile(false);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    {codeFiles.length === 0 ? (
                      <div className="text-xs text-text-secondary p-4 text-center">{t.workspaceEmpty}</div>
                    ) : (
                      codeFiles.map(f => (
                        <div
                          key={f.path}
                          onClick={() => setSelectedPath(f.path)}
                          className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs font-mono transition-colors ${
                            selectedFile?.path === f.path
                              ? 'bg-blue-600 text-white'
                              : isLight
                              ? 'hover:bg-gray-200 text-gray-800'
                              : 'hover:bg-white/5 text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          <span className="truncate">{f.path}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                triggerBlobDownload(new Blob([f.content || ''], { type: 'text/plain;charset=utf-8' }), f.name);
                              }}
                              className="p-1 rounded hover:bg-black/20"
                              title={t.downloadFileTooltip}
                            >
                              <Download size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                onDeleteFile(f.path);
                              }}
                              className="p-1 rounded hover:bg-red-500/20 text-red-400"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Code Editor */}
                  <div className="md:col-span-2 flex flex-col min-h-0">
                    {selectedFile && !selectedFile.isBinary ? (
                      <>
                        <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
                          isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/30 border-white/10'
                        }`}>
                          <span className="text-xs font-mono font-bold truncate">{selectedFile.path}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                triggerBlobDownload(
                                  new Blob([selectedFile.content || ''], { type: 'text/plain;charset=utf-8' }),
                                  selectedFile.name
                                );
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1"
                            >
                              <Download size={12} />
                              <span>{selectedFile.name}</span>
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={selectedFile.content || ''}
                          onChange={(e) => onUpdateFile(selectedFile.path, e.target.value)}
                          className={`flex-1 w-full p-4 font-mono text-xs leading-6 outline-none resize-none ${
                            isLight ? 'bg-white text-gray-900' : 'bg-[#0d0d10] text-emerald-100'
                          }`}
                        />
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-text-secondary p-6">
                        {t.workspaceEmpty}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'assets' && (
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h4 className="text-sm font-bold">asset/</h4>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {t.workspaceAddAsset} — HTML, React, Word (.docx) &amp; PowerPoint (.pptx)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => assetPickerRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2"
                    >
                      <ImagePlus size={14} />
                      <span>{t.workspaceAddAsset}</span>
                    </button>
                  </div>

                  {assetFiles.length === 0 ? (
                    <div className={`border-2 border-dashed rounded-2xl p-12 text-center ${
                      isLight ? 'border-gray-200 text-gray-500' : 'border-white/10 text-text-secondary'
                    }`}>
                      <ImageIcon size={28} className="mx-auto mb-3 opacity-50" />
                      <p className="text-xs">{t.workspaceEmpty}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {assetFiles.map(asset => (
                        <div
                          key={asset.path}
                          className={`rounded-2xl border overflow-hidden flex flex-col ${
                            isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/30 border-white/10'
                          }`}
                        >
                          <div className="h-32 bg-black/20 flex items-center justify-center overflow-hidden">
                            {asset.dataUrl ? (
                              <img
                                src={asset.dataUrl}
                                alt={asset.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon size={24} className="opacity-40" />
                            )}
                          </div>
                          <div className="p-3 flex flex-col gap-2">
                            <span className="text-xs font-mono font-semibold truncate" title={asset.path}>
                              {asset.path}
                            </span>
                            <div className="flex items-center justify-between gap-1">
                              <button
                                type="button"
                                onClick={() => copyAssetRef(asset.path)}
                                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 border ${
                                  isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-white/5 border-white/10 text-text-secondary hover:text-white'
                                }`}
                              >
                                {copiedPath === asset.path ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                <span>{copiedPath === asset.path ? t.assetCopiedPath : t.assetCopyPath}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteFile(asset.path)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/15"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WorkspaceRunnerModal;
