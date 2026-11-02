/**
 * iOS/Android: Web-Audio-compatible context from react-native-audio-api. Loaded lazily so a
 * build without the native module (e.g. Expo Go) falls back to a haptics-only metronome.
 */
export function createPlatformAudioContext(): AudioContext | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AudioContext: NativeAudioContext } = require('react-native-audio-api');
    return new NativeAudioContext() as unknown as AudioContext;
  } catch (err) {
    console.warn('[Audio] Native AudioContext unavailable; metronome is haptics-only:', err);
    return null;
  }
}
