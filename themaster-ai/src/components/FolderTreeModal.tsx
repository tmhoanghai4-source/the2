import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderTree, X, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { Theme, TranslationStrings } from '../types';
import { buildAsciiTreeFromPaths, isDirectoryTreeText } from '../lib/fileGenerator';
import { DirectoryTreeBlock } from './MarkdownRenderer';

interface FolderTreeModalProps {
  isOpen: boolean;
  theme: Theme;
  t: TranslationStrings;
  onClose: () => void;
  onInsertToChat: (treeText: string, rootName: string) => void;
  onSendToAi: (treeText: string, rootName: string) => void;
}

const DEFAULT_PATHS = `src/main.tsx
src/App.tsx
src/components/Sidebar.tsx
src/components/ChatInput.tsx
src/lib/utils.ts
package.json
README.md`;

const FolderTreeModal: React.FC<FolderTreeModalProps> = ({
  isOpen,
  theme,
  t,
  onClose,
  onInsertToChat,
  onSendToAi,
}) => {
  const isLight = theme === Theme.LIGHT;
  const [rootName, setRootName] = useState('my-project');
  const [rawPaths, setRawPaths] = useState(DEFAULT_PATHS);

  const generatedTree = useMemo(() => {
    const trimmed = rawPaths.trim();
    if (!trimmed) {
      return `${rootName.trim() || 'project'}/\n└── (empty)`;
    }
    if (isDirectoryTreeText(trimmed)) {
      return trimmed;
    }
    const paths = trimmed
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    return buildAsciiTreeFromPaths(paths, rootName.trim() || 'project');
  }, [rawPaths, rootName]);

  const effectiveTitle = useMemo(() => {
    const firstLine = generatedTree.split('\n')[0]?.trim().replace(/\/$/, '');
    return rootName.trim() || firstLine || 'project';
  }, [generatedTree, rootName]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
              isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-secondary border-white/10 text-text-primary'
            }`}
          >
            {/* Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isLight ? 'bg-gray-50 border-gray-200' : 'bg-tertiary/40 border-white/10'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500">
                  <FolderTree size={18} />
                </div>
                <h3 className="text-sm font-bold tracking-tight">
                  {t.customTreeTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'hover:bg-gray-200 text-gray-500' : 'hover:bg-white/10 text-text-secondary'
                }`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="flex flex-col gap-4">
                <div>
                  <input
                    type="text"
                    value={rootName}
                    onChange={(e) => setRootName(e.target.value)}
                    placeholder={t.customTreeRootPh}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none transition-colors ${
                      isLight
                        ? 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'
                        : 'bg-black/30 border-white/10 text-text-primary focus:border-emerald-500/50'
                    }`}
                  />
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-text-secondary">
                      Paths / ASCII Tree
                    </span>
                    <button
                      type="button"
                      onClick={() => setRawPaths(DEFAULT_PATHS)}
                      className="text-[11px] font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1"
                    >
                      <Sparkles size={12} />
                      <span>Sample</span>
                    </button>
                  </div>
                  <textarea
                    value={rawPaths}
                    onChange={(e) => setRawPaths(e.target.value)}
                    placeholder={t.customTreePathsPh}
                    rows={12}
                    className={`w-full flex-1 min-h-[260px] p-4 rounded-2xl border text-xs font-mono leading-6 outline-none resize-none transition-colors ${
                      isLight
                        ? 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'
                        : 'bg-[#0d0d10] border-white/10 text-emerald-200 focus:border-emerald-500/50'
                    }`}
                  />
                </div>
              </div>

              {/* Live Preview */}
              <div className="flex flex-col">
                <div className="-my-5">
                  <DirectoryTreeBlock
                    treeText={generatedTree}
                    title={effectiveTitle}
                    appTheme={theme}
                    t={t}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t flex flex-wrap items-center justify-end gap-3 ${
              isLight ? 'bg-gray-50 border-gray-200' : 'bg-tertiary/30 border-white/10'
            }`}>
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isLight ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-text-secondary'
                }`}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onInsertToChat(generatedTree, effectiveTitle);
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20"
              >
                <CheckCircle2 size={15} />
                <span>{t.customTreeInsertChat}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSendToAi(generatedTree, effectiveTitle);
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-600/20"
              >
                <Send size={14} />
                <span>{t.customTreeSendAi}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FolderTreeModal;
