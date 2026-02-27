
import React from 'react';
import { Play, Square, Volume2, Radio, Cable, Disc, Download, Loader2 } from 'lucide-react';

interface ControlsProps {
  isPlaying: boolean;
  bpm: number;
  volume: number;
  steps: number;
  audioEnabled: boolean;
  midiEnabled: boolean;
  isRecording: boolean;
  isExporting?: boolean;
  loopsToRecord: number;
  loopMode: 'auto' | 'custom';
  autoLoops: { value: number; disabled: boolean; reason?: string };
  currentLoopCount: number;
  onTogglePlay: () => void;
  onBpmChange: (newBpm: number) => void;
  onVolumeChange: (newVol: number) => void;
  onToggleAudio: () => void;
  onToggleMidi: () => void;
  onClear: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onLoopsToRecordChange: (loops: number) => void;
  onLoopModeChange: (mode: 'auto' | 'custom') => void;
  onCustomLoopsClick: () => void;
}

const Controls: React.FC<ControlsProps> = ({ 
  isPlaying, 
  bpm, 
  volume, 
  audioEnabled,
  midiEnabled,
  isRecording,
  isExporting,
  loopsToRecord,
  loopMode,
  autoLoops,
  currentLoopCount,
  onTogglePlay, 
  onBpmChange, 
  onVolumeChange, 
  onToggleAudio,
  onToggleMidi,
  onClear,
  onStartRecording,
  onStopRecording,
  onLoopsToRecordChange,
  onLoopModeChange,
  onCustomLoopsClick
}) => {
  return (
    <div className="bg-slate-900/90 backdrop-blur-xl p-6 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-6 shadow-2xl">
      {/* Transport */}
      <div className="flex items-center gap-4">
        <button
          onClick={onTogglePlay}
          className={`
            w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg
            ${isPlaying 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
              : 'bg-orange-500 hover:bg-orange-600 text-white animate-pulse shadow-orange-500/20'
            }
          `}
        >
          {isPlaying ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
        </button>

        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Transport</span>
          <span className="text-sm font-semibold">{isPlaying ? 'Playing' : 'Stopped'}</span>
        </div>
      </div>

      {/* Recording */}
      <div className="flex items-center gap-4 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Record Loops</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onLoopModeChange('auto')}
              disabled={autoLoops.disabled}
              className={`px-3 h-7 rounded-lg text-[10px] font-black transition-all ${
                loopMode === 'auto'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                  : autoLoops.disabled
                    ? 'bg-slate-800/50 text-slate-700 cursor-not-allowed'
                    : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
              }`}
              title={autoLoops.disabled ? autoLoops.reason : `Calculate loops for perfect polymetric cycle (${autoLoops.value} loops)`}
            >
              AUTO {autoLoops.disabled ? '(!)' : `(${autoLoops.value})`}
            </button>

            <button
              onClick={onCustomLoopsClick}
              className={`px-3 h-7 rounded-lg text-[10px] font-black transition-all ${
                loopMode === 'custom'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                  : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
              }`}
            >
              CUSTOM {loopMode === 'custom' ? `(${loopsToRecord})` : ''}
            </button>
          </div>
        </div>

        <button
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={isExporting}
          className={`
            flex items-center gap-2 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all
            ${isRecording 
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 ring-2 ring-red-500/20' 
              : isExporting
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50'
            }
          `}
        >
          {isExporting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Exporting...
            </>
          ) : isRecording ? (
            <>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              REC {currentLoopCount + 1}/{loopsToRecord}
            </>
          ) : (
            <>
              <Disc size={14} />
              Record Loops
            </>
          )}
        </button>
      </div>

      {/* Toggles */}
      <div className="flex gap-4">
        <button 
          onClick={onToggleAudio}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all border ${audioEnabled ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-slate-800 border-transparent text-slate-500'}`}
        >
          <Radio size={18} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Engine</span>
        </button>
        <button 
          onClick={onToggleMidi}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all border ${midiEnabled ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-transparent text-slate-500'}`}
        >
          <Cable size={18} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">MIDI Out</span>
        </button>
      </div>

      {/* BPM */}
      <div className="flex flex-col gap-1 flex-grow max-w-[140px]">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tempo</span>
          <span className="text-xs font-mono font-bold text-orange-400">{bpm}</span>
        </div>
        <input
          type="range"
          min="40"
          max="240"
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
        />
      </div>

      {/* Volume */}
      <div className="flex flex-col gap-1 flex-grow max-w-[140px]">
        <div className="flex justify-between items-center px-1">
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
             <Volume2 size={12} /> Volume
           </span>
           <span className="text-xs font-mono font-bold text-slate-400">{Math.round((volume + 60) * (100 / 60))}%</span>
        </div>
        <input
          type="range"
          min="-60"
          max="0"
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onClear}
          className="px-4 py-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-300 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all"
        >
          Reset Studio
        </button>
      </div>
    </div>
  );
};

export default Controls;
