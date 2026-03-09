
export class MidiService {
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

  /**
   * Send a note using hardware-scheduled Web MIDI API timestamps.
   * This is far more precise than setTimeout and keeps MIDI in sync
   * with the Web Audio engine.
   *
   * @param note - MIDI note number (0–127)
   * @param velocity - MIDI velocity (0–127)
   * @param channel - MIDI channel (0–15)
   * @param timestamp - DOMHighResTimeStamp from performance.now() for when
   *   the note should fire. If undefined, the note is sent immediately.
   */
  sendNoteOnAt(note: number, velocity: number = 100, channel: number = 0, timestamp?: number) {
    if (this.outputs.length === 0) return;

    const noteOnMessage = [0x90 + channel, note, velocity];
    const noteOffMessage = [0x80 + channel, note, 0];
    const noteOffTimestamp = timestamp !== undefined ? timestamp + 50 : undefined;

    this.outputs.forEach(output => {
      output.send(noteOnMessage, timestamp);
      output.send(noteOffMessage, noteOffTimestamp);
    });
  }

  /** Convenience wrapper: send note immediately (no scheduling). */
  sendNoteOn(note: number, velocity: number = 100, channel: number = 0) {
    this.sendNoteOnAt(note, velocity, channel, undefined);
  }
}

export const midiService = new MidiService();
