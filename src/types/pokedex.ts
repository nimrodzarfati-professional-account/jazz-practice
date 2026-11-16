import { PitchKey } from './models';

export type StandardStyle =
  | 'SWING'
  | 'BEBOP'
  | 'BOSSA'
  | 'BALLAD'
  | 'BLUES'
  | 'MODAL'
  | 'WALTZ'
  | 'HARD_BOP'
  | 'LATIN'
  | 'RHYTHM_CHANGES';

export type StandardTier = 'STARTER' | 'CORE' | 'VETERAN' | 'LEGENDARY';

export type StandardStatus = 'CAUGHT' | 'SEEN' | 'LOCKED';

export interface PokedexStandard {
  id: string;
  dexNumber: number; // e.g. 1 to 151
  title: string;
  composer: string;
  year: number;
  types: StandardStyle[];
  defaultKey: PitchKey;
  masteredKeys: PitchKey[];
  form: string; // e.g. "32-Bar AABA", "12-Bar Blues", "32-Bar ABAC"
  tempoBpm: number; // Typical performance tempo
  tempoLabel: string; // e.g. "Med-Up Swing", "Medium Bossa", "Slow Ballad"
  tier: StandardTier;
  status: StandardStatus;
  firstChords: string; // Bandstand quick-read hook
  jamCallNotes: string; // How to call at a jam: intro, solos, ending, hazard warning
  personalNotes?: string;
  unlockedAt?: string | null;
  lastPracticedAt?: string | null;
  timesPracticed?: number;
  practiceCount?: number;
  isCustom?: boolean;
}

export interface PokedexStats {
  totalCount: number;
  caughtCount: number;
  seenCount: number;
  lockedCount: number;
  completionPercentage: number;
}

export const STYLE_CONFIG: Record<
  StandardStyle,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  SWING: {
    label: 'SWING',
    bg: '#D49B35',
    text: '#181512',
    border: '#9E6E16',
    icon: '🎷',
  },
  BEBOP: {
    label: 'BEBOP',
    bg: '#9E2A2B',
    text: '#F4EFE6',
    border: '#6B1A1B',
    icon: '⚡',
  },
  BOSSA: {
    label: 'BOSSA',
    bg: '#2A7B7B',
    text: '#F4EFE6',
    border: '#1A5353',
    icon: '🌴',
  },
  BALLAD: {
    label: 'BALLAD',
    bg: '#3A4268',
    text: '#F4EFE6',
    border: '#242944',
    icon: '🌙',
  },
  BLUES: {
    label: 'BLUES',
    bg: '#274D7E',
    text: '#F4EFE6',
    border: '#173153',
    icon: '🎸',
  },
  MODAL: {
    label: 'MODAL',
    bg: '#6E3C8A',
    text: '#F4EFE6',
    border: '#49235D',
    icon: '🪐',
  },
  WALTZ: {
    label: 'WALTZ',
    bg: '#546A48',
    text: '#F4EFE6',
    border: '#35432D',
    icon: '🎻',
  },
  HARD_BOP: {
    label: 'HARD BOP',
    bg: '#D95D39',
    text: '#181512',
    border: '#A33C1E',
    icon: '🔥',
  },
  LATIN: {
    label: 'LATIN',
    bg: '#D97724',
    text: '#181512',
    border: '#9D4F0E',
    icon: '🥁',
  },
  RHYTHM_CHANGES: {
    label: 'RHYTHM',
    bg: '#C29B27',
    text: '#181512',
    border: '#846714',
    icon: '⚓',
  },
};

export const TIER_CONFIG: Record<
  StandardTier,
  { label: string; badge: string; color: string; desc: string }
> = {
  STARTER: {
    label: 'STARTER',
    badge: '★ STARTER',
    color: '#388E3C',
    desc: 'Essential for every jam session. Beginner-friendly form & changes.',
  },
  CORE: {
    label: 'CORE',
    badge: '★★ CORE',
    color: '#D49B35',
    desc: 'The bedrock of jazz repertoire. Expected at almost any jam.',
  },
  VETERAN: {
    label: 'VETERAN',
    badge: '★★★ VETERAN',
    color: '#D95D39',
    desc: 'Faster tempos, modal shifts, or intricate changes.',
  },
  LEGENDARY: {
    label: 'LEGENDARY',
    badge: '★★★★ LEGENDARY',
    color: '#8E24AA',
    desc: 'High harmonic complexity or blistering tempo curve.',
  },
};
