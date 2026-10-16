/**
 * Audio, Metronome & Studio Chime Service for Shed Engine
 */
import * as Haptics from 'expo-haptics';

/**
 * Plays a warm studio chime tone when a practice block completes
 */
export function playBlockCompleteChime(): void {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
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

  /**
   * Starts a rhythm metronome with haptic ticks
   */
  public startMetronome(bpm: number, onBeat?: (beatNumber: number) => void): void {
    this.stopMetronome();
    this.currentBpm = Math.max(30, Math.min(320, bpm));
    this.isTicking = true;
    this.beatCounter = 0;

    const intervalMs = (60 / this.currentBpm) * 1000;

    this.metronomeTimer = setInterval(() => {
      this.beatCounter = (this.beatCounter % 4) + 1;

      if (this.beatCounter === 1) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (onBeat) {
        onBeat(this.beatCounter);
      }
    }, intervalMs);
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
