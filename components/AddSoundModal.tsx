
import React, { useState, useEffect } from 'react';
import * as Tone from 'tone';
import { X, Play, Shuffle } from 'lucide-react';
import { SynthType, DrumKit, DrumParams } from '../types';
import { audioService } from '../services/audioService';
import SoundDesignerForm, { SYNTH_TYPES } from './SoundDesignerForm';
import { RANDOM_NAMES, RANDOM_EMOJIS } from '../constants';

interface AddSoundModalProps {
  onClose: () => void;
  onAdd: (kit: DrumKit, params: DrumParams) => void;
}

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandom = (min: number, max: number) => Math.random() * (max - min) + min;

const AddSoundModal: React.FC<AddSoundModalProps> = ({ onClose, onAdd }) => {
  // Initialize state with random values
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [synthType, setSynthType] = useState<SynthType>('membrane');
  const [sampleUrl, setSampleUrl] = useState<string | undefined>();
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
    setSynthType(pickRandom(SYNTH_TYPES).id);
    setParams({
      pitch: getRandom(0.4, 1.6),
      attack: getRandom(0.001, 0.05),
      decay: getRandom(0.05, 0.6),
      sustain: getRandom(0, 0.4),
      release: getRandom(0.05, 0.8),
      reverb: Math.random() < 0.2 ? getRandom(0, 0.4) : 0,
      delay: Math.random() < 0.1 ? getRandom(0, 0.3) : 0,
      distortion: Math.random() < 0.1 ? getRandom(0, 0.5) : 0,
      bitcrush: Math.random() < 0.05 ? getRandom(0, 0.4) : 0,
      filterCutoff: Math.random() < 0.2 ? getRandom(0.2, 1) : 1
    });
  }, []);

  const handleTestSound = async () => {
    if (Tone.getContext().state !== 'running') await Tone.start();
    const tempId = 'temp-preview';
    
    if (synthType === 'sample' && sampleUrl) {
      await audioService.createSample(tempId, sampleUrl);
    } else {
      audioService.createSynth(tempId, synthType, {
        envelope: {
          attack: params.attack,
          decay: params.decay,
          sustain: params.sustain,
          release: params.release
        }
      });
    }
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
      synthType,
      sampleUrl
    };
    onAdd(newKit, params);
  };

  const handleRandomize = () => {
    setName(pickRandom(RANDOM_NAMES));
    setEmoji(pickRandom(RANDOM_EMOJIS));
    setSynthType(pickRandom(SYNTH_TYPES).id);
    setParams({
      pitch: Math.round(getRandom(0.4, 1.6) * 100) / 100,
      attack: Math.round(getRandom(0.001, 0.05) * 1000) / 1000,
      decay: Math.round(getRandom(0.05, 0.6) * 100) / 100,
      sustain: Math.round(getRandom(0, 0.4) * 100) / 100,
      release: Math.round(getRandom(0.05, 0.8) * 100) / 100,
      reverb: Math.random() < 0.2 ? Math.round(getRandom(0, 0.4) * 100) / 100 : 0,
      delay: Math.random() < 0.1 ? Math.round(getRandom(0, 0.3) * 100) / 100 : 0,
      distortion: Math.random() < 0.1 ? Math.round(getRandom(0, 0.5) * 100) / 100 : 0,
      bitcrush: Math.random() < 0.05 ? Math.round(getRandom(0, 0.4) * 100) / 100 : 0,
      filterCutoff: Math.random() < 0.2 ? Math.round(getRandom(0.2, 1) * 100) / 100 : 1
    });
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
            sampleUrl={sampleUrl}
            params={params}
            onNameChange={setName}
            onEmojiChange={setEmoji}
            onSynthTypeChange={setSynthType}
            onSampleUrlChange={setSampleUrl}
            onParamsChange={setParams}
          />

          <div className="space-y-6 pt-4">
            <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-3xl space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Preview & Tools</h4>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleRandomize}
                  className="py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border border-slate-700 group"
                >
                  <Shuffle size={16} />
                  Randomize
                </button>
                <button 
                  onClick={handleTestSound}
                  className="py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border border-slate-700 group"
                >
                  <Play size={16} fill="currentColor" />
                  Trigger
                </button>
              </div>
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
