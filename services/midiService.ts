
class MidiService {
  private midiAccess: MIDIAccess | null = null;
  private outputs: MIDIOutput[] = [];

  constructor() {
    this.init();
  }

  async init() {
    if (typeof navigator.requestMIDIAccess === 'function') {
      try {
        this.midiAccess = await navigator.requestMIDIAccess();
        this.updateOutputs();
        this.midiAccess.onstatechange = () => this.updateOutputs();
      } catch (e) {
        console.warn('MIDI not supported or access denied');
      }
    }
  }

  private updateOutputs() {
    if (!this.midiAccess) return;
    this.outputs = Array.from(this.midiAccess.outputs.values());
  }

  sendNoteOn(note: number, velocity: number = 100, channel: number = 0, time?: number) {
    if (this.outputs.length === 0) return;
    
    const noteOnMessage = [0x90 + channel, note, velocity];
    const noteOffMessage = [0x80 + channel, note, 0];
    
    // MIDI timing uses performance.now() based timestamps in milliseconds
    const timestamp = time || 0;

    this.outputs.forEach(output => {
      output.send(noteOnMessage, timestamp);
      // Send Note Off shortly after (e.g., 50ms later)
      output.send(noteOffMessage, timestamp + 50);
    });
  }
}

export const midiService = new MidiService();
