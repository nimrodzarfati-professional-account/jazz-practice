/**
 * Web: the browser's Web Audio context. The `.native.ts` sibling supplies the iOS/Android one.
 */
export function createPlatformAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as any).webkitAudioContext ||
    (typeof globalThis !== 'undefined' ? (globalThis as any).AudioContext : undefined);
  return AudioContextClass ? (new AudioContextClass() as AudioContext) : null;
}
