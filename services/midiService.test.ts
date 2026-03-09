import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MidiService } from './midiService';

// Factory that creates a mock MIDIOutput and a fresh MidiService wired to it.
async function createServiceWithMockOutput() {
  const mockSend = vi.fn();
  const mockOutput = { send: mockSend };
  const mockMidiAccess = {
    outputs: new Map([['output1', mockOutput]]),
    onstatechange: null as any,
  };
  vi.stubGlobal('navigator', {
    requestMIDIAccess: vi.fn().mockResolvedValue(mockMidiAccess),
  });
  const service = new MidiService();
  await service.init();
  return { service, mockSend, mockOutput };
}

describe('MidiService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('sendNoteOnAt', () => {
    it('sends note-on with the provided performance timestamp', async () => {
      const { service, mockSend } = await createServiceWithMockOutput();
      service.sendNoteOnAt(60, 100, 0, 5350);
      expect(mockSend).toHaveBeenCalledWith([0x90, 60, 100], 5350);
    });

    it('sends note-off exactly 50ms after the note-on timestamp', async () => {
      const { service, mockSend } = await createServiceWithMockOutput();
      service.sendNoteOnAt(60, 100, 0, 5350);
      expect(mockSend).toHaveBeenCalledWith([0x80, 60, 0], 5400);
    });

    it('sends without timestamp when undefined (immediate send)', async () => {
      const { service, mockSend } = await createServiceWithMockOutput();
      service.sendNoteOnAt(60, 100, 0, undefined);
      expect(mockSend).toHaveBeenCalledWith([0x90, 60, 100], undefined);
      expect(mockSend).toHaveBeenCalledWith([0x80, 60, 0], undefined);
    });

    it('encodes the MIDI channel correctly in the status byte', async () => {
      const { service, mockSend } = await createServiceWithMockOutput();
      // Channel 9 (0-indexed) → status byte 0x90 + 9 = 0x99
      service.sendNoteOnAt(36, 100, 9, 5000);
      expect(mockSend).toHaveBeenCalledWith([0x99, 36, 100], 5000);
    });

    it('encodes velocity in the message', async () => {
      const { service, mockSend } = await createServiceWithMockOutput();
      service.sendNoteOnAt(60, 80, 0, 5000);
      expect(mockSend).toHaveBeenCalledWith([0x90, 60, 80], 5000);
    });

    it('sends to all connected outputs', async () => {
      const mockSend1 = vi.fn();
      const mockSend2 = vi.fn();
      const mockMidiAccess = {
        outputs: new Map([
          ['out1', { send: mockSend1 }],
          ['out2', { send: mockSend2 }],
        ]),
        onstatechange: null as any,
      };
      vi.stubGlobal('navigator', {
        requestMIDIAccess: vi.fn().mockResolvedValue(mockMidiAccess),
      });
      const service = new MidiService();
      await service.init();

      service.sendNoteOnAt(60, 100, 0, 5000);

      expect(mockSend1).toHaveBeenCalledWith([0x90, 60, 100], 5000);
      expect(mockSend2).toHaveBeenCalledWith([0x90, 60, 100], 5000);
    });

    it('does nothing when no outputs are connected', async () => {
      const mockMidiAccess = {
        outputs: new Map(),
        onstatechange: null as any,
      };
      vi.stubGlobal('navigator', {
        requestMIDIAccess: vi.fn().mockResolvedValue(mockMidiAccess),
      });
      const service = new MidiService();
      await service.init();
      // Should not throw
      expect(() => service.sendNoteOnAt(60, 100, 0, 5000)).not.toThrow();
    });
  });

  describe('sendNoteOn (immediate convenience wrapper)', () => {
    it('delegates to sendNoteOnAt with undefined timestamp', async () => {
      const { service } = await createServiceWithMockOutput();
      const spy = vi.spyOn(service, 'sendNoteOnAt');
      service.sendNoteOn(60, 100, 0);
      expect(spy).toHaveBeenCalledWith(60, 100, 0, undefined);
    });
  });

  describe('ratchet scheduling', () => {
    it('each ratchet hit has a correctly spaced timestamp', async () => {
      const { service, mockSend } = await createServiceWithMockOutput();

      // 16th note at 120 BPM = 0.125s → interval for 2 ratchets = 62.5ms
      const baseTimestamp = 5350;
      const ratchetIntervalMs = 62.5;
      const ratchetCount = 2;

      for (let i = 0; i < ratchetCount; i++) {
        service.sendNoteOnAt(60, 100, 0, baseTimestamp + i * ratchetIntervalMs);
      }

      expect(mockSend).toHaveBeenNthCalledWith(1, [0x90, 60, 100], 5350);
      expect(mockSend).toHaveBeenNthCalledWith(3, [0x90, 60, 100], 5412.5);
    });

    it('4 ratchets produce 4 evenly-spaced note-on events', async () => {
      const { service, mockSend } = await createServiceWithMockOutput();

      const baseTimestamp = 5000;
      // 16th note = 125ms, 4 ratchets → interval = 31.25ms
      const ratchetIntervalMs = 31.25;

      for (let i = 0; i < 4; i++) {
        service.sendNoteOnAt(60, 100, 0, baseTimestamp + i * ratchetIntervalMs);
      }

      const noteOnCalls = mockSend.mock.calls.filter(([msg]) => msg[0] === 0x90);
      expect(noteOnCalls).toHaveLength(4);
      expect(noteOnCalls[0][1]).toBeCloseTo(5000, 5);
      expect(noteOnCalls[1][1]).toBeCloseTo(5031.25, 5);
      expect(noteOnCalls[2][1]).toBeCloseTo(5062.5, 5);
      expect(noteOnCalls[3][1]).toBeCloseTo(5093.75, 5);
    });
  });

  describe('init', () => {
    it('handles missing MIDI support gracefully', async () => {
      vi.stubGlobal('navigator', {
        requestMIDIAccess: undefined,
      });
      const service = new MidiService();
      // Should not throw
      await expect(service.init()).resolves.toBeUndefined();
    });

    it('handles MIDI access denial gracefully', async () => {
      vi.stubGlobal('navigator', {
        requestMIDIAccess: vi.fn().mockRejectedValue(new Error('Access denied')),
      });
      const service = new MidiService();
      // Should not throw — just warn
      await expect(service.init()).resolves.toBeUndefined();
    });
  });
});
