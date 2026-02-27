
import React, { useState, useEffect } from 'react';
import * as Tone from 'tone';
import { X, Play } from 'lucide-react';
import { SynthType, DrumKit, DrumParams } from '../types';
import { audioService } from '../services/audioService';
import SoundDesignerForm from './SoundDesignerForm';

interface AddSoundModalProps {
  onClose: () => void;
  onAdd: (kit: DrumKit, params: DrumParams) => void;
}

const RANDOM_NAMES = [
  "Cyber Kick", "Neon Snap", "Void Thud", "Plasma Pop", "Echo Strike", 
  "Pulse Wave", "Ghost Click", "Rust Hit", "Velvet Clap", "Glitch Zap",
  "Solar Flare", "Deep Space", "Quartz Hit", "Carbon Snap", "Ion Blast"
];

const RANDOM_EMOJIS = ["⚡", "🥁", "🔮", "🧨", "🛸", "👾", "🌌", "💎", "🌋", "🌀", "🛰️", "🛸", "☄️", "🌈", "🔥"];

const SYNTH_OPTIONS: SynthType[] = ['membrane', 'noise', 'metal', 'am', 'fm', 'duo'];

const getRandom = (min: number, max: number) => Math.random() * (max - min) + min;
const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const AddSoundModal: React.FC<AddSoundModalProps> = ({ onClose, onAdd }) => {
  // Initialize state with random values
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [synthType, setSynthType] = useState<SynthType>('membrane');
  const [params, setParams] = useState<DrumParams>({
    pitch: 1,
    attack: 0.001,
    decay: 0.2,
    sustain: 0,
    release: 0.1
  });

  // Randomize on mount
  useEffect(() => {
    setName(pickRandom(RANDOM_NAMES));
    setEmoji(pickRandom(RANDOM_EMOJIS));
    setSynthType(pickRandom(SYNTH_OPTIONS));
    setParams({
      pitch: getRandom(0.4, 1.6),
      attack: getRandom(0.001, 0.05),
      decay: getRandom(0.05, 0.6),
      sustain: getRandom(0, 0.4),
      release: getRandom(0.05, 0.8)
    });
  }, []);

  const handleTestSound = async () => {
    if (Tone.getContext().state !== 'running') await Tone.start();
    const tempId = 'temp-preview';
    audioService.createSynth(tempId, synthType, {
      envelope: {
        attack: params.attack,
        decay: params.decay,
        sustain: params.sustain,
        release: params.release
      }
    });
    // Apply parameters before triggering
    audioService.updateParameter(tempId, 'pitch', params.pitch);
    audioService.trigger(tempId, Tone.now(), { pitch: params.pitch });
  };

  const handleAdd = () => {
    const id = `custom-${Date.now()}`;
    const newKit: DrumKit = {
      id,
      name,
      emoji,
      midiNote: 60,
      color: 'bg-orange-400',
      synthType
    };
    onAdd(newKit, params);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0b1121]/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700/50 rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-blue-500" />
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Create New Sound</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Professional Synth Architect</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <SoundDesignerForm 
            name={name}
            emoji={emoji}
            synthType={synthType}
            params={params}
            onNameChange={setName}
            onEmojiChange={setEmoji}
            onSynthTypeChange={setSynthType}
            onParamsChange={setParams}
          />

          <div className="space-y-6 pt-4">
            <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-3xl space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Preview Output</h4>
              <button 
                onClick={handleTestSound}
                className="w-full py-6 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex flex-col items-center justify-center gap-3 transition-all active:scale-95 border border-slate-700 group"
              >
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                   <Play size={20} fill="currentColor" />
                </div>
                Trigger Hit
              </button>
            </div>

            <button 
              onClick={handleAdd}
              className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 transition-all active:scale-95"
            >
              Add To Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSoundModal;
