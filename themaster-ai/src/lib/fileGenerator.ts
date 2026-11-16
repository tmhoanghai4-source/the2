import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun, AlignmentType } from 'docx';
import PptxGenJS from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface ResolvedImageAsset {
  bytes: Uint8Array;
  dataUri: string;
  docType: 'png' | 'jpg' | 'gif' | 'bmp';
  width: number;
  height: number;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function normalizeImageBlob(blob: Blob): Promise<ResolvedImageAsset | null> {
  const mime = (blob.type || 'image/png').toLowerCase();
  const isNativeSupported = mime.includes('png') || mime.includes('jpeg') || mime.includes('jpg') || mime.includes('gif') || mime.includes('bmp');

  const rawDataUri: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image blob'));
    reader.readAsDataURL(blob);
  });

  const dimensions: { width: number; height: number; img?: HTMLImageElement } = await new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth || 640, height: img.naturalHeight || 480, img });
    img.onerror = () => resolve({ width: 640, height: 480 });
    img.src = rawDataUri;
  });

  if (isNativeSupported) {
    const base64 = rawDataUri.split(',')[1] || '';
    const docType: ResolvedImageAsset['docType'] =
      mime.includes('jpeg') || mime.includes('jpg')
        ? 'jpg'
        : mime.includes('gif')
        ? 'gif'
        : mime.includes('bmp')
        ? 'bmp'
        : 'png';
    return {
      bytes: base64ToUint8(base64),
      dataUri: rawDataUri,
      docType,
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  // Convert webp/svg/other image formats to PNG via canvas
  if (dimensions.img) {
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(dimensions.img, 0, 0);
      const pngUri = canvas.toDataURL('image/png');
      const pngBase64 = pngUri.split(',')[1] || '';
      return {
        bytes: base64ToUint8(pngBase64),
        dataUri: pngUri,
        docType: 'png',
        width: dimensions.width,
        height: dimensions.height,
      };
    }
  }

  const ab = await blob.arrayBuffer();
  const bytes = new Uint8Array(ab);
  return {
    bytes,
    dataUri: `data:image/png;base64,${uint8ToBase64(bytes)}`,
    docType: 'png',
    width: dimensions.width,
    height: dimensions.height,
  };
}

export function resolveImageDisplaySrc(src: string, attachedImages?: Record<string, string>): string {
  const trimmed = (src || '').trim();
  if (!trimmed) return '';
  if (attachedImages) {
    if (attachedImages[trimmed]) return attachedImages[trimmed];
    const cleanKey = trimmed.replace(/^attach:\/\//, '');
    if (attachedImages[cleanKey]) return attachedImages[cleanKey];
  }
  if (/^asset\//i.test(trimmed)) {
    return `/${trimmed}`;
  }
  if (/^assets\//i.test(trimmed)) {
    return `/${trimmed.replace(/^assets\//i, 'asset/')}`;
  }
  return trimmed;
}

async function resolveImageAsset(src: string, attachedImages?: Record<string, string>): Promise<ResolvedImageAsset | null> {
  try {
    const resolved = resolveImageDisplaySrc(src, attachedImages);
    if (!resolved) return null;

    if (resolved.startsWith('data:image/')) {
      const resp = await fetch(resolved);
      const blob = await resp.blob();
      return await normalizeImageBlob(blob);
    }

    if (resolved.startsWith('/') && !resolved.startsWith('//')) {
      const resp = await fetch(resolved);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return await normalizeImageBlob(blob);
    }

    if (/^https?:\/\//i.test(resolved)) {
      try {
        const direct = await fetch(resolved);
        if (direct.ok) {
          const ct = direct.headers.get('content-type') || '';
          if (!ct || ct.startsWith('image/')) {
            return await normalizeImageBlob(await direct.blob());
          }
        }
      } catch {
        // CORS fallback to backend image proxy
      }
      const proxied = await fetch(`/api/v2/kernel/image-proxy?url=${encodeURIComponent(resolved)}`);
      if (!proxied.ok) return null;
      return await normalizeImageBlob(await proxied.blob());
    }
  } catch (err) {
    console.warn('Could not resolve image for document:', src, err);
  }
  return null;
}

function parseInlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true }));
    } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      runs.push(new TextRun({ text: part.slice(1, -1), font: 'Consolas' }));
    } else {
      runs.push(new TextRun({ text: part }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text })];
}

export async function downloadDocx(
  filename: string,
  content: string,
  attachedImages?: Record<string, string>
) {
  const safeName = filename.endsWith('.docx') ? filename : `${filename.replace(/\.[^/.]+$/, '')}.docx`;
  const lines = content.split('\n');
  const children: (Paragraph | Table)[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect Markdown image ![alt](src), <img src="...">, or [IMAGE: src]
    const mdImgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
    const htmlImgMatch = trimmed.match(/^<img[^>]+src=["']([^"']+)["'][^>]*>$/i);
    const tagImgMatch = trimmed.match(/^\[IMAGE:\s*([^\]]+)\]$/i);
    const matchedImageSrc = mdImgMatch?.[2] || htmlImgMatch?.[1] || tagImgMatch?.[1];
    const matchedAlt = mdImgMatch?.[1] || '';

    if (matchedImageSrc) {
      const asset = await resolveImageAsset(matchedImageSrc, attachedImages);
      if (asset) {
        const maxWidth = 480;
        const scale = asset.width > maxWidth ? maxWidth / asset.width : 1;
        const targetW = Math.max(80, Math.round(asset.width * scale));
        const targetH = Math.max(60, Math.round(asset.height * scale));
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: matchedAlt ? 60 : 160 },
            children: [
              new ImageRun({
                type: asset.docType,
                data: asset.bytes,
                transformation: { width: targetW, height: targetH },
              }),
            ],
          })
        );
        if (matchedAlt) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 140 },
              children: [new TextRun({ text: matchedAlt, italics: true, size: 20, color: '64748B' })],
            })
          );
        }
        i++;
        continue;
      }
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const dataRows = tableLines.filter(l => !/^\|[\s:-]+\|$/.test(l.replace(/\|/g, '|').replace(/[^|\s:-]/g, '') === l ? l : '') && !/^(\|\s*:?-+:?\s*)+\|$/.test(l));
      if (dataRows.length > 0) {
        const rows = dataRows.map((rowLine, rowIdx) => {
          const cells = rowLine.slice(1, -1).split('|').map(c => c.trim());
          return new TableRow({
            children: cells.map(cellText => new TableCell({
              width: { size: Math.floor(100 / Math.max(cells.length, 1)), type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
              },
              children: [
                new Paragraph({
                  children: rowIdx === 0
                    ? [new TextRun({ text: cellText, bold: true })]
                    : parseInlineRuns(cellText),
                }),
              ],
            })),
          });
        });
        children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        children.push(new Paragraph({ text: '' }));
      }
      continue;
    }

    if (trimmed.startsWith('### ')) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: parseInlineRuns(trimmed.slice(4)), spacing: { before: 180, after: 80 } }));
    } else if (trimmed.startsWith('## ')) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: parseInlineRuns(trimmed.slice(3)), spacing: { before: 240, after: 100 } }));
    } else if (trimmed.startsWith('# ')) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: parseInlineRuns(trimmed.slice(2)), spacing: { before: 300, after: 120 } }));
    } else if (/^[-*+]\s+/.test(trimmed)) {
      children.push(new Paragraph({ bullet: { level: 0 }, children: parseInlineRuns(trimmed.replace(/^[-*+]\s+/, '')), spacing: { after: 60 } }));
    } else if (/^\d+\.\s+/.test(trimmed)) {
      children.push(new Paragraph({ children: parseInlineRuns(trimmed), spacing: { after: 60 } }));
    } else if (trimmed === '---' || trimmed === '***') {
      children.push(new Paragraph({ text: '' }));
    } else {
      children.push(new Paragraph({ children: parseInlineRuns(line), spacing: { after: 100 } }));
    }
    i++;
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, safeName);
}

export interface SlideData {
  title: string;
  subtitle?: string;
  bullets?: string[];
  notes?: string;
  image?: string;
  images?: string[];
}

export interface PresentationSpec {
  title?: string;
  subtitle?: string;
  themeColor?: string;
  slides: SlideData[];
}

export function parsePptxContent(content: string): PresentationSpec | null {
  const trimmed = content.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && Array.isArray(parsed.slides)) {
      return parsed as PresentationSpec;
    }
  } catch {
    // Fallback: parse Markdown slides separated by ---
  }

  if (trimmed.includes('# ') || trimmed.includes('## ')) {
    const rawSlides = trimmed.split(/\n---\n/);
    const slides: SlideData[] = [];
    for (const block of rawSlides) {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;
      let title = 'Slide';
      const bullets: string[] = [];
      let image: string | undefined;
      for (const l of lines) {
        const imgMatch = l.match(/^!\[[^\]]*\]\(([^)\s]+)\)$/);
        if (imgMatch) {
          image = imgMatch[1];
        } else if (l.startsWith('#')) {
          title = l.replace(/^#+\s*/, '');
        } else {
          bullets.push(l.replace(/^[-*•\d.]+\s*/, ''));
        }
      }
      slides.push({ title, bullets, image });
    }
    if (slides.length > 0) {
      return {
        title: slides[0].title,
        slides,
      };
    }
  }

  return null;
}

export async function downloadPptx(
  filename: string,
  content: string,
  attachedImages?: Record<string, string>
) {
  const safeName = filename.endsWith('.pptx') ? filename : `${filename.replace(/\.[^/.]+$/, '')}.pptx`;
  const spec = parsePptxContent(content) || {
    title: safeName.replace(/\.pptx$/, ''),
    slides: [{ title: safeName.replace(/\.pptx$/, ''), bullets: content.split('\n').filter(Boolean).slice(0, 10) }],
  };

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  const accentHex = (spec.themeColor || '#1D4ED8').replace('#', '');

  if (spec.title) {
    const cover = pptx.addSlide();
    cover.background = { color: '0F172A' };
    cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.25, h: 5.625, fill: { color: accentHex } });
    cover.addText(spec.title, {
      x: 0.9, y: 1.8, w: 8.2, h: 1.2,
      fontSize: 34, bold: true, color: 'FFFFFF', fontFace: 'Arial',
    });
    if (spec.subtitle) {
      cover.addText(spec.subtitle, {
        x: 0.9, y: 3.1, w: 8.2, h: 0.7,
        fontSize: 16, color: 'CBD5E1', fontFace: 'Arial',
      });
    }
  }

  for (let index = 0; index < spec.slides.length; index++) {
    const s = spec.slides[index];
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.9, fill: { color: '0F172A' } });
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.9, w: 10, h: 0.06, fill: { color: accentHex } });

    slide.addText(s.title || `Slide ${index + 1}`, {
      x: 0.6, y: 0.18, w: 8.8, h: 0.55,
      fontSize: 22, bold: true, color: 'FFFFFF', fontFace: 'Arial',
    });

    if (s.subtitle) {
      slide.addText(s.subtitle, {
        x: 0.6, y: 1.15, w: 8.8, h: 0.45,
        fontSize: 14, italic: true, color: '475569', fontFace: 'Arial',
      });
    }

    const slideImgSrc = s.image || (Array.isArray(s.images) ? s.images[0] : undefined);
    const resolvedImg = slideImgSrc ? await resolveImageAsset(slideImgSrc, attachedImages) : null;
    const bullets = s.bullets && s.bullets.length > 0 ? s.bullets : [];
    const startY = s.subtitle ? 1.7 : 1.3;

    if (resolvedImg) {
      if (bullets.length > 0) {
        slide.addText(
          bullets.map(b => ({ text: b, options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } })),
          {
            x: 0.6, y: startY, w: 5.0, h: 3.6,
            fontSize: 15, color: '1E293B', fontFace: 'Arial', valign: 'top',
          }
        );
        slide.addImage({
          data: resolvedImg.dataUri,
          x: 5.85,
          y: startY,
          w: 3.55,
          h: 3.55,
          sizing: { type: 'contain', w: 3.55, h: 3.55 },
        });
      } else {
        slide.addImage({
          data: resolvedImg.dataUri,
          x: 1.5,
          y: startY,
          w: 7.0,
          h: 3.7,
          sizing: { type: 'contain', w: 7.0, h: 3.7 },
        });
      }
    } else if (bullets.length > 0) {
      slide.addText(
        bullets.map(b => ({ text: b, options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } })),
        {
          x: 0.7, y: startY, w: 8.6, h: 3.5,
          fontSize: 16, color: '1E293B', fontFace: 'Arial', valign: 'top',
        }
      );
    }

    slide.addText(`${index + 1} / ${spec.slides.length}`, {
      x: 8.8, y: 5.2, w: 0.8, h: 0.3,
      fontSize: 10, color: '94A3B8', align: 'right',
    });

    if (s.notes) {
      slide.addNotes(s.notes);
    }
  }

  await pptx.writeFile({ fileName: safeName });
}

export async function downloadPdf(filename: string, content: string) {
  const safeName = filename.endsWith('.pdf') ? filename : `${filename.replace(/\.[^/.]+$/, '')}.pdf`;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const scale = 2;
  const canvasWidth = pageWidth * scale;
  const canvasHeight = pageHeight * scale;
  const margin = 52 * scale;
  const maxWidth = canvasWidth - margin * 2;
  const lineHeight = 20 * scale;

  const createPageCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#111827';
    ctx.textBaseline = 'top';
    return { canvas, ctx };
  };

  let { canvas, ctx } = createPageCanvas();
  let cursorY = margin;
  let pageCount = 0;

  const pushPage = () => {
    if (pageCount > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);
    pageCount++;
    const next = createPageCanvas();
    canvas = next.canvas;
    ctx = next.ctx;
    cursorY = margin;
  };

  const lines = content.split('\n');
  for (const rawLine of lines) {
    let fontSize = 11 * scale;
    let isBold = false;
    let text = rawLine;

    if (rawLine.startsWith('# ')) {
      fontSize = 18 * scale;
      isBold = true;
      text = rawLine.slice(2);
      cursorY += 6 * scale;
    } else if (rawLine.startsWith('## ')) {
      fontSize = 14 * scale;
      isBold = true;
      text = rawLine.slice(3);
      cursorY += 4 * scale;
    } else if (rawLine.startsWith('### ')) {
      fontSize = 12 * scale;
      isBold = true;
      text = rawLine.slice(4);
    }

    ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px Inter, Arial, sans-serif`;
    const cleanText = text.replace(/\*\*/g, '');

    if (!cleanText.trim()) {
      cursorY += lineHeight * 0.6;
      if (cursorY > canvasHeight - margin) pushPage();
      continue;
    }

    const words = cleanText.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        if (cursorY + lineHeight > canvasHeight - margin) pushPage();
        ctx.fillText(currentLine, margin, cursorY);
        cursorY += fontSize * 1.45;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      if (cursorY + lineHeight > canvasHeight - margin) pushPage();
      ctx.fillText(currentLine, margin, cursorY);
      cursorY += fontSize * 1.45;
    }
  }

  if (pageCount > 0) pdf.addPage();
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);
  pdf.save(safeName);
}

export async function downloadZipFromFiles(zipName: string, files: { path: string; content: string }[]) {
  const zip = new JSZip();
  const usedPaths = new Set<string>();

  for (const file of files) {
    let cleanPath = file.path.replace(/^\/+/, '').trim() || 'file.txt';
    if (usedPaths.has(cleanPath)) {
      const dotIdx = cleanPath.lastIndexOf('.');
      const base = dotIdx !== -1 ? cleanPath.slice(0, dotIdx) : cleanPath;
      const ext = dotIdx !== -1 ? cleanPath.slice(dotIdx) : '';
      let counter = 2;
      while (usedPaths.has(`${base}_${counter}${ext}`)) counter++;
      cleanPath = `${base}_${counter}${ext}`;
    }
    usedPaths.add(cleanPath);
    zip.file(cleanPath, file.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const finalZipName = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`;
  triggerBlobDownload(blob, finalZipName);
}

interface TreeNode {
  name: string;
  isDir: boolean;
  children: Map<string, TreeNode>;
}

export function buildAsciiTreeFromPaths(paths: string[], rootName?: string): string {
  const root: TreeNode = { name: rootName || 'project', isDir: true, children: new Map() };

  const normalized = paths
    .map(p => p.replace(/\\/g, '/').replace(/^\/+/, ''))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  if (normalized.length === 0) return `${root.name}/\n└── (trống)`;

  const firstSegs = new Set(normalized.map(p => p.split('/')[0]));
  const stripFirst = !rootName && firstSegs.size === 1 && normalized.every(p => p.includes('/'));
  if (stripFirst) {
    root.name = Array.from(firstSegs)[0];
  }

  for (const rawPath of normalized) {
    const parts = rawPath.split('/').filter(Boolean);
    const effectiveParts = stripFirst ? parts.slice(1) : parts;
    let curr = root;
    effectiveParts.forEach((part, idx) => {
      const isLast = idx === effectiveParts.length - 1;
      if (!curr.children.has(part)) {
        curr.children.set(part, {
          name: part,
          isDir: !isLast,
          children: new Map(),
        });
      } else if (!isLast) {
        curr.children.get(part)!.isDir = true;
      }
      curr = curr.children.get(part)!;
    });
  }

  const lines: string[] = [`${root.name}/`];

  const walk = (node: TreeNode, prefix: string) => {
    const entries = Array.from(node.children.values()).sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    entries.forEach((entry, idx) => {
      const isLast = idx === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      lines.push(`${prefix}${connector}${entry.name}${entry.isDir ? '/' : ''}`);
      if (entry.isDir && entry.children.size > 0) {
        walk(entry, prefix + (isLast ? '    ' : '│   '));
      }
    });
  };

  walk(root, '');
  return lines.join('\n');
}

export function isDirectoryTreeText(text: string): boolean {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return false;
  const treeLines = lines.filter(l => /[├└│]──|├──|└──|\|--|`--/.test(l));
  if (treeLines.length >= 2) return true;
  return treeLines.length >= 1 && lines[0].trim().endsWith('/');
}

export interface ParsedFileBlock {
  filename: string;
  language: string;
  content: string;
}

export function extractFilesFromMarkdown(markdown: string): ParsedFileBlock[] {
  const parts = markdown.split(/(```[\s\S]*?```)/g);
  const files: ParsedFileBlock[] = [];
  const extMap: Record<string, string> = {
    python: 'py', py: 'py', typescript: 'ts', ts: 'ts', tsx: 'tsx', jsx: 'jsx',
    javascript: 'js', js: 'js', html: 'html', css: 'css', json: 'json',
    rust: 'rs', go: 'go', java: 'java', cpp: 'cpp', c: 'c', sh: 'sh', bash: 'sh',
    sql: 'sql', markdown: 'md', md: 'md', yaml: 'yml', yml: 'yml', xml: 'xml',
  };

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part.startsWith('```') || !part.endsWith('```')) continue;

    const firstNewLine = part.indexOf('\n');
    const langLine = firstNewLine !== -1 ? part.slice(3, firstNewLine).trim() : part.slice(3, -3).trim();
    const body = firstNewLine !== -1 ? part.slice(firstNewLine + 1, -3).trim() : '';
    if (!body) continue;

    const [rawLang = 'txt', ...rest] = langLine.split(/\s+/);
    const headerName = rest.join(' ').trim();
    const langLower = rawLang.toLowerCase();

    if (['vis_prompt', 'nano_banana', 'mermaid', 'recharts', 'tree', 'dirtree', 'filetree'].includes(langLower)) {
      continue;
    }

    const prevText = i > 0 ? parts[i - 1] : '';
    const fnMatches = [...prevText.matchAll(/FILENAME:\s*([^\s\n`]+)/g)];
    const metaFilename = fnMatches.length > 0 ? fnMatches[fnMatches.length - 1][1] : '';

    const ext = extMap[langLower] || 'txt';
    const filename = metaFilename || headerName || `file_${files.length + 1}.${ext}`;
    files.push({ filename, language: langLower, content: body });
  }

  return files;
}
