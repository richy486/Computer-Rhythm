
import React, { useState } from 'react';
import { Sparkles, Loader2, Music2, AlertCircle } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { DrumKit, DrumParams, SynthType } from '../types';

interface PatternGeneratorProps {
  onGenerate: (data: GeneratedPattern) => void;
  isEngineStarted: boolean;
  currentBpm: number;
  currentKit: DrumKit[];
  currentGrid: number[][];
}

export interface GeneratedPattern {
  bpm?: number;
  globalSteps: number;
  tracks: {
    kit: {
      name: string;
      emoji: string;
      synthType: SynthType;
    };
    params: DrumParams;
    pattern: number[]; 
    rowSteps: number;
  }[];
}

const PatternGenerator: React.FC<PatternGeneratorProps> = ({ 
  onGenerate, 
  isEngineStarted, 
  currentBpm,
  currentKit,
  currentGrid
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating || !isEngineStarted) return;
    
    setIsGenerating(true);
    setError(null);
    setStatus('Analyzing style...');

    try {
      const apiKey = (typeof process !== 'undefined' ? (process.env.GEMINI_API_KEY || process.env.API_KEY) : null) || (import.meta as any).env?.VITE_GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      const statusUpdates = [
        'Evaluating existing kit...',
        'Syncing rhythmic context...',
        'Generating new sequences...',
        'Perfecting the groove...'
      ];
      
      let statusIdx = 0;
      const interval = setInterval(() => {
        if (statusIdx < statusUpdates.length) {
          setStatus(statusUpdates[statusIdx]);
          statusIdx++;
        }
      }, 800);

      const context = {
        kit: currentKit.map(k => ({ name: k.name, emoji: k.emoji, type: k.synthType })),
        activePatternSnippet: currentGrid.map(row => row.slice(0, 16))
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: `Description: "${prompt}"\n\nCurrent Context: ${JSON.stringify(context)}\nCurrent BPM: ${currentBpm}`,
        config: {
          systemInstruction: `You are an expert Music Producer. 
          Generate a JSON object for a drum machine pattern.
          
          CRITICAL RULES:
          1. Respect Existing Work: If the current kit already has sounds, try to map your new rhythm to those existing sounds where appropriate. 
          2. Non-Destructive: Your response will update the GLOBAL kit. Try to keep the total track count under 10.
          3. 'tracks' array:
             - If you reuse a sound from the context, keep its 'name' and 'emoji' similar.
             - 'pattern': EXACTLY 64 integers (0: rest, 1: hit, 2+: ratchet).
          4. Technical:
             - 'globalSteps': Usually 16, 32, or 48.
             - 'synthType': membrane, noise, metal, am, fm, duo.
             - 'params': ADSR and pitch (0.1 to 2.0).`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bpm: { type: Type.NUMBER },
              globalSteps: { type: Type.INTEGER },
              tracks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    kit: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        emoji: { type: Type.STRING },
                        synthType: { type: Type.STRING, enum: ['membrane', 'noise', 'metal', 'am', 'fm', 'duo'] }
                      },
                      required: ["name", "emoji", "synthType"]
                    },
                    params: {
                      type: Type.OBJECT,
                      properties: {
                        pitch: { type: Type.NUMBER },
                        attack: { type: Type.NUMBER },
                        decay: { type: Type.NUMBER },
                        sustain: { type: Type.NUMBER },
                        release: { type: Type.NUMBER }
                      },
                      required: ["pitch", "attack", "decay", "sustain", "release"]
                    },
                    pattern: { 
                      type: Type.ARRAY, 
                      items: { type: Type.INTEGER }
                    },
                    rowSteps: { type: Type.INTEGER }
                  },
                  required: ["kit", "params", "pattern", "rowSteps"]
                }
              }
            },
            required: ["globalSteps", "tracks"]
          }
        }
      });

      clearInterval(interval);
      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      
      const result = JSON.parse(text) as GeneratedPattern;
      onGenerate(result);
      setPrompt('');
      setStatus('');
    } catch (err: any) {
      console.error("AI Pattern Generation Error:", err);
      setError(err.message || "Failed to generate pattern.");
      setStatus('');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-4 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative bg-slate-900/90 border border-slate-700/50 rounded-[2rem] p-4 md:p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-shrink-0 flex items-center gap-3 px-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 ${isGenerating ? 'bg-indigo-600 animate-pulse' : 'bg-indigo-500 shadow-indigo-500/20'}`}>
                {isGenerating ? <Loader2 className="text-white animate-spin" size={20} /> : <Music2 className="text-white" size={20} />}
              </div>
              <div className="hidden md:block">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">AI Composer</h3>
                <p className="text-[8px] font-bold text-slate-500 uppercase">Intelligent Sequence Generation</p>
              </div>
            </div>

            <div className="flex-grow w-full relative">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating || !isEngineStarted}
                placeholder={isEngineStarted ? "e.g., 'Add a deep sub kick' or 'Complex glitchy variations'..." : "Start engine to use AI composer..."}
                className={`w-full bg-slate-950/50 border rounded-2xl py-4 px-6 text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all font-medium pr-12 ${error ? 'border-red-500/50' : 'border-slate-800 focus:border-indigo-500/50'}`}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>
            
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || !isEngineStarted}
              className={`hidden md:flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                isGenerating || !prompt.trim() || !isEngineStarted
                ? 'bg-slate-800 text-slate-600'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20 active:scale-95'
              }`}
            >
              Generate Rhythm
            </button>
          </div>
          
          {isGenerating && (
            <div className="mt-4 px-6 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <Loader2 className="text-indigo-400 animate-spin" size={14} />
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] animate-pulse">
                {status}
              </span>
            </div>
          )}

          {error && (
            <div className="mt-4 px-6 flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-widest animate-in slide-in-from-top-1">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatternGenerator;
