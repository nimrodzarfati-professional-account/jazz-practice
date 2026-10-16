/**
 * Database Schema & Seed Constants for Shed Engine V2
 */
import { Exercise } from '../types/models';

export const SCHEMA_VERSION = 2;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS active_standard (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  defaultKey TEXT NOT NULL,
  startedAt TEXT NOT NULL,
  rotationCycleDays INTEGER NOT NULL DEFAULT 14
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  context TEXT NOT NULL,
  category TEXT NOT NULL,
  inRotation INTEGER NOT NULL DEFAULT 1,
  durationMinutes INTEGER NOT NULL DEFAULT 15,
  intensity INTEGER NOT NULL DEFAULT 3,
  basePriority INTEGER NOT NULL DEFAULT 5,
  currentBpm INTEGER NOT NULL DEFAULT 120,
  isKeyBased INTEGER NOT NULL DEFAULT 0,
  masteredKeys TEXT NOT NULL DEFAULT '[]',
  usesActiveStandard INTEGER NOT NULL DEFAULT 0,
  lastPracticedAt TEXT,
  skippedCount INTEGER NOT NULL DEFAULT 0
);
`;

export const SEED_EXERCISES: Exercise[] = [
  {
    id: 'ex_1',
    title: 'Drop 2 Voicings (Stella & Autumn Leaves)',
    description: 'Smooth voice leading for minor 7th, dominant 7th, and major 7th chords across top 4 strings.',
    context: 'COMPING',
    category: 'MAINTENANCE',
    inRotation: true,
    durationMinutes: 15,
    intensity: 2,
    basePriority: 8,
    currentBpm: 110,
    isKeyBased: true,
    masteredKeys: ['C', 'F', 'Bb', 'Eb'],
    usesActiveStandard: true,
    lastPracticedAt: null,
    skippedCount: 0,
  },
  {
    id: 'ex_2',
    title: 'Bill Evans Rootless Shells',
    description: 'Type A (3-5-7-9) and Type B (7-9-3-5) inversions over the II-V-I cycle with bass pedal points.',
    context: 'COMPING',
    category: 'MAINTENANCE',
    inRotation: true,
    durationMinutes: 15,
    intensity: 2,
    basePriority: 7,
    currentBpm: 120,
    isKeyBased: true,
    masteredKeys: ['F', 'Bb', 'Eb', 'Ab'],
    usesActiveStandard: true,
    lastPracticedAt: null,
    skippedCount: 0,
  },
  {
    id: 'ex_3',
    title: 'Donna Lee Head & Bird Solo',
    description: 'Charlie Parker bebop phrasing, chromatic enclosures, and rapid target-note articulation.',
    context: 'SOLOING',
    category: 'TRANSCRIBING',
    inRotation: true,
    durationMinutes: 20,
    intensity: 5,
    basePriority: 9,
    currentBpm: 180,
    isKeyBased: false,
    masteredKeys: [],
    usesActiveStandard: false,
    lastPracticedAt: null,
    skippedCount: 0,
  },
];
