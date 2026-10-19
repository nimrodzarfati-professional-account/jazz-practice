/**
 * Audio, Metronome & Studio Chime Service for Shed Engine
 */
import * as Haptics from 'expo-haptics';

export type MetronomeFeelMode = 'BACKBEAT_2_4' | 'ALL_FOUR_2_4_ACCENT';
export type MetronomeVoice = 'PENDULUM' | 'HI_HAT' | 'RIMSHOT' | 'WOODBLOCK';

export const METRONOME_VOICES: { id: MetronomeVoice; label: string }[] = [
  { id: 'PENDULUM', label: 'PENDULUM' },
  { id: 'HI_HAT', label: '2 & 4 HAT' },
  { id: 'RIMSHOT', label: 'CROSS-STICK' },
  { id: 'WOODBLOCK', label: 'WOODBLOCK' },
];

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window !== 'undefined') {
      const AudioContextClass =
        window.AudioContext ||
        (window as any).webkitAudioContext ||
        (typeof globalThis !== 'undefined' ? (globalThis as any).AudioContext : undefined);
      if (AudioContextClass) {
        if (!sharedAudioCtx) {
          sharedAudioCtx = new AudioContextClass() as any;
        }
        if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
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

  private playClickTone(beatNumber: number): void {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const isDownbeat = beatNumber === 1;
      const isBackbeat = beatNumber === 2 || beatNumber === 4;
      const isOddBeat = beatNumber % 2 === 1;

      // When 2 & 4 Backbeat Mode is enforced, completely mute audio on beats 1 & 3
      if (this.feelMode === 'BACKBEAT_2_4' && !isBackbeat) {
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

  public startMetronome(bpm: number, onBeat?: (beatNumber: number) => void): void {
    this.stopMetronome();
    this.currentBpm = Math.max(30, Math.min(320, bpm));
    this.isTicking = true;
    this.beatCounter = 0;

    const tick = () => {
      this.beatCounter = (this.beatCounter % 4) + 1;
      this.playClickTone(this.beatCounter);

      const isAccent =
        this.currentVoice === 'HI_HAT'
          ? this.beatCounter === 2 || this.beatCounter === 4
          : this.beatCounter === 1;

      if (isAccent) {
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
