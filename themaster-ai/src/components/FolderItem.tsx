
import React, { useMemo, useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MoreVertical, Briefcase, GraduationCap, User } from 'lucide-react';
import { Chat, Folder, Theme } from '../types';
import SortableChatItem from './SortableChatItem';

interface FolderItemProps {
  folder: Folder;
  isOver: boolean;
  onRename: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string) => void;
  chats: Chat[];
  activeChatId: string | null;
  deletingChatId: string | null;
  binaryTitle: string;
  theme: Theme;
  onSelectChat: (id: string) => void;
  onRenameChat: (id: string, e: React.MouseEvent) => void;
  onDeleteChat: (id: string, e: React.MouseEvent) => void;
}

const FolderIcon: React.FC<{ type?: string; color: string; size?: number }> = ({ type, color, size = 12 }) => {
  const props = { size, style: { color }, strokeWidth: 3 };
  switch (type) {
    case 'work': return <Briefcase {...props} />;
    case 'study': return <GraduationCap {...props} />;
    case 'personal': return <User {...props} />;
    default: return <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />;
  }
};

const FolderItem: React.FC<FolderItemProps> = ({ 
  folder, 
  isOver, 
  onRename, 
  onDelete, 
  chats, 
  activeChatId, 
  deletingChatId, 
  binaryTitle, 
  theme, 
  onSelectChat, 
  onRenameChat, 
  onDeleteChat 
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const chatIds = useMemo(() => chats.map(c => c.id), [chats]);
  
  return (
    <div key={folder.id} className="group">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer ${isOver ? 'bg-blue-600/30 ring-2 ring-blue-500 shadow-lg' : 'hover:bg-tertiary'}`}
      >
        <div className="flex items-center gap-3">
          <FolderIcon type={folder.icon} color={folder.color || '#3b82f6'} />
          <span className="text-xs font-bold text-text-secondary group-hover:text-text-primary">{folder.name}</span>
          <span className="text-[9px] text-text-secondary/50 font-black">({chats.length})</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onRename(folder.id, e); }} className="p-1 hover:bg-tertiary rounded text-text-secondary">
             <MoreVertical size={10} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }} className="p-1 hover:bg-tertiary rounded text-text-secondary hover:text-red-500">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="ml-4 mt-1 space-y-1 overflow-hidden">
          <SortableContext items={chatIds} strategy={verticalListSortingStrategy}>
            {chats.map(chat => (
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
        </div>
      )}
    </div>
  );
};

export default FolderItem;
