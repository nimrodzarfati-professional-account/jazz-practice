/**
 * Database & Cloud Client Initialization for Shed Engine
 * 
 * - Primary: Offline-first local SQLite via expo-sqlite
 * - Cloud: Supabase client for optional cloud backup synchronization
 */
import * as SQLite from 'expo-sqlite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CREATE_TABLES_SQL,
  SCHEMA_VERSION,
  SEED_EXERCISES,
  SEED_ALARMS,
} from './schema';

const DB_NAME = 'shed_engine.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Optional Supabase environment configuration */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Returns the Supabase client if configured, or null if running strictly offline
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseInstance && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('[Supabase] Failed to initialize Supabase client:', err);
      supabaseInstance = null;
    }
  }
  return supabaseInstance;
}

/**
 * Initializes the SQLite database, creates tables, runs migrations,
 * and seeds initial jazz repertoire if empty.
 */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      // Execute schema creation
      await db.execAsync(CREATE_TABLES_SQL);

      // Check schema version and run migrations if necessary
      const versionRow = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM metadata WHERE key = ?',
        ['schema_version']
      );

      if (!versionRow) {
        // Record initial version
        await db.runAsync(
          'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)',
          ['schema_version', String(SCHEMA_VERSION)]
        );

        // Check if exercises need seeding
        const countRow = await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM exercises'
        );

        if (!countRow || countRow.count === 0) {
          const now = new Date().toISOString();

          // Seed default exercises
          for (const ex of SEED_EXERCISES) {
            await db.runAsync(
              `INSERT INTO exercises (
                id, title, description, context, category, base_priority,
                default_duration_minutes, target_bpm, key_stamps_json,
                last_practiced_at, created_at, updated_at, is_archived
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                ex.id,
                ex.title,
                ex.description,
                ex.context,
                ex.category,
                ex.basePriority,
                ex.defaultDurationMinutes,
                ex.targetBpm ?? null,
                JSON.stringify(ex.keyStamps),
                ex.lastPracticedAt ?? null,
                now,
                now,
                0,
              ]
            );
          }

          // Seed default alarm schedules
          for (const alarm of SEED_ALARMS) {
            await db.runAsync(
              `INSERT INTO alarm_schedules (
                id, day_of_week, hour, minute, enabled, label,
                default_session_minutes, default_intensity, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                alarm.id,
                alarm.day_of_week,
                alarm.hour,
                alarm.minute,
                alarm.enabled,
                alarm.label,
                alarm.default_session_minutes,
                alarm.default_intensity,
                now,
              ]
            );
          }
        }
      }

      dbInstance = db;
      return db;
    } catch (err) {
      console.error('[Database] Failed to initialize SQLite database:', err);
      throw err;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}
