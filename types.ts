
export type SynthType = 'membrane' | 'noise' | 'metal' | 'am' | 'fm' | 'duo' | 'sample';

export interface DrumKit {
  id: string;
  name: string;
  emoji: string;
  midiNote: number;
  color: string;
  synthType?: SynthType;
  sampleUrl?: string;
}

export interface DrumParams {
  pitch: number; 
  decay: number;
  attack?: number;
  sustain?: number;
  release?: number;
  // Effects
  reverb?: number;
  delay?: number;
  distortion?: number;
  bitcrush?: number;
  filterCutoff?: number;
}

export type SequencerGrid = number[][]; 

export interface Page {
  id: string;
  name: string;
  grid: SequencerGrid;
  rowSteps: number[];
  rowSwings: number[];
  swingTargets: boolean[][]; // Per-step swing activation
  rowOffsets: number[];
  rowDirections: boolean[];
  globalSteps: number;
}

export interface ProjectState {
  version: string;
  bpm: number;
  volume: number;
  audioEnabled: boolean;
  midiEnabled: boolean;
  activePageIndex: number;
  pages: Page[];
  drumParams: DrumParams[];
  mutes: boolean[];
  customKit?: DrumKit[];
}
