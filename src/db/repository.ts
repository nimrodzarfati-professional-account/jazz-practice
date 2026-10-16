import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { ActiveStandard, Exercise, PitchKey } from '../types/models';

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

function getDb(): SyncDb {
  if (dbInstance) return dbInstance;

  // Web & environments without SharedArrayBuffer: use persistent localStorage adapter
  if (Platform.OS === 'web' || typeof SharedArrayBuffer === 'undefined') {
    const STD_KEY = 'shed_v2_active_standard';
    const EX_KEY = 'shed_v2_exercises';

    dbInstance = {
      execSync(_sql: string) {},
      getFirstSync<T>(sql: string, _params?: any[]): T | null {
        if (typeof localStorage === 'undefined') return null;
        if (sql.includes('FROM active_standard')) {
          if (sql.includes('COUNT(*)')) {
            const raw = localStorage.getItem(STD_KEY);
            return { count: raw ? 1 : 0 } as unknown as T;
          }
          const raw = localStorage.getItem(STD_KEY);
          return raw ? JSON.parse(raw) : null;
        }
        if (sql.includes('FROM exercises')) {
          if (sql.includes('COUNT(*)')) {
            const raw = localStorage.getItem(EX_KEY);
            const list = raw ? JSON.parse(raw) : [];
            return { count: list.length } as unknown as T;
          }
        }
        return null;
      },
      getAllSync<T>(sql: string, _params?: any[]): T[] {
        if (typeof localStorage === 'undefined') return [];
        if (sql.includes('FROM exercises')) {
          const raw = localStorage.getItem(EX_KEY);
          let list: any[] = raw ? JSON.parse(raw) : [];
          if (sql.includes('WHERE inRotation = 1')) {
            list = list.filter((e) => e.inRotation === 1 || e.inRotation === true);
          }
          if (sql.includes('ORDER BY inRotation DESC, basePriority DESC')) {
            list = list.sort((a, b) => {
              if (b.inRotation !== a.inRotation) return (b.inRotation ? 1 : 0) - (a.inRotation ? 1 : 0);
              return (b.basePriority || 0) - (a.basePriority || 0);
            });
          }
          return list as unknown as T[];
        }
        return [];
      },
      runSync(sql: string, params: any[] = []) {
        if (typeof localStorage === 'undefined') return;
        if (sql.includes('INSERT INTO active_standard')) {
          const [id, title, defaultKey, startedAt, rotationCycleDays] = params;
          const std = { id, title, defaultKey, startedAt, rotationCycleDays };
          localStorage.setItem(STD_KEY, JSON.stringify(std));
          return;
        }
        if (sql.includes('UPDATE active_standard')) {
          const [title, defaultKey, startedAt, rotationCycleDays] = params;
          const std = { id: 'std_1', title, defaultKey, startedAt, rotationCycleDays };
          localStorage.setItem(STD_KEY, JSON.stringify(std));
          return;
        }
        if (sql.includes('INSERT INTO exercises')) {
          const [
            id, title, description, context, category, inRotation,
            durationMinutes, intensity, basePriority, currentBpm,
            isKeyBased, masteredKeys, usesActiveStandard
          ] = params;
          const raw = localStorage.getItem(EX_KEY);
          const list: any[] = raw ? JSON.parse(raw) : [];
          list.push({
            id, title, description, context, category, inRotation,
            durationMinutes, intensity, basePriority, currentBpm,
            isKeyBased, masteredKeys, usesActiveStandard,
            lastPracticedAt: null, skippedCount: 0
          });
          localStorage.setItem(EX_KEY, JSON.stringify(list));
          return;
        }
        if (sql.includes('UPDATE exercises SET inRotation = ? WHERE id = ?')) {
          const [inRot, id] = params;
          const raw = localStorage.getItem(EX_KEY);
          const list: any[] = raw ? JSON.parse(raw) : [];
          const item = list.find((e) => e.id === id);
          if (item) {
            item.inRotation = inRot;
            localStorage.setItem(EX_KEY, JSON.stringify(list));
          }
          return;
        }
        if (sql.includes("SET category = 'MAINTENANCE'")) {
          const [id] = params;
          const raw = localStorage.getItem(EX_KEY);
          const list: any[] = raw ? JSON.parse(raw) : [];
          const item = list.find((e) => e.id === id);
          if (item) {
            item.category = 'MAINTENANCE';
            item.usesActiveStandard = 1;
            item.intensity = Math.max(1, (item.intensity || 3) - 1);
            item.basePriority = 6;
            item.skippedCount = 0;
            localStorage.setItem(EX_KEY, JSON.stringify(list));
          }
          return;
        }
        if (sql.includes('SET currentBpm = ?, masteredKeys = ?, lastPracticedAt = ?, skippedCount = 0')) {
          const [bpm, keys, practicedAt, id] = params;
          const raw = localStorage.getItem(EX_KEY);
          const list: any[] = raw ? JSON.parse(raw) : [];
          const item = list.find((e) => e.id === id);
          if (item) {
            item.currentBpm = bpm;
            item.masteredKeys = keys;
            item.lastPracticedAt = practicedAt;
            item.skippedCount = 0;
            localStorage.setItem(EX_KEY, JSON.stringify(list));
          }
          return;
        }
        if (sql.includes('SET currentBpm = ?, masteredKeys = ? WHERE id = ?')) {
          const [bpm, keys, id] = params;
          const raw = localStorage.getItem(EX_KEY);
          const list: any[] = raw ? JSON.parse(raw) : [];
          const item = list.find((e) => e.id === id);
          if (item) {
            item.currentBpm = bpm;
            item.masteredKeys = keys;
            localStorage.setItem(EX_KEY, JSON.stringify(list));
          }
          return;
        }
        if (sql.includes('DELETE FROM exercises WHERE id = ?')) {
          const [id] = params;
          const raw = localStorage.getItem(EX_KEY);
          let list: any[] = raw ? JSON.parse(raw) : [];
          list = list.filter((e) => e.id !== id);
          localStorage.setItem(EX_KEY, JSON.stringify(list));
          return;
        }
      },
      prepareSync(sql: string) {
        return {
          executeSync(params: any[] = []) {
            if (typeof localStorage === 'undefined') return;
            if (sql.includes('skippedCount = skippedCount + 1')) {
              const [id] = params;
              const raw = localStorage.getItem(EX_KEY);
              const list: any[] = raw ? JSON.parse(raw) : [];
              const item = list.find((e) => e.id === id);
              if (item) {
                item.skippedCount = (item.skippedCount || 0) + 1;
                localStorage.setItem(EX_KEY, JSON.stringify(list));
              }
            }
          },
          finalizeSync() {},
        };
      },
    };

    return dbInstance;
  }

  // Native SQLite on iOS / Android
  dbInstance = SQLite.openDatabaseSync('shed_engine_v2.db') as unknown as SyncDb;
  return dbInstance;
}

export function initDatabase(): void {
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
      skippedCount INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Seed default Active Standard if empty
  const stdCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM active_standard');
  if (!stdCount || stdCount.count === 0) {
    db.runSync(
      `INSERT INTO active_standard (id, title, defaultKey, startedAt, rotationCycleDays)
       VALUES ('std_1', 'Stella By Starlight', 'Bb', ?, 14)`,
      [new Date(Date.now() - 5 * 86400000).toISOString()] // Day 6 of 14
    );
  }

  // Seed authentic jazz exercises if empty
  const exCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM exercises');
  if (!exCount || exCount.count === 0) {
    const defaultExercises = [
      {
        id: 'ex_1',
        title: 'Drop 2 Voicings (Stella & Autumn Leaves)',
        description: 'Smooth voice leading for minor 7th, dominant 7th, and major 7th chords across top 4 strings.',
        context: 'COMPING',
        category: 'MAINTENANCE',
        inRotation: 1,
        durationMinutes: 15,
        intensity: 2,
        basePriority: 8,
        currentBpm: 110,
        isKeyBased: 1,
        masteredKeys: JSON.stringify(['C', 'F', 'Bb', 'Eb']),
        usesActiveStandard: 1,
      },
      {
        id: 'ex_2',
        title: 'Bill Evans Rootless Shells',
        description: 'Type A (3-5-7-9) and Type B (7-9-3-5) inversions over the II-V-I cycle with bass pedal points.',
        context: 'COMPING',
        category: 'MAINTENANCE',
        inRotation: 1,
        durationMinutes: 15,
        intensity: 2,
        basePriority: 7,
        currentBpm: 120,
        isKeyBased: 1,
        masteredKeys: JSON.stringify(['F', 'Bb', 'Eb', 'Ab']),
        usesActiveStandard: 1,
      },
      {
        id: 'ex_3',
        title: 'Donna Lee Head & Bird Solo',
        description: 'Charlie Parker bebop phrasing, chromatic enclosures, and rapid target-note articulation.',
        context: 'SOLOING',
        category: 'TRANSCRIBING',
        inRotation: 1,
        durationMinutes: 20,
        intensity: 5,
        basePriority: 9,
        currentBpm: 180,
        isKeyBased: 0,
        masteredKeys: JSON.stringify([]),
        usesActiveStandard: 0,
      },
      {
        id: 'ex_4',
        title: 'Coltrane Matrix Permutations',
        description: 'Four-note digital patterns (1-2-3-5) navigating major thirds cycle (Giant Steps substitutions).',
        context: 'SOLOING',
        category: 'NEW_CONCEPT',
        inRotation: 1,
        durationMinutes: 15,
        intensity: 4,
        basePriority: 8,
        currentBpm: 140,
        isKeyBased: 1,
        masteredKeys: JSON.stringify(['C', 'G']),
        usesActiveStandard: 0,
      },
      {
        id: 'ex_5',
        title: 'Altered Dominant Licks & Tritone Subs',
        description: 'Super Locrian / 7th mode of melodic minor over resolving secondary dominants.',
        context: 'SOLOING',
        category: 'NEW_CONCEPT',
        inRotation: 1,
        durationMinutes: 15,
        intensity: 3,
        basePriority: 7,
        currentBpm: 130,
        isKeyBased: 1,
        masteredKeys: JSON.stringify(['C', 'F', 'Bb']),
        usesActiveStandard: 0,
      },
      {
        id: 'ex_6',
        title: 'Freddie Green 4-to-the-Bar Swing',
        description: 'Rhythm guitar acoustic swing chunking using 2-note shell chords on strings 4 & 6.',
        context: 'COMPING',
        category: 'MAINTENANCE',
        inRotation: 0,
        durationMinutes: 10,
        intensity: 1,
        basePriority: 6,
        currentBpm: 130,
        isKeyBased: 0,
        masteredKeys: JSON.stringify([]),
        usesActiveStandard: 1,
      },
    ];

    for (const ex of defaultExercises) {
      db.runSync(
        `INSERT INTO exercises (
          id, title, description, context, category, inRotation,
          durationMinutes, intensity, basePriority, currentBpm,
          isKeyBased, masteredKeys, usesActiveStandard, skippedCount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          ex.id,
          ex.title,
          ex.description,
          ex.context,
          ex.category,
          ex.inRotation,
          ex.durationMinutes,
          ex.intensity,
          ex.basePriority,
          ex.currentBpm,
          ex.isKeyBased,
          ex.masteredKeys,
          ex.usesActiveStandard,
        ]
      );
    }
  }
}

function mapRowToExercise(row: any): Exercise {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    context: row.context,
    category: row.category,
    inRotation: Boolean(row.inRotation),
    durationMinutes: row.durationMinutes,
    intensity: row.intensity,
    basePriority: row.basePriority,
    currentBpm: row.currentBpm,
    isKeyBased: Boolean(row.isKeyBased),
    masteredKeys: typeof row.masteredKeys === 'string' ? JSON.parse(row.masteredKeys || '[]') : (row.masteredKeys || []),
    usesActiveStandard: Boolean(row.usesActiveStandard),
    lastPracticedAt: row.lastPracticedAt,
    skippedCount: row.skippedCount || 0,
  };
}

/**
 * Fetch current 1-2 week Jazz Standard for Maintenance exercises
 */
export function getActiveStandard(): ActiveStandard {
  initDatabase();
  const db = getDb();
  const row = db.getFirstSync<any>('SELECT * FROM active_standard LIMIT 1');
  if (!row) {
    return {
      id: 'std_1',
      title: 'Stella By Starlight',
      defaultKey: 'Bb',
      startedAt: new Date().toISOString(),
      rotationCycleDays: 14,
    };
  }
  return {
    id: row.id,
    title: row.title,
    defaultKey: row.defaultKey as PitchKey,
    startedAt: row.startedAt,
    rotationCycleDays: row.rotationCycleDays,
  };
}

/**
 * Rotate to a new Jazz Standard for the next 1-2 weeks
 */
export function rotateActiveStandard(
  newTitle: string,
  newKey: PitchKey,
  cycleDays: 7 | 10 | 14 = 14
): ActiveStandard {
  initDatabase();
  const db = getDb();
  const nowIso = new Date().toISOString();
  db.runSync(
    `UPDATE active_standard
     SET title = ?, defaultKey = ?, startedAt = ?, rotationCycleDays = ?
     WHERE id = 'std_1'`,
    [newTitle, newKey, nowIso, cycleDays]
  );
  return getActiveStandard();
}

/**
 * Returns ONLY exercises currently marked In-Rotation for the daily scheduler
 */
export function getRotationExercises(): Exercise[] {
  initDatabase();
  const db = getDb();
  const rows = db.getAllSync<any>('SELECT * FROM exercises WHERE inRotation = 1');
  return rows.map(mapRowToExercise);
}

/**
 * Returns ALL exercises (Active Rotation + Archived Vault) for The Crate screen
 */
export function getAllVaultExercises(): Exercise[] {
  initDatabase();
  const db = getDb();
  const rows = db.getAllSync<any>('SELECT * FROM exercises ORDER BY inRotation DESC, basePriority DESC');
  return rows.map(mapRowToExercise);
}

/**
 * Toggle whether an exercise is in active rotation or dormant in the Vault
 */
export function toggleExerciseRotation(id: string, inRotation: boolean): void {
  initDatabase();
  const db = getDb();
  db.runSync('UPDATE exercises SET inRotation = ? WHERE id = ?', [inRotation ? 1 : 0, id]);
}

/**
 * GRADUATE TO MAINTENANCE:
 * Converts a NEW_CONCEPT or TRANSCRIBING exercise into an ongoing MAINTENANCE exercise
 * automatically bound to the 1-2 week Active Standard.
 */
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
}

/**
 * Update exercise progress after completing a timer block or stamping keys
 */
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
       SET currentBpm = ?, masteredKeys = ?, lastPracticedAt = ?, skippedCount = 0
       WHERE id = ?`,
      [bpm, JSON.stringify(keys), new Date().toISOString(), id]
    );
  } else {
    db.runSync(
      `UPDATE exercises SET currentBpm = ?, masteredKeys = ? WHERE id = ?`,
      [bpm, JSON.stringify(keys), id]
    );
  }
}

/**
 * Self-Healing: Increment skippedCount for all exercises in a canceled session
 */
export function incrementSkippedForCanceledSession(exerciseIds: string[]): void {
  initDatabase();
  const db = getDb();
  const stmt = db.prepareSync('UPDATE exercises SET skippedCount = skippedCount + 1 WHERE id = ?');
  try {
    for (const id of exerciseIds) {
      stmt.executeSync([id]);
    }
  } finally {
    stmt.finalizeSync();
  }
}

/**
 * Add a new exercise to SQLite / persistent store
 */
export function addExercise(ex: Omit<Exercise, 'id'>): Exercise {
  initDatabase();
  const db = getDb();
  const id = `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  db.runSync(
    `INSERT INTO exercises (
      id, title, description, context, category, inRotation,
      durationMinutes, intensity, basePriority, currentBpm,
      isKeyBased, masteredKeys, usesActiveStandard, skippedCount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      ex.title,
      ex.description,
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
    ]
  );
  return { ...ex, id };
}

/**
 * Delete exercise permanently
 */
export function deleteExercise(id: string): void {
  initDatabase();
  const db = getDb();
  db.runSync('DELETE FROM exercises WHERE id = ?', [id]);
}
