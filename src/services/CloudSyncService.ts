/**
 * CloudSyncService — Realtime Cloud Synchronization for Shed Engine V2
 * 
 * Architecture:
 * - Remote Supabase DB is the Source of Truth
 * - Local SQLite (mobile) / localStorage (web) acts as the offline cache & backup
 * - Instant write-through on every mutating action (add, delete, rotate, edit, progress)
 * - Automatic Realtime WebSocket subscription pushes changes to all connected devices
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ActiveStandard, Exercise, PitchKey } from '../types/models';
import {
  getAllVaultExercises,
  getActiveStandard,
  updateExerciseDetails,
  updateExerciseProgress,
  toggleExerciseRotation,
  addExercise,
  deleteExercise,
  rotateActiveStandard,
  registerCloudSyncHandlers,
  getAppSetting,
  setAppSetting,
} from '../db/repository';

interface CloudConfig {
  url: string;
  anonKey: string;
}

let supabaseInstance: SupabaseClient | null = null;
let currentConfig: CloudConfig | null = null;

/**
 * Loads cloud credentials from local storage/db or environment variables
 */
export function getCloudConfig(): CloudConfig {
  if (currentConfig && (currentConfig.url || currentConfig.anonKey)) return currentConfig;

  // 1. Try saved credentials from persistent DB / storage
  try {
    const savedUrl = getAppSetting('supabase_url');
    const savedKey = getAppSetting('supabase_anon_key');
    if (savedUrl && savedKey) {
      currentConfig = { url: savedUrl.trim(), anonKey: savedKey.trim() };
      return currentConfig;
    }
  } catch {}

  // 2. Fall back to build-time environment variables
  const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

  currentConfig = {
    url: envUrl.trim(),
    anonKey: envKey.trim(),
  };

  return currentConfig;
}

/**
 * Saves user-provided credentials into persistent storage
 */
export function saveCloudConfig(url: string, anonKey: string): void {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();
  currentConfig = { url: cleanUrl, anonKey: cleanKey };

  try {
    setAppSetting('supabase_url', cleanUrl);
    setAppSetting('supabase_anon_key', cleanKey);
  } catch {}

  // Reset existing client instance so next call re-creates with new credentials
  supabaseInstance = null;
}

/**
 * Clears saved cloud credentials
 */
export function clearCloudConfig(): void {
  currentConfig = { url: '', anonKey: '' };
  try {
    setAppSetting('supabase_url', '');
    setAppSetting('supabase_anon_key', '');
  } catch {}
  supabaseInstance = null;
}

/**
 * Returns true if cloud sync credentials are configured
 */
export function isCloudConfigured(): boolean {
  const cfg = getCloudConfig();
  return Boolean(cfg.url && cfg.anonKey);
}

/**
 * Returns active Supabase client or null if not configured
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const cfg = getCloudConfig();
  if (!cfg.url || !cfg.anonKey) {
    return null;
  }

  try {
    supabaseInstance = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return supabaseInstance;
  } catch (err) {
    console.warn('[CloudSync] Failed to initialize Supabase client:', err);
    supabaseInstance = null;
    return null;
  }
}

// ==============================================================================
// Bidirectional Data Converters (App Domain <-> Cloud Postgres)
// ==============================================================================

export function exerciseToCloudRow(ex: Exercise): Record<string, any> {
  return {
    id: ex.id,
    title: ex.title,
    description: ex.description || '',
    context: ex.context,
    category: ex.category,
    in_rotation: Boolean(ex.inRotation),
    duration_minutes: Number(ex.durationMinutes) || 15,
    intensity: Number(ex.intensity) || 3,
    base_priority: Number(ex.basePriority) || 5,
    current_bpm: Number(ex.currentBpm) || 120,
    is_key_based: Boolean(ex.isKeyBased),
    mastered_keys: ex.masteredKeys || [],
    uses_active_standard: Boolean(ex.usesActiveStandard),
    last_practiced_at: ex.lastPracticedAt,
    skipped_count: Number(ex.skippedCount) || 0,
    rotation_changed_at: ex.rotationChangedAt || new Date().toISOString(),
    accumulated_in_rotation_ms: Number(ex.accumulatedInRotationMs) || 0,
    accumulated_out_rotation_ms: Number(ex.accumulatedOutRotationMs) || 0,
    updated_at: new Date().toISOString(),
  };
}

export function cloudRowToExercise(row: any): Exercise {
  let masteredKeys: PitchKey[] = [];
  if (Array.isArray(row.mastered_keys)) {
    masteredKeys = row.mastered_keys;
  } else if (typeof row.mastered_keys === 'string') {
    try {
      masteredKeys = JSON.parse(row.mastered_keys);
    } catch {
      masteredKeys = [];
    }
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    context: row.context,
    category: row.category,
    inRotation: Boolean(row.in_rotation),
    durationMinutes: Number(row.duration_minutes) || 15,
    intensity: Number(row.intensity) || 3,
    basePriority: Number(row.base_priority) || 5,
    currentBpm: Number(row.current_bpm) || 120,
    isKeyBased: Boolean(row.is_key_based),
    masteredKeys,
    usesActiveStandard: Boolean(row.uses_active_standard),
    lastPracticedAt: row.last_practiced_at || null,
    skippedCount: Number(row.skipped_count) || 0,
    rotationChangedAt: row.rotation_changed_at || new Date().toISOString(),
    accumulatedInRotationMs: Number(row.accumulated_in_rotation_ms) || 0,
    accumulatedOutRotationMs: Number(row.accumulated_out_rotation_ms) || 0,
  };
}

export function standardToCloudRow(std: ActiveStandard): Record<string, any> {
  return {
    id: std.id || 'std_1',
    title: std.title,
    default_key: std.defaultKey || 'Bb',
    started_at: std.startedAt || new Date().toISOString(),
    rotation_cycle_days: Number(std.rotationCycleDays) || 14,
    updated_at: new Date().toISOString(),
  };
}

export function cloudRowToStandard(row: any): ActiveStandard {
  return {
    id: row.id || 'std_1',
    title: row.title,
    defaultKey: (row.default_key as PitchKey) || 'Bb',
    startedAt: row.started_at || new Date().toISOString(),
    rotationCycleDays: Number(row.rotation_cycle_days) || 14,
  };
}

// ==============================================================================
// Realtime Write-Through Operations (Asynchronous Non-Blocking)
// ==============================================================================

/**
 * Pushes exercise creation or update to Supabase
 */
export async function pushExerciseToCloud(exercise: Exercise): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const row = exerciseToCloudRow(exercise);
    await client.from('exercises').upsert(row);
  } catch (err) {
    console.warn('[CloudSync] pushExercise error:', err);
  }
}

/**
 * Pushes exercise deletion to Supabase
 */
export async function pushDeleteExerciseToCloud(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('exercises').delete().eq('id', id);
  } catch (err) {
    console.warn('[CloudSync] pushDelete error:', err);
  }
}

/**
 * Pushes active standard rotation to Supabase
 */
export async function pushStandardToCloud(standard: ActiveStandard): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const row = standardToCloudRow(standard);
    await client.from('active_standard').upsert(row);
  } catch (err) {
    console.warn('[CloudSync] pushStandard error:', err);
  }
}

/**
 * Pulls all records from Supabase (Source of Truth) into local cache.
 * If cloud is empty and local has exercises, pushes local exercises to cloud.
 */
export async function pullAllFromCloud(): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Cloud sync is not configured.' };
  }

  try {
    // 1. Pull Active Standard
    const { data: stdData, error: stdError } = await client
      .from('active_standard')
      .select('*')
      .limit(1);

    if (!stdError && stdData && stdData.length > 0) {
      const remoteStd = cloudRowToStandard(stdData[0]);
      rotateActiveStandard(remoteStd.title, remoteStd.defaultKey, remoteStd.rotationCycleDays as any);
    } else {
      // Seed cloud with local active standard
      const localStd = getActiveStandard();
      await pushStandardToCloud(localStd);
    }

    // 2. Pull Exercises
    const { data: exData, error: exError } = await client
      .from('exercises')
      .select('*');

    if (exError) {
      return { success: false, count: 0, error: exError.message };
    }

    if (!exData || exData.length === 0) {
      // Cloud is empty: push local exercises to cloud so no user data is lost
      const localExercises = getAllVaultExercises();
      if (localExercises.length > 0) {
        const rows = localExercises.map(exerciseToCloudRow);
        await client.from('exercises').upsert(rows);
        return { success: true, count: localExercises.length };
      }
      return { success: true, count: 0 };
    }

    // Update local cache with remote exercises
    const localList = getAllVaultExercises();
    const localMap = new Map(localList.map((e) => [e.id, e]));

    for (const row of exData) {
      const remoteEx = cloudRowToExercise(row);
      if (localMap.has(remoteEx.id)) {
        updateExerciseDetails(remoteEx.id, {
          title: remoteEx.title,
          description: remoteEx.description,
          context: remoteEx.context,
          category: remoteEx.category,
          durationMinutes: remoteEx.durationMinutes,
          intensity: remoteEx.intensity,
          basePriority: remoteEx.basePriority,
          currentBpm: remoteEx.currentBpm,
          isKeyBased: remoteEx.isKeyBased,
          usesActiveStandard: remoteEx.usesActiveStandard,
        });
        updateExerciseProgress(remoteEx.id, remoteEx.currentBpm, remoteEx.masteredKeys, false);
        toggleExerciseRotation(remoteEx.id, remoteEx.inRotation);
      } else {
        addExercise(remoteEx);
      }
    }

    return { success: true, count: exData.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Network error syncing with cloud.' };
  }
}

// ==============================================================================
// Realtime Subscription Listener (Automatic Multi-Device Sync)
// ==============================================================================

/**
 * Subscribes to Realtime changes on exercises and active_standard.
 * When another device (e.g. mobile) writes to the DB, this device immediately receives the update!
 */
export function subscribeToRealtimeChanges(onDataUpdated: () => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel('shed_realtime_sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'exercises' },
      (payload) => {
        try {
          if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id;
            if (oldId) {
              deleteExercise(oldId);
              onDataUpdated();
            }
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new;
            if (row && row.id) {
              const ex = cloudRowToExercise(row);
              const all = getAllVaultExercises();
              const existing = all.find((e) => e.id === ex.id);

              if (existing) {
                updateExerciseDetails(ex.id, {
                  title: ex.title,
                  description: ex.description,
                  context: ex.context,
                  category: ex.category,
                  durationMinutes: ex.durationMinutes,
                  intensity: ex.intensity,
                  basePriority: ex.basePriority,
                  currentBpm: ex.currentBpm,
                  isKeyBased: ex.isKeyBased,
                  usesActiveStandard: ex.usesActiveStandard,
                });
                updateExerciseProgress(ex.id, ex.currentBpm, ex.masteredKeys, false);
                toggleExerciseRotation(ex.id, ex.inRotation);
              } else {
                addExercise(ex);
              }
              onDataUpdated();
            }
          }
        } catch (err) {
          console.warn('[CloudSync] realtime exercise event error:', err);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'active_standard' },
      (payload) => {
        try {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new;
            if (row && row.title) {
              const std = cloudRowToStandard(row);
              rotateActiveStandard(std.title, std.defaultKey, std.rotationCycleDays as any);
              onDataUpdated();
            }
          }
        } catch (err) {
          console.warn('[CloudSync] realtime standard event error:', err);
        }
      }
    )
    .subscribe();

  return () => {
    try {
      client.removeChannel(channel);
    } catch {}
  };
}

// Automatically register write-through hooks with the repository
registerCloudSyncHandlers({
  pushExercise: (ex) => {
    pushExerciseToCloud(ex);
  },
  deleteExercise: (id) => {
    pushDeleteExerciseToCloud(id);
  },
  pushStandard: (std) => {
    pushStandardToCloud(std);
  },
});
