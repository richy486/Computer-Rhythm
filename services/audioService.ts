
import * as Tone from 'tone';
import { SynthType } from '../types';

class AudioService {
  // Use 'any' as 'Tone.Instrument' is not exported as a member in some Tone.js versions/builds
  private synths: Record<string, any> = {};
  private effectChains: Record<string, {
    reverb: Tone.Reverb;
    delay: Tone.FeedbackDelay;
    distortion: Tone.Distortion;
    bitcrusher: Tone.BitCrusher;
    filter: Tone.Filter;
    output: Tone.Gain;
  }> = {};
  private initialized = false;
  private mainOutput: Tone.Gain | null = null;
  private recorder: Tone.Recorder | null = null;

  async init() {
    if (this.initialized) return;

    await Tone.start();
    this.recorder = new Tone.Recorder();
    this.mainOutput = new Tone.Gain(1).toDestination();
    this.mainOutput.connect(this.recorder);

    // Initialize Default Kit
    this.createSynth('kick', 'membrane', { pitchDecay: 0.05, octaves: 6 });
    this.createSynth('snare', 'noise', { noise: { type: 'white' } });
    this.createSynth('hh-closed', 'metal', { frequency: 250, resonance: 6000 });
    this.createSynth('hh-open', 'metal', { frequency: 250, resonance: 6000 });
    this.createSynth('clap', 'noise', { noise: { type: 'pink' } });
    this.createSynth('tom-high', 'membrane', { volume: -4 });
    this.createSynth('tom-mid', 'membrane', { volume: -4 });
    this.createSynth('tom-low', 'membrane', { volume: -4 });

    this.initialized = true;
  }

  async createSample(id: string, url: string) {
    if (this.synths[id]) {
      this.synths[id].dispose();
    }

    const chain = this.getOrCreateChain(id);

    return new Promise<void>((resolve, reject) => {
      const player = new Tone.Player({
        url: url,
        autostart: false,
        onload: () => {
          player.connect(chain.filter);
          this.synths[id] = player;
          resolve();
        },
        onerror: (err) => {
          console.error(`Failed to load sample for ${id}:`, err);
          reject(err);
        }
      });
    });
  }

  private getOrCreateChain(id: string) {
    if (this.effectChains[id]) return this.effectChains[id];

    const reverb = new Tone.Reverb({ decay: 1.5 });
    reverb.wet.value = 0;
    const delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.3 });
    delay.wet.value = 0;
    const distortion = new Tone.Distortion({ distortion: 0.4 });
    distortion.wet.value = 0;
    const bitcrusher = new Tone.BitCrusher({ bits: 8 });
    bitcrusher.wet.value = 0;
    const filter = new Tone.Filter({ type: 'lowpass', frequency: 20000 });
    const output = new Tone.Gain(1);

    // Chain: Filter -> BitCrusher -> Distortion -> Delay -> Reverb -> Output
    filter.connect(bitcrusher);
    bitcrusher.connect(distortion);
    distortion.connect(delay);
    delay.connect(reverb);
    reverb.connect(output);

    if (this.mainOutput) {
      output.connect(this.mainOutput);
    }

    this.effectChains[id] = { reverb, delay, distortion, bitcrusher, filter, output };
    return this.effectChains[id];
  }

  createSynth(id: string, type: SynthType, options: any = {}) {
    if (this.synths[id]) {
      this.synths[id].dispose();
    }

    const chain = this.getOrCreateChain(id);

    // Use 'any' as 'Tone.Instrument' is not exported as a member in some Tone.js versions/builds
    let synth: any;

    switch (type) {
      case 'membrane':
        synth = new Tone.MembraneSynth(options);
        break;
      case 'noise':
        synth = new Tone.NoiseSynth(options);
        break;
      case 'metal':
        synth = new Tone.MetalSynth(options);
        break;
      case 'am':
        synth = new Tone.AMSynth(options);
        break;
      case 'fm':
        synth = new Tone.FMSynth(options);
        break;
      case 'duo':
        synth = new Tone.DuoSynth(options);
        break;
      case 'sample':
        // For samples, we use createSample which is async. 
        // This is a fallback if called synchronously.
        synth = new Tone.MembraneSynth(options);
        break;
      default:
        synth = new Tone.MembraneSynth(options);
    }

    synth.connect(chain.filter);
    this.synths[id] = synth;
    return synth;
  }

  updateParameter(id: string, param: string, value: number) {
    const synth = this.synths[id];
    if (!synth) return;

    if (param === 'decay' && 'envelope' in synth) {
      synth.envelope.decay = Math.max(0.001, value);
    } else if (param === 'attack' && 'envelope' in synth) {
      synth.envelope.attack = Math.max(0.001, value);
    } else if (param === 'sustain' && 'envelope' in synth) {
      synth.envelope.sustain = value;
    } else if (param === 'release' && 'envelope' in synth) {
      synth.envelope.release = Math.max(0.001, value);
    } else if (param === 'pitch') {
      if (synth instanceof Tone.MetalSynth) {
        synth.frequency.value = 50 + (value * 975);
      } else if (synth instanceof Tone.MembraneSynth) {
        synth.octaves = 0.5 + (value * 7.5);
      } else if (synth instanceof Tone.Player) {
        // For Player, pitch can be simulated with playbackRate
        synth.playbackRate = 0.5 + (value * 1.5);
      } else if ('frequency' in synth && synth.frequency instanceof Tone.Signal) {
        synth.frequency.value = 40 + (value * 2000);
      }
    } else if (param === 'reverb') {
      const chain = this.effectChains[id];
      if (chain) chain.reverb.wet.value = value;
    } else if (param === 'delay') {
      const chain = this.effectChains[id];
      if (chain) chain.delay.wet.value = value;
    } else if (param === 'distortion') {
      const chain = this.effectChains[id];
      if (chain) chain.distortion.wet.value = value;
    } else if (param === 'bitcrush') {
      const chain = this.effectChains[id];
      if (chain) {
        chain.bitcrusher.wet.value = value > 0 ? 1 : 0;
        if (value > 0) {
          // Map 0-1 to 8-1 bits (lower is more crushed)
          chain.bitcrusher.bits.value = Math.max(1, Math.floor(8 - (value * 7)));
        }
      }
    } else if (param === 'filterCutoff') {
      const chain = this.effectChains[id];
      if (chain) {
        // Map 0-1 to 100Hz - 20000Hz
        chain.filter.frequency.value = 100 + (Math.pow(value, 2) * 19900);
      }
    }
  }

  trigger(id: string, time?: number, params?: { pitch: number, ratchet?: number }) {
    if (!this.initialized) return;
    const synth = this.synths[id];
    if (!synth) return;

    const actualTime = time ?? Tone.now();
    const ratchet = params?.ratchet || 1;
    const pitchVal = params?.pitch || 1;
    const stepDuration = Tone.Time("16n").toSeconds();
    const interval = stepDuration / ratchet;

    for (let i = 0; i < ratchet; i++) {
      const hitTime = actualTime + (i * interval);
      
      if (synth instanceof Tone.MembraneSynth) {
        const freq = 30 + (pitchVal * 120); 
        synth.triggerAttackRelease(freq, '8n', hitTime);
      } 
      else if (synth instanceof Tone.NoiseSynth) {
        synth.triggerAttackRelease('16n', hitTime);
      }
      else if (synth instanceof Tone.MetalSynth) {
        synth.triggerAttackRelease('32n', hitTime);
      }
      else if (synth instanceof Tone.Player) {
        synth.start(hitTime);
      }
      // Use property check instead of 'instanceof Tone.Monophonic' as it is not exported as a member
      else if (synth && 'frequency' in synth && typeof synth.triggerAttackRelease === 'function') {
        const freq = 40 + (pitchVal * 440);
        synth.triggerAttackRelease(freq, '16n', hitTime);
      }
    }
  }

  setBPM(bpm: number) {
    Tone.getTransport().bpm.value = bpm;
  }

  setVolume(db: number) {
    if (this.mainOutput) {
      this.mainOutput.gain.rampTo(Tone.dbToGain(db), 0.1);
    }
  }

  startRecording() {
    if (this.recorder) {
      this.recorder.start();
    }
  }

  async stopRecording() {
    if (!this.recorder) return null;
    
    try {
      const blob = await this.recorder.stop();
      const arrayBuffer = await blob.arrayBuffer();
      
      // Use the Tone.js context to decode the recorded data
      const audioCtx = Tone.getContext().rawContext;
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      // Convert the AudioBuffer to a proper WAV blob
      return this.audioBufferToWav(audioBuffer);
    } catch (e) {
      console.error("Failed to convert recording to WAV:", e);
      return null;
    }
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // write WAVE header
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"

    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // length = 16
    setUint16(1);                                  // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);  // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit

    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    // write interleaved data
    for (i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {             // interleave channels
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF); // scale to 16-bit signed int
        view.setInt16(pos, sample, true);          // write 16-bit sample
        pos += 2;
      }
      offset++;                                     // next source sample
    }

    return new Blob([bufferArr], { type: "audio/wav" });
  }
}

export const audioService = new AudioService();
