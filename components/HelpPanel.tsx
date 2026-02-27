
import React from 'react';
import { Settings2, GripVertical, Move, Target, Zap } from 'lucide-react';

interface HelpPanelProps {
  isVisible: boolean;
}

const HelpPanel: React.FC<HelpPanelProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Move size={16} /></div>
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white mb-1">Move</h4>
          <p className="text-[9px] text-slate-400 leading-relaxed">Shift-drag select and drag move or Cmd-drag move without overwriting.</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg"><Zap size={16} /></div>
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white mb-1">Ratcheting</h4>
          <p className="text-[9px] text-slate-400 leading-relaxed">Click and drag up and down on a step to change density.</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-green-500/20 text-green-400 rounded-lg"><Target size={16} /></div>
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white mb-1">Set Next Step</h4>
          <p className="text-[9px] text-slate-400 leading-relaxed">Cmd / Ctrl + Click any square to jump its row playhead.</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-slate-500/20 text-slate-400 rounded-lg"><GripVertical size={16} /></div>
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white mb-1">Loop Length</h4>
          <p className="text-[9px] text-slate-400 leading-relaxed">Drag orange handles to set independent per-row loop lengths.</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg"><Settings2 size={16} /></div>
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white mb-1">Edit Sound</h4>
          <p className="text-[9px] text-slate-400 leading-relaxed">Click the gear icon to open the synth architect for that sound.</p>
        </div>
      </div>
    </div>
  );
};

export default HelpPanel;
