import { PitchKey } from './models';

export type StandardStyle =
  | 'SWING'
  | 'BALLAD'
  | 'BOSSA'
  | 'BEBOP'
  | 'BLUES'
  | 'WALTZ'
  | 'LATIN'
  | 'MODAL';

export const STANDARD_STYLES: StandardStyle[] = [
  'SWING',
  'BALLAD',
  'BOSSA',
  'BEBOP',
  'BLUES',
  'WALTZ',
  'LATIN',
  'MODAL',
];

export const STYLE_LABELS: Record<StandardStyle, string> = {
  SWING: 'SWING',
  BALLAD: 'BALLAD',
  BOSSA: 'BOSSA',
  BEBOP: 'BEBOP',
  BLUES: 'BLUES',
  WALTZ: 'WALTZ',
  LATIN: 'LATIN',
  MODAL: 'MODAL',
};

export const TOTAL_KNOWN_STANDARDS_BENCHMARK = 1500;

export interface RepertoireStandard {
  id: string;
  title: string;
  composer: string;
  defaultKey: PitchKey;
  knownKeys: PitchKey[];
  style: StandardStyle;
  notes: string;
  isKnown: boolean;
  isCustom: boolean;
  updatedAt: string;
}

export interface RepertoireStats {
  knownCount: number;
  totalCatalogBenchmark: number;
  catalogSeededCount: number;
  byStyle: Record<StandardStyle, number>;
}
