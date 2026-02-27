
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as Tone from 'tone';
import { Music, HelpCircle, Power, Trash2 } from 'lucide-react';
import SequencerGrid from './components/SequencerGrid';
import SequencerTabs from './components/SequencerTabs';
import HelpPanel from './components/HelpPanel';
import Controls from './components/Controls';
import DrumEditor from './components/DrumEditor';
import AddSoundModal from './components/AddSoundModal';
import PatternGenerator, { GeneratedPattern } from './components/PatternGenerator';
import { audioService } from './services/audioService';
import { midiService } from './services/midiService';
import { DRUM_KIT, INITIAL_STEPS, ROWS, INITIAL_BPM, INITIAL_VOLUME, MAX_STEPS } from './constants';
import { isGeminiEnabled } from './src/utils/featureFlags';
import { DrumKit, DrumParams, ProjectState, Page } from './types';

const STORAGE_KEY = 'gemini_beat_studio_project_v1';

const createDefaultSwingTargets = (rows: number) => 
  Array(rows).fill(null).map(() => 
    Array(MAX_STEPS).fill(false).map((_, i) => i % 2 === 1)
  );

const createBlankPage = (id: string, name: string, rows: number): Page => ({
  id,
  name,
  grid: Array(rows).fill(null).map(() => Array(MAX_STEPS).fill(0)),
  rowSteps: Array(rows).fill(INITIAL_STEPS),
  rowSwings: Array(rows).fill(0),
  swingTargets: createDefaultSwingTargets(rows),
  rowOffsets: Array(rows).fill(0),
  rowDirections: Array(rows).fill(true), 
  globalSteps: INITIAL_STEPS,
});

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(INITIAL_BPM);
  const [volume, setVolume] = useState(INITIAL_VOLUME);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [midiEnabled, setMidiEnabled] = useState(true);
  const [absoluteStep, setAbsoluteStep] = useState(-1);
  const [isEngineStarted, setIsEngineStarted] = useState(false);
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<{index: number} | null>(null);
  const [isRemoveTrackModalOpen, setIsRemoveTrackModalOpen] = useState<{index: number} | null>(null);
  const [isAddSoundModalOpen, setIsAddSoundModalOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeSwingEditRow, setActiveSwingEditRow] = useState<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loopsToRecord, setLoopsToRecord] = useState(1);
  const [loopMode, setLoopMode] = useState<'auto' | 'custom'>('auto');
  const [isCustomLoopsModalOpen, setIsCustomLoopsModalOpen] = useState(false);
  const [customLoopsInput, setCustomLoopsInput] = useState('1');
  const [hasSetInitialLoops, setHasSetInitialLoops] = useState(false);
  const [currentLoopCount, setCurrentLoopCount] = useState(0);

  const [drumKit, setDrumKit] = useState<DrumKit[]>(DRUM_KIT);
  const [mutes, setMutes] = useState<boolean[]>(Array(DRUM_KIT.length).fill(false));
  const [allDrumParams, setAllDrumParams] = useState<DrumParams[]>(
    DRUM_KIT.map(() => ({ pitch: 1, attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }))
  );

  const [pages, setPages] = useState<Page[]>([createBlankPage('p1', 'Pattern 1', DRUM_KIT.length)]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [playingPageIndex, setPlayingPageIndex] = useState(0);
  const [queuedPageIndex, setQueuedPageIndex] = useState<number | null>(null);

  const drumKitRef = useRef(drumKit);
  const pagesRef = useRef(pages);
  const activePageIndexRef = useRef(activePageIndex);
  const playingPageIndexRef = useRef(playingPageIndex);
  const queuedPageIndexRef = useRef(queuedPageIndex);
  const audioEnabledRef = useRef(audioEnabled);
  const midiEnabledRef = useRef(midiEnabled);
  const paramsRef = useRef(allDrumParams);
  const mutesRef = useRef(mutes);
  const sequenceRef = useRef<Tone.Sequence<number> | null>(null);
  const absoluteStepRef = useRef(-1);
  const localStepRef = useRef(0);
  const isRecordingRef = useRef(isRecording);
  const loopsToRecordRef = useRef(loopsToRecord);
  const currentLoopCountRef = useRef(currentLoopCount);

  useEffect(() => { drumKitRef.current = drumKit; }, [drumKit]);
  useEffect(() => { pagesRef.current = pages; }, [pages]);
  useEffect(() => { activePageIndexRef.current = activePageIndex; }, [activePageIndex]);
  useEffect(() => { playingPageIndexRef.current = playingPageIndex; }, [playingPageIndex]);
  useEffect(() => { queuedPageIndexRef.current = queuedPageIndex; }, [queuedPageIndex]);
  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);
  useEffect(() => { midiEnabledRef.current = midiEnabled; }, [midiEnabled]);
  useEffect(() => { paramsRef.current = allDrumParams; }, [allDrumParams]);
  useEffect(() => { mutesRef.current = mutes; }, [mutes]);
  useEffect(() => { absoluteStepRef.current = absoluteStep; }, [absoluteStep]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { loopsToRecordRef.current = loopsToRecord; }, [loopsToRecord]);
  useEffect(() => { currentLoopCountRef.current = currentLoopCount; }, [currentLoopCount]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveSwingEditRow(null);
        setActiveEditIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data: ProjectState = JSON.parse(saved);
        setBpm(data.bpm);
        setVolume(data.volume);
        setAudioEnabled(data.audioEnabled ?? true);
        setMidiEnabled(data.midiEnabled ?? true);
        
        const kit = data.customKit || DRUM_KIT;
        setDrumKit(kit);

        const migratedPages = data.pages.map(p => ({
          ...p,
          rowOffsets: p.rowOffsets || Array(kit.length).fill(0),
          rowSwings: p.rowSwings || Array(kit.length).fill(0),
          swingTargets: p.swingTargets || createDefaultSwingTargets(kit.length),
          rowDirections: p.rowDirections || Array(kit.length).fill(true)
        }));
        setPages(migratedPages);
        setActivePageIndex(data.activePageIndex);
        setPlayingPageIndex(data.activePageIndex);
        setAllDrumParams(data.drumParams);
        setMutes(data.mutes);
      } catch (e) { console.error("Failed to load project", e); }
    }
  }, []);

  useEffect(() => {
    const project: ProjectState = {
      version: '1.7',
      bpm,
      volume,
      audioEnabled,
      midiEnabled,
      activePageIndex,
      pages,
      drumParams: allDrumParams,
      mutes,
      customKit: drumKit
    };
    const timeout = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [bpm, volume, audioEnabled, midiEnabled, activePageIndex, pages, allDrumParams, mutes, drumKit]);

  const handleStartEngine = async () => {
    await audioService.init();
    audioService.setBPM(bpm);
    audioService.setVolume(volume);

    drumKit.forEach((drum, i) => {
      if (drum.synthType) {
        audioService.createSynth(drum.id, drum.synthType);
      }
      const p = allDrumParams[i];
      if (p) {
        audioService.updateParameter(drum.id, 'decay', p.decay);
        audioService.updateParameter(drum.id, 'attack', p.attack || 0.001);
        audioService.updateParameter(drum.id, 'sustain', p.sustain || 0);
        audioService.updateParameter(drum.id, 'release', p.release || 0.1);
        audioService.updateParameter(drum.id, 'pitch', p.pitch);
      }
    });

    setIsEngineStarted(true);
    
    const sequence = new Tone.Sequence((time, _) => {
      const currentPage = pagesRef.current[playingPageIndexRef.current];
      const step = localStepRef.current;
      Tone.getDraw().schedule(() => setAbsoluteStep(step), time);
      
      currentPage.grid.forEach((row, rowIndex) => {
        if (mutesRef.current[rowIndex]) return;
        
        const rSteps = currentPage.rowSteps[rowIndex];
        const rOffset = currentPage.rowOffsets[rowIndex];
        const isForward = currentPage.rowDirections[rowIndex];
        let actualStep = ((step + rOffset) % rSteps + rSteps) % rSteps;
        if (!isForward) actualStep = (rSteps - 1) - actualStep;
        
        const ratchetCount = row[actualStep];
        if (ratchetCount > 0) {
          const drum = drumKitRef.current[rowIndex];
          const params = paramsRef.current[rowIndex];
          
          let triggerTime = time;
          // Apply Swing: Check if this specific step is a target for this row
          const isSwingTarget = currentPage.swingTargets?.[rowIndex]?.[actualStep] ?? false;
          if (isSwingTarget) {
            const swing = currentPage.rowSwings[rowIndex] || 0;
            const swingOffset = swing * (Tone.Time("16n").toSeconds() * 0.4);
            triggerTime += swingOffset;
          }

          if (audioEnabledRef.current) audioService.trigger(drum.id, triggerTime, { pitch: params.pitch, ratchet: ratchetCount });
          if (midiEnabledRef.current) midiService.sendNoteOn(drum.midiNote);
        }
      });

      localStepRef.current++;
      if (localStepRef.current % currentPage.globalSteps === 0) {
        // Loop finished
        if (isRecordingRef.current) {
          const nextLoop = currentLoopCountRef.current + 1;
          Tone.getDraw().schedule(() => setCurrentLoopCount(nextLoop), time);
          
          if (nextLoop >= loopsToRecordRef.current) {
            Tone.getDraw().schedule(() => {
              handleStopRecording();
            }, time);
          }
        }

        if (queuedPageIndexRef.current !== null) {
          const nextIdx = queuedPageIndexRef.current;
          localStepRef.current = 0;
          Tone.getDraw().schedule(() => {
            setPlayingPageIndex(nextIdx);
            setQueuedPageIndex(null);
          }, time);
        }
      }
    }, [0], "16n");
    
    sequenceRef.current = sequence;
    sequence.start(0);
  };

  useEffect(() => { if (isEngineStarted) audioService.setBPM(bpm); }, [bpm, isEngineStarted]);
  useEffect(() => { if (isEngineStarted) audioService.setVolume(volume); }, [volume, isEngineStarted]);

  const handleTogglePlay = useCallback(async () => {
    if (Tone.getContext().state !== 'running') await Tone.start();
    if (!isPlaying) { 
      localStepRef.current = 0; 
      Tone.getTransport().start(); 
    }
    else { 
      Tone.getTransport().pause(); 
      setAbsoluteStep(-1); 
      if (isRecording) handleStopRecording();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, isRecording]);

  const handleStartRecording = async () => {
    if (!isEngineStarted) await handleStartEngine();
    
    // If already playing, stop first to ensure we start from the beginning of the loop
    if (isPlaying) {
      Tone.getTransport().stop();
      setIsPlaying(false);
    }

    setCurrentLoopCount(0);
    setIsRecording(true);
    
    // Reset to start of loop
    localStepRef.current = 0;
    
    // Start recorder slightly before transport to catch the first transient
    audioService.startRecording();
    
    Tone.getTransport().start();
    setIsPlaying(true);
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    
    // Automatically stop playback
    Tone.getTransport().stop();
    setIsPlaying(false);
    setAbsoluteStep(-1);

    setIsExporting(true);
    try {
      const blob = await audioService.stopRecording();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.download = `computer-rhythm-export-${Date.now()}.wav`;
        anchor.href = url;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setIsExporting(false);
    }
  };

  const updateCurrentPage = (update: (p: Page) => Page) => {
    setPages(prev => prev.map((p, i) => i === activePageIndex ? update(p) : p));
  };

  const handleToggleCell = (row: number, col: number) => {
    updateCurrentPage(p => {
      const newGrid = [...p.grid];
      newGrid[row] = [...newGrid[row]];
      newGrid[row][col] = newGrid[row][col] > 0 ? 0 : 1;
      return { ...p, grid: newGrid };
    });
  };

  const handleToggleSwingTarget = (row: number, col: number) => {
    updateCurrentPage(p => {
      const newTargets = p.swingTargets.map((rowArr, i) => i === row ? [...rowArr] : rowArr);
      newTargets[row][col] = !newTargets[row][col];
      return { ...p, swingTargets: newTargets };
    });
  };

  const handleSetRatchet = (row: number, col: number, ratchet: number) => {
    updateCurrentPage(p => {
      const newGrid = [...p.grid];
      newGrid[row] = [...newGrid[row]];
      newGrid[row][col] = ratchet;
      return { ...p, grid: newGrid };
    });
  };

  const handleSetRowSwing = (row: number, swing: number) => {
    updateCurrentPage(p => {
      const newSwings = [...p.rowSwings];
      newSwings[row] = swing;
      return { ...p, rowSwings: newSwings };
    });
  };

  const handleSetRowOffset = (row: number, targetCol: number) => {
    updateCurrentPage(p => {
      const newRowOffsets = [...p.rowOffsets];
      const rSteps = p.rowSteps[row];
      const isForward = p.rowDirections[row];
      let normalizedTarget = targetCol;
      if (!isForward) normalizedTarget = (rSteps - 1) - targetCol;
      const referenceStep = isPlaying ? absoluteStepRef.current : 0;
      const rawOffset = normalizedTarget - referenceStep;
      newRowOffsets[row] = ((rawOffset % rSteps) + rSteps) % rSteps;
      return { ...p, rowOffsets: newRowOffsets };
    });
  };

  const handleMoveCells = (sR: number, sC: number, eR: number, eC: number, dR: number, dC: number, isCtrl: boolean) => {
    updateCurrentPage(p => {
      const newGrid = p.grid.map(row => [...row]);
      const sourceCells: {r: number, c: number, val: number}[] = [];
      for (let r = Math.min(sR, eR); r <= Math.max(sR, eR); r++) {
        for (let c = Math.min(sC, eC); c <= Math.max(sC, eC); c++) {
          sourceCells.push({ r, c, val: p.grid[r][c] });
        }
      }
      if (!isCtrl) sourceCells.forEach(({r, c}) => { newGrid[r][c] = 0; });
      sourceCells.forEach(({r, c, val}) => {
        const tr = r + dR, tc = c + dC;
        if (tr >= 0 && tr < drumKit.length && tc >= 0 && tc < MAX_STEPS) {
          if (isCtrl) { if (val > 0) { newGrid[tr][tc] = val; newGrid[r][c] = 0; } }
          else newGrid[tr][tc] = val;
        }
      });
      return { ...p, grid: newGrid };
    });
  };

  const handleToggleMute = (i: number) => setMutes(prev => { const n = [...prev]; n[i] = !n[i]; return n; });

  const handleUpdateDrumParams = (i: number, p: DrumParams) => {
    setAllDrumParams(prev => prev.map((old, idx) => idx === i ? p : old));
    audioService.updateParameter(drumKit[i].id, 'decay', p.decay);
    audioService.updateParameter(drumKit[i].id, 'pitch', p.pitch);
    if (p.attack !== undefined) audioService.updateParameter(drumKit[i].id, 'attack', p.attack);
    if (p.sustain !== undefined) audioService.updateParameter(drumKit[i].id, 'sustain', p.sustain);
    if (p.release !== undefined) audioService.updateParameter(drumKit[i].id, 'release', p.release);
  };

  const handleDrumMetadataUpdate = (id: string, updates: Partial<DrumKit>) => {
    setDrumKit(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const handleUpdateRowSteps = (i: number, newLength: number) => updateCurrentPage(p => { 
    const currentGlobal = isPlaying ? absoluteStepRef.current : 0;
    const oldLength = p.rowSteps[i];
    const oldOffset = p.rowOffsets[i];
    const isForward = p.rowDirections[i];
    let currentLocalStep = ((currentGlobal + oldOffset) % oldLength + oldLength) % oldLength;
    if (!isForward) currentLocalStep = (oldLength - 1) - currentLocalStep;
    let targetLocalStep = currentLocalStep;
    if (targetLocalStep >= newLength) targetLocalStep = 0;
    let engineTarget = targetLocalStep;
    if (!isForward) engineTarget = (newLength - 1) - targetLocalStep;
    const newRowOffsets = [...p.rowOffsets];
    const rawOffset = engineTarget - currentGlobal;
    newRowOffsets[i] = ((rawOffset % newLength) + newLength) % newLength;
    const n = [...p.rowSteps]; 
    n[i] = newLength; 
    return { ...p, rowSteps: n, rowOffsets: newRowOffsets }; 
  });

  const handleToggleRowDirection = (i: number) => updateCurrentPage(p => {
    const newDirections = [...p.rowDirections];
    const isForward = newDirections[i];
    const rSteps = p.rowSteps[i];
    const currentGlobal = isPlaying ? absoluteStepRef.current : 0;
    let currentCell = ((currentGlobal + p.rowOffsets[i]) % rSteps + rSteps) % rSteps;
    if (!isForward) currentCell = (rSteps - 1) - currentCell;
    const nextForward = !isForward;
    newDirections[i] = nextForward;
    let engineTarget = currentCell;
    if (!nextForward) engineTarget = (rSteps - 1) - currentCell;
    const newRowOffsets = [...p.rowOffsets];
    const rawOffset = engineTarget - currentGlobal;
    newRowOffsets[i] = ((rawOffset % rSteps) + rSteps) % rSteps;
    return { ...p, rowDirections: newDirections, rowOffsets: newRowOffsets };
  });

  const handleGlobalStepsChange = (newGlobal: number) => updateCurrentPage(p => {
    const currentGlobal = isPlaying ? absoluteStepRef.current : 0;
    const oldGlobal = p.globalSteps;
    const newRowOffsets = [...p.rowOffsets];
    const newRowSteps = p.rowSteps.map((rs, i) => {
      if (rs === oldGlobal) {
        const isForward = p.rowDirections[i];
        let currentCell = ((currentGlobal + p.rowOffsets[i]) % rs + rs) % rs;
        if (!isForward) currentCell = (rs - 1) - currentCell;
        let targetCell = currentCell;
        if (targetCell >= newGlobal) targetCell = 0;
        let engineTarget = targetCell;
        if (!isForward) engineTarget = (newGlobal - 1) - targetCell;
        const rawOffset = engineTarget - currentGlobal;
        newRowOffsets[i] = ((rawOffset % newGlobal) + newGlobal) % newGlobal;
        return newGlobal;
      }
      return rs;
    });
    return { ...p, globalSteps: newGlobal, rowSteps: newRowSteps, rowOffsets: newRowOffsets };
  });

  const handleAddPage = () => {
    const nId = `p${pages.length + 1}`, nName = `Pattern ${pages.length + 1}`;
    setPages(prev => [...prev, createBlankPage(nId, nName, drumKit.length)]);
    setActivePageIndex(pages.length);
  };

  const handleAddSound = (kit: DrumKit, params: DrumParams) => {
    if (isEngineStarted) {
      audioService.createSynth(kit.id, kit.synthType || 'membrane', {
        envelope: {
          attack: params.attack,
          decay: params.decay,
          sustain: params.sustain,
          release: params.release
        }
      });
      audioService.updateParameter(kit.id, 'pitch', params.pitch);
    }
    
    setDrumKit(prev => [...prev, kit]);
    setAllDrumParams(prev => [...prev, params]);
    setMutes(prev => [...prev, false]);
    setPages(prev => prev.map(p => ({
      ...p,
      grid: [...p.grid, Array(MAX_STEPS).fill(0)],
      rowSteps: [...p.rowSteps, INITIAL_STEPS],
      rowSwings: [...p.rowSwings, 0],
      swingTargets: [...p.swingTargets, Array(MAX_STEPS).fill(false).map((_, i) => i % 2 === 1)],
      rowOffsets: [...p.rowOffsets, 0],
      rowDirections: [...p.rowDirections, true],
    })));
    setIsAddSoundModalOpen(false);
  };

  const handleRemoveTrack = (index: number) => {
    setDrumKit(prev => prev.filter((_, i) => i !== index));
    setAllDrumParams(prev => prev.filter((_, i) => i !== index));
    setMutes(prev => prev.filter((_, i) => i !== index));
    setPages(prev => prev.map(p => ({
      ...p,
      grid: p.grid.filter((_, i) => i !== index),
      rowSteps: p.rowSteps.filter((_, i) => i !== index),
      rowSwings: p.rowSwings.filter((_, i) => i !== index),
      swingTargets: p.swingTargets.filter((_, i) => i !== index),
      rowOffsets: p.rowOffsets.filter((_, i) => i !== index),
      rowDirections: p.rowDirections.filter((_, i) => i !== index),
    })));
    
    if (activeEditIndex === index) setActiveEditIndex(null);
    else if (activeEditIndex !== null && activeEditIndex > index) {
      setActiveEditIndex(activeEditIndex - 1);
    }
    if (activeSwingEditRow === index) setActiveSwingEditRow(null);
    else if (activeSwingEditRow !== null && activeSwingEditRow > index) {
      setActiveSwingEditRow(activeSwingEditRow - 1);
    }
    
    setIsRemoveTrackModalOpen(null);
  };

  const handleGenerateAIPattern = useCallback((data: GeneratedPattern) => {
    if (data.bpm) setBpm(data.bpm);
    
    const newKits: DrumKit[] = [];
    const newParams: DrumParams[] = [];
    
    data.tracks.forEach((track, i) => {
      const id = `ai-track-${Date.now()}-${i}`;
      const kit: DrumKit = { 
        id, 
        name: track.kit.name, 
        emoji: track.kit.emoji, 
        synthType: track.kit.synthType,
        midiNote: 60 + i, 
        color: 'bg-indigo-500' 
      };
      newKits.push(kit);
      newParams.push(track.params);

      if (isEngineStarted) {
        audioService.createSynth(id, kit.synthType || 'membrane', {
          envelope: {
            attack: track.params.attack,
            decay: track.params.decay,
            sustain: track.params.sustain,
            release: track.params.release
          }
        });
        audioService.updateParameter(id, 'pitch', track.params.pitch);
      }
    });

    setDrumKit(newKits);
    setAllDrumParams(newParams);
    setMutes(newKits.map(() => false));
    
    setPages(prev => prev.map((p, pIdx) => {
      if (pIdx === activePageIndex) {
        return {
          ...p,
          globalSteps: data.globalSteps,
          grid: data.tracks.map(t => {
            const row = Array(MAX_STEPS).fill(0);
            for(let i=0; i<64; i++) row[i] = t.pattern[i] || 0;
            return row;
          }),
          rowSteps: data.tracks.map(t => t.rowSteps || data.globalSteps),
          rowSwings: data.tracks.map(() => 0),
          swingTargets: newKits.map(() => Array(MAX_STEPS).fill(false).map((_, i) => i % 2 === 1)),
          rowOffsets: data.tracks.map(() => 0),
          rowDirections: data.tracks.map(() => true),
        };
      }
      return {
        ...p,
        grid: newKits.map((_, i) => p.grid[i] || Array(MAX_STEPS).fill(0)),
        rowSteps: newKits.map((_, i) => p.rowSteps[i] || INITIAL_STEPS),
        rowSwings: newKits.map((_, i) => p.rowSwings[i] || 0),
        swingTargets: newKits.map((_, i) => p.swingTargets[i] || Array(MAX_STEPS).fill(false).map((_, idx) => idx % 2 === 1)),
        rowOffsets: newKits.map((_, i) => p.rowOffsets[i] || 0),
        rowDirections: newKits.map((_, i) => p.rowDirections[i] || true),
      };
    }));

    setAbsoluteStep(-1);
    localStepRef.current = 0;
  }, [activePageIndex, isEngineStarted]);

  const handleReset = () => {
    const initialKit = DRUM_KIT;
    const initialPages = [createBlankPage('p1', 'Pattern 1', initialKit.length)];
    const initialParams = initialKit.map(() => ({ pitch: 1, attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }));
    const initialMutes = Array(initialKit.length).fill(false);
    setDrumKit(initialKit);
    setPages(initialPages);
    setActivePageIndex(0);
    setPlayingPageIndex(0);
    setQueuedPageIndex(null);
    setBpm(INITIAL_BPM);
    setVolume(INITIAL_VOLUME);
    setAudioEnabled(true);
    setMidiEnabled(true);
    setAllDrumParams(initialParams);
    setMutes(initialMutes);
    setAbsoluteStep(-1);
    localStepRef.current = 0;
    if (isEngineStarted) {
      audioService.setBPM(INITIAL_BPM);
      audioService.setVolume(INITIAL_VOLUME);
    }
    localStorage.removeItem(STORAGE_KEY);
    setIsResetModalOpen(false);
  };

  const handleRenamePage = (index: number, newName: string) => {
    setPages(prev => prev.map((p, i) => i === index ? { ...p, name: newName } : p));
  };

  const autoLoops = useMemo(() => {
    const activePage = pages[activePageIndex];
    const M = activePage.globalSteps;
    
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const lcm = (a: number, b: number): number => (a === 0 || b === 0) ? 0 : Math.abs(a * b) / gcd(a, b);

    let totalLcm = M;
    let hasActiveTracks = false;

    activePage.rowSteps.forEach((s, idx) => {
      // Only check for triggers within the actual length of the track
      const hasTriggers = activePage.grid[idx].slice(0, s).some(v => v > 0);
      if (hasTriggers) {
        hasActiveTracks = true;
        if (s > 0) {
          totalLcm = lcm(totalLcm, s);
        }
      }
    });

    if (!hasActiveTracks) {
      return { value: 1, disabled: true, reason: "No active tracks found" };
    }

    const loops = totalLcm / M;

    // Limit to 32 loops for safety (browser performance/file size)
    if (loops > 32) {
      return { value: Math.round(loops), disabled: true, reason: `Cycle too long (${Math.round(loops)} loops)` };
    }

    return { value: Math.round(loops), disabled: false };
  }, [pages, activePageIndex]);

  useEffect(() => {
    if (loopMode === 'auto' && !autoLoops.disabled) {
      setLoopsToRecord(autoLoops.value);
    }
  }, [autoLoops, loopMode]);

  const handleDuplicatePage = (index: number) => {
    const source = pages[index];
    const newPage: Page = {
      ...JSON.parse(JSON.stringify(source)),
      id: `p${Date.now()}`,
      name: `${source.name} (Copy)`
    };
    setPages(prev => [...prev, newPage]);
    setActivePageIndex(pages.length);
  };

  const activePage = pages[activePageIndex];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-[#0b1121] text-slate-100 selection:bg-orange-500/30 font-sans">
      {!isEngineStarted && (
        <div className="fixed inset-0 z-[100] bg-[#0b1121]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-orange-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-orange-500/40 mb-8 animate-bounce">
            <Music className="text-white" size={48} />
          </div>
          <h2 className="text-4xl font-black tracking-tight mb-2">COMPUTER RHYTHM</h2>
          <p className="text-slate-400 mb-12 max-w-md">Professional synthesized drum machines & MIDI control.</p>
          <button onClick={handleStartEngine} className="group flex items-center gap-3 px-10 py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-black text-xl transition-all active:scale-95">
            <Power size={24} /> START STUDIO
          </button>
        </div>
      )}

      {isCustomLoopsModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#0b1121]/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black uppercase tracking-widest mb-2">Custom Loops</h3>
            <p className="text-slate-400 text-sm mb-6">Enter the number of loops to record for your export.</p>
            
            <div className="flex flex-col gap-4">
              <input
                type="number"
                min="1"
                max="128"
                value={customLoopsInput}
                onChange={(e) => setCustomLoopsInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xl font-mono text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                autoFocus
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => setIsCustomLoopsModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const val = parseInt(customLoopsInput);
                    if (!isNaN(val) && val > 0) {
                      setLoopsToRecord(val);
                      setIsCustomLoopsModalOpen(false);
                    }
                  }}
                  className="flex-1 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-500/20 transition-all"
                >
                  Set Loops
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isResetModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#0b1121]/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-2">Reset Studio?</h3>
            <p className="text-slate-400 text-sm mb-8">This clears ALL patterns and settings.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsResetModalOpen(false)} className="flex-grow py-3 px-4 bg-slate-800 text-white font-bold rounded-xl">Cancel</button>
              <button onClick={handleReset} className="flex-grow py-3 px-4 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/20">Reset</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#0b1121]/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-2">Remove Pattern?</h3>
            <p className="text-slate-400 text-sm mb-8">Are you sure you want to delete "{pages[isDeleteModalOpen.index].name}"?</p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(null)} className="flex-grow py-3 px-4 bg-slate-800 text-white font-bold rounded-xl">Cancel</button>
              <button onClick={() => {
                const index = isDeleteModalOpen.index;
                const newPages = pages.filter((_, i) => i !== index);
                setPages(newPages);
                if (activePageIndex >= newPages.length) setActivePageIndex(newPages.length - 1);
                if (playingPageIndex === index) setPlayingPageIndex(0);
                if (queuedPageIndex === index) setQueuedPageIndex(null);
                setIsDeleteModalOpen(null);
              }} className="flex-grow py-3 px-4 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/20">Delete</button>
            </div>
          </div>
        </div>
      )}

      {isRemoveTrackModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#0b1121]/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-2xl font-black mb-2">Delete Track?</h3>
            <p className="text-slate-400 text-sm mb-8">Are you sure you want to remove the track "{drumKit[isRemoveTrackModalOpen.index].emoji} {drumKit[isRemoveTrackModalOpen.index].name}"? This will delete its sequences from all patterns.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsRemoveTrackModalOpen(null)} className="flex-grow py-3 px-4 bg-slate-800 text-white font-bold rounded-xl">Cancel</button>
              <button onClick={() => handleRemoveTrack(isRemoveTrackModalOpen.index)} className="flex-grow py-3 px-4 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/20">Remove</button>
            </div>
          </div>
        </div>
      )}

      {isAddSoundModalOpen && (
        <AddSoundModal 
          onClose={() => setIsAddSoundModalOpen(false)}
          onAdd={handleAddSound}
        />
      )}

      <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20"><Music className="text-white" size={28} /></div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white">COMPUTER <span className="text-orange-500">RHYTHM</span></h1>
            <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">Synth & MIDI Environment</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/50 rounded-full animate-pulse">
              <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Recording</span>
            </div>
          )}
          <button 
            onClick={() => setShowHelp(!showHelp)} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showHelp ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            <HelpCircle size={16} /> Quick Help
          </button>
        </div>
      </header>

      <main className="w-full max-w-6xl flex flex-col lg:flex-row gap-8">
        <div className="flex-grow space-y-4 overflow-hidden">
          <HelpPanel isVisible={showHelp} />
          
          <SequencerTabs 
            pages={pages}
            activePageIndex={activePageIndex}
            playingPageIndex={playingPageIndex}
            queuedPageIndex={queuedPageIndex}
            onSelectPage={setActivePageIndex}
            onAddPage={handleAddPage}
            onRemovePage={(i) => setIsDeleteModalOpen({index: i})}
            onQueuePage={setQueuedPageIndex}
            onRenamePage={handleRenamePage}
            onDuplicatePage={handleDuplicatePage}
          />

          <section className="bg-slate-900/40 p-6 md:p-8 rounded-[2.5rem] border border-slate-800/60 shadow-2xl backdrop-blur-sm relative overflow-hidden">
            <SequencerGrid 
              drumKit={drumKit}
              grid={activePage.grid} 
              rowSteps={activePage.rowSteps}
              rowSwings={activePage.rowSwings}
              swingTargets={activePage.swingTargets}
              rowOffsets={activePage.rowOffsets}
              rowDirections={activePage.rowDirections}
              globalSteps={activePage.globalSteps}
              currentStep={playingPageIndex === activePageIndex ? absoluteStep : -1} 
              mutes={mutes}
              onToggleCell={handleToggleCell} 
              onToggleSwingTarget={handleToggleSwingTarget}
              onSetRatchet={handleSetRatchet}
              onSetRowSwing={handleSetRowSwing}
              onMoveCells={handleMoveCells}
              onSetRowOffset={handleSetRowOffset}
              onEditDrum={(i) => { setActiveEditIndex(activeEditIndex === i ? null : i); setActiveSwingEditRow(null); }}
              onToggleMute={handleToggleMute}
              onRemoveTrack={(i) => setIsRemoveTrackModalOpen({index: i})}
              onUpdateRowSteps={handleUpdateRowSteps}
              onUpdateGlobalSteps={handleGlobalStepsChange}
              onToggleRowDirection={handleToggleRowDirection}
              onAddTrack={() => setIsAddSoundModalOpen(true)}
              activeEditIndex={activeEditIndex}
              activeSwingEditRow={activeSwingEditRow}
              onSetSwingEditRow={(i) => { setActiveSwingEditRow(activeSwingEditRow === i ? null : i); setActiveEditIndex(null); }}
            />
          </section>

          <section className="sticky bottom-8 z-20 w-full mt-8 flex flex-col gap-4">
             <Controls 
               isPlaying={isPlaying} bpm={bpm} volume={volume} steps={activePage.globalSteps}
               audioEnabled={audioEnabled} midiEnabled={midiEnabled}
               isRecording={isRecording}
               isExporting={isExporting}
               loopsToRecord={loopsToRecord}
               loopMode={loopMode}
               autoLoops={autoLoops}
               currentLoopCount={currentLoopCount}
               onTogglePlay={handleTogglePlay} onBpmChange={setBpm} onVolumeChange={setVolume}
               onToggleAudio={() => setAudioEnabled(!audioEnabled)} onToggleMidi={() => setMidiEnabled(!midiEnabled)}
               onClear={() => setIsResetModalOpen(true)}
               onStartRecording={handleStartRecording}
               onStopRecording={handleStopRecording}
               onLoopsToRecordChange={(val) => {
                 setLoopsToRecord(val);
                 setLoopMode('custom');
               }}
               onLoopModeChange={setLoopMode}
               onCustomLoopsClick={() => {
                 setCustomLoopsInput(loopsToRecord.toString());
                 setIsCustomLoopsModalOpen(true);
               }}
             />
             {isGeminiEnabled() && (
               <PatternGenerator 
                 isEngineStarted={isEngineStarted}
                 onGenerate={handleGenerateAIPattern}
                 currentBpm={bpm}
                 currentKit={drumKit}
                 currentGrid={activePage.grid}
               />
             )}
          </section>
        </div>

        {activeEditIndex !== null && (
          <aside className="lg:w-80 shrink-0">
            <DrumEditor 
              drum={drumKit[activeEditIndex]}
              params={allDrumParams[activeEditIndex]}
              onClose={() => setActiveEditIndex(null)}
              onChange={(p) => handleUpdateDrumParams(activeEditIndex, p)}
              onDrumUpdate={handleDrumMetadataUpdate}
            />
          </aside>
        )}
      </main>
    </div>
  );
};

export default App;
