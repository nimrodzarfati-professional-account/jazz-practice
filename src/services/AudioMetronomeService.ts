/**
 * Audio, Metronome & Studio Chime Service for Shed Engine
 */
import * as Haptics from 'expo-haptics';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        if (!sharedAudioCtx) {
          sharedAudioCtx = new AudioContextClass();
        }
        if (sharedAudioCtx.state === 'suspended') {
          sharedAudioCtx.resume();
        }
        return sharedAudioCtx;
      }
    }
  } catch {
    // Non-blocking fallback
  }
  return null;
}

/**
 * Plays a warm studio chime tone when a practice block completes
 */
export function playBlockCompleteChime(): void {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const ctx = getAudioContext();
    if (ctx) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 Rhodes warm chime
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25); // A5

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    }
  } catch {
    // Non-blocking fallback
  }
}

class AudioMetronomeService {
  private isTicking: boolean = false;
  private metronomeTimer: ReturnType<typeof setInterval> | null = null;
  private currentBpm: number = 120;
  private beatCounter: number = 0;
  private noiseBuffer: AudioBuffer | null = null;

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    // 25ms buffer of crisp white noise for the mechanical escapement snap
    const bufferSize = Math.floor(ctx.sampleRate * 0.025);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Exponentially decaying noise burst right in the buffer
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.004));
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private playClickTone(isDownbeat: boolean, isOddBeat: boolean): void {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // --- LAYER 1: Mechanical Metal Escapement Snap (Filtered Noise Burst) ---
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = this.getNoiseBuffer(ctx);

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      // Slight pitch difference between "tick" (odd) and "tock" (even)
      noiseFilter.frequency.setValueAtTime(isOddBeat ? 2600 : 2300, now);
      noiseFilter.Q.setValueAtTime(3.5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(isDownbeat ? 0.55 : 0.38, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start(now);

      // --- LAYER 2: Hollow Wooden Pyramid Body Knock (Rapid Pitch-Drop Impulse) ---
      const bodyOsc = ctx.createOscillator();
      const bodyFilter = ctx.createBiquadFilter();
      const bodyGain = ctx.createGain();

      bodyOsc.type = 'triangle';
      // Wood resonance starts with a sharp click and drops into the hollow wood fundamental
      const startFreq = isDownbeat ? 1650 : isOddBeat ? 1350 : 1220;
      const woodResonanceFreq = isDownbeat ? 460 : isOddBeat ? 390 : 365;

      bodyOsc.frequency.setValueAtTime(startFreq, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(woodResonanceFreq, now + 0.009);

      // Warm low-pass filter to shave off digital harshness
      bodyFilter.type = 'lowpass';
      bodyFilter.frequency.setValueAtTime(2400, now);

      bodyGain.gain.setValueAtTime(isDownbeat ? 0.45 : 0.32, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

      bodyOsc.connect(bodyFilter);
      bodyFilter.connect(bodyGain);
      bodyGain.connect(ctx.destination);

      bodyOsc.start(now);
      bodyOsc.stop(now + 0.042);
    } catch {
      // Non-blocking fallback
    }
  }

  public startMetronome(bpm: number, onBeat?: (beatNumber: number) => void): void {
    this.stopMetronome();
    this.currentBpm = Math.max(30, Math.min(320, bpm));
    this.isTicking = true;
    this.beatCounter = 0;

    const tick = () => {
      this.beatCounter = (this.beatCounter % 4) + 1;
      const isDownbeat = this.beatCounter === 1;
      const isOddBeat = this.beatCounter % 2 === 1;

      this.playClickTone(isDownbeat, isOddBeat);

      if (isDownbeat) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (onBeat) {
        onBeat(this.beatCounter);
      }
    };

    tick();

    const intervalMs = (60 / this.currentBpm) * 1000;
    this.metronomeTimer = setInterval(tick, intervalMs);
  }

  public stopMetronome(): void {
    this.isTicking = false;
    if (this.metronomeTimer) {
      clearInterval(this.metronomeTimer);
      this.metronomeTimer = null;
    }
    this.beatCounter = 0;
  }

  public getIsTicking(): boolean {
    return this.isTicking;
  }

  public getCurrentBpm(): number {
    return this.currentBpm;
  }
}

export const audioMetronomeService = new AudioMetronomeService();
export default audioMetronomeService;
