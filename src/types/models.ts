/**
 * Domain Models for Shed Engine V2
 *
 * Strict architectural types for the All-Cream Vintage Press Jazz Practice System:
 * - 1-2 Week Active Standard cycle
 * - In-Rotation vs. Vault Repertoire
 * - Graduation from New Concept / Transcribing -> Maintenance
 * - Exercise-driven timer durations
 */

// Pitch keys in Circle of Fifths order
export type PitchKey =
  | 'C'
  | 'F'
  | 'Bb'
  | 'Eb'
  | 'Ab'
  | 'Db'
  | 'Gb'
  | 'B'
  | 'E'
  | 'A'
  | 'D'
  | 'G';

export const CIRCLE_OF_FIFTHS: PitchKey[] = [
  'C',
  'F',
  'Bb',
  'Eb',
  'Ab',
  'Db',
  'Gb',
  'B',
  'E',
  'A',
  'D',
  'G',
];

// Backward compatibility alias
export type MusicalKey = PitchKey;

// Musical context: Soloing vs. Comping
export type MusicalContext = 'SOLOING' | 'COMPING';
export type ExerciseContext = MusicalContext;

// Exercise categories
export type ExerciseCategory = 'MAINTENANCE' | 'TRANSCRIBING' | 'NEW_CONCEPT';

/**
 * 1-2 Week Active Jazz Standard for ongoing maintenance & harmonic grounding
 */
export interface ActiveStandard {
  id: string;
  title: string;
  defaultKey: PitchKey;
  startedAt: string; // ISO date string
  rotationCycleDays: 7 | 10 | 14 | number;
}

/**
 * Core Exercise definition
 */
export interface Exercise {
  id: string;
  title: string;
  description: string;
  context: MusicalContext;
  category: ExerciseCategory;
  inRotation: boolean;
  durationMinutes: number; // Timer duration dictated directly by the exercise
  intensity: number; // 1-5 (Chop / Brain Battery)
  basePriority: number; // 1-10
  currentBpm: number;
  isKeyBased: boolean; // If false, 12-key stamp pad is hidden & key deficit ignored
  masteredKeys: PitchKey[];
  usesActiveStandard: boolean; // If true or MAINTENANCE, bound to active standard
  lastPracticedAt: string | null;
  skippedCount: number;
}

/**
 * Scored exercise for the practice queue (output of SchedulerEngine)
 */
export interface ScoredExercise extends Exercise {
  urgencyScore: number;
  allocatedMinutes: number;
  assignedStandardTitle?: string;
}

/**
 * Pre-session configuration
 */
export interface SessionConfig {
  availableMinutes: number; // 15-120
  intensity: number; // 1-5
  contextFilter?: 'ALL' | MusicalContext;
}

/**
 * Session log entry for history
 */
export interface SessionLogEntry {
  id: string;
  exerciseId: string;
  exerciseTitle: string;
  durationMinutes: number;
  bpmAchieved: number;
  masteredKeys: PitchKey[];
  practicedAt: string;
  notes?: string;
}
