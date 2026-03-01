
import React from 'react';
import * as Tone from 'tone';
import { X, Play, Shuffle } from 'lucide-react';
import { DrumKit, DrumParams, SynthType } from '../types';
import SoundDesignerForm, { SYNTH_TYPES } from './SoundDesignerForm';
import { audioService } from '../services/audioService';
import { RANDOM_NAMES, RANDOM_EMOJIS } from '../constants';

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

interface DrumEditorProps {
  drum: DrumKit;
  params: DrumParams;
  onClose: () => void;
  onChange: (newParams: DrumParams) => void;
  onDrumUpdate: (id: string, updates: Partial<DrumKit>) => void;
}

const DrumEditor: React.FC<DrumEditorProps> = ({ drum, params, onClose, onChange, onDrumUpdate }) => {
  const handleTestSound = async () => {
    if (Tone.getContext().state !== 'running') await Tone.start();
    audioService.trigger(drum.id, Tone.now(), { pitch: params.pitch });
  };

  const handleSynthTypeChange = (newType: SynthType) => {
    onDrumUpdate(drum.id, { synthType: newType });
    if (newType === 'sample' && drum.sampleUrl) {
      audioService.createSample(drum.id, drum.sampleUrl);
    } else {
      // Tell audio service to recreate the synth with new type
      audioService.createSynth(drum.id, newType, {
        envelope: {
          attack: params.attack || 0.001,
          decay: params.decay,
          sustain: params.sustain || 0,
          release: params.release || 0.1
        }
      });
    }
    audioService.updateParameter(drum.id, 'pitch', params.pitch);
  };

  const handleSampleUrlChange = (url: string) => {
    onDrumUpdate(drum.id, { sampleUrl: url });
    if (drum.synthType === 'sample') {
      audioService.createSample(drum.id, url);
    }
  };

  const handleRandomize = () => {
    const randomSynth = pickRandom(SYNTH_TYPES).id;
    const randomParams: DrumParams = {
      pitch: Math.round(Math.random() * 200) / 100,
      attack: Math.round((Math.random() * 0.499 + 0.001) * 1000) / 1000,
      decay: Math.round((Math.random() * 1.49 + 0.01) * 100) / 100,
      sustain: Math.round(Math.random() * 100) / 100,
      release: Math.round((Math.random() * 1.99 + 0.01) * 100) / 100,
    };

    const randomName = pickRandom(RANDOM_NAMES);
    const randomEmoji = pickRandom(RANDOM_EMOJIS);

    onDrumUpdate(drum.id, { 
      synthType: randomSynth,
      name: randomName,
      emoji: randomEmoji
    });
    onChange(randomParams);
    
    // Recreate synth for the new type
    audioService.createSynth(drum.id, randomSynth, {
      envelope: {
        attack: randomParams.attack,
        decay: randomParams.decay,
        sustain: randomParams.sustain,
        release: randomParams.release
      }
    });
    audioService.updateParameter(drum.id, 'pitch', randomParams.pitch);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full md:w-80 shadow-2xl animate-in slide-in-from-right-4 duration-200 h-fit max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-lg">{drum.emoji}</div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white leading-none">{drum.name}</h3>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5">Edit Sound</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-slate-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-6">
        <SoundDesignerForm 
          compact
          name={drum.name}
          emoji={drum.emoji}
          synthType={drum.synthType || 'membrane'}
          sampleUrl={drum.sampleUrl}
          params={params}
          onNameChange={(val) => onDrumUpdate(drum.id, { name: val })}
          onEmojiChange={(val) => onDrumUpdate(drum.id, { emoji: val })}
          onSynthTypeChange={handleSynthTypeChange}
          onSampleUrlChange={handleSampleUrlChange}
          onParamsChange={onChange}
        />

        <div className="pt-6 border-t border-slate-800 flex gap-2">
           <button 
            onClick={handleRandomize}
            className="flex-grow py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 border border-slate-700"
            title="Randomize all parameters"
          >
            <Shuffle size={12} /> Randomize
          </button>
           <button 
            onClick={handleTestSound}
            className="flex-grow py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-500/20"
          >
            <Play size={12} fill="currentColor" /> Preview
          </button>
        </div>

        <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
          <p className="text-[9px] text-slate-500 leading-relaxed font-medium">
            Modifications are applied in real-time to the synthesis engine. Custom sounds are saved locally with your project patterns.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DrumEditor;
