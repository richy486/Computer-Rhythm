/**
 * Converts an audio context scheduled time (seconds) to a performance.now()
 * timestamp (milliseconds) suitable for the Web MIDI API's send() timestamp parameter.
 *
 * The Web MIDI API's output.send(data, timestamp) uses DOMHighResTimeStamp
 * (same clock as performance.now()), enabling hardware-precise MIDI scheduling
 * without relying on setTimeout.
 *
 * @param scheduledAudioTime - The audio context time in seconds (e.g. the `time` arg from Tone.js callback)
 * @param audioCtxCurrentTime - The current audio context time in seconds (audioCtx.currentTime at moment of call)
 * @param performanceNow - The current performance.now() in milliseconds (at moment of call)
 * @returns The equivalent performance.now() timestamp in milliseconds
 */
export function audioTimeToPerformanceTime(
  scheduledAudioTime: number,
  audioCtxCurrentTime: number,
  performanceNow: number
): number {
  const perfOffsetMs = performanceNow - audioCtxCurrentTime * 1000;
  return perfOffsetMs + scheduledAudioTime * 1000;
}
