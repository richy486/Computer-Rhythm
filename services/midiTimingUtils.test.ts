import { describe, it, expect } from 'vitest';
import { audioTimeToPerformanceTime } from './midiTimingUtils';

describe('audioTimeToPerformanceTime', () => {
  it('returns the same performance time when scheduled at the current audio time', () => {
    // audio at 10.0s, performance at 5000ms → offset = 5000 - 10000 = -5000ms
    // result = -5000 + 10000 = 5000ms
    const result = audioTimeToPerformanceTime(10.0, 10.0, 5000);
    expect(result).toBe(5000);
  });

  it('adds lookahead correctly (350ms lookahead at 120 BPM)', () => {
    // Typical scenario: audio scheduled 350ms (0.35s) ahead
    // audio scheduled at 10.35s, current audio time 10.0s, perf 5000ms
    // offset = 5000 - 10000 = -5000ms
    // result = -5000 + 10350 = 5350ms
    const result = audioTimeToPerformanceTime(10.35, 10.0, 5000);
    expect(result).toBeCloseTo(5350, 5);
  });

  it('converts exactly 1 second of audio lookahead to 1000ms of performance time', () => {
    const result = audioTimeToPerformanceTime(11.0, 10.0, 5000);
    expect(result).toBe(6000);
  });

  it('handles zero values at session start', () => {
    const result = audioTimeToPerformanceTime(0, 0, 0);
    expect(result).toBe(0);
  });

  it('handles late callback (scheduled audio time is already in the past)', () => {
    // If the JS event loop was slow and the callback fired late, scheduledTime < currentTime
    // result is a past performance timestamp — the MIDI API will send immediately
    const result = audioTimeToPerformanceTime(9.9, 10.0, 5000);
    expect(result).toBeCloseTo(4900, 5);
  });

  it('swing offset is reflected correctly in the performance timestamp', () => {
    // 16th note at 120 BPM = 0.125s. Swing adds up to 40% = 0.05s
    // audio scheduled at 10.05s (swung), current at 10.0s, perf 5000ms
    const result = audioTimeToPerformanceTime(10.05, 10.0, 5000);
    expect(result).toBeCloseTo(5050, 5);
  });

  it('ratchet: second hit 1 ratchet-interval after first hit lands at correct timestamp', () => {
    // 16th note = 0.125s, 2 ratchets → interval = 0.0625s = 62.5ms
    const firstHitAudioTime = 10.35;
    const ratchetIntervalMs = 62.5;
    const audioCtxCurrentTime = 10.0;
    const perfNow = 5000;

    const firstHitPerf = audioTimeToPerformanceTime(firstHitAudioTime, audioCtxCurrentTime, perfNow);
    const secondHitPerf = firstHitPerf + ratchetIntervalMs;

    expect(firstHitPerf).toBeCloseTo(5350, 5);
    expect(secondHitPerf).toBeCloseTo(5412.5, 5);
  });

  it('is independent of absolute audio context time values', () => {
    // The offset between audio and performance clock is constant within a session.
    // Doubling both times should give the same relative result.
    const result1 = audioTimeToPerformanceTime(10.35, 10.0, 5000);
    const result2 = audioTimeToPerformanceTime(20.35, 20.0, 15000);
    // Both should be 350ms ahead of their respective perfNow values
    expect(result1 - 5000).toBeCloseTo(350, 5);
    expect(result2 - 15000).toBeCloseTo(350, 5);
  });
});
