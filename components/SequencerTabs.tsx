
import React from 'react';
import { Plus, X, Play, Music, Copy } from 'lucide-react';

interface Page {
  id: string;
  name: string;
}

interface SequencerTabsProps {
  pages: Page[];
  activePageIndex: number;
  playingPageIndex: number;
  queuedPageIndex: number | null;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onRemovePage: (index: number) => void;
  onQueuePage: (index: number) => void;
  onRenamePage: (index: number, newName: string) => void;
  onDuplicatePage: (index: number) => void;
}

const SequencerTabs: React.FC<SequencerTabsProps> = ({
  pages,
  activePageIndex,
  playingPageIndex,
  queuedPageIndex,
  onSelectPage,
  onAddPage,
  onRemovePage,
  onQueuePage,
  onRenamePage,
  onDuplicatePage
}) => {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editValue, setEditValue] = React.useState('');

  const handleStartEdit = (index: number, name: string) => {
    setEditingIndex(index);
    setEditValue(name);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editValue.trim()) {
      onRenamePage(editingIndex, editValue.trim());
    }
    setEditingIndex(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveEdit();
    if (e.key === 'Escape') setEditingIndex(null);
  };

  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
      {pages.map((page, index) => {
        const isActive = activePageIndex === index;
        const isPlaying = playingPageIndex === index;
        const isQueued = queuedPageIndex === index;
        const isEditing = editingIndex === index;

        return (
          <div
            key={page.id}
            className={`
              relative flex items-center h-12 min-w-[160px] rounded-xl border transition-all cursor-pointer group
              ${isActive 
                ? 'bg-slate-800 border-orange-500/50 shadow-lg shadow-orange-500/5' 
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}
            `}
            onClick={() => !isEditing && onSelectPage(index)}
          >
            {/* Left Actions */}
            <div className="flex items-center gap-1 ml-2">
              {pages.length > 1 && !isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePage(index);
                  }}
                  className="p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                  title="Remove Pattern"
                >
                  <X size={12} />
                </button>
              )}
              {!isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicatePage(index);
                  }}
                  className="p-1 text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                  title="Duplicate Pattern"
                >
                  <Copy size={12} />
                </button>
              )}
            </div>

            {/* Content */}
            <div 
              className="flex-grow px-2 flex items-center gap-2"
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleStartEdit(index, page.name);
              }}
            >
               <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPlaying ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-slate-700'}`} />
               {isEditing ? (
                 <input
                   autoFocus
                   value={editValue}
                   onChange={(e) => setEditValue(e.target.value)}
                   onBlur={handleSaveEdit}
                   onKeyDown={handleKeyDown}
                   onClick={(e) => e.stopPropagation()}
                   className="bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest w-full px-1 rounded border border-orange-500/50 outline-none"
                 />
               ) : (
                 <span className={`text-[10px] font-black uppercase tracking-widest truncate max-w-[80px] ${isActive ? 'text-white' : 'text-slate-500'}`}>
                   {page.name}
                 </span>
               )}
            </div>

            {/* Queue Button */}
            {!isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQueuePage(index);
                }}
                className={`
                  mr-2 p-1.5 rounded-lg transition-all
                  ${isQueued 
                    ? 'bg-blue-500 text-white animate-pulse' 
                    : isPlaying ? 'text-green-500 bg-green-500/10' : 'text-slate-600 hover:text-white hover:bg-slate-700'}
                `}
                title="Queue Pattern"
              >
                <Play size={12} fill={isQueued || isPlaying ? "currentColor" : "none"} />
              </button>
            )}

            {/* Active Indicator Line */}
            {isActive && (
              <div className="absolute -bottom-[1px] left-4 right-4 h-[2px] bg-orange-500 rounded-full" />
            )}
            
            {/* Queued Label Overlay */}
            {isQueued && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-[7px] font-black text-white px-1.5 py-0.5 rounded shadow-lg uppercase tracking-tighter">
                Next
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={onAddPage}
        className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-500 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all"
        title="Add Pattern"
      >
        <Plus size={20} />
      </button>
    </div>
  );
};

export default SequencerTabs;
