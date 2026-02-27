
import React, { useRef, useState } from 'react';
import { Settings2, GripVertical, ChevronDown, Volume2, VolumeX, MousePointer2, Move, Target, ArrowRight, ArrowLeft, Plus, Trash2, Magnet } from 'lucide-react';
import { MAX_STEPS, MIN_STEPS } from '../constants';
import { DrumKit } from '../types';
import Knob from './Knob';

interface SequencerGridProps {
  drumKit: DrumKit[];
  grid: number[][];
  rowSteps: number[];
  rowSwings: number[];
  swingTargets: boolean[][];
  rowOffsets: number[];
  rowDirections: boolean[];
  globalSteps: number;
  currentStep: number;
  mutes: boolean[];
  onToggleCell: (row: number, col: number) => void;
  onToggleSwingTarget: (row: number, col: number) => void;
  onSetRatchet: (row: number, col: number, ratchet: number) => void;
  onSetRowSwing: (row: number, swing: number) => void;
  onMoveCells: (sR: number, sC: number, eR: number, eC: number, dR: number, dC: number, isCtrl: boolean) => void;
  onSetRowOffset: (row: number, col: number) => void;
  onEditDrum: (index: number) => void;
  onToggleMute: (index: number) => void;
  onRemoveTrack: (index: number) => void;
  onUpdateRowSteps: (index: number, steps: number) => void;
  onUpdateGlobalSteps: (steps: number) => void;
  onToggleRowDirection: (index: number) => void;
  onAddTrack: () => void;
  activeEditIndex: number | null;
  activeSwingEditRow: number | null;
  onSetSwingEditRow: (index: number | null) => void;
}

const SequencerGrid: React.FC<SequencerGridProps> = ({ 
  drumKit,
  grid, 
  rowSteps,
  rowSwings,
  swingTargets,
  rowOffsets,
  rowDirections,
  globalSteps,
  currentStep, 
  mutes,
  onToggleCell, 
  onToggleSwingTarget,
  onSetRatchet,
  onSetRowSwing,
  onMoveCells,
  onSetRowOffset,
  onEditDrum,
  onToggleMute,
  onRemoveTrack,
  onUpdateRowSteps,
  onUpdateGlobalSteps,
  onToggleRowDirection,
  onAddTrack,
  activeEditIndex,
  activeSwingEditRow,
  onSetSwingEditRow
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // SELECTION & MOVE STATE
  const [selection, setSelection] = useState<{ start: {r: number, c: number}, end: {r: number, c: number} } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [moveGhost, setMoveGhost] = useState<{ dr: number, dc: number } | null>(null);
  const [moveStartPos, setMoveStartPos] = useState<{r: number, c: number} | null>(null);

  // Standard Ratchet Gesture State
  const [gesturingCell, setGesturingCell] = useState<{ 
    row: number, col: number, startY: number, startRatchet: number, hasMoved: boolean 
  } | null>(null);

  const getCellFromPos = (clientX: number, clientY: number) => {
    const stepsContainers = containerRef.current?.querySelectorAll('.steps-container');
    if (!stepsContainers) return null;

    let targetRow = -1;
    let targetCol = -1;

    stepsContainers.forEach((container, rowIndex) => {
      const rect = container.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        targetRow = rowIndex;
        const x = clientX - rect.left;
        const stepWidth = rect.width / MAX_STEPS;
        targetCol = Math.floor(x / stepWidth);
      }
    });

    if (targetRow >= 0 && targetCol >= 0 && targetCol < MAX_STEPS) {
      return { r: targetRow, c: targetCol };
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const cell = getCellFromPos(e.clientX, e.clientY);
    if (draggingIndex !== null) return; 

    // Swing Target Editing Mode
    if (activeSwingEditRow !== null && cell) {
      if (cell.r === activeSwingEditRow) {
        onToggleSwingTarget(cell.r, cell.c);
        return;
      }
      // Clicking outside the active row closes the mode
      onSetSwingEditRow(null);
      return;
    }

    if (e.shiftKey && cell) {
      setSelection({ start: cell, end: cell });
      setIsSelecting(true);
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }

    if (selection && cell) {
      const minR = Math.min(selection.start.r, selection.end.r);
      const maxR = Math.max(selection.start.r, selection.end.r);
      const minC = Math.min(selection.start.c, selection.end.c);
      const maxC = Math.max(selection.start.c, selection.end.c);
      if (cell.r >= minR && cell.r <= maxR && cell.c >= minC && cell.c <= maxC) {
        setIsMoving(true);
        setMoveStartPos(cell);
        setMoveGhost({ dr: 0, dc: 0 });
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        return;
      }
    }

    if (cell) {
      setSelection(null);
      handleCellPointerDown(e, cell.r, cell.c);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingIndex !== null) {
      const stepsContainer = containerRef.current?.querySelector('.steps-container');
      if (!stepsContainer) return;
      const rect = stepsContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const stepWidth = rect.width / MAX_STEPS;
      let newSteps = Math.round(x / stepWidth);
      newSteps = Math.max(MIN_STEPS, Math.min(MAX_STEPS, newSteps));
      if (draggingIndex === -1) onUpdateGlobalSteps(newSteps);
      else onUpdateRowSteps(draggingIndex, newSteps);
      return;
    }

    if (isSelecting) {
      const cell = getCellFromPos(e.clientX, e.clientY);
      if (cell && selection) setSelection({ ...selection, end: cell });
      return;
    }

    if (isMoving && moveStartPos) {
      const cell = getCellFromPos(e.clientX, e.clientY);
      if (cell) setMoveGhost({ dr: cell.r - moveStartPos.r, dc: cell.c - moveStartPos.c });
      return;
    }

    if (gesturingCell) {
      const deltaY = gesturingCell.startY - e.clientY;
      const stepSize = 12;
      if (Math.abs(deltaY) > 5 && !gesturingCell.hasMoved) {
        setGesturingCell(prev => prev ? { ...prev, hasMoved: true } : null);
      }
      if (gesturingCell.hasMoved) {
        const change = Math.floor(deltaY / stepSize);
        let nextRatchet = gesturingCell.startRatchet + change;
        nextRatchet = Math.max(1, Math.min(16, nextRatchet));
        if (nextRatchet !== grid[gesturingCell.row][gesturingCell.col]) {
          onSetRatchet(gesturingCell.row, gesturingCell.col, nextRatchet);
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isSelecting) setIsSelecting(false);
    if (isMoving && moveGhost && selection) {
      if (moveGhost.dr !== 0 || moveGhost.dc !== 0) {
        onMoveCells(selection.start.r, selection.start.c, selection.end.r, selection.end.c, moveGhost.dr, moveGhost.dc, e.ctrlKey || e.metaKey);
        setSelection(null);
      }
      setIsMoving(false);
      setMoveGhost(null);
      setMoveStartPos(null);
    }
    if (gesturingCell && !gesturingCell.hasMoved) {
      if (e.ctrlKey || e.metaKey) onSetRowOffset(gesturingCell.row, gesturingCell.col);
      else onToggleCell(gesturingCell.row, gesturingCell.col);
    }
    setDraggingIndex(null);
    setGesturingCell(null);
  };

  const handleCellPointerDown = (e: React.PointerEvent, row: number, col: number) => {
    const ratchet = grid[row][col];
    setGesturingCell({ row, col, startY: e.clientY, startRatchet: ratchet || 1, hasMoved: false });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const isCellSelected = (r: number, c: number) => {
    if (!selection) return false;
    const minR = Math.min(selection.start.r, selection.end.r);
    const maxR = Math.max(selection.start.r, selection.end.r);
    const minC = Math.min(selection.start.c, selection.end.c);
    const maxC = Math.max(selection.start.c, selection.end.c);
    return r >= minR && r <= maxR && c >= minC && maxC >= c;
  };

  return (
    <div className="flex flex-col gap-2 w-full select-none">
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-2">
           {activeSwingEditRow !== null && (
             <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30 text-[9px] font-black uppercase tracking-widest animate-pulse">
               <Magnet size={12} /> Editing Swing Targets (ESC to exit)
             </div>
           )}
        </div>
        {selection && <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-blue-400 animate-pulse"><MousePointer2 size={12} /> Area Selected</div>}
      </div>

      <div className="flex flex-col gap-2 w-full overflow-x-auto pb-4 custom-scrollbar relative" ref={containerRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} style={{ touchAction: 'none' }}>
        <div className="flex flex-col gap-2 relative" style={{ minWidth: `${MAX_STEPS * 36 + 260}px` }}>
          
          <div className="flex items-end gap-3 h-6 mb-1 pr-16 relative">
            <div className="w-56 flex-shrink-0 flex items-center justify-end pr-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Steps</span>
            </div>
            <div className="flex gap-1 flex-grow relative">
              {Array.from({ length: MAX_STEPS }).map((_, colIndex) => {
                const isBeatStart = colIndex % 4 === 0;
                return (
                  <div key={`header-${colIndex}`} className="w-full flex flex-col items-center justify-end relative">
                    <span className={`text-[8px] font-mono leading-none ${isBeatStart ? 'text-slate-300' : 'text-slate-600'}`}>
                      {colIndex + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative">
            {drumKit.map((drum, rowIndex) => {
              const rSteps = rowSteps[rowIndex];
              const rSwing = rowSwings[rowIndex] || 0;
              const rOffset = rowOffsets[rowIndex];
              const isForward = rowDirections[rowIndex];
              const isMuted = mutes[rowIndex];
              const isEditingSwing = activeSwingEditRow === rowIndex;
              
              return (
                <div key={drum.id} className={`flex items-center gap-3 group/row transition-opacity mb-2 relative z-10 ${isMuted ? 'opacity-50' : 'opacity-100'}`}>
                  {/* Track Header with Controls */}
                  <div className="w-56 flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => onToggleMute(rowIndex)} className={`p-1 rounded-lg transition-all ${isMuted ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700'}`}>
                      {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                    </button>
                    <button onClick={() => onEditDrum(rowIndex)} className={`p-1 rounded-lg transition-all ${activeEditIndex === rowIndex ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700'}`}>
                      <Settings2 size={12} />
                    </button>
                    
                    {/* Swing Control - Knob & Target Button */}
                    <div className="flex items-center gap-1 bg-slate-800/40 p-1 rounded-lg border border-slate-700/50">
                      <Knob 
                        label="Swg" 
                        min={-1} 
                        max={1} 
                        value={rSwing} 
                        onChange={(val) => onSetRowSwing(rowIndex, val)} 
                      />
                      <button 
                        onClick={(e) => { e.stopPropagation(); onSetSwingEditRow(isEditingSwing ? null : rowIndex); }}
                        className={`p-1 rounded transition-all ${isEditingSwing ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-600 hover:text-blue-400 hover:bg-slate-800'}`}
                        title="Edit Swing Targets"
                      >
                        <Magnet size={10} />
                      </button>
                    </div>

                    <span className="text-lg ml-1">{drum.emoji}</span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 truncate flex-grow min-w-0">{drum.name}</span>
                    
                    <button onClick={() => onRemoveTrack(rowIndex)} className="p-1 rounded-lg transition-all bg-slate-800/40 text-slate-600 hover:text-red-400 hover:bg-red-500/10">
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Step Grid Container */}
                  <div className="flex gap-1 flex-grow relative steps-container mr-16">
                    {Array.from({ length: MAX_STEPS }).map((_, colIndex) => {
                      const ratchetCount = grid[rowIndex][colIndex];
                      const isActive = ratchetCount > 0;
                      const isSwingTarget = swingTargets[rowIndex]?.[colIndex] ?? false;
                      
                      let currentLocalStep = ((currentStep + rOffset) % rSteps + rSteps) % rSteps;
                      if (!isForward) {
                        currentLocalStep = (rSteps - 1) - currentLocalStep;
                      }
                      
                      const isCurrentRowStep = currentStep !== -1 && currentLocalStep === colIndex;
                      const isWithinLoop = colIndex < rSteps;
                      const isBeat = colIndex % 4 === 0;
                      const selected = isCellSelected(rowIndex, colIndex);

                      // Visual Swing Shift based on custom targets
                      const swingShift = isSwingTarget ? rSwing * 16 : 0;

                      let isGhostActive = false;
                      if (moveGhost && selection) {
                        const minR = Math.min(selection.start.r, selection.end.r) + moveGhost.dr, maxR = Math.max(selection.start.r, selection.end.r) + moveGhost.dr;
                        const minC = Math.min(selection.start.c, selection.end.c) + moveGhost.dc, maxC = Math.max(selection.start.c, selection.end.c) + moveGhost.dc;
                        if (rowIndex >= minR && rowIndex <= maxR && colIndex >= minC && colIndex <= maxC) isGhostActive = true;
                      }

                      return (
                        <div key={`${rowIndex}-${colIndex}`} className="w-full h-10 relative">
                          {/* Static Playhead Indicator (White Line) */}
                          {isCurrentRowStep && isWithinLoop && (
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-white z-30 pointer-events-none rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                          )}
                          
                          {/* Static Playhead Dot (for empty cells) */}
                          {isCurrentRowStep && !isActive && isWithinLoop && (
                            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                              <div className="w-1.5 h-1.5 bg-white rounded-full opacity-60 animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                            </div>
                          )}

                          <button 
                            style={{ transform: `translateX(${swingShift}px)` }}
                            className={`w-full h-10 rounded-sm transition-all duration-75 flex items-center justify-center relative group 
                              ${isActive ? (isMuted ? 'bg-slate-700' : 'bg-slate-800/20') : (isBeat ? 'bg-slate-700/40' : 'bg-slate-800')} 
                              ${!isWithinLoop ? 'opacity-5 grayscale cursor-not-allowed' : ''} 
                              ${selected ? 'ring-2 ring-blue-500/50 bg-blue-500/10 z-20' : ''} 
                              ${isGhostActive ? 'ring-2 ring-blue-400 ring-dashed bg-blue-400/20 z-30' : ''}
                              ${isEditingSwing && isWithinLoop ? (isSwingTarget ? 'border border-blue-400 ring-2 ring-blue-500/20' : 'border border-slate-700') : ''}
                            `} 
                            disabled={!isWithinLoop}
                          >
                            {isActive && isWithinLoop && (
                              <div className="absolute inset-0 flex gap-[1.5px] p-[2px] items-stretch">
                                {Array.from({ length: ratchetCount }).map((_, i) => (
                                  <div key={i} className={`flex-grow rounded-sm shadow-[0_0_8px_rgba(249,115,22,0.4)] ${isMuted ? 'bg-slate-400 opacity-40 shadow-none' : 'bg-orange-500'}`} style={{ height: '100%', minWidth: '1px' }} />
                                ))}
                              </div>
                            )}
                            {ratchetCount > 1 && isWithinLoop && (
                              <div className="absolute top-0 right-1 px-1 bg-slate-900/60 rounded-bl-sm pointer-events-none z-20">
                                 <span className="text-[7px] font-black text-white/80">{ratchetCount}</span>
                              </div>
                            )}
                            {isSwingTarget && isWithinLoop && !isEditingSwing && (
                               <div className="absolute bottom-1 right-1 w-1 h-1 bg-blue-400 rounded-full opacity-30 group-hover:opacity-100" />
                            )}
                          </button>
                        </div>
                      );
                    })}

                    <div className={`absolute top-0 bottom-0 z-20 w-4 -ml-2 cursor-col-resize flex items-center justify-center group/handle ${draggingIndex === rowIndex ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`} style={{ left: `${(rSteps / MAX_STEPS) * 100}%` }} onPointerDown={(e) => { e.stopPropagation(); setDraggingIndex(rowIndex); (e.target as Element).setPointerCapture(e.pointerId); }}>
                      <div className={`h-full w-1 transition-colors flex items-center justify-center ${draggingIndex === rowIndex ? 'bg-orange-500' : 'bg-orange-500/40 group-hover/handle:bg-orange-500'}`}>
                        <div className="w-4 h-6 bg-slate-800 border border-slate-700 rounded-sm flex items-center justify-center shadow-lg"><GripVertical size={10} className="text-orange-500" /></div>
                      </div>
                    </div>

                    <div className="absolute top-0 bottom-0 flex items-center transition-all" style={{ left: `${(rSteps / MAX_STEPS) * 100}%` }}>
                      <button 
                        onClick={() => onToggleRowDirection(rowIndex)}
                        className={`
                          ml-4 w-8 h-8 flex items-center justify-center rounded-lg border transition-all z-30 shadow-xl
                          ${isForward 
                            ? 'bg-slate-800 border-slate-700 text-slate-500 hover:text-orange-400 hover:border-orange-500/40' 
                            : 'bg-orange-500 border-orange-400 text-white shadow-orange-500/20'}
                        `}
                        title={isForward ? "Switch to Reverse" : "Switch to Forward"}
                      >
                        {isForward ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mt-4 mb-2 pr-16">
            <div className="w-56 flex-shrink-0 flex items-center justify-center pt-2">
              <button 
                onClick={onAddTrack}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800/40 border border-dashed border-slate-700 hover:border-orange-500/40 hover:text-orange-400 hover:bg-slate-800 transition-all text-[10px] font-black uppercase tracking-widest w-full text-slate-500"
              >
                <Plus size={14} /> Add Sound
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6 mb-2 relative group/timeline mr-16">
            <div className="w-56 flex-shrink-0 flex items-center justify-end px-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Timeline</span>
            </div>
            <div className="flex gap-1 flex-grow relative h-6 bg-slate-900/40 rounded-full items-center px-1">
              <div className="absolute left-1 h-1 bg-slate-500/10 rounded-full" style={{ width: `calc(${(globalSteps / MAX_STEPS) * 100}%)` }} />
              
              <div className="absolute top-1/2 -translate-y-1/2 -ml-2 w-6 h-6 z-30 cursor-col-resize flex items-center justify-center rounded-full bg-slate-800 border-2 border-slate-500 shadow-lg" style={{ left: `${(globalSteps / MAX_STEPS) * 100}%` }} onPointerDown={(e) => { e.stopPropagation(); setDraggingIndex(-1); (e.target as Element).setPointerCapture(e.pointerId); }}>
                <ChevronDown size={14} className="text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SequencerGrid;
