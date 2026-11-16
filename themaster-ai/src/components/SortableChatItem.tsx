
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Move, MoreVertical } from 'lucide-react';
import { Chat, Theme } from '../types';

interface SortableChatItemProps {
  chat: Chat;
  activeChatId: string | null;
  deletingChatId: string | null;
  binaryTitle: string;
  theme: Theme;
  onSelect: (id: string) => void;
  onRename: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const SortableChatItem: React.FC<SortableChatItemProps> = ({ 
  chat, 
  activeChatId, 
  deletingChatId, 
  binaryTitle, 
  theme, 
  onSelect, 
  onRename, 
  onDelete 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: chat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`group/chat relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${activeChatId === chat.id ? 'bg-blue-600/10 text-blue-400' : 'text-text-secondary hover:bg-tertiary hover:text-text-primary'}`}
      onClick={() => onSelect(chat.id)}
    >
      <div className="flex items-center gap-3 truncate">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing opacity-30 hover:opacity-100 transition-opacity">
          <Move size={12} />
        </div>
        <span className={`truncate max-w-[140px] ${deletingChatId === chat.id ? (theme === Theme.MATRIX ? 'font-mono matrix-fade-out' : theme === Theme.CYBERPUNK ? 'cyberpunk-glitch-text font-bold' : '') : ''}`}>
          {deletingChatId === chat.id ? binaryTitle : chat.title}
        </span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover/chat:opacity-100 transition-opacity">
        <button onClick={(e) => onRename(chat.id, e)} className="p-1 hover:bg-tertiary rounded">
          <MoreVertical size={12} />
        </button>
        <button onClick={(e) => onDelete(chat.id, e)} className="p-1 hover:bg-tertiary rounded hover:text-red-500">
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </div>
  );
};

export default SortableChatItem;
