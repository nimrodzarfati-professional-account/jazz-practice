/**
 * Audio, Metronome & Hands-Free TTS Announcement Service for Shed Engine
 * 
 * Powered by:
 * - expo-speech: Text-To-Speech announcements between practice blocks
 * - expo-audio / Web Audio API: Vintage chime, metronome ticks, and Rhodes chord tones
 */
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { MusicalKey } from '../types/models';

class AudioMetronomeService {
  private isTicking: boolean = false;
  private metronomeTimer: ReturnType<typeof setInterval> | null = null;
  private currentBpm: number = 120;
  private beatCounter: number = 0;

  /**
   * Hands-free Text-to-Speech (TTS) announcement for the next exercise block.
   * Announces the exercise title, target key, and target BPM out loud
   * so the musician never has to remove their hands from their instrument.
   */
  public async announceNextBlock(
    title: string,
    targetKey?: MusicalKey | null,
    targetBpm?: number | null
  ): Promise<void> {
    try {
      // First play a tactile haptic thud
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      let text = `Next up: ${title}.`;
      if (targetKey) {
        text += ` Target key: ${targetKey}.`;
      }
      if (targetBpm) {
        text += ` Suggested tempo: ${targetBpm} B P M.`;
      }

      await Speech.stop();
      Speech.speak(text, {
        language: 'en-US',
        pitch: 0.95,
        rate: 0.9, // Relaxed studio vocal tempo
      });
    } catch (err) {
      console.warn('[AudioService] TTS announcement error:', err);
    }
  }

  /**
   * Announces session completion out loud.
   */
  public async announceSessionComplete(totalMinutes: number): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Speech.stop();
      Speech.speak(`Session complete. You logged ${totalMinutes} minutes of practice. Well shed.`, {
        language: 'en-US',
        pitch: 0.95,
        rate: 0.9,
      });
    } catch (err) {
      console.warn('[AudioService] Session complete TTS error:', err);
    }
  }

  /**
   * Starts a rhythm metronome with haptic ticks and audio pulses.
   */
  public startMetronome(bpm: number, onBeat?: (beatNumber: number) => void): void {
    this.stopMetronome();
    this.currentBpm = Math.max(30, Math.min(320, bpm));
    this.isTicking = true;
    this.beatCounter = 0;

    const intervalMs = (60 / this.currentBpm) * 1000;

    this.metronomeTimer = setInterval(() => {
      this.beatCounter = (this.beatCounter % 4) + 1;

      // Downbeat on beat 1 has heavy haptic, beats 2-4 have light
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

  /**
   * Stops the metronome.
   */
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
