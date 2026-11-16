import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Trash2,
  Paperclip,
  Mic,
  MicOff,
  Zap,
  Eraser,
  Image,
  FileUp,
  FolderUp,
  FolderTree,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Theme, AIMode, Language, Attachment, TranslationStrings } from "../types";
import { FileBrandIcon } from "./FileBrandIcon";

interface ChatInputProps {
  input: string;
  suggestion: string;
  isThinking: boolean;
  isRecording: boolean;
  isTranscribing?: boolean;
  micError?: string | null;
  readAloudEnabled?: boolean;
  isSpeaking?: boolean;
  isFocused: boolean;
  theme: Theme;
  mode: AIMode;
  language: Language;
  t: TranslationStrings;
  attachments: Attachment[];
  modeStyles: any;
  mentionMenu: any;
  mentionIndex: number;
  magicChips: any[];
  typingParticles: any[];
  tiltStyle: any;
  chatMousePos: { x: number; y: number };
  wpm: number;
  isCyberpunkDeleting: boolean;
  isMatrixFading: boolean;
  isBlackHoleActive: boolean;
  isSucking: boolean;
  isExploding: boolean;
  username?: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onSend: (textOverride?: string) => void;
  onClear: () => void;
  onAttachClick?: () => void;
  onAttachImageClick?: () => void;
  onAttachFileClick?: () => void;
  onAttachFolderClick?: () => void;
  onOpenCustomTree?: () => void;
  onInsertPromptTemplate?: (template: string) => void;
  onToggleRecording: () => void;
  onToggleReadAloud?: () => void;
  onStopSpeaking?: () => void;
  onClearMicError?: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onRemoveAttachment: (id: string) => void;
  onSuggestionClick: () => void;
  onMentionSelect: (username: string) => void;
  nukeConversation: () => void;
  chatBarRef: React.RefObject<HTMLDivElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  replyTo: any;
  onCancelReply: () => void;
  onShowTools: () => void;
  isToolsMenuOpen: boolean;
  isEcoMode: boolean;
  onToggleEco: () => void;
  chargeProgress: number;
  startCharge: () => void;
  endCharge: () => void;
  onOpenPromptBuilder: () => void;
  onStop?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  isThinking,
  isRecording,
  isTranscribing = false,
  micError = null,
  readAloudEnabled = false,
  isSpeaking = false,
  isFocused,
  theme,
  t,
  attachments,
  magicChips,
  typingParticles,
  tiltStyle,
  chatMousePos,
  isBlackHoleActive,
  isSucking,
  isExploding,
  onInputChange,
  onInputKeyDown,
  onPaste,
  onSend,
  onClear,
  onAttachClick,
  onAttachImageClick,
  onAttachFileClick,
  onAttachFolderClick,
  onOpenCustomTree,
  onInsertPromptTemplate,
  onToggleRecording,
  onToggleReadAloud,
  onStopSpeaking,
  onClearMicError,
  onFocus,
  onBlur,
  onRemoveAttachment,
  chatBarRef,
  textareaRef,
  replyTo,
  onCancelReply,
  onStop,
}) => {
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const isLight = theme === Theme.LIGHT;

  useEffect(() => {
    if (isThinking) {
      setIsAttachmentMenuOpen(false);
    }
  }, [isThinking]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        attachmentMenuRef.current &&
        !attachmentMenuRef.current.contains(event.target as Node)
      ) {
        setIsAttachmentMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const getThemeChatStyle = () => {
    switch (theme) {
      case Theme.MATRIX:
        return {
          bg: "bg-[#040c07]/95 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.12)]",
          glow: "rgba(16, 185, 129, 0.22)",
          accent: "text-emerald-300 hover:bg-emerald-500/15 hover:border-emerald-400/50 border border-transparent",
          iconButton: "text-emerald-300 hover:text-emerald-100 hover:bg-emerald-500/15",
          buttonActive: "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-300 font-mono font-bold",
          borderFocused: "border-emerald-400 ring-2 ring-emerald-500/25 shadow-[0_0_30px_rgba(16,185,129,0.3)]",
          textarea: "font-mono text-emerald-100 placeholder:text-emerald-300/75 custom-caret-matrix",
          glassGlow: "from-transparent via-emerald-400/60 to-transparent",
          menuContainer: "rounded-2xl border-emerald-500/30 bg-[#051009]/95 text-emerald-100",
          menuHeader: "text-emerald-300 font-mono border-emerald-500/20 bg-emerald-950/30",
          itemStyles: "hover:bg-emerald-500/15 hover:text-emerald-100 text-emerald-200 border border-transparent hover:border-emerald-500/30",
        };
      case Theme.CYBERPUNK:
        return {
          bg: "bg-[#120520]/95 border-fuchsia-500/45 shadow-[0_0_25px_rgba(240,70,250,0.16)]",
          glow: "rgba(240, 70, 250, 0.25)",
          accent: "text-fuchsia-300 hover:bg-fuchsia-500/15 hover:border-fuchsia-400/50 border border-transparent",
          iconButton: "text-fuchsia-200 hover:text-white hover:bg-fuchsia-500/15",
          buttonActive: "bg-fuchsia-500 hover:bg-fuchsia-400 text-white shadow-[0_0_15px_rgba(240,70,250,0.4)] border border-fuchsia-300 font-bold",
          borderFocused: "border-fuchsia-400 ring-2 ring-fuchsia-500/25 shadow-[0_0_35px_rgba(240,70,250,0.3)]",
          textarea: "font-sans text-yellow-100 placeholder:text-fuchsia-200/75 custom-caret-cyber",
          glassGlow: "from-transparent via-fuchsia-400/60 to-transparent",
          menuContainer: "rounded-2xl border-fuchsia-500/30 bg-[#120520]/95 text-fuchsia-100",
          menuHeader: "text-fuchsia-300 font-bold border-fuchsia-500/20 bg-fuchsia-950/30",
          itemStyles: "hover:bg-fuchsia-500/15 hover:text-white text-fuchsia-200 border border-transparent hover:border-fuchsia-500/30",
        };
      case Theme.GALAXY:
        return {
          bg: "bg-[#07071a]/95 border-indigo-400/40 shadow-[0_0_30px_rgba(124,58,237,0.2)]",
          glow: "rgba(124, 58, 237, 0.3)",
          accent: "text-indigo-200 hover:bg-indigo-500/15 hover:border-indigo-400/50 border border-transparent",
          iconButton: "text-indigo-200 hover:text-white hover:bg-indigo-500/15",
          buttonActive: "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]",
          borderFocused: "border-violet-400 ring-2 ring-indigo-500/25 shadow-[0_0_40px_rgba(124,58,237,0.3)]",
          textarea: "font-sans text-sky-50 placeholder:text-indigo-200/75 custom-caret-galaxy",
          glassGlow: "from-transparent via-violet-400/60 to-transparent",
          menuContainer: "rounded-2xl border-indigo-400/30 bg-[#07071a]/95 text-sky-50",
          menuHeader: "text-indigo-200 font-bold border-indigo-500/20 bg-indigo-950/30",
          itemStyles: "hover:bg-violet-500/15 hover:text-white text-indigo-100 border border-transparent hover:border-violet-400/30",
        };
      case Theme.PIXEL:
        return {
          bg: "bg-[#1a1a22] border-4 border-amber-500 shadow-[6px_6px_0px_#78350f]",
          glow: "rgba(217, 119, 6, 0.12)",
          accent: "text-amber-300 hover:bg-amber-500/15 border-2 border-transparent hover:border-amber-400/40",
          iconButton: "text-amber-300 hover:text-amber-100 hover:bg-amber-500/15",
          buttonActive: "bg-amber-500 hover:bg-amber-400 text-black shadow-none border-2 border-black font-black font-mono uppercase rounded-none",
          borderFocused: "border-amber-400 shadow-[8px_8px_0px_#92400e]",
          textarea: "font-mono text-amber-100 placeholder:text-amber-300/75 custom-caret-pixel",
          glassGlow: "from-transparent via-amber-400/60 to-transparent",
          menuContainer: "rounded-none border-4 border-amber-500 bg-[#141418] text-amber-100",
          menuHeader: "text-amber-300 font-mono border-amber-500/30 bg-amber-950/30",
          itemStyles: "hover:bg-amber-500/15 hover:text-amber-100 text-amber-200 border-2 border-transparent hover:border-amber-500/30",
        };
      case Theme.LIGHT:
        return {
          bg: "bg-white border-gray-300 shadow-[0_10px_28px_rgba(0,0,0,0.08)]",
          glow: "rgba(59, 130, 246, 0.12)",
          accent: "text-gray-700 hover:bg-gray-100 border border-transparent hover:border-gray-300",
          iconButton: "text-gray-700 hover:text-gray-950 hover:bg-gray-100",
          buttonActive: "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]",
          borderFocused: "border-blue-500 ring-4 ring-blue-500/15 shadow-[0_10px_35px_rgba(37,99,235,0.12)]",
          textarea: "font-sans text-gray-900 placeholder:text-gray-500 custom-caret-light",
          glassGlow: "from-transparent via-blue-500/50 to-transparent",
          menuContainer: "rounded-2xl border-gray-200 bg-white text-gray-900 shadow-xl",
          menuHeader: "text-gray-700 font-semibold border-gray-200 bg-gray-50",
          itemStyles: "hover:bg-gray-100 hover:text-gray-950 text-gray-700 border border-transparent hover:border-gray-200",
        };
      case Theme.DARK:
      default:
        return {
          bg: "bg-[#151518]/95 border-zinc-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
          glow: "rgba(59, 130, 246, 0.2)",
          accent: "text-zinc-300 hover:bg-zinc-800 border border-transparent hover:border-zinc-600",
          iconButton: "text-zinc-300 hover:text-white hover:bg-zinc-800",
          buttonActive: "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]",
          borderFocused: "border-blue-500/70 ring-2 ring-blue-500/20 shadow-[0_0_35px_rgba(37,99,235,0.25)]",
          textarea: "font-sans text-zinc-100 placeholder:text-zinc-400 custom-caret-dark",
          glassGlow: "from-transparent via-blue-500/50 to-transparent",
          menuContainer: "rounded-2xl border-zinc-700 bg-[#141418]/95 text-zinc-100",
          menuHeader: "text-zinc-300 font-bold border-zinc-800 bg-zinc-900/60",
          itemStyles: "hover:bg-zinc-800 hover:text-white text-zinc-200 border border-transparent hover:border-zinc-700",
        };
    }
  };

  const style = getThemeChatStyle();

  const applyTemplate = (templateText: string) => {
    setIsAttachmentMenuOpen(false);
    if (onInsertPromptTemplate) {
      onInsertPromptTemplate(templateText);
    }
  };

  return (
    <div className="shrink-0 p-4 lg:p-8 relative z-30">
      <div className="max-w-4xl mx-auto relative">
        {/* Mic / Transcription Status or Inline Error */}
        <AnimatePresence>
          {(isRecording || isTranscribing || micError) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mb-3 flex items-center gap-2"
            >
              {isRecording && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>{t.micListening}</span>
                </div>
              )}
              {isTranscribing && !isRecording && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/40 text-blue-400 text-xs font-semibold">
                  <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                  <span>{t.micTranscribing}</span>
                </div>
              )}
              {micError && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-semibold">
                  <span>{micError}</span>
                  {onClearMicError && (
                    <button
                      type="button"
                      onClick={onClearMicError}
                      className="ml-1 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reply / Quote Banner */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className={`mb-3 px-4 py-2 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                isLight ? "bg-white border-gray-200 text-gray-700" : "bg-white/5 border-white/10 text-text-secondary"
              }`}
            >
              <span className="truncate">{t.quotePrefix}: "{replyTo.text}"</span>
              <button type="button" onClick={onCancelReply} className="text-red-400 hover:text-red-300 font-bold">
                {t.cancel}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic magic chips */}
        {magicChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <AnimatePresence>
              {magicChips.map((chip, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={chip.action}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-white/10 transition-all hover:border-white/25 whitespace-nowrap ${chip.color}`}
                >
                  <Zap size={11} />
                  {chip.label}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Main Chat Bar */}
        <motion.div
          ref={chatBarRef}
          style={tiltStyle}
          animate={{
            scale: isFocused ? 1.008 : 1,
          }}
          transition={{ type: "spring", stiffness: 350, damping: 24 }}
          className={`relative backdrop-blur-2xl border transition-all duration-300 ${
            theme === Theme.PIXEL ? "rounded-none" : "rounded-3xl"
          } ${
            isFocused ? style.borderFocused : style.bg
          } ${isRecording ? "ring-4 ring-red-500/25 border-red-500/70" : ""} ${
            isBlackHoleActive ? "black-hole-pull" : ""
          } ${isSucking ? "black-hole-suck" : ""} ${isExploding ? "supernova-flash" : ""}`}
        >
          {/* Typing particles */}
          {typingParticles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: p.x, y: p.y, opacity: 1, scale: 1.5 }}
              animate={{
                y: p.y - 90,
                x: p.x + (Math.random() - 0.5) * 140,
                opacity: 0,
                scale: 0.2,
              }}
              transition={{ duration: 0.6 }}
              className="fixed pointer-events-none select-none font-bold z-[100]"
              style={{ color: p.color }}
            >
              <span className="text-xs font-bold">{p.char}</span>
            </motion.div>
          ))}

          {/* Interactive mouse radial highlight overlay */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
              theme === Theme.PIXEL ? "hidden" : "rounded-3xl overflow-hidden"
            }`}
            style={{
              opacity: isFocused ? 0.3 : 0.12,
              background: `radial-gradient(380px circle at ${chatMousePos.x}px ${chatMousePos.y}px, ${style.glow}, transparent 60%)`,
            }}
          />

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className={`flex flex-wrap gap-2.5 p-4 border-b overflow-hidden ${
              theme === Theme.PIXEL
                ? "border-amber-600/30 bg-black/20"
                : isLight
                ? "rounded-t-3xl border-gray-200 bg-gray-50"
                : "rounded-t-3xl border-white/10 bg-white/5"
            }`}>
              {attachments.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-2.5 p-2.5 border rounded-2xl relative pr-9 ${
                    isLight
                      ? "bg-white border-gray-200 text-gray-800"
                      : theme === Theme.MATRIX
                      ? "bg-black/60 border-emerald-500/30 text-emerald-200"
                      : "bg-tertiary/70 border-white/10 text-text-primary"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs ${
                    file.mimeType.startsWith("image/") ? "bg-amber-500/20 text-amber-400" :
                    file.mimeType === "application/pdf" ? "bg-rose-500/20 text-rose-400" :
                    file.mimeType === "application/x-directory" ? "bg-emerald-500/20 text-emerald-400" :
                    "bg-blue-600/20 text-blue-400"
                  }`}>
                    {file.mimeType.startsWith("image/") ? "🖼️" :
                     file.mimeType === "application/pdf" ? "📕" :
                     file.mimeType === "application/x-directory" ? "📁" : "📄"}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold truncate max-w-[140px]">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-text-secondary">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isThinking}
                    onClick={() => onRemoveAttachment(file.id)}
                    className={`absolute right-2 p-1 rounded-lg transition-all ${
                      isThinking
                        ? "opacity-30 cursor-not-allowed"
                        : "hover:bg-red-500/15 text-text-secondary hover:text-red-500"
                    }`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative p-2">
            <div className="flex items-center gap-1">
              {/* EXPANDED PAPERCLIP MENU */}
              <div className="relative" ref={attachmentMenuRef}>
                <button
                  type="button"
                  disabled={isThinking}
                  onClick={() => !isThinking && setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                  className={`p-3.5 rounded-2xl transition-all group relative ${style.accent} ${
                    isThinking ? "opacity-40 cursor-not-allowed pointer-events-none" : ""
                  }`}
                  title={t.attachAndCreate}
                >
                  <Paperclip size={19} className="group-hover:rotate-12 transition-transform" />
                  {attachments.length > 0 && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </button>

                <AnimatePresence>
                  {isAttachmentMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.96 }}
                      animate={{ opacity: 1, y: -4, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 360, damping: 26 }}
                      className={`absolute bottom-full left-1 mb-2.5 w-64 z-[9999] p-1.5 shadow-2xl border backdrop-blur-2xl ${style.menuContainer}`}
                    >
                      <div className={`px-3 py-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider border-b ${style.menuHeader}`}>
                        {t.attachAndCreate}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAttachmentMenuOpen(false);
                          (onAttachImageClick || onAttachClick)?.();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-all rounded-xl text-left ${style.itemStyles}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Image size={15} className="shrink-0 text-amber-400" />
                          <span>{t.attachImage}</span>
                        </div>
                        <span className="text-[10px] opacity-60 font-mono">IMG</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAttachmentMenuOpen(false);
                          (onAttachFileClick || onAttachClick)?.();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-all rounded-xl text-left ${style.itemStyles}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <FileUp size={15} className="shrink-0 text-blue-400" />
                          <span>{t.attachFile}</span>
                        </div>
                        <span className="text-[10px] opacity-60 font-mono">FILE</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAttachmentMenuOpen(false);
                          onAttachFolderClick?.();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-all rounded-xl text-left ${style.itemStyles}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <FolderUp size={15} className="shrink-0 text-emerald-400" />
                          <span>{t.attachFolder}</span>
                        </div>
                        <span className="text-[10px] opacity-60 font-mono">DIR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyTemplate(t.templateDrawTree)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-all rounded-xl text-left ${style.itemStyles}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <FolderTree size={15} className="shrink-0 text-teal-400" />
                          <span>{t.drawTree}</span>
                        </div>
                        <span className="text-[10px] opacity-60 font-mono">TREE</span>
                      </button>

                      {onOpenCustomTree && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAttachmentMenuOpen(false);
                            onOpenCustomTree();
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-all rounded-xl text-left ${style.itemStyles}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <FolderTree size={15} className="shrink-0 text-emerald-400" />
                            <span>{t.customTreeBtn}</span>
                          </div>
                          <span className="text-[10px] opacity-60 font-mono">CUSTOM</span>
                        </button>
                      )}

                      <div className="my-1 border-t border-white/10" />

                      <button
                        type="button"
                        onClick={() => applyTemplate(t.templateCreateWord)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-all rounded-xl text-left ${style.itemStyles}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <FileBrandIcon type="docx" size={16} className="shrink-0" />
                          <span>{t.createWord}</span>
                        </div>
                        <span className="text-[10px] opacity-60 font-mono">.DOCX</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyTemplate(t.templateCreatePptx)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-all rounded-xl text-left ${style.itemStyles}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <FileBrandIcon type="pptx" size={16} className="shrink-0" />
                          <span>{t.createPptx}</span>
                        </div>
                        <span className="text-[10px] opacity-60 font-mono">.PPTX</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyTemplate(t.templateCreateZip)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-all rounded-xl text-left ${style.itemStyles}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <FileBrandIcon type="zip" size={16} className="shrink-0" />
                          <span>{t.createZip}</span>
                        </div>
                        <span className="text-[10px] opacity-60 font-mono">.ZIP</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Central text input box */}
              <div className="flex-1 relative flex items-center min-h-[54px]">
                <textarea
                  ref={textareaRef}
                  value={input}
                  disabled={isThinking}
                  onChange={onInputChange}
                  onKeyDown={onInputKeyDown}
                  onPaste={onPaste}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder={
                    theme === Theme.PIXEL
                      ? t.commandPlaceholder
                      : theme === Theme.MATRIX
                      ? `> ${t.placeholder}`
                      : t.placeholder
                  }
                  rows={1}
                  className={`w-full bg-transparent border-none focus:ring-0 focus:outline-none text-base font-medium py-3.5 pl-3 pr-28 resize-none no-scrollbar h-auto self-center ${style.textarea} ${
                    isThinking ? "opacity-50 cursor-not-allowed select-none" : ""
                  }`}
                />

                <div className="absolute right-2 flex items-center gap-1">
                  <AnimatePresence>
                    {!isThinking && input.length > 0 && (
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        onClick={onClear}
                        className={`p-2.5 rounded-xl transition-all hover:text-red-500 ${style.iconButton}`}
                        title={t.clearInput}
                      >
                        <Eraser size={17} />
                      </motion.button>
                    )}
                  </AnimatePresence>

                  {onToggleReadAloud && (
                    <button
                      type="button"
                      disabled={isThinking}
                      onClick={() => {
                        if (isThinking) return;
                        if (isSpeaking && onStopSpeaking) {
                          onStopSpeaking();
                        } else {
                          onToggleReadAloud();
                        }
                      }}
                      className={`p-2.5 rounded-xl transition-all ${
                        isThinking
                          ? "opacity-40 cursor-not-allowed pointer-events-none"
                          : isSpeaking
                          ? "bg-blue-500 text-white animate-pulse"
                          : readAloudEnabled
                          ? "bg-blue-500/20 text-blue-400"
                          : style.iconButton
                      }`}
                      title={
                        isSpeaking
                          ? t.readAloudStop
                          : readAloudEnabled
                          ? t.readAloudEnabled
                          : t.readAloudEnable
                      }
                    >
                      {readAloudEnabled || isSpeaking ? <Volume2 size={17} /> : <VolumeX size={17} />}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isThinking}
                    onClick={() => {
                      if (!isThinking) onToggleRecording();
                    }}
                    className={`p-2.5 rounded-xl transition-all relative ${
                      isThinking
                        ? "opacity-40 cursor-not-allowed pointer-events-none"
                        : isRecording
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse"
                        : style.iconButton
                    }`}
                    title={isRecording ? t.micStop : t.micStart}
                  >
                    {isRecording ? <MicOff size={17} /> : <Mic size={17} />}
                  </button>
                </div>
              </div>

              {/* Send / Stop button */}
              <div className="relative flex items-center justify-center min-w-[48px] min-h-[48px]">
                {isThinking ? (
                  <button
                    key="cancel-state"
                    type="button"
                    onClick={() => onStop?.()}
                    className={`relative z-50 flex items-center justify-center select-none w-11 h-11 transition-all ${
                      theme === Theme.PIXEL
                        ? "border-4 border-amber-500 bg-[#18181a] rounded-none text-amber-500"
                        : isLight
                        ? "rounded-full bg-white border border-gray-300 shadow-md text-gray-800"
                        : "rounded-full bg-zinc-900 border border-white/15 shadow-lg text-zinc-100 hover:bg-zinc-800"
                    } cursor-pointer group`}
                    title={t.stopGenerating}
                  >
                    <div className="relative w-full h-full flex items-center justify-center">
                      <div
                        className="absolute inset-[3px] rounded-full border-2 animate-spin"
                        style={{
                          borderColor: "transparent",
                          borderTopColor:
                            theme === Theme.MATRIX
                              ? "#10b981"
                              : theme === Theme.CYBERPUNK
                              ? "#f046fa"
                              : theme === Theme.GALAXY
                              ? "#7c3aed"
                              : theme === Theme.LIGHT
                              ? "#2563eb"
                              : "#ffffff",
                        }}
                      />
                      <div
                        className={`w-3 h-3 rounded-[2px] ${
                          theme === Theme.MATRIX
                            ? "bg-emerald-400"
                            : theme === Theme.CYBERPUNK
                            ? "bg-fuchsia-400"
                            : theme === Theme.GALAXY
                            ? "bg-violet-400"
                            : theme === Theme.PIXEL
                            ? "bg-amber-500 rounded-none"
                            : isLight
                            ? "bg-gray-800"
                            : "bg-white"
                        }`}
                      />
                    </div>
                  </button>
                ) : (
                  <button
                    key="send-state"
                    type="button"
                    onClick={() => onSend()}
                    disabled={!input.trim() && attachments.length === 0}
                    className={`p-3.5 mx-1 transition-all ${
                      theme === Theme.PIXEL ? "rounded-none" : "rounded-2xl"
                    } ${
                      !input.trim() && attachments.length === 0
                        ? isLight
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-white/5 text-zinc-500 cursor-not-allowed"
                        : `${style.buttonActive} active:scale-95`
                    }`}
                  >
                    <Send size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ChatInput;
