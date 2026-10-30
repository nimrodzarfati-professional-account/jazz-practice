import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import {
  ActiveStandard,
  Exercise,
  PitchKey,
  SessionLogEntry,
  UserSyncState,
} from '../types/models';

export interface PendingMutation {
  id: string;
  entityType: 'exercise' | 'standard' | 'practice_log' | 'user_state';
  action: 'UPSERT' | 'DELETE';
  payload: string; // JSON string of Exercise, ActiveStandard, SessionLogEntry, UserSyncState, or { id: string }
  createdAt: string;
}

interface SyncDb {
  execSync(sql: string): void;
  getFirstSync<T>(sql: string, params?: any[]): T | null;
  getAllSync<T>(sql: string, params?: any[]): T[];
  runSync(sql: string, params?: any[]): void;
  prepareSync(sql: string): {
    executeSync(params?: any[]): void;
    finalizeSync(): void;
  };
}

let dbInstance: SyncDb | null = null;
let isInitialized = false;

let onCloudPushExercise: ((ex: Exercise) => void) | null = null;
let onCloudDeleteExercise: ((id: string) => void) | null = null;
let onCloudPushStandard: ((std: ActiveStandard) => void) | null = null;
let onCloudPushPracticeLog: ((log: SessionLogEntry) => void) | null = null;
let onCloudPushUserState: ((state: UserSyncState) => void) | null = null;

export function registerCloudSyncHandlers(handlers: {
  pushExercise: (ex: Exercise) => void;
  deleteExercise: (id: string) => void;
  pushStandard: (std: ActiveStandard) => void;
  pushPracticeLog?: (log: SessionLogEntry) => void;
  pushUserState?: (state: UserSyncState) => void;
}): void {
  onCloudPushExercise = handlers.pushExercise;
  onCloudDeleteExercise = handlers.deleteExercise;
  onCloudPushStandard = handlers.pushStandard;
  onCloudPushPracticeLog = handlers.pushPracticeLog || null;
  onCloudPushUserState = handlers.pushUserState || null;
}

const DEFAULT_ACTIVE_STANDARD: ActiveStandard = {
  id: 'std_1',
  title: 'Stella By Starlight',
  defaultKey: 'Bb',
  startedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  rotationCycleDays: 14,
};

const DEFAULT_SEED_EXERCISES: Exercise[] = [
  {
    id: 'ex_1',
    title: 'Drop 2 Voicings (Stella & Autumn Leaves)',
    description:
      'Smooth voice leading for minor 7th, dominant 7th, and major 7th chords across top 4 strings.',
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
    rotationChangedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    accumulatedInRotationMs: 0,
    accumulatedOutRotationMs: 0,
  },
  {
    id: 'ex_2',
    title: 'Bill Evans Rootless Shells',
    description:
      'Type A (3-5-7-9) and Type B (7-9-3-5) inversions over the II-V-I cycle with bass pedal points.',
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
    rotationChangedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    accumulatedInRotationMs: 0,
    accumulatedOutRotationMs: 0,
  },
  {
    id: 'ex_3',
    title: 'Donna Lee Head & Bird Solo',
    description:
      'Charlie Parker bebop phrasing, chromatic enclosures, and rapid target-note articulation.',
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
    rotationChangedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    accumulatedInRotationMs: 0,
    accumulatedOutRotationMs: 0,
  },
  {
    id: 'ex_4',
    title: 'Coltrane Matrix Permutations',
    description:
      'Four-note digital patterns (1-2-3-5) navigating major thirds cycle (Giant Steps substitutions).',
    context: 'SOLOING',
    category: 'NEW_CONCEPT',
    inRotation: true,
    durationMinutes: 15,
    intensity: 4,
    basePriority: 8,
    currentBpm: 140,
    isKeyBased: true,
    masteredKeys: ['C', 'G'],
    usesActiveStandard: false,
    lastPracticedAt: null,
    skippedCount: 0,
    rotationChangedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    accumulatedInRotationMs: 0,
    accumulatedOutRotationMs: 0,
  },
  {
    id: 'ex_5',
    title: 'Altered Dominant Licks & Tritone Subs',
    description:
      'Super Locrian / 7th mode of melodic minor over resolving secondary dominants.',
    context: 'SOLOING',
    category: 'NEW_CONCEPT',
    inRotation: true,
    durationMinutes: 15,
    intensity: 3,
    basePriority: 7,
    currentBpm: 130,
    isKeyBased: true,
    masteredKeys: ['C', 'F', 'Bb'],
    usesActiveStandard: false,
    lastPracticedAt: null,
    skippedCount: 0,
    rotationChangedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    accumulatedInRotationMs: 0,
    accumulatedOutRotationMs: 0,
  },
  {
    id: 'ex_6',
    title: 'Freddie Green 4-to-the-Bar Swing',
    description:
      'Rhythm guitar acoustic swing chunking using 2-note shell chords on strings 4 & 6.',
    context: 'COMPING',
    category: 'MAINTENANCE',
    inRotation: false,
    durationMinutes: 10,
    intensity: 1,
    basePriority: 6,
    currentBpm: 130,
    isKeyBased: false,
    masteredKeys: [],
    usesActiveStandard: true,
    lastPracticedAt: null,
    skippedCount: 0,
    rotationChangedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    accumulatedInRotationMs: 0,
    accumulatedOutRotationMs: 0,
  },
];

function createWebStorageAdapter(): SyncDb {
  const STD_KEY = 'shed_v2_active_standard';
  const EX_KEY = 'shed_v2_exercises';
  const MUT_KEY = 'shed_v2_pending_mutations';

  const readExercises = (): any[] => {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(EX_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  };

  const writeExercises = (list: any[]) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(EX_KEY, JSON.stringify(list));
  };

  const readMutations = (): PendingMutation[] => {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(MUT_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  };

  const writeMutations = (list: PendingMutation[]) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(MUT_KEY, JSON.stringify(list));
  };

  return {
    execSync(_sql: string) {},
    getFirstSync<T>(sql: string, params?: any[]): T | null {
      if (typeof localStorage === 'undefined') return null;

      if (sql.includes('FROM active_standard')) {
        const raw = localStorage.getItem(STD_KEY);
        if (sql.includes('COUNT(*)')) {
          return { count: raw ? 1 : 0 } as unknown as T;
        }
        return raw ? (JSON.parse(raw) as T) : null;
      }

      if (sql.includes('FROM app_settings')) {
        const [key] = params || [];
        const val = localStorage.getItem('shed_v2_setting_' + key);
        return val !== null ? ({ value: val } as unknown as T) : null;
      }

      if (sql.includes('FROM exercises')) {
        const list = readExercises();
        if (sql.includes('COUNT(*)')) {
          return { count: list.length } as unknown as T;
        }
        if (sql.includes('WHERE id = ?')) {
          const [id] = params || [];
          return (list.find((e) => e.id === id) || null) as unknown as T;
        }
      }

      return null;
    },
    getAllSync<T>(sql: string, _params?: any[]): T[] {
      if (typeof localStorage === 'undefined') return [];

      if (sql.includes('FROM pending_mutations')) {
        const list = readMutations();
        return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt)) as unknown as T[];
      }

      if (sql.includes('FROM exercises')) {
        let list = readExercises();
        if (sql.includes('WHERE inRotation = 1')) {
          list = list.filter((e) => Boolean(e.inRotation));
        }
        if (sql.includes('ORDER BY inRotation DESC, basePriority DESC')) {
          list = [...list].sort((a, b) => {
            const rotDiff = (b.inRotation ? 1 : 0) - (a.inRotation ? 1 : 0);
            if (rotDiff !== 0) return rotDiff;
            return (b.basePriority || 0) - (a.basePriority || 0);
          });
        }
        return list as unknown as T[];
      }
      return [];
    },
    runSync(sql: string, params: any[] = []) {
      if (typeof localStorage === 'undefined') return;

      if (sql.includes('INSERT OR REPLACE INTO active_standard') || sql.includes('INSERT INTO active_standard')) {
        const [id, title, defaultKey, startedAt, rotationCycleDays] = params;
        const std = {
          id: id || 'std_1',
          title: title || DEFAULT_ACTIVE_STANDARD.title,
          defaultKey: defaultKey || DEFAULT_ACTIVE_STANDARD.defaultKey,
          startedAt: startedAt || DEFAULT_ACTIVE_STANDARD.startedAt,
          rotationCycleDays: Number(rotationCycleDays) || 14,
        };
        localStorage.setItem(STD_KEY, JSON.stringify(std));
        return;
      }

      if (sql.includes('UPDATE active_standard')) {
        const [title, defaultKey, startedAt, rotationCycleDays] = params;
        const std = {
          id: 'std_1',
          title,
          defaultKey,
          startedAt,
          rotationCycleDays: Number(rotationCycleDays) || 14,
        };
        localStorage.setItem(STD_KEY, JSON.stringify(std));
        return;
      }

      if (sql.includes('app_settings')) {
        const [key, value] = params;
        localStorage.setItem('shed_v2_setting_' + key, String(value));
        return;
      }

      if (sql.includes('INSERT OR REPLACE INTO pending_mutations')) {
        const [id, entityType, action, payload, createdAt] = params;
        const list = readMutations().filter((m) => m.id !== id);
        list.push({ id, entityType, action, payload, createdAt });
        writeMutations(list);
        return;
      }

      if (sql.includes('DELETE FROM pending_mutations WHERE id = ?')) {
        const [id] = params;
        writeMutations(readMutations().filter((m) => m.id !== id));
        return;
      }

      if (sql.includes('DELETE FROM pending_mutations')) {
        writeMutations([]);
        return;
      }

      if (sql.includes('INSERT OR REPLACE INTO exercises') || sql.includes('INSERT INTO exercises')) {
        const [
          id,
          title,
          description,
          context,
          category,
          inRotation,
          durationMinutes,
          intensity,
          basePriority,
          currentBpm,
          isKeyBased,
          masteredKeys,
          usesActiveStandard,
          lastPracticedAt,
          skippedCount,
          rotationChangedAt,
          accumulatedInRotationMs,
          accumulatedOutRotationMs,
          isHomework,
          homeworkStartedAt,
        ] = params;
        const list = readExercises().filter((e) => e.id !== id);
        list.push({
          id,
          title,
          description,
          context,
          category,
          inRotation: Number(inRotation) ? 1 : 0,
          durationMinutes: Number(durationMinutes) || 15,
          intensity: Number(intensity) || 3,
          basePriority: Number(basePriority) || 5,
          currentBpm: Number(currentBpm) || 120,
          isKeyBased: Number(isKeyBased) ? 1 : 0,
          masteredKeys:
            typeof masteredKeys === 'string'
              ? masteredKeys
              : JSON.stringify(masteredKeys || []),
          usesActiveStandard: Number(usesActiveStandard) ? 1 : 0,
          lastPracticedAt: lastPracticedAt ?? null,
          skippedCount: Number(skippedCount) || 0,
          rotationChangedAt: rotationChangedAt || new Date().toISOString(),
          accumulatedInRotationMs: Number(accumulatedInRotationMs) || 0,
          accumulatedOutRotationMs: Number(accumulatedOutRotationMs) || 0,
          isHomework: Number(isHomework) ? 1 : 0,
          homeworkStartedAt: homeworkStartedAt || null,
        });
        writeExercises(list);
        return;
      }

      if (sql.includes('UPDATE exercises SET inRotation = ?, rotationChangedAt = ?')) {
        const [inRot, rotChangedAt, accIn, accOut, id] = params;
        const list = readExercises();
        const item = list.find((e) => e.id === id);
        if (item) {
          item.inRotation = inRot;
          item.rotationChangedAt = rotChangedAt;
          item.accumulatedInRotationMs = accIn;
          item.accumulatedOutRotationMs = accOut;
          writeExercises(list);
        }
        return;
      }

      if (sql.includes("SET category = 'MAINTENANCE'")) {
        const [id] = params;
        const list = readExercises();
        const item = list.find((e) => e.id === id);
        if (item) {
          item.category = 'MAINTENANCE';
          item.usesActiveStandard = 1;
          item.intensity = Math.max(1, (item.intensity || 3) - 1);
          item.basePriority = 6;
          item.skippedCount = 0;
          writeExercises(list);
        }
        return;
      }

      if (sql.includes('SET masteredKeys = ?, lastPracticedAt = ?, skippedCount = 0')) {
        const [keys, practicedAt, id] = params;
        const list = readExercises();
        const item = list.find((e) => e.id === id);
        if (item) {
          item.masteredKeys = keys;
          item.lastPracticedAt = practicedAt;
          item.skippedCount = 0;
          writeExercises(list);
        }
        return;
      }

      if (sql.includes('SET masteredKeys = ? WHERE id = ?')) {
        const [keys, id] = params;
        const list = readExercises();
        const item = list.find((e) => e.id === id);
        if (item) {
          item.masteredKeys = keys;
          writeExercises(list);
        }
        return;
      }

      if (sql.includes('UPDATE exercises SET isHomework = ?, homeworkStartedAt = ?')) {
        const [isHw, hwStartedAt, id] = params;
        const list = readExercises();
        const item = list.find((e) => e.id === id);
        if (item) {
          item.isHomework = Number(isHw) ? 1 : 0;
          item.homeworkStartedAt = hwStartedAt || null;
          writeExercises(list);
        }
        return;
      }

      if (sql.includes('UPDATE exercises SET isHomework = 0, homeworkStartedAt = NULL')) {
        const [id] = params;
        const list = readExercises();
        const item = list.find((e) => e.id === id);
        if (item) {
          item.isHomework = 0;
          item.homeworkStartedAt = null;
          writeExercises(list);
        }
        return;
      }

      if (sql.includes('UPDATE exercises SET title = ?, description = ?')) {
        const [
          title,
          description,
          context,
          category,
          durationMinutes,
          intensity,
          basePriority,
          currentBpm,
          isKeyBased,
          usesActiveStandard,
          id,
        ] = params;
        const list = readExercises();
        const item = list.find((e) => e.id === id);
        if (item) {
          Object.assign(item, {
            title,
            description,
            context,
            category,
            durationMinutes,
            intensity,
            basePriority,
            currentBpm,
            isKeyBased,
            usesActiveStandard,
          });
          writeExercises(list);
        }
        return;
      }

      if (sql.includes('DELETE FROM exercises WHERE id = ?')) {
        const [id] = params;
        writeExercises(readExercises().filter((e) => e.id !== id));
        return;
      }

      if (sql.includes('DELETE FROM exercises')) {
        writeExercises([]);
        return;
      }
    },
    prepareSync(sql: string) {
      return {
        executeSync(params: any[] = []) {
          if (typeof localStorage === 'undefined') return;
          if (sql.includes('skippedCount = skippedCount + 1')) {
            const [id] = params;
            const list = readExercises();
            const item = list.find((e) => e.id === id);
            if (item) {
              item.skippedCount = (item.skippedCount || 0) + 1;
              writeExercises(list);
            }
          }
        },
        finalizeSync() {},
      };
    },
  };
}

function getDb(): SyncDb {
  if (dbInstance) return dbInstance;

  if (Platform.OS === 'web' || typeof SharedArrayBuffer === 'undefined') {
    dbInstance = createWebStorageAdapter();
    return dbInstance;
  }

  dbInstance = SQLite.openDatabaseSync('shed_engine_v2.db') as unknown as SyncDb;
  return dbInstance;
}

export function initDatabase(): void {
  if (isInitialized) return;
  const db = getDb();

  db.execSync(`
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
      skippedCount INTEGER NOT NULL DEFAULT 0,
      rotationChangedAt TEXT,
      accumulatedInRotationMs INTEGER NOT NULL DEFAULT 0,
      accumulatedOutRotationMs INTEGER NOT NULL DEFAULT 0,
      isHomework INTEGER NOT NULL DEFAULT 0,
      homeworkStartedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pending_mutations (
      id TEXT PRIMARY KEY NOT NULL,
      entityType TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  const migrations = [
    `ALTER TABLE exercises ADD COLUMN rotationChangedAt TEXT`,
    `ALTER TABLE exercises ADD COLUMN accumulatedInRotationMs INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE exercises ADD COLUMN accumulatedOutRotationMs INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE exercises ADD COLUMN isHomework INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE exercises ADD COLUMN homeworkStartedAt TEXT`,
  ];
  for (const sql of migrations) {
    try {
      db.execSync(sql);
    } catch {
      // Column already exists
    }
  }

  isInitialized = true;

  // Ensure Active Standard exists
  const stdCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM active_standard'
  );
  if (!stdCount || stdCount.count === 0) {
    upsertLocalStandardFromCloud(DEFAULT_ACTIVE_STANDARD);
  }

  // Only seed initial exercises once on first-ever local boot
  const alreadySeeded = getAppSetting('db_seeded_v2');
  if (alreadySeeded !== 'true') {
    const exCount = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM exercises'
    );
    if (!exCount || exCount.count === 0) {
      for (const ex of DEFAULT_SEED_EXERCISES) {
        upsertLocalExerciseFromCloud(ex);
      }
    }
    setAppSetting('db_seeded_v2', 'true');
  }
}

function mapRowToExercise(row: any): Exercise {
  let parsedKeys: PitchKey[] = [];
  if (Array.isArray(row.masteredKeys)) {
    parsedKeys = row.masteredKeys;
  } else if (typeof row.masteredKeys === 'string') {
    try {
      parsedKeys = JSON.parse(row.masteredKeys || '[]');
    } catch {
      parsedKeys = [];
    }
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    context: row.context,
    category: row.category,
    inRotation: Boolean(row.inRotation),
    durationMinutes: Number(row.durationMinutes) || 15,
    intensity: Number(row.intensity) || 3,
    basePriority: Number(row.basePriority) || 5,
    currentBpm: Number(row.currentBpm) || 120,
    isKeyBased: Boolean(row.isKeyBased),
    masteredKeys: parsedKeys,
    usesActiveStandard: Boolean(row.usesActiveStandard),
    lastPracticedAt: row.lastPracticedAt || null,
    skippedCount: Number(row.skippedCount) || 0,
    rotationChangedAt: row.rotationChangedAt || new Date().toISOString(),
    accumulatedInRotationMs: Number(row.accumulatedInRotationMs) || 0,
    accumulatedOutRotationMs: Number(row.accumulatedOutRotationMs) || 0,
    isHomework: Boolean(row.isHomework),
    homeworkStartedAt: row.homeworkStartedAt || null,
  };
}

// ==============================================================================
// Silent Local Cache Mirror Operations (Called ONLY by CloudSyncService)
// Do NOT trigger onCloudPush* callbacks to prevent infinite write loops!
// ==============================================================================

export function upsertLocalExerciseFromCloud(ex: Exercise): void {
  initDatabase();
  const db = getDb();
  db.runSync(
    `INSERT OR REPLACE INTO exercises (
      id, title, description, context, category, inRotation,
      durationMinutes, intensity, basePriority, currentBpm,
      isKeyBased, masteredKeys, usesActiveStandard,
      lastPracticedAt, skippedCount, rotationChangedAt,
      accumulatedInRotationMs, accumulatedOutRotationMs,
      isHomework, homeworkStartedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ex.id,
      ex.title,
      ex.description || '',
      ex.context,
      ex.category,
      ex.inRotation ? 1 : 0,
      ex.durationMinutes,
      ex.intensity,
      ex.basePriority,
      ex.currentBpm,
      ex.isKeyBased ? 1 : 0,
      JSON.stringify(ex.masteredKeys || []),
      ex.usesActiveStandard ? 1 : 0,
      ex.lastPracticedAt || null,
      ex.skippedCount || 0,
      ex.rotationChangedAt || new Date().toISOString(),
      ex.accumulatedInRotationMs || 0,
      ex.accumulatedOutRotationMs || 0,
      ex.isHomework ? 1 : 0,
      ex.homeworkStartedAt || null,
    ]
  );
}

export function deleteLocalExerciseFromCloud(id: string): void {
  initDatabase();
  const db = getDb();
  db.runSync('DELETE FROM exercises WHERE id = ?', [id]);
}

export function upsertLocalStandardFromCloud(std: ActiveStandard): void {
  initDatabase();
  const db = getDb();
  db.runSync(
    `INSERT OR REPLACE INTO active_standard (id, title, defaultKey, startedAt, rotationCycleDays)
     VALUES (?, ?, ?, ?, ?)`,
    [
      std.id || 'std_1',
      std.title,
      std.defaultKey || 'Bb',
      std.startedAt || new Date().toISOString(),
      Number(std.rotationCycleDays) || 14,
    ]
  );
}

/**
 * Replaces the local SQLite / localStorage cache with the authoritative Supabase snapshot.
 * Preserves any exercises that still have a pending local UPSERT mutation in the outbox,
 * and excludes any exercises that have a pending local DELETE mutation.
 */
export function replaceLocalCacheWithCloudData(
  remoteStandard: ActiveStandard | null,
  remoteExercises: Exercise[],
  pendingDeletedIds: Set<string> = new Set(),
  pendingUpsertExercises: Map<string, Exercise> = new Map()
): void {
  initDatabase();
  const db = getDb();

  if (remoteStandard) {
    upsertLocalStandardFromCloud(remoteStandard);
  }

  const remoteIds = new Set<string>();
  for (const ex of remoteExercises) {
    if (pendingDeletedIds.has(ex.id)) continue;
    remoteIds.add(ex.id);
    const override = pendingUpsertExercises.get(ex.id);
    upsertLocalExerciseFromCloud(override || ex);
  }

  // Also keep any newly created offline exercises not yet flushed to Supabase
  for (const [id, pendingEx] of pendingUpsertExercises.entries()) {
    if (!remoteIds.has(id) && !pendingDeletedIds.has(id)) {
      remoteIds.add(id);
      upsertLocalExerciseFromCloud(pendingEx);
    }
  }

  // Delete any stale local rows that no longer exist in Supabase
  const existingLocal = getAllVaultExercises();
  for (const localEx of existingLocal) {
    if (!remoteIds.has(localEx.id)) {
      db.runSync('DELETE FROM exercises WHERE id = ?', [localEx.id]);
    }
  }

  setAppSetting('db_seeded_v2', 'true');
}

// ==============================================================================
// Offline Outbox Queue Helpers
// ==============================================================================

export function savePendingMutation(mutation: PendingMutation): void {
  initDatabase();
  const db = getDb();
  db.runSync(
    `INSERT OR REPLACE INTO pending_mutations (id, entityType, action, payload, createdAt)
     VALUES (?, ?, ?, ?, ?)`,
    [
      mutation.id,
      mutation.entityType,
      mutation.action,
      mutation.payload,
      mutation.createdAt,
    ]
  );
}

export function getPendingMutations(): PendingMutation[] {
  initDatabase();
  const db = getDb();
  return db.getAllSync<PendingMutation>(
    'SELECT * FROM pending_mutations ORDER BY createdAt ASC'
  );
}

export function removePendingMutation(id: string): void {
  initDatabase();
  const db = getDb();
  db.runSync('DELETE FROM pending_mutations WHERE id = ?', [id]);
}

// ==============================================================================
// Public Read & Write Repository Functions (Write-Through to Supabase)
// ==============================================================================

export function getActiveStandard(): ActiveStandard {
  initDatabase();
  const db = getDb();
  const row = db.getFirstSync<any>('SELECT * FROM active_standard LIMIT 1');
  if (!row || !row.title || !row.startedAt) {
    return DEFAULT_ACTIVE_STANDARD;
  }
  return {
    id: row.id || 'std_1',
    title: row.title,
    defaultKey: (row.defaultKey as PitchKey) || 'Bb',
    startedAt: row.startedAt,
    rotationCycleDays: Number(row.rotationCycleDays) || 14,
  };
}

export function rotateActiveStandard(
  newTitle: string,
  newKey: PitchKey,
  cycleDays: 7 | 10 | 14 = 14
): ActiveStandard {
  initDatabase();
  const nowIso = new Date().toISOString();
  const updatedStd: ActiveStandard = {
    id: 'std_1',
    title: newTitle,
    defaultKey: newKey,
    startedAt: nowIso,
    rotationCycleDays: cycleDays,
  };
  upsertLocalStandardFromCloud(updatedStd);
  if (onCloudPushStandard) {
    onCloudPushStandard(updatedStd);
  }
  return updatedStd;
}

export function getExerciseById(id: string): Exercise | null {
  initDatabase();
  const db = getDb();
  const row = db.getFirstSync<any>('SELECT * FROM exercises WHERE id = ?', [id]);
  return row ? mapRowToExercise(row) : null;
}

export function getRotationExercises(): Exercise[] {
  initDatabase();
  const db = getDb();
  const rows = db.getAllSync<any>('SELECT * FROM exercises WHERE inRotation = 1');
  return rows.map(mapRowToExercise);
}

export function getAllVaultExercises(): Exercise[] {
  initDatabase();
  const db = getDb();
  const rows = db.getAllSync<any>(
    'SELECT * FROM exercises ORDER BY inRotation DESC, basePriority DESC'
  );
  return rows.map(mapRowToExercise);
}

export function toggleExerciseRotation(id: string, inRotation: boolean): void {
  initDatabase();
  const db = getDb();
  const row = db.getFirstSync<any>('SELECT * FROM exercises WHERE id = ?', [id]);
  if (!row) return;
  const currentInRot = Boolean(row.inRotation);
  if (currentInRot === inRotation) {
    return; // No change in rotation status; preserve streak!
  }
  const changedAt = row.rotationChangedAt || new Date().toISOString();
  const elapsedMs = Math.max(0, Date.now() - new Date(changedAt).getTime());
  let accIn = Number(row.accumulatedInRotationMs) || 0;
  let accOut = Number(row.accumulatedOutRotationMs) || 0;
  if (currentInRot) {
    accIn += elapsedMs;
  } else {
    accOut += elapsedMs;
  }
  const nowIso = new Date().toISOString();
  db.runSync(
    'UPDATE exercises SET inRotation = ?, rotationChangedAt = ?, accumulatedInRotationMs = ?, accumulatedOutRotationMs = ? WHERE id = ?',
    [inRotation ? 1 : 0, nowIso, accIn, accOut, id]
  );
  if (onCloudPushExercise) {
    const updated = getExerciseById(id);
    if (updated) onCloudPushExercise(updated);
  }
}

export function graduateExerciseToMaintenance(id: string): void {
  initDatabase();
  const db = getDb();
  db.runSync(
    `UPDATE exercises
     SET category = 'MAINTENANCE',
         usesActiveStandard = 1,
         intensity = MAX(1, intensity - 1),
         basePriority = 6,
         skippedCount = 0
     WHERE id = ?`,
    [id]
  );
  if (onCloudPushExercise) {
    const updated = getExerciseById(id);
    if (updated) onCloudPushExercise(updated);
  }
}

export function updateExerciseProgress(
  id: string,
  bpm: number,
  keys: PitchKey[],
  markPracticedNow: boolean
): void {
  initDatabase();
  const db = getDb();
  if (markPracticedNow) {
    db.runSync(
      `UPDATE exercises
       SET masteredKeys = ?, lastPracticedAt = ?, skippedCount = 0
       WHERE id = ?`,
      [JSON.stringify(keys), new Date().toISOString(), id]
    );
    const exercise = getExerciseById(id);
    if (exercise) {
      const activeStd = getActiveStandard();
      const stdTitle =
        exercise.usesActiveStandard || exercise.category === 'MAINTENANCE'
          ? activeStd?.title
          : undefined;
      // Log the session's achieved BPM in practice_logs without altering exercises.currentBpm
      logPracticeSession(
        { ...exercise, currentBpm: bpm },
        exercise.durationMinutes,
        stdTitle
      );
    }
  } else {
    db.runSync(
      `UPDATE exercises SET masteredKeys = ? WHERE id = ?`,
      [JSON.stringify(keys), id]
    );
  }
  if (onCloudPushExercise) {
    const updated = getExerciseById(id);
    if (updated) onCloudPushExercise(updated);
  }
}

export function incrementSkippedForCanceledSession(exerciseIds: string[]): void {
  initDatabase();
  const db = getDb();
  const stmt = db.prepareSync(
    'UPDATE exercises SET skippedCount = skippedCount + 1 WHERE id = ?'
  );
  try {
    for (const id of exerciseIds) {
      stmt.executeSync([id]);
    }
  } finally {
    stmt.finalizeSync();
  }
  if (onCloudPushExercise) {
    for (const id of exerciseIds) {
      const updated = getExerciseById(id);
      if (updated) onCloudPushExercise(updated);
    }
  }
}

export function addExercise(ex: Omit<Exercise, 'id'> & { id?: string }): Exercise {
  initDatabase();
  const id = ex.id || `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const rotationChangedAt = ex.rotationChangedAt || new Date().toISOString();
  const accumulatedInRotationMs = ex.accumulatedInRotationMs || 0;
  const accumulatedOutRotationMs = ex.accumulatedOutRotationMs || 0;

  const result: Exercise = {
    ...ex,
    id,
    lastPracticedAt: ex.lastPracticedAt ?? null,
    skippedCount: ex.skippedCount ?? 0,
    rotationChangedAt,
    accumulatedInRotationMs,
    accumulatedOutRotationMs,
    isHomework: Boolean(ex.isHomework),
    homeworkStartedAt: ex.homeworkStartedAt || (ex.isHomework ? new Date().toISOString() : null),
  };

  upsertLocalExerciseFromCloud(result);

  if (onCloudPushExercise) {
    onCloudPushExercise(result);
  }
  return result;
}

export function deleteExercise(id: string): void {
  initDatabase();
  const db = getDb();
  db.runSync('DELETE FROM exercises WHERE id = ?', [id]);
  if (onCloudDeleteExercise) {
    onCloudDeleteExercise(id);
  }
}

export function updateExerciseDetails(
  id: string,
  updates: Pick<
    Exercise,
    | 'title'
    | 'description'
    | 'context'
    | 'category'
    | 'durationMinutes'
    | 'intensity'
    | 'basePriority'
    | 'currentBpm'
    | 'isKeyBased'
    | 'usesActiveStandard'
  > &
    Partial<Pick<Exercise, 'isHomework' | 'homeworkStartedAt'>>
): void {
  initDatabase();
  const db = getDb();
  db.runSync(
    `UPDATE exercises SET title = ?, description = ?, context = ?, category = ?, durationMinutes = ?, intensity = ?, basePriority = ?, currentBpm = ?, isKeyBased = ?, usesActiveStandard = ? WHERE id = ?`,
    [
      updates.title,
      updates.description,
      updates.context,
      updates.category,
      updates.durationMinutes,
      updates.intensity,
      updates.basePriority,
      updates.currentBpm,
      updates.isKeyBased ? 1 : 0,
      updates.usesActiveStandard ? 1 : 0,
      id,
    ]
  );
  if (updates.isHomework !== undefined) {
    const nowIso = updates.isHomework ? updates.homeworkStartedAt || new Date().toISOString() : null;
    db.runSync(
      'UPDATE exercises SET isHomework = ?, homeworkStartedAt = ? WHERE id = ?',
      [updates.isHomework ? 1 : 0, nowIso, id]
    );
  }
  if (onCloudPushExercise) {
    const updated = getExerciseById(id);
    if (updated) onCloudPushExercise(updated);
  }
}

/**
 * Assigns an exercise as a 7-day high-urgency Weekly Homework assignment (or clears it)
 */
export function setExerciseHomework(id: string, isHomework: boolean): void {
  initDatabase();
  const db = getDb();
  const nowIso = isHomework ? new Date().toISOString() : null;
  db.runSync(
    'UPDATE exercises SET isHomework = ?, homeworkStartedAt = ? WHERE id = ?',
    [isHomework ? 1 : 0, nowIso, id]
  );
  if (isHomework) {
    const ex = getExerciseById(id);
    if (ex && !ex.inRotation) {
      toggleExerciseRotation(id, true);
    }
  }
  if (onCloudPushExercise) {
    const updated = getExerciseById(id);
    if (updated) onCloudPushExercise(updated);
  }
}

/**
 * Resolves the 7-day Homework cycle decision: keep in active rotation or archive to vault
 */
export function resolveHomeworkDecision(id: string, decision: 'keep' | 'vault'): void {
  initDatabase();
  const db = getDb();
  db.runSync(
    'UPDATE exercises SET isHomework = 0, homeworkStartedAt = NULL WHERE id = ?',
    [id]
  );
  if (decision === 'vault') {
    toggleExerciseRotation(id, false);
  } else {
    const ex = getExerciseById(id);
    if (ex && !ex.inRotation) {
      toggleExerciseRotation(id, true);
    }
  }
  if (onCloudPushExercise) {
    const updated = getExerciseById(id);
    if (updated) onCloudPushExercise(updated);
  }
}

export function bulkAddExercises(
  items: (Omit<
    Exercise,
    'id' | 'rotationChangedAt' | 'accumulatedInRotationMs' | 'accumulatedOutRotationMs'
  > &
    Partial<
      Pick<Exercise, 'rotationChangedAt' | 'accumulatedInRotationMs' | 'accumulatedOutRotationMs'>
    >)[]
): Exercise[] {
  initDatabase();
  const nowIso = new Date().toISOString();
  return items.map((item) =>
    addExercise({
      ...item,
      rotationChangedAt: item.rotationChangedAt || nowIso,
      accumulatedInRotationMs: item.accumulatedInRotationMs || 0,
      accumulatedOutRotationMs: item.accumulatedOutRotationMs || 0,
    })
  );
}

export function getAppSetting(key: string): string | null {
  try {
    const db = getDb();
    const row = db.getFirstSync<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      [key]
    );
    return row ? row.value : null;
  } catch {
    return null;
  }
}

export function setAppSetting(key: string, value: string): void {
  try {
    const db = getDb();
    db.runSync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  } catch (err) {
    console.warn('[Repository] setAppSetting error:', err);
  }
}

// ==============================================================================
// Practice Logs & User Sync State Operations
// ==============================================================================

const LOGS_SETTING_KEY = 'shed_v2_practice_logs_json';
const USER_STATE_SETTING_KEY = 'shed_v2_user_sync_state_json';

export function getPracticeLogs(): SessionLogEntry[] {
  initDatabase();
  const raw = getAppSetting(LOGS_SETTING_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SessionLogEntry[];
  } catch {
    return [];
  }
}

export function upsertLocalPracticeLogsFromCloud(logs: SessionLogEntry[]): void {
  initDatabase();
  const existing = getPracticeLogs();
  const map = new Map<string, SessionLogEntry>();
  for (const l of existing) map.set(l.id, l);
  for (const l of logs) map.set(l.id, l);
  const merged = Array.from(map.values())
    .sort((a, b) => b.practicedAt.localeCompare(a.practicedAt))
    .slice(0, 200);
  setAppSetting(LOGS_SETTING_KEY, JSON.stringify(merged));
}

export function logPracticeSession(
  exercise: Exercise,
  durationMinutes: number,
  standardTitle?: string
): SessionLogEntry {
  initDatabase();
  const nowIso = new Date().toISOString();
  const entry: SessionLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    exerciseId: exercise.id,
    exerciseTitle: exercise.title,
    standardTitle,
    durationMinutes,
    bpmAchieved: exercise.currentBpm,
    masteredKeys: exercise.masteredKeys,
    practicedAt: nowIso,
  };
  upsertLocalPracticeLogsFromCloud([entry]);
  if (onCloudPushPracticeLog) {
    onCloudPushPracticeLog(entry);
  }
  return entry;
}

export const DEFAULT_USER_SYNC_STATE: UserSyncState = {
  id: 'state_1',
  availableMinutes: 30,
  intensity: 3,
  contextFilter: 'ALL',
  activeQueueIds: [],
  activeQueueIndex: 0,
  metronomeFeel: 'BACKBEAT_2_4',
  metronomeVoice: 'PENDULUM',
  themeMode: 'default',
  updatedAt: new Date(0).toISOString(),
};

export function getUserSyncState(): UserSyncState {
  initDatabase();
  const raw = getAppSetting(USER_STATE_SETTING_KEY);
  if (!raw) return DEFAULT_USER_SYNC_STATE;
  try {
    return { ...DEFAULT_USER_SYNC_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_USER_SYNC_STATE;
  }
}

export function upsertLocalUserStateFromCloud(state: UserSyncState): void {
  initDatabase();
  setAppSetting(USER_STATE_SETTING_KEY, JSON.stringify(state));
}

export function saveUserSyncState(
  partial: Partial<Omit<UserSyncState, 'id' | 'updatedAt'>>
): UserSyncState {
  initDatabase();
  const current = getUserSyncState();

  // Check if any field in `partial` actually changed to avoid redundant cloud writes & realtime loops
  const hasChanged = (Object.keys(partial) as (keyof typeof partial)[]).some((key) => {
    const nextVal = partial[key];
    if (nextVal === undefined) return false;
    const currVal = current[key];
    if (Array.isArray(nextVal) && Array.isArray(currVal)) {
      return (
        nextVal.length !== currVal.length ||
        nextVal.some((v, idx) => v !== currVal[idx])
      );
    }
    return nextVal !== currVal;
  });

  if (!hasChanged) {
    return current;
  }

  const updated: UserSyncState = {
    ...current,
    ...partial,
    id: 'state_1',
    updatedAt: new Date().toISOString(),
  };
  upsertLocalUserStateFromCloud(updated);
  if (onCloudPushUserState) {
    onCloudPushUserState(updated);
  }
  return updated;
}

