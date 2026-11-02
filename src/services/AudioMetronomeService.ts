/**
 * Audio, Metronome & Studio Chime Service for Shed Engine
 */
import * as Haptics from 'expo-haptics';
import { createPlatformAudioContext } from './audioContextFactory';

export type MetronomeFeelMode = 'BACKBEAT_2_4' | 'ALL_FOUR_2_4_ACCENT';
export type MetronomeVoice = 'PENDULUM' | 'HI_HAT' | 'RIMSHOT' | 'WOODBLOCK';

export const METRONOME_VOICES: { id: MetronomeVoice; label: string }[] = [
  { id: 'PENDULUM', label: 'PENDULUM' },
  { id: 'HI_HAT', label: 'HI-HAT' },
  { id: 'RIMSHOT', label: 'CROSS-STICK' },
  { id: 'WOODBLOCK', label: 'WOODBLOCK' },
];

// Look-ahead scheduling: wake every 25 ms and queue any click due in the next 100 ms
const SCHEDULER_INTERVAL_MS = 25;
const LOOKAHEAD_SECONDS = 0.1;

let sharedAudioCtx: AudioContext | null = null;
let audioCtxUnavailable = false;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx && !audioCtxUnavailable) {
      sharedAudioCtx = createPlatformAudioContext();
      if (!sharedAudioCtx) audioCtxUnavailable = true;
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch {
    // Non-blocking fallback
    audioCtxUnavailable = true;
    return null;
  }
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
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private beatTimeouts = new Set<ReturnType<typeof setTimeout>>();
  private currentBpm: number = 120;
  private nextBeat: number = 1;
  private nextClickTime: number = 0;
  private onBeat: ((beatNumber: number) => void) | undefined;
  private feelMode: MetronomeFeelMode = 'BACKBEAT_2_4'; // Enforced jazz 2 & 4 by default
  private currentVoice: MetronomeVoice = 'PENDULUM';
  private noiseBuffer: AudioBuffer | null = null;

  public setFeelMode(mode: MetronomeFeelMode): void {
    this.feelMode = mode;
  }

  public getFeelMode(): MetronomeFeelMode {
    return this.feelMode;
  }

  public setVoice(voice: MetronomeVoice): void {
    this.currentVoice = voice;
  }

  public getVoice(): MetronomeVoice {
    return this.currentVoice;
  }

  private beatSounds(beatNumber: number): boolean {
    return this.feelMode !== 'BACKBEAT_2_4' || beatNumber === 2 || beatNumber === 4;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const bufferSize = Math.floor(ctx.sampleRate * 0.08); // 80ms buffer for hi-hat chick & snaps
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private playClickTone(ctx: AudioContext, beatNumber: number, now: number): void {
    try {
      const isDownbeat = beatNumber === 1;
      const isBackbeat = beatNumber === 2 || beatNumber === 4;
      const isOddBeat = beatNumber % 2 === 1;

      // When 2 & 4 Backbeat Mode is enforced, completely mute audio on beats 1 & 3
      if (!this.beatSounds(beatNumber)) {
        return;
      }

      if (this.currentVoice === 'HI_HAT') {
        // Jazz 2 & 4 Foot Hi-Hat Chick (Ghost whisper on 1 & 3, crisp clamp on 2 & 4)
        const noise = ctx.createBufferSource();
        noise.buffer = this.getNoiseBuffer(ctx);

        const hpFilter = ctx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.setValueAtTime(5500, now);

        const bpFilter = ctx.createBiquadFilter();
        bpFilter.type = 'bandpass';
        bpFilter.frequency.setValueAtTime(isBackbeat ? 8200 : 6500, now);
        bpFilter.Q.setValueAtTime(1.8, now);

        const gain = ctx.createGain();
        // Emphasize 2 & 4 strongly; barely audible air feather on 1 & 3
        gain.gain.setValueAtTime(isBackbeat ? 0.65 : 0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isBackbeat ? 0.045 : 0.015));

        noise.connect(hpFilter);
        hpFilter.connect(bpFilter);
        bpFilter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.05);
        return;
      }

      if (this.currentVoice === 'RIMSHOT') {
        // Maple Cross-Stick on Snare Rim (Inharmonic woody modes + crisp transient)
        const freqs = isDownbeat ? [480, 1020, 2150] : [420, 890, 1850];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = idx === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime((isDownbeat ? 0.25 : 0.18) / (idx + 1), now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.03);
        });
        return;
      }

      if (this.currentVoice === 'WOODBLOCK') {
        // Hollow Studio Ash Woodblock
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const baseFreq = isDownbeat ? 860 : 640;
        osc.frequency.setValueAtTime(baseFreq * 1.35, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.006);

        gain.gain.setValueAtTime(isDownbeat ? 0.45 : 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
        return;
      }

      // DEFAULT: 'PENDULUM' (Wittner Mechanical Escapement + Mahogany Pyramid)
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = this.getNoiseBuffer(ctx);
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(isOddBeat ? 2600 : 2300, now);
      noiseFilter.Q.setValueAtTime(3.5, now);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(isDownbeat ? 0.5 : 0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start(now);
      noiseSource.stop(now + 0.02);

      const bodyOsc = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(isDownbeat ? 1650 : isOddBeat ? 1350 : 1220, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(isDownbeat ? 460 : isOddBeat ? 390 : 365, now + 0.009);
      bodyGain.gain.setValueAtTime(isDownbeat ? 0.45 : 0.32, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);
      bodyOsc.connect(bodyGain);
      bodyGain.connect(ctx.destination);
      bodyOsc.start(now);
      bodyOsc.stop(now + 0.042);
    } catch {
      // Non-blocking fallback
    }
  }

  /** Haptics (only on beats that sound) and the visual beat callback. */
  private emitBeat(beatNumber: number): void {
    if (!this.isTicking) return;
    if (this.beatSounds(beatNumber)) {
      const isAccent =
        this.currentVoice === 'HI_HAT'
          ? beatNumber === 2 || beatNumber === 4
          : beatNumber === 1;
      Haptics.impactAsync(
        isAccent ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light
      );
    }
    this.onBeat?.(beatNumber);
  }

  private advanceBeat(): void {
    this.nextBeat = (this.nextBeat % 4) + 1;
  }

  private runScheduler(ctx: AudioContext): void {
    // If the timer was throttled (background tab), resync instead of bursting missed clicks
    if (this.nextClickTime < ctx.currentTime - 0.2) {
      this.nextClickTime = ctx.currentTime + 0.05;
    }
    while (this.nextClickTime < ctx.currentTime + LOOKAHEAD_SECONDS) {
      const beat = this.nextBeat;
      const clickTime = this.nextClickTime;
      this.playClickTone(ctx, beat, clickTime);

      const delayMs = Math.max(0, (clickTime - ctx.currentTime) * 1000);
      const timeout = setTimeout(() => {
        this.beatTimeouts.delete(timeout);
        this.emitBeat(beat);
      }, delayMs);
      this.beatTimeouts.add(timeout);

      this.nextClickTime += 60 / this.currentBpm;
      this.advanceBeat();
    }
  }

  public startMetronome(bpm: number, onBeat?: (beatNumber: number) => void): void {
    this.stopMetronome();
    this.currentBpm = Math.max(30, Math.min(320, bpm));
    this.isTicking = true;
    this.nextBeat = 1;
    this.onBeat = onBeat;

    const ctx = getAudioContext();
    if (ctx) {
      this.nextClickTime = ctx.currentTime + 0.05;
      this.runScheduler(ctx);
      this.schedulerTimer = setInterval(() => this.runScheduler(ctx), SCHEDULER_INTERVAL_MS);
      return;
    }

    // No audio context (native build without audio module): haptics and visuals only
    const tick = () => {
      const beat = this.nextBeat;
      this.advanceBeat();
      this.emitBeat(beat);
      this.schedulerTimer = setTimeout(tick, 60000 / this.currentBpm);
    };
    tick();
  }

  /** Changes tempo without restarting the bar or producing an extra click. */
  public setBpm(bpm: number): void {
    this.currentBpm = Math.max(30, Math.min(320, bpm));
  }

  public stopMetronome(): void {
    this.isTicking = false;
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.beatTimeouts.forEach((t) => clearTimeout(t));
    this.beatTimeouts.clear();
    this.nextBeat = 1;
    this.onBeat = undefined;
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
