/**
 * Complete Typed Repository for Shed Engine
 * 
 * High-performance offline-first CRUD operations on local SQLite,
 * with optional bidirectional sync to Supabase.
 */
import { getDb, getSupabaseClient } from './client';
import {
  Exercise,
  ExerciseContext,
  ExerciseCategory,
  MusicalKey,
  KeyStampState,
  PracticeSession,
  SessionLogEntry,
  AlarmSchedule,
  IntensityLevel,
} from '../types/models';
import { createDefaultKeyStamps } from './schema';

/* ------------------------------------------------------------------ */
/*  Database Row Types (Snake Case)                                   */
/* ------------------------------------------------------------------ */

interface ExerciseRow {
  id: string;
  title: string;
  description: string;
  context: string;
  category: string;
  base_priority: number;
  default_duration_minutes: number;
  target_bpm: number | null;
  key_stamps_json: string;
  last_practiced_at: string | null;
  created_at: string;
  updated_at: string;
  is_archived: number;
  synced_at: string | null;
}

interface PracticeSessionRow {
  id: string;
  available_minutes: number;
  intensity: number;
  blocks_json: string;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  cancelled: number;
  total_duration_minutes: number;
  created_at: string;
  synced_at: string | null;
}

interface SessionLogRow {
  id: string;
  session_id: string;
  exercise_id: string;
  duration_minutes: number;
  keys_worked_json: string;
  bpm_achieved: number | null;
  notes: string;
  practiced_at: string;
  created_at: string;
  synced_at: string | null;
}

interface AlarmScheduleRow {
  id: string;
  day_of_week: number;
  hour: number;
  minute: number;
  enabled: number;
  label: string;
  default_session_minutes: number;
  default_intensity: number;
  created_at: string;
  synced_at: string | null;
}

/* ------------------------------------------------------------------ */
/*  Mappers                                                            */
/* ------------------------------------------------------------------ */

function mapExerciseRow(row: ExerciseRow): Exercise {
  let keyStamps: KeyStampState[] = [];
  try {
    keyStamps = JSON.parse(row.key_stamps_json);
  } catch {
    keyStamps = createDefaultKeyStamps();
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    context: row.context as ExerciseContext,
    category: row.category as ExerciseCategory,
    basePriority: row.base_priority,
    defaultDurationMinutes: row.default_duration_minutes,
    targetBpm: row.target_bpm,
    keyStamps,
    lastPracticedAt: row.last_practiced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isArchived: row.is_archived === 1,
  };
}

function mapSessionRow(row: PracticeSessionRow): PracticeSession {
  return {
    id: row.id,
    config: {
      availableMinutes: row.available_minutes,
      intensity: row.intensity as IntensityLevel,
    },
    blocks: JSON.parse(row.blocks_json || '[]'),
    scheduledAt: row.scheduled_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    cancelled: row.cancelled === 1,
    totalDurationMinutes: row.total_duration_minutes,
  };
}

function mapSessionLogRow(row: SessionLogRow): SessionLogEntry {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    durationMinutes: row.duration_minutes,
    keysWorked: JSON.parse(row.keys_worked_json || '[]') as MusicalKey[],
    bpmAchieved: row.bpm_achieved,
    notes: row.notes,
    practicedAt: row.practiced_at,
  };
}

function mapAlarmScheduleRow(row: AlarmScheduleRow): AlarmSchedule {
  return {
    id: row.id,
    dayOfWeek: row.day_of_week,
    hour: row.hour,
    minute: row.minute,
    enabled: row.enabled === 1,
    label: row.label,
    defaultSessionMinutes: row.default_session_minutes,
    defaultIntensity: row.default_intensity as IntensityLevel,
  };
}

/* ------------------------------------------------------------------ */
/*  Exercise Repository Methods                                        */
/* ------------------------------------------------------------------ */

export async function getExercises(options?: {
  context?: ExerciseContext;
  category?: ExerciseCategory;
  includeArchived?: boolean;
}): Promise<Exercise[]> {
  const db = await getDb();
  let query = 'SELECT * FROM exercises WHERE 1=1';
  const params: (string | number)[] = [];

  if (!options?.includeArchived) {
    query += ' AND is_archived = 0';
  }

  if (options?.context) {
    query += ' AND context = ?';
    params.push(options.context);
  }

  if (options?.category) {
    query += ' AND category = ?';
    params.push(options.category);
  }

  query += ' ORDER BY base_priority DESC, created_at DESC';

  const rows = await db.getAllAsync<ExerciseRow>(query, params);
  return rows.map(mapExerciseRow);
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ExerciseRow>(
    'SELECT * FROM exercises WHERE id = ?',
    [id]
  );
  return row ? mapExerciseRow(row) : null;
}

export async function createExercise(
  exercise: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'> & {
    id?: string;
  }
): Promise<Exercise> {
  const db = await getDb();
  const id = exercise.id || `ex-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const keyStamps = exercise.keyStamps?.length ? exercise.keyStamps : createDefaultKeyStamps();

  await db.runAsync(
    `INSERT INTO exercises (
      id, title, description, context, category, base_priority,
      default_duration_minutes, target_bpm, key_stamps_json,
      last_practiced_at, created_at, updated_at, is_archived, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      id,
      exercise.title,
      exercise.description || '',
      exercise.context,
      exercise.category,
      exercise.basePriority,
      exercise.defaultDurationMinutes,
      exercise.targetBpm ?? null,
      JSON.stringify(keyStamps),
      exercise.lastPracticedAt ?? null,
      now,
      now,
      0,
    ]
  );

  return {
    id,
    title: exercise.title,
    description: exercise.description || '',
    context: exercise.context,
    category: exercise.category,
    basePriority: exercise.basePriority,
    defaultDurationMinutes: exercise.defaultDurationMinutes,
    targetBpm: exercise.targetBpm ?? null,
    keyStamps,
    lastPracticedAt: exercise.lastPracticedAt ?? null,
    createdAt: now,
    updatedAt: now,
    isArchived: false,
  };
}

export async function updateExercise(
  id: string,
  updates: Partial<Omit<Exercise, 'id' | 'createdAt'>>
): Promise<Exercise> {
  const db = await getDb();
  const current = await getExerciseById(id);
  if (!current) {
    throw new Error(`Exercise with id ${id} not found`);
  }

  const now = new Date().toISOString();
  const updated: Exercise = {
    ...current,
    ...updates,
    updatedAt: now,
  };

  await db.runAsync(
    `UPDATE exercises SET
      title = ?,
      description = ?,
      context = ?,
      category = ?,
      base_priority = ?,
      default_duration_minutes = ?,
      target_bpm = ?,
      key_stamps_json = ?,
      last_practiced_at = ?,
      updated_at = ?,
      is_archived = ?,
      synced_at = NULL
    WHERE id = ?`,
    [
      updated.title,
      updated.description,
      updated.context,
      updated.category,
      updated.basePriority,
      updated.defaultDurationMinutes,
      updated.targetBpm ?? null,
      JSON.stringify(updated.keyStamps),
      updated.lastPracticedAt ?? null,
      now,
      updated.isArchived ? 1 : 0,
      id,
    ]
  );

  return updated;
}

export async function updateExerciseKeyStamps(
  id: string,
  keyStamps: KeyStampState[]
): Promise<Exercise> {
  return updateExercise(id, { keyStamps });
}

export async function markExercisePracticed(
  id: string,
  keysWorked?: MusicalKey[],
  bpmAchieved?: number | null
): Promise<Exercise> {
  const exercise = await getExerciseById(id);
  if (!exercise) {
    throw new Error(`Exercise ${id} not found`);
  }

  const now = new Date().toISOString();
  let updatedStamps = [...exercise.keyStamps];

  if (keysWorked && keysWorked.length > 0) {
    updatedStamps = updatedStamps.map((stamp) => {
      if (keysWorked.includes(stamp.key)) {
        return {
          ...stamp,
          stamped: true,
          bpm: bpmAchieved ?? stamp.bpm,
          stampedAt: now,
        };
      }
      return stamp;
    });
  }

  return updateExercise(id, {
    lastPracticedAt: now,
    keyStamps: updatedStamps,
  });
}

export async function deleteExercise(id: string, permanent: boolean = false): Promise<void> {
  const db = await getDb();
  if (permanent) {
    await db.runAsync('DELETE FROM exercises WHERE id = ?', [id]);
  } else {
    await db.runAsync(
      'UPDATE exercises SET is_archived = 1, updated_at = ?, synced_at = NULL WHERE id = ?',
      [new Date().toISOString(), id]
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Practice Session Methods                                           */
/* ------------------------------------------------------------------ */

export async function createPracticeSession(
  session: Omit<PracticeSession, 'id' | 'scheduledAt'> & {
    id?: string;
    scheduledAt?: string;
  }
): Promise<PracticeSession> {
  const db = await getDb();
  const id = session.id || `session-${Date.now()}`;
  const now = new Date().toISOString();
  const scheduledAt = session.scheduledAt || now;

  await db.runAsync(
    `INSERT INTO practice_sessions (
      id, available_minutes, intensity, blocks_json, scheduled_at,
      started_at, completed_at, cancelled, total_duration_minutes,
      created_at, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      id,
      session.config.availableMinutes,
      session.config.intensity,
      JSON.stringify(session.blocks),
      scheduledAt,
      session.startedAt ?? null,
      session.completedAt ?? null,
      session.cancelled ? 1 : 0,
      session.totalDurationMinutes || 0,
      now,
    ]
  );

  return {
    id,
    config: session.config,
    blocks: session.blocks,
    scheduledAt,
    startedAt: session.startedAt ?? null,
    completedAt: session.completedAt ?? null,
    cancelled: session.cancelled,
    totalDurationMinutes: session.totalDurationMinutes,
  };
}

export async function updatePracticeSession(
  id: string,
  updates: Partial<PracticeSession>
): Promise<void> {
  const db = await getDb();
  const current = await db.getFirstAsync<PracticeSessionRow>(
    'SELECT * FROM practice_sessions WHERE id = ?',
    [id]
  );
  if (!current) return;

  const updatedCancelled = updates.cancelled !== undefined ? (updates.cancelled ? 1 : 0) : current.cancelled;
  const updatedStarted = updates.startedAt !== undefined ? updates.startedAt : current.started_at;
  const updatedCompleted = updates.completedAt !== undefined ? updates.completedAt : current.completed_at;
  const updatedTotal = updates.totalDurationMinutes !== undefined ? updates.totalDurationMinutes : current.total_duration_minutes;
  const updatedBlocks = updates.blocks ? JSON.stringify(updates.blocks) : current.blocks_json;

  await db.runAsync(
    `UPDATE practice_sessions SET
      started_at = ?,
      completed_at = ?,
      cancelled = ?,
      total_duration_minutes = ?,
      blocks_json = ?,
      synced_at = NULL
    WHERE id = ?`,
    [
      updatedStarted,
      updatedCompleted,
      updatedCancelled,
      updatedTotal,
      updatedBlocks,
      id,
    ]
  );
}

export async function getRecentSessions(limit: number = 10): Promise<PracticeSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PracticeSessionRow>(
    'SELECT * FROM practice_sessions ORDER BY scheduled_at DESC LIMIT ?',
    [limit]
  );
  return rows.map(mapSessionRow);
}

/* ------------------------------------------------------------------ */
/*  Session Logs Methods                                               */
/* ------------------------------------------------------------------ */

export async function logSessionCompletion(
  log: Omit<SessionLogEntry, 'id' | 'practicedAt'> & {
    id?: string;
    practicedAt?: string;
  }
): Promise<SessionLogEntry> {
  const db = await getDb();
  const id = log.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const practicedAt = log.practicedAt || now;

  await db.runAsync(
    `INSERT INTO session_logs (
      id, session_id, exercise_id, duration_minutes, keys_worked_json,
      bpm_achieved, notes, practiced_at, created_at, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      id,
      log.sessionId,
      log.exerciseId,
      log.durationMinutes,
      JSON.stringify(log.keysWorked || []),
      log.bpmAchieved ?? null,
      log.notes || '',
      practicedAt,
      now,
    ]
  );

  // Mark exercise as practiced
  await markExercisePracticed(log.exerciseId, log.keysWorked, log.bpmAchieved);

  return {
    id,
    sessionId: log.sessionId,
    exerciseId: log.exerciseId,
    durationMinutes: log.durationMinutes,
    keysWorked: log.keysWorked,
    bpmAchieved: log.bpmAchieved,
    notes: log.notes,
    practicedAt,
  };
}

export async function getLogsForExercise(exerciseId: string): Promise<SessionLogEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SessionLogRow>(
    'SELECT * FROM session_logs WHERE exercise_id = ? ORDER BY practiced_at DESC',
    [exerciseId]
  );
  return rows.map(mapSessionLogRow);
}

export async function getAllLogs(limit: number = 50): Promise<SessionLogEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SessionLogRow>(
    'SELECT * FROM session_logs ORDER BY practiced_at DESC LIMIT ?',
    [limit]
  );
  return rows.map(mapSessionLogRow);
}

/* ------------------------------------------------------------------ */
/*  Alarm Schedules Methods                                            */
/* ------------------------------------------------------------------ */

export async function getAlarmSchedules(): Promise<AlarmSchedule[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AlarmScheduleRow>(
    'SELECT * FROM alarm_schedules ORDER BY day_of_week ASC, hour ASC, minute ASC'
  );
  return rows.map(mapAlarmScheduleRow);
}

export async function updateAlarmSchedule(
  id: string,
  updates: Partial<Omit<AlarmSchedule, 'id'>>
): Promise<void> {
  const db = await getDb();
  const current = await db.getFirstAsync<AlarmScheduleRow>(
    'SELECT * FROM alarm_schedules WHERE id = ?',
    [id]
  );
  if (!current) return;

  const enabled = updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : current.enabled;
  const hour = updates.hour !== undefined ? updates.hour : current.hour;
  const minute = updates.minute !== undefined ? updates.minute : current.minute;
  const label = updates.label !== undefined ? updates.label : current.label;
  const defaultMinutes = updates.defaultSessionMinutes !== undefined ? updates.defaultSessionMinutes : current.default_session_minutes;
  const defaultIntensity = updates.defaultIntensity !== undefined ? updates.defaultIntensity : current.default_intensity;

  await db.runAsync(
    `UPDATE alarm_schedules SET
      enabled = ?,
      hour = ?,
      minute = ?,
      label = ?,
      default_session_minutes = ?,
      default_intensity = ?,
      synced_at = NULL
    WHERE id = ?`,
    [
      enabled,
      hour,
      minute,
      label,
      defaultMinutes,
      defaultIntensity,
      id,
    ]
  );
}

/* ------------------------------------------------------------------ */
/*  Supabase Cloud Backup Sync (Optional / Resilient)                  */
/* ------------------------------------------------------------------ */

export interface SyncResult {
  syncedExercises: number;
  syncedLogs: number;
  skipped: boolean;
  error?: string;
}

export async function syncPendingRecordsWithSupabase(): Promise<SyncResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      syncedExercises: 0,
      syncedLogs: 0,
      skipped: true,
    };
  }

  const db = await getDb();
  try {
    // 1. Find exercises needing sync
    const pendingExercises = await db.getAllAsync<ExerciseRow>(
      'SELECT * FROM exercises WHERE synced_at IS NULL OR synced_at < updated_at'
    );

    let syncedExercisesCount = 0;
    if (pendingExercises.length > 0) {
      const records = pendingExercises.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        context: row.context,
        category: row.category,
        base_priority: row.base_priority,
        default_duration_minutes: row.default_duration_minutes,
        target_bpm: row.target_bpm,
        key_stamps_json: row.key_stamps_json,
        last_practiced_at: row.last_practiced_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        is_archived: row.is_archived === 1,
      }));

      const { error } = await supabase.from('exercises').upsert(records);
      if (!error) {
        const now = new Date().toISOString();
        for (const ex of pendingExercises) {
          await db.runAsync('UPDATE exercises SET synced_at = ? WHERE id = ?', [now, ex.id]);
        }
        syncedExercisesCount = pendingExercises.length;
      }
    }

    // 2. Find session logs needing sync
    const pendingLogs = await db.getAllAsync<SessionLogRow>(
      'SELECT * FROM session_logs WHERE synced_at IS NULL'
    );

    let syncedLogsCount = 0;
    if (pendingLogs.length > 0) {
      const records = pendingLogs.map((row) => ({
        id: row.id,
        session_id: row.session_id,
        exercise_id: row.exercise_id,
        duration_minutes: row.duration_minutes,
        keys_worked_json: row.keys_worked_json,
        bpm_achieved: row.bpm_achieved,
        notes: row.notes,
        practiced_at: row.practiced_at,
        created_at: row.created_at,
      }));

      const { error } = await supabase.from('session_logs').upsert(records);
      if (!error) {
        const now = new Date().toISOString();
        for (const log of pendingLogs) {
          await db.runAsync('UPDATE session_logs SET synced_at = ? WHERE id = ?', [now, log.id]);
        }
        syncedLogsCount = pendingLogs.length;
      }
    }

    return {
      syncedExercises: syncedExercisesCount,
      syncedLogs: syncedLogsCount,
      skipped: false,
    };
  } catch (err: any) {
    return {
      syncedExercises: 0,
      syncedLogs: 0,
      skipped: false,
      error: err?.message || 'Sync failed',
    };
  }
}
