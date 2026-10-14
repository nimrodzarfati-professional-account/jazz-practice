/**
 * Database Schema & Initial Seed Data for Shed Engine
 * 
 * Powered by expo-sqlite (offline-first local database)
 */
import { Exercise, CIRCLE_OF_FIFTHS, KeyStampState } from '../types/models';

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  context TEXT NOT NULL CHECK(context IN ('soloing', 'comping')),
  category TEXT NOT NULL CHECK(category IN ('maintenance', 'transcribing', 'new_concept')),
  base_priority INTEGER NOT NULL DEFAULT 5,
  default_duration_minutes INTEGER NOT NULL DEFAULT 15,
  target_bpm INTEGER,
  key_stamps_json TEXT NOT NULL DEFAULT '[]',
  last_practiced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_archived INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT
);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  available_minutes INTEGER NOT NULL,
  intensity INTEGER NOT NULL CHECK(intensity BETWEEN 1 AND 5),
  blocks_json TEXT NOT NULL DEFAULT '[]',
  scheduled_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  cancelled INTEGER NOT NULL DEFAULT 0,
  total_duration_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  synced_at TEXT
);

CREATE TABLE IF NOT EXISTS session_logs (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  keys_worked_json TEXT NOT NULL DEFAULT '[]',
  bpm_achieved INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  practiced_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  synced_at TEXT,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alarm_schedules (
  id TEXT PRIMARY KEY NOT NULL,
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  hour INTEGER NOT NULL CHECK(hour BETWEEN 0 AND 23),
  minute INTEGER NOT NULL CHECK(minute BETWEEN 0 AND 59),
  enabled INTEGER NOT NULL DEFAULT 1,
  label TEXT NOT NULL,
  default_session_minutes INTEGER NOT NULL DEFAULT 45,
  default_intensity INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL,
  synced_at TEXT
);

CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_context ON exercises(context);
CREATE INDEX IF NOT EXISTS idx_exercises_last_practiced ON exercises(last_practiced_at);
CREATE INDEX IF NOT EXISTS idx_session_logs_exercise ON session_logs(exercise_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_practiced ON session_logs(practiced_at);
`;

/** Initial 12-key unstamped blank state helper */
export function createDefaultKeyStamps(): KeyStampState[] {
  return CIRCLE_OF_FIFTHS.map((key) => ({
    key,
    stamped: false,
    bpm: null,
    stampedAt: null,
  }));
}

/** Pre-populated authentic jazz repertoire and drills for immediate practice */
export const SEED_EXERCISES: Omit<Exercise, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'seed-ex-1',
    title: 'Drop 2 Major & Minor 2-5-1 Voicings',
    description: 'Cycle through all 12 keys using 4-way close to Drop 2 voicings on strings 4-3-2-1 with smooth voice-leading.',
    context: 'comping',
    category: 'maintenance',
    basePriority: 9,
    defaultDurationMinutes: 15,
    targetBpm: 120,
    keyStamps: CIRCLE_OF_FIFTHS.map((key) => ({
      key,
      stamped: ['C', 'F', 'Bb', 'Eb'].includes(key),
      bpm: ['C', 'F', 'Bb', 'Eb'].includes(key) ? 120 : null,
      stampedAt: ['C', 'F', 'Bb', 'Eb'].includes(key) ? new Date(Date.now() - 86400000 * 2).toISOString() : null,
    })),
    lastPracticedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    isArchived: false,
  },
  {
    id: 'seed-ex-2',
    title: 'Bill Evans Left-Hand Rootless Shells',
    description: "Transcription study from Cannonball Adderley's 1959 recording of Autumn Leaves. Focus on A/B voicings behind horn solo.",
    context: 'comping',
    category: 'transcribing',
    basePriority: 8,
    defaultDurationMinutes: 20,
    targetBpm: 140,
    keyStamps: CIRCLE_OF_FIFTHS.map((key) => ({
      key,
      stamped: key === 'Bb' || key === 'G',
      bpm: key === 'Bb' ? 140 : null,
      stampedAt: key === 'Bb' ? new Date(Date.now() - 86400000 * 4).toISOString() : null,
    })),
    lastPracticedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    isArchived: false,
  },
  {
    id: 'seed-ex-3',
    title: 'Coltrane 3-Tonic Augmented Matrix',
    description: 'Improvisation drill over Giant Steps / 26-2 changes. Connecting Bmaj7, D7, Gmaj7, Bb7, Ebmaj7 with digital patterns (1-2-3-5).',
    context: 'soloing',
    category: 'new_concept',
    basePriority: 7,
    defaultDurationMinutes: 25,
    targetBpm: 180,
    keyStamps: createDefaultKeyStamps(),
    lastPracticedAt: null,
    isArchived: false,
  },
  {
    id: 'seed-ex-4',
    title: 'Charlie Parker Omnibook — Donna Lee Head & Solo',
    description: 'Memorize and internalize phrasing, enunciation, and swing feel of chorus 1 at tempo.',
    context: 'soloing',
    category: 'transcribing',
    basePriority: 8,
    defaultDurationMinutes: 20,
    targetBpm: 210,
    keyStamps: CIRCLE_OF_FIFTHS.map((key) => ({
      key,
      stamped: key === 'Ab',
      bpm: key === 'Ab' ? 190 : null,
      stampedAt: key === 'Ab' ? new Date(Date.now() - 86400000 * 6).toISOString() : null,
    })),
    lastPracticedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    isArchived: false,
  },
  {
    id: 'seed-ex-5',
    title: 'Altered Scale (Super Locrian) Resolutions',
    description: 'Connecting 7alt to Maj7 / min7 across all 12 keys using 3-b9-b13 enclosures.',
    context: 'soloing',
    category: 'maintenance',
    basePriority: 6,
    defaultDurationMinutes: 15,
    targetBpm: 130,
    keyStamps: createDefaultKeyStamps(),
    lastPracticedAt: null,
    isArchived: false,
  },
];

export const SEED_ALARMS = [
  {
    id: 'alarm-mon-shed',
    day_of_week: 1, // Monday
    hour: 8,
    minute: 30,
    enabled: 1,
    label: 'Morning Shed Routine',
    default_session_minutes: 45,
    default_intensity: 4,
  },
  {
    id: 'alarm-wed-shed',
    day_of_week: 3, // Wednesday
    hour: 8,
    minute: 30,
    enabled: 1,
    label: 'Morning Shed Routine',
    default_session_minutes: 60,
    default_intensity: 4,
  },
  {
    id: 'alarm-sat-shed',
    day_of_week: 6, // Saturday
    hour: 10,
    minute: 0,
    enabled: 1,
    label: 'Deep Weekend Studio Session',
    default_session_minutes: 90,
    default_intensity: 5,
  },
];
