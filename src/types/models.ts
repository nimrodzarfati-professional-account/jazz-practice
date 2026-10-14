// Exercise context
export type ExerciseContext = 'soloing' | 'comping';

// Exercise category
export type ExerciseCategory = 'maintenance' | 'transcribing' | 'new_concept';

// The 12 musical keys
export type MusicalKey = 'C' | 'F' | 'Bb' | 'Eb' | 'Ab' | 'Db' | 'Gb' | 'B' | 'E' | 'A' | 'D' | 'G';

// All 12 keys in circle of fifths order
export const CIRCLE_OF_FIFTHS: MusicalKey[] = ['C', 'G', 'D', 'A', 'E', 'B', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

// Key completion state for the stamp grid
export interface KeyStampState {
  key: MusicalKey;
  stamped: boolean;
  bpm: number | null;
  stampedAt: string | null; // ISO date
}

// Core Exercise model
export interface Exercise {
  id: string;
  title: string;
  description: string;
  context: ExerciseContext;
  category: ExerciseCategory;
  basePriority: number; // 1-10
  defaultDurationMinutes: number;
  targetBpm: number | null;
  keyStamps: KeyStampState[];
  lastPracticedAt: string | null; // ISO date
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

// Intensity/energy level
export type IntensityLevel = 1 | 2 | 3 | 4 | 5;

// Session configuration (from the pre-session faders)
export interface SessionConfig {
  availableMinutes: number; // 15-120
  intensity: IntensityLevel; // 1-5 (Chop/Brain Battery)
}

// A single block within a practice session
export interface SessionBlock {
  exerciseId: string;
  exercise: Exercise;
  durationMinutes: number;
  targetKey: MusicalKey | null;
  targetBpm: number | null;
  completed: boolean;
  skipped: boolean;
}

// A complete practice session
export interface PracticeSession {
  id: string;
  config: SessionConfig;
  blocks: SessionBlock[];
  scheduledAt: string; // ISO date
  startedAt: string | null;
  completedAt: string | null;
  cancelled: boolean;
  totalDurationMinutes: number;
}

// Alarm schedule
export interface AlarmSchedule {
  id: string;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  hour: number;
  minute: number;
  enabled: boolean;
  label: string;
  defaultSessionMinutes: number;
  defaultIntensity: IntensityLevel;
}

// Session log entry (for history/analytics)
export interface SessionLogEntry {
  id: string;
  sessionId: string;
  exerciseId: string;
  durationMinutes: number;
  keysWorked: MusicalKey[];
  bpmAchieved: number | null;
  notes: string;
  practicedAt: string;
}

// Category decay rates (how quickly exercises become urgent when neglected)
export const CATEGORY_DECAY_RATES: Record<ExerciseCategory, number> = {
  maintenance: 1.0,    // Linear decay - needs regular upkeep
  transcribing: 1.5,   // Faster decay - momentum is critical
  new_concept: 0.7,    // Slower decay - these can simmer
};

// Scheduler scoring result
export interface ScoredExercise {
  exercise: Exercise;
  urgencyScore: number;
  suggestedDuration: number;
  suggestedKey: MusicalKey | null;
}
