
import React, { useState } from 'react';
import { Music, Waves, Activity, Zap, Layers, Sparkles, Loader2, Info } from 'lucide-react';
import { SynthType, DrumParams, DrumKit } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { isGeminiEnabled } from '../src/utils/featureFlags';

export const SYNTH_TYPES: { id: SynthType; name: string; icon: any }[] = [
  { id: 'membrane', name: 'Membrane', icon: Activity },
  { id: 'noise', name: 'Noise', icon: Zap },
  { id: 'metal', name: 'Metal', icon: Waves },
  { id: 'fm', name: 'FM', icon: Layers },
  { id: 'am', name: 'AM', icon: Layers },
  { id: 'duo', name: 'Duo', icon: Music },
];

interface SoundDesignerFormProps {
  name: string;
  emoji: string;
  synthType: SynthType;
  params: DrumParams;
  onNameChange: (val: string) => void;
  onEmojiChange: (val: string) => void;
  onSynthTypeChange: (val: SynthType) => void;
  onParamsChange: (params: DrumParams) => void;
  compact?: boolean;
}

const SoundDesignerForm: React.FC<SoundDesignerFormProps> = ({
  name,
  emoji,
  synthType,
  params,
  onNameChange,
  onEmojiChange,
  onSynthTypeChange,
  onParamsChange,
  compact = false
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const updateParam = (key: keyof DrumParams, val: number) => {
    onParamsChange({ ...params, [key]: val });
  };

  const handleGeminiGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    try {
      const apiKey = (typeof process !== 'undefined' ? (process.env.GEMINI_API_KEY || process.env.API_KEY) : null) || (import.meta as any).env?.VITE_GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      const currentContext = {
        name,
        emoji,
        synthType,
        params
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: `Description: ${prompt}\n\nCurrent State (use this for relative edits if the description suggests refinement): ${JSON.stringify(currentContext)}`,
        config: {
          systemInstruction: `You are a professional audio engineer and synthesizer expert. Your task is to translate natural language descriptions of drum and percussion sounds into synthesis parameters for a digital drum machine.
          
          Guidelines:
          1. Choose the most appropriate 'synthType':
             - 'membrane': For round, percussive hits like kicks, toms, or woodblocks.
             - 'noise': For snares, claps, or wind-like sweeps.
             - 'metal': For high-frequency, metallic sounds like hi-hats, cymbals, or bells.
             - 'fm'/'am'/'duo': For complex, tonal, or aggressive electronic textures.
          2. Map descriptors to ADSR (Attack, Decay, Sustain, Release) and Pitch:
             - "Punchy" means very fast Attack and short Decay.
             - "Ethereal" means longer Attack and longer Release.
             - "Bass" means lowering the Pitch parameter.
          3. Always return a creative but fitting 'name' and 'emoji'.
          4. If the user provides a current state, make subtle relative adjustments unless they ask for something entirely new.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "A creative name for the sound" },
              emoji: { type: Type.STRING, description: "A single fitting emoji" },
              synthType: { 
                type: Type.STRING, 
                enum: ['membrane', 'noise', 'metal', 'am', 'fm', 'duo'],
                description: "The synthesis engine type" 
              },
              params: {
                type: Type.OBJECT,
                properties: {
                  pitch: { type: Type.NUMBER, description: "Value from 0.0 to 2.0" },
                  attack: { type: Type.NUMBER, description: "Value from 0.001 to 0.5" },
                  decay: { type: Type.NUMBER, description: "Value from 0.01 to 1.5" },
                  sustain: { type: Type.NUMBER, description: "Value from 0.0 to 1.0" },
                  release: { type: Type.NUMBER, description: "Value from 0.01 to 2.0" }
                },
                required: ["pitch", "attack", "decay", "sustain", "release"]
              }
            },
            required: ["name", "emoji", "synthType", "params"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      
      onNameChange(result.name);
      onEmojiChange(result.emoji);
      onSynthTypeChange(result.synthType);
      onParamsChange(result.params);
      setPrompt(''); // Clear prompt after success
    } catch (error) {
      console.error("Gemini AI error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`space-y-6 ${compact ? 'max-w-full' : ''}`}>
      {/* Gemini AI Assistant Section */}
      {isGeminiEnabled() && (
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
          <div className="relative bg-slate-900/80 border border-slate-700/50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={12} className={isGenerating ? 'animate-spin' : ''} /> 
                Gemini AI Sound Designer
              </label>
              <div className="group/info relative">
                <Info size={12} className="text-slate-600 hover:text-slate-400 cursor-help" />
                <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-slate-800 text-[8px] text-slate-400 rounded-lg opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-slate-700">
                  Describe a sound like "Lo-fi jazz snare" or "Deep orbital kick". Use "more bass" or "sharper" for refinements.
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={compact ? "Describe refinement..." : "Describe a new sound from scratch..."}
                className="flex-grow h-16 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all resize-none font-medium"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGeminiGenerate();
                  }
                }}
              />
              <button
                onClick={handleGeminiGenerate}
                disabled={isGenerating || !prompt.trim()}
                className={`w-12 h-16 rounded-xl flex items-center justify-center transition-all ${
                  isGenerating || !prompt.trim() 
                  ? 'bg-slate-800 text-slate-600' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95'
                }`}
              >
                {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {isGeminiEnabled() && <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />}

      {/* Identity Row */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name & Emoji</label>
        <div className="flex gap-2">
          <input 
            value={emoji} 
            onChange={e => onEmojiChange(e.target.value)}
            className="w-12 h-10 bg-slate-800 border border-slate-700 rounded-lg text-center text-lg focus:border-orange-500 outline-none transition-all"
          />
          <input 
            value={name} 
            onChange={e => onNameChange(e.target.value)}
            className="flex-grow h-10 bg-slate-800 border border-slate-700 rounded-lg px-3 text-sm font-bold focus:border-orange-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Synth Engine Selection */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Engine</label>
        <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-3'} gap-1.5`}>
          {SYNTH_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => onSynthTypeChange(type.id)}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-[9px] font-black uppercase transition-all ${synthType === type.id ? 'bg-orange-500 border-orange-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
            >
              <type.icon size={12} />
              <span className="truncate">{type.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Controls Grid */}
      <div className="space-y-4">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Synthesis Parameters</label>
        
        <div className="space-y-3">
          {/* Pitch */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-orange-400 uppercase">
              <span>Pitch / Tone</span> 
              <span>{Math.round(params.pitch * 100)}%</span>
            </div>
            <input type="range" min="0" max="2" step="0.01" value={params.pitch} onChange={e => updateParam('pitch', parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-orange-500" />
          </div>

          {/* ADSR Controls */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-400 uppercase">
                <span>Attack</span> 
                <span>{params.attack?.toFixed(3)}s</span>
              </div>
              <input type="range" min="0.001" max="0.5" step="0.001" value={params.attack} onChange={e => updateParam('attack', parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-slate-400" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-400 uppercase">
                <span>Decay</span> 
                <span>{params.decay.toFixed(2)}s</span>
              </div>
              <input type="range" min="0.01" max="1.5" step="0.01" value={params.decay} onChange={e => updateParam('decay', parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-slate-400" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-400 uppercase">
                <span>Sustain</span> 
                <span>{params.sustain?.toFixed(2)}</span>
              </div>
              <input type="range" min="0" max="1" step="0.01" value={params.sustain} onChange={e => updateParam('sustain', parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-slate-400" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-400 uppercase">
                <span>Release</span> 
                <span>{params.release?.toFixed(2)}s</span>
              </div>
              <input type="range" min="0.01" max="2" step="0.01" value={params.release} onChange={e => updateParam('release', parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoundDesignerForm;
