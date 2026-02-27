
import { DrumKit } from './types';

export const INITIAL_STEPS = 16;
export const MIN_STEPS = 1;
export const MAX_STEPS = 64;
export const ROWS = 8;

export const DRUM_KIT: DrumKit[] = [
  { id: 'kick', name: 'Kick', emoji: '🥁', midiNote: 36, color: 'bg-orange-500' },
  { id: 'snare', name: 'Snare', emoji: '🥢', midiNote: 38, color: 'bg-orange-400' },
  { id: 'hh-closed', name: 'Closed Hat', emoji: '💿', midiNote: 42, color: 'bg-orange-300' },
  { id: 'hh-open', name: 'Open Hat', emoji: '✨', midiNote: 46, color: 'bg-orange-300' },
  { id: 'clap', name: 'Clap', emoji: '👏', midiNote: 39, color: 'bg-orange-200' },
  { id: 'tom-high', name: 'High Tom', emoji: '🔵', midiNote: 50, color: 'bg-orange-400' },
  { id: 'tom-mid', name: 'Mid Tom', emoji: '🟢', midiNote: 47, color: 'bg-orange-500' },
  { id: 'tom-low', name: 'Low Tom', emoji: '🔴', midiNote: 43, color: 'bg-orange-600' },
];

export const INITIAL_BPM = 120;
export const INITIAL_VOLUME = -12; // dB
