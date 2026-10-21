/**
 * CloudSyncService — Supabase-First Data Layer with Persistent Offline Mirror
 *
 * Architecture:
 * - Supabase is the primary Source of Truth for exercises, active_standard, practice_logs, and user_sync_state.
 * - Every create, update, rotate, and delete executes a direct R/W call to Supabase.
 * - Local SQLite (iOS/Android) / localStorage (Web) is kept as an exact persistent mirror
 *   so the app works seamlessly offline using the last synced version of the database.
 * - Offline mutations are queued in `pending_mutations` and automatically flushed to
 *   Supabase as soon as connectivity returns.
 */
import { AppState, Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ActiveStandard,
  Exercise,
  PitchKey,
  SessionLogEntry,
  UserSyncState,
} from '../types/models';
import {
  getAllVaultExercises,
  getActiveStandard,
  upsertLocalExerciseFromCloud,
  deleteLocalExerciseFromCloud,
  upsertLocalStandardFromCloud,
  replaceLocalCacheWithCloudData,
  savePendingMutation,
  getPendingMutations,
  removePendingMutation,
  registerCloudSyncHandlers,
  getAppSetting,
  setAppSetting,
  getPracticeLogs,
  upsertLocalPracticeLogsFromCloud,
  getUserSyncState,
  upsertLocalUserStateFromCloud,
} from '../db/repository';

export type SyncConnectionStatus = 'connected' | 'syncing' | 'offline';

interface CloudConfig {
  url: string;
  anonKey: string;
}

let supabaseInstance: SupabaseClient | null = null;
let currentConfig: CloudConfig | null = null;
let syncStatus: SyncConnectionStatus = 'syncing';
const statusListeners = new Set<(status: SyncConnectionStatus) => void>();

function setSyncStatus(next: SyncConnectionStatus): void {
  if (syncStatus !== next) {
    syncStatus = next;
    statusListeners.forEach((listener) => listener(syncStatus));
  }
}

export function getSyncStatus(): SyncConnectionStatus {
  return syncStatus;
}

export function subscribeToSyncStatus(
  listener: (status: SyncConnectionStatus) => void
): () => void {
  statusListeners.add(listener);
  listener(syncStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

export function getCloudConfig(): CloudConfig {
  if (currentConfig && currentConfig.url && currentConfig.anonKey) {
    return currentConfig;
  }

  const envUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
  const envKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  if (envUrl && envKey) {
    currentConfig = { url: envUrl, anonKey: envKey };
    return currentConfig;
  }

  try {
    const savedUrl = (getAppSetting('supabase_url') || '').trim();
    const savedKey = (getAppSetting('supabase_anon_key') || '').trim();
    if (savedUrl && savedKey) {
      currentConfig = { url: savedUrl, anonKey: savedKey };
      return currentConfig;
    }
  } catch {
    // Ignore storage read errors
  }

  currentConfig = { url: '', anonKey: '' };
  return currentConfig;
}

export function saveCloudConfig(url: string, anonKey: string): void {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();
  currentConfig = { url: cleanUrl, anonKey: cleanKey };
  try {
    setAppSetting('supabase_url', cleanUrl);
    setAppSetting('supabase_anon_key', cleanKey);
  } catch {}
  supabaseInstance = null;
}

export function isCloudConfigured(): boolean {
  const cfg = getCloudConfig();
  return Boolean(cfg.url && cfg.anonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const cfg = getCloudConfig();
  if (!cfg.url || !cfg.anonKey) {
    setSyncStatus('offline');
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
    setSyncStatus('offline');
    return null;
  }
}

// ==============================================================================
// Bidirectional Data Converters (App Domain <-> Supabase Postgres)
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
    last_practiced_at: ex.lastPracticedAt || null,
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

export function practiceLogToCloudRow(log: SessionLogEntry): Record<string, any> {
  return {
    id: log.id,
    exercise_id: log.exerciseId,
    exercise_title: log.exerciseTitle,
    standard_title: log.standardTitle || null,
    duration_minutes: log.durationMinutes,
    bpm_achieved: log.bpmAchieved,
    mastered_keys: log.masteredKeys || [],
    practiced_at: log.practicedAt,
  };
}

export function cloudRowToPracticeLog(row: any): SessionLogEntry {
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
    exerciseId: row.exercise_id,
    exerciseTitle: row.exercise_title,
    standardTitle: row.standard_title || undefined,
    durationMinutes: Number(row.duration_minutes) || 15,
    bpmAchieved: Number(row.bpm_achieved) || 120,
    masteredKeys,
    practicedAt: row.practiced_at || new Date().toISOString(),
  };
}

export function userStateToCloudRow(state: UserSyncState): Record<string, any> {
  return {
    id: 'state_1',
    available_minutes: state.availableMinutes,
    intensity: state.intensity,
    context_filter: state.contextFilter,
    active_queue_ids: state.activeQueueIds || [],
    active_queue_index: state.activeQueueIndex || 0,
    metronome_feel: state.metronomeFeel || 'BACKBEAT_2_4',
    metronome_voice: state.metronomeVoice || 'PENDULUM',
    theme_mode: state.themeMode || 'default',
    updated_at: state.updatedAt || new Date().toISOString(),
  };
}

export function cloudRowToUserState(row: any): UserSyncState {
  return {
    id: row.id || 'state_1',
    availableMinutes: Number(row.available_minutes) || 30,
    intensity: Number(row.intensity) || 3,
    contextFilter: row.context_filter || 'ALL',
    activeQueueIds: Array.isArray(row.active_queue_ids) ? row.active_queue_ids : [],
    activeQueueIndex: Number(row.active_queue_index) || 0,
    metronomeFeel: row.metronome_feel || 'BACKBEAT_2_4',
    metronomeVoice: row.metronome_voice || 'PENDULUM',
    themeMode: row.theme_mode || 'default',
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

// ==============================================================================
// Direct R/W Operations with Offline Outbox Queue Fallback
// ==============================================================================

export async function pushExerciseToCloud(exercise: Exercise): Promise<void> {
  const mutationId = `mut_ex_${exercise.id}`;
  const client = getSupabaseClient();

  if (!client) {
    savePendingMutation({
      id: mutationId,
      entityType: 'exercise',
      action: 'UPSERT',
      payload: JSON.stringify(exercise),
      createdAt: new Date().toISOString(),
    });
    setSyncStatus('offline');
    return;
  }

  try {
    setSyncStatus('syncing');
    const row = exerciseToCloudRow(exercise);
    const { error } = await client.from('exercises').upsert(row);
    if (error) throw error;
    removePendingMutation(mutationId);
    setSyncStatus('connected');
  } catch (err) {
    console.warn('[CloudSync] Offline or failed pushExercise, queued for retry:', err);
    savePendingMutation({
      id: mutationId,
      entityType: 'exercise',
      action: 'UPSERT',
      payload: JSON.stringify(exercise),
      createdAt: new Date().toISOString(),
    });
    setSyncStatus('offline');
  }
}

export async function pushDeleteExerciseToCloud(id: string): Promise<void> {
  const mutationId = `mut_ex_${id}`;
  const client = getSupabaseClient();

  if (!client) {
    savePendingMutation({
      id: mutationId,
      entityType: 'exercise',
      action: 'DELETE',
      payload: JSON.stringify({ id }),
      createdAt: new Date().toISOString(),
    });
    setSyncStatus('offline');
    return;
  }

  try {
    setSyncStatus('syncing');
    const { error } = await client.from('exercises').delete().eq('id', id);
    if (error) throw error;
    removePendingMutation(mutationId);
    setSyncStatus('connected');
  } catch (err) {
    console.warn('[CloudSync] Offline or failed pushDelete, queued for retry:', err);
    savePendingMutation({
      id: mutationId,
      entityType: 'exercise',
      action: 'DELETE',
      payload: JSON.stringify({ id }),
      createdAt: new Date().toISOString(),
    });
    setSyncStatus('offline');
  }
}

export async function pushStandardToCloud(standard: ActiveStandard): Promise<void> {
  const mutationId = `mut_std_${standard.id || 'std_1'}`;
  const client = getSupabaseClient();

  if (!client) {
    savePendingMutation({
      id: mutationId,
      entityType: 'standard',
      action: 'UPSERT',
      payload: JSON.stringify(standard),
      createdAt: new Date().toISOString(),
    });
    setSyncStatus('offline');
    return;
  }

  try {
    setSyncStatus('syncing');
    const row = standardToCloudRow(standard);
    const { error } = await client.from('active_standard').upsert(row);
    if (error) throw error;
    removePendingMutation(mutationId);
    setSyncStatus('connected');
  } catch (err) {
    console.warn('[CloudSync] Offline or failed pushStandard, queued for retry:', err);
    savePendingMutation({
      id: mutationId,
      entityType: 'standard',
      action: 'UPSERT',
      payload: JSON.stringify(standard),
      createdAt: new Date().toISOString(),
    });
    setSyncStatus('offline');
  }
}

export async function pushPracticeLogToCloud(log: SessionLogEntry): Promise<void> {
  const mutationId = `mut_log_${log.id}`;
  const client = getSupabaseClient();

  if (!client) {
    savePendingMutation({
      id: mutationId,
      entityType: 'practice_log',
      action: 'UPSERT',
      payload: JSON.stringify(log),
      createdAt: new Date().toISOString(),
    });
    setSyncStatus('offline');
    return;
  }

  try {
    const { error } = await client.from('practice_logs').upsert(practiceLogToCloudRow(log));
    if (error) throw error;
    removePendingMutation(mutationId);
    setSyncStatus('connected');
  } catch (err) {
    console.warn('[CloudSync] Offline or failed pushPracticeLog, queued for retry:', err);
    savePendingMutation({
      id: mutationId,
      entityType: 'practice_log',
      action: 'UPSERT',
      payload: JSON.stringify(log),
      createdAt: new Date().toISOString(),
    });
    setSyncStatus('offline');
  }
}

export async function pushUserStateToCloud(state: UserSyncState): Promise<void> {
  const mutationId = 'mut_user_state_1';
  const client = getSupabaseClient();

  if (!client) {
    savePendingMutation({
      id: mutationId,
      entityType: 'user_state',
      action: 'UPSERT',
      payload: JSON.stringify(state),
      createdAt: new Date().toISOString(),
    });
    setSyncStatus('offline');
    return;
  }

  try {
    const { error } = await client.from('user_sync_state').upsert(userStateToCloudRow(state));
    if (error) throw error;
    removePendingMutation(mutationId);
    setSyncStatus('connected');
  } catch (err) {
    console.warn('[CloudSync] Offline or failed pushUserState, queued for retry:', err);
    savePendingMutation({
      id: mutationId,
      entityType: 'user_state',
      action: 'UPSERT',
      payload: JSON.stringify(state),
      createdAt: new Date().toISOString(),
    });
    setSyncStatus('offline');
  }
}

/**
 * Replays any offline mutations stored in `pending_mutations` to Supabase
 */
export async function flushPendingMutations(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const pending = getPendingMutations();
  if (pending.length === 0) return;

  for (const mut of pending) {
    try {
      if (mut.entityType === 'exercise' && mut.action === 'UPSERT') {
        const ex: Exercise = JSON.parse(mut.payload);
        const { error } = await client.from('exercises').upsert(exerciseToCloudRow(ex));
        if (!error) removePendingMutation(mut.id);
      } else if (mut.entityType === 'exercise' && mut.action === 'DELETE') {
        const { id } = JSON.parse(mut.payload);
        const { error } = await client.from('exercises').delete().eq('id', id);
        if (!error) removePendingMutation(mut.id);
      } else if (mut.entityType === 'standard' && mut.action === 'UPSERT') {
        const std: ActiveStandard = JSON.parse(mut.payload);
        const { error } = await client
          .from('active_standard')
          .upsert(standardToCloudRow(std));
        if (!error) removePendingMutation(mut.id);
      } else if (mut.entityType === 'practice_log' && mut.action === 'UPSERT') {
        const log: SessionLogEntry = JSON.parse(mut.payload);
        const { error } = await client
          .from('practice_logs')
          .upsert(practiceLogToCloudRow(log));
        if (!error) removePendingMutation(mut.id);
      } else if (mut.entityType === 'user_state' && mut.action === 'UPSERT') {
        const state: UserSyncState = JSON.parse(mut.payload);
        const { error } = await client
          .from('user_sync_state')
          .upsert(userStateToCloudRow(state));
        if (!error) removePendingMutation(mut.id);
      }
    } catch {
      // Leave in queue for next connectivity window
    }
  }
}

/**
 * Primary synchronization entry point:
 * 1. Flushes any pending offline writes to Supabase.
 * 2. Pulls authoritative `active_standard`, `exercises`, `practice_logs`, and `user_sync_state` from Supabase.
 * 3. Atomically mirrors Supabase into local SQLite / localStorage cache.
 * 4. If offline, keeps the last persisted local snapshot intact.
 */
export async function pullAllFromCloud(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    setSyncStatus('offline');
    return {
      success: false,
      count: getAllVaultExercises().length,
      error: 'Offline mode: serving local persistent cache.',
    };
  }

  try {
    setSyncStatus('syncing');

    // Step 1: Flush offline outbox first so local offline edits aren't overwritten
    await flushPendingMutations();

    // Step 2: Fetch Active Standard from Supabase
    const { data: stdData, error: stdError } = await client
      .from('active_standard')
      .select('*')
      .limit(1);

    let authoritativeStandard: ActiveStandard | null = null;
    if (!stdError && stdData && stdData.length > 0) {
      authoritativeStandard = cloudRowToStandard(stdData[0]);
    } else if (!stdError && (!stdData || stdData.length === 0)) {
      const localStd = getActiveStandard();
      await client.from('active_standard').upsert(standardToCloudRow(localStd));
      authoritativeStandard = localStd;
    }

    // Step 3: Fetch All Exercises from Supabase
    const { data: exData, error: exError } = await client
      .from('exercises')
      .select('*');

    if (exError) {
      setSyncStatus('offline');
      return {
        success: false,
        count: getAllVaultExercises().length,
        error: exError.message,
      };
    }

    const cloudBootstrapped = getAppSetting('cloud_bootstrapped_v2') === 'true';

    // If brand new Supabase project with 0 rows and never bootstrapped before, seed it once
    if ((!exData || exData.length === 0) && !cloudBootstrapped) {
      const localExercises = getAllVaultExercises();
      if (localExercises.length > 0) {
        const rows = localExercises.map(exerciseToCloudRow);
        await client.from('exercises').upsert(rows);
      }
      setAppSetting('cloud_bootstrapped_v2', 'true');
      setSyncStatus('connected');
      return { success: true, count: localExercises.length };
    }

    setAppSetting('cloud_bootstrapped_v2', 'true');

    // Gather any remaining un-flushed mutations to protect them
    const remainingMutations = getPendingMutations();
    const pendingDeletedIds = new Set<string>();
    const pendingUpsertExercises = new Map<string, Exercise>();

    for (const mut of remainingMutations) {
      if (mut.entityType === 'exercise') {
        if (mut.action === 'DELETE') {
          const parsed = JSON.parse(mut.payload);
          if (parsed?.id) pendingDeletedIds.add(parsed.id);
        } else if (mut.action === 'UPSERT') {
          const parsed: Exercise = JSON.parse(mut.payload);
          if (parsed?.id) pendingUpsertExercises.set(parsed.id, parsed);
        }
      }
    }

    const remoteExercises = (exData || []).map(cloudRowToExercise);

    // Step 4: Replace local cache with authoritative cloud snapshot (no write-back loop!)
    replaceLocalCacheWithCloudData(
      authoritativeStandard,
      remoteExercises,
      pendingDeletedIds,
      pendingUpsertExercises
    );

    // Step 5: Sync Practice Logs
    try {
      const { data: logsData } = await client
        .from('practice_logs')
        .select('*')
        .order('practiced_at', { ascending: false })
        .limit(200);

      if (logsData && logsData.length > 0) {
        upsertLocalPracticeLogsFromCloud(logsData.map(cloudRowToPracticeLog));
      } else {
        const localLogs = getPracticeLogs();
        if (localLogs.length > 0) {
          const rows = localLogs.map(practiceLogToCloudRow);
          await client.from('practice_logs').upsert(rows);
        }
      }
    } catch (logErr) {
      console.warn('[CloudSync] Practice logs sync notice:', logErr);
    }

    // Step 6: Sync User Sync State (Call Sheet faders, queue, metronome, theme)
    try {
      const { data: stateData } = await client
        .from('user_sync_state')
        .select('*')
        .eq('id', 'state_1')
        .limit(1);

      if (stateData && stateData.length > 0) {
        upsertLocalUserStateFromCloud(cloudRowToUserState(stateData[0]));
      } else {
        const localState = getUserSyncState();
        await client.from('user_sync_state').upsert(userStateToCloudRow(localState));
      }
    } catch (stateErr) {
      console.warn('[CloudSync] User sync state notice:', stateErr);
    }

    setSyncStatus('connected');
    return { success: true, count: remoteExercises.length };
  } catch (err: any) {
    setSyncStatus('offline');
    return {
      success: false,
      count: getAllVaultExercises().length,
      error: err?.message || 'Offline: using last persisted database snapshot.',
    };
  }
}

// ==============================================================================
// Realtime Subscription + Automatic Connectivity Recovery
// ==============================================================================

export function subscribeToRealtimeChanges(onDataUpdated: () => void): () => void {
  const client = getSupabaseClient();

  // Re-sync automatically when app returns to foreground
  const appStateSub = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      pullAllFromCloud().then((res) => {
        if (res.success) onDataUpdated();
      });
    }
  });

  // Re-sync automatically when browser regains internet connection on Web
  const handleOnline = () => {
    pullAllFromCloud().then((res) => {
      if (res.success) onDataUpdated();
    });
  };
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
  }

  if (!client) {
    return () => {
      appStateSub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    };
  }

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
              deleteLocalExerciseFromCloud(oldId);
              onDataUpdated();
            }
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new;
            if (row && row.id) {
              const ex = cloudRowToExercise(row);
              upsertLocalExerciseFromCloud(ex);
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
              upsertLocalStandardFromCloud(std);
              onDataUpdated();
            }
          }
        } catch (err) {
          console.warn('[CloudSync] realtime standard event error:', err);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'practice_logs' },
      (payload) => {
        try {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new;
            if (row && row.id) {
              const log = cloudRowToPracticeLog(row);
              upsertLocalPracticeLogsFromCloud([log]);
              onDataUpdated();
            }
          }
        } catch (err) {
          console.warn('[CloudSync] realtime practice_log event error:', err);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_sync_state' },
      (payload) => {
        try {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new;
            if (row) {
              const state = cloudRowToUserState(row);
              upsertLocalUserStateFromCloud(state);
              onDataUpdated();
            }
          }
        } catch (err) {
          console.warn('[CloudSync] realtime user_sync_state event error:', err);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setSyncStatus('connected');
      }
    });

  return () => {
    appStateSub.remove();
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
    }
    try {
      client.removeChannel(channel);
    } catch {}
  };
}

// Automatically wire repository mutations to direct Supabase R/W operations
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
  pushPracticeLog: (log) => {
    pushPracticeLogToCloud(log);
  },
  pushUserState: (state) => {
    pushUserStateToCloud(state);
  },
});