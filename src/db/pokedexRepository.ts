/**
 * Jazz-Dex (Pokédex for Jazz Standards) Repository
 *
 * Persists standards, status (Caught/Seen/Locked), mastered keys, and jam notes.
 * Automatically synchronizes with practice sessions & weekly active standards.
 */
import { PokedexStandard, PokedexStats } from '../types/pokedex';
import { PitchKey } from '../types/models';
import {
  getAppSetting,
  setAppSetting,
  initDatabase,
  getPracticeLogs,
  getActiveStandard,
  rotateActiveStandard,
  registerPracticeLogRecordedListener,
  registerStandardRotatedListener,
} from './repository';
import { SEED_POKEDEX_STANDARDS } from './seedPokedex';

const POKEDEX_SETTING_KEY = 'shed_v2_pokedex_json';

// Automatically trigger sync when practice sessions or rotations occur
registerPracticeLogRecordedListener(() => {
  syncPokedexWithPracticeHistory();
});

registerStandardRotatedListener(() => {
  syncPokedexWithPracticeHistory();
});

/**
 * Normalizes title for loose comparison (e.g. "Take the 'A' Train" -> "taketheatrain")
 */
export function normalizeStandardTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Saves standards array to local persistent store.
 */
function savePokedex(list: PokedexStandard[]): void {
  initDatabase();
  try {
    setAppSetting(POKEDEX_SETTING_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('[PokedexRepo] Error saving dex:', err);
  }
}

/**
 * Synchronizes the Pokédex with actual practice logs & the current active standard.
 *
 * Rules:
 * 1. If an active standard was practiced in the weekly cycle (or active for >= 7 days),
 *    it automatically unlocks to 'CAUGHT'.
 * 2. Any standard with practice logs is upgraded to 'CAUGHT' or 'SEEN' with practice count.
 * 3. If an active standard isn't in the dex, it is automatically added as a custom entry.
 */
export function syncPokedexWithPracticeHistory(): PokedexStandard[] {
  initDatabase();
  const raw = getAppSetting(POKEDEX_SETTING_KEY);
  let list: PokedexStandard[] = [];

  if (!raw) {
    list = [...SEED_POKEDEX_STANDARDS];
  } else {
    try {
      list = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) {
        list = [...SEED_POKEDEX_STANDARDS];
      }
    } catch {
      list = [...SEED_POKEDEX_STANDARDS];
    }
  }

  const logs = getPracticeLogs();
  const activeStd = getActiveStandard();
  let hasChanges = false;

  // 1. Group logs by normalized standard title
  const logsByStd = new Map<
    string,
    { count: number; lastDate: string; keys: Set<PitchKey> }
  >();

  for (const log of logs) {
    if (!log.standardTitle) continue;
    const norm = normalizeStandardTitle(log.standardTitle);
    if (!norm) continue;

    const existing = logsByStd.get(norm) || {
      count: 0,
      lastDate: log.practicedAt,
      keys: new Set<PitchKey>(),
    };

    existing.count += 1;
    if (new Date(log.practicedAt) > new Date(existing.lastDate)) {
      existing.lastDate = log.practicedAt;
    }
    if (Array.isArray(log.masteredKeys)) {
      log.masteredKeys.forEach((k) => existing.keys.add(k));
    }
    logsByStd.set(norm, existing);
  }

  // 2. Check current Active Standard cycle
  const activeNorm = normalizeStandardTitle(activeStd.title);
  const activeStartedMs = new Date(activeStd.startedAt).getTime();
  const daysActive = Number.isNaN(activeStartedMs)
    ? 0
    : Math.floor((Date.now() - activeStartedMs) / 86400000);
  const isActiveWeekCompleted = daysActive >= 7;

  // 3. Update existing dex items
  let activeFoundInDex = false;

  list = list.map((item) => {
    const itemNorm = normalizeStandardTitle(item.title);
    const logData = logsByStd.get(itemNorm);
    const isActiveStandard = itemNorm === activeNorm;
    if (isActiveStandard) activeFoundInDex = true;

    let nextStatus = item.status;
    let nextTimesPracticed = item.timesPracticed || 0;
    let nextLastPracticed = item.lastPracticedAt;
    let nextUnlockedAt = item.unlockedAt;
    const nextMasteredKeys = new Set(item.masteredKeys || []);

    if (logData) {
      nextTimesPracticed = Math.max(nextTimesPracticed, logData.count);
      nextLastPracticed = logData.lastDate;
      logData.keys.forEach((k) => nextMasteredKeys.add(k));

      // Practiced in a session -> opens / unlocks!
      if (nextStatus !== 'CAUGHT') {
        nextStatus = 'CAUGHT';
        nextUnlockedAt = nextUnlockedAt || logData.lastDate;
        hasChanges = true;
      }
    }

    // Active standard rules
    if (isActiveStandard) {
      if (isActiveWeekCompleted) {
        // Completed week with this standard -> definitely unlock!
        if (nextStatus !== 'CAUGHT') {
          nextStatus = 'CAUGHT';
          nextUnlockedAt = nextUnlockedAt || new Date().toISOString();
          hasChanges = true;
        }
      } else if (nextStatus === 'LOCKED') {
        // Currently active in practice -> Mark as SEEN / IN TRAINING
        nextStatus = 'SEEN';
        hasChanges = true;
      }
    }

    if (
      nextStatus !== item.status ||
      nextTimesPracticed !== item.timesPracticed ||
      nextLastPracticed !== item.lastPracticedAt ||
      nextUnlockedAt !== item.unlockedAt ||
      nextMasteredKeys.size !== (item.masteredKeys || []).length
    ) {
      hasChanges = true;
      return {
        ...item,
        status: nextStatus,
        timesPracticed: nextTimesPracticed,
        practiceCount: nextTimesPracticed,
        lastPracticedAt: nextLastPracticed,
        unlockedAt: nextUnlockedAt,
        masteredKeys: Array.from(nextMasteredKeys),
      };
    }
    return item;
  });

  // 4. If current active standard is not in the Dex at all, automatically add it
  if (!activeFoundInDex && activeStd.title.trim()) {
    const maxDexNum = list.reduce((max, s) => Math.max(max, s.dexNumber || 0), 0);
    const newEntry: PokedexStandard = {
      id: `dex_custom_${Date.now()}`,
      dexNumber: maxDexNum + 1,
      title: activeStd.title.trim(),
      composer: 'Current Shed Focus',
      year: new Date().getFullYear(),
      types: ['SWING'],
      defaultKey: activeStd.defaultKey,
      masteredKeys: [activeStd.defaultKey],
      form: '32-Bar Standard',
      tempoBpm: 140,
      tempoLabel: 'Medium Swing',
      tier: 'CORE',
      status: isActiveWeekCompleted ? 'CAUGHT' : 'SEEN',
      firstChords: `${activeStd.defaultKey}maj7 ...`,
      jamCallNotes: `Practiced during active shed rotation. Default key: ${activeStd.defaultKey}.`,
      unlockedAt: isActiveWeekCompleted ? new Date().toISOString() : null,
      timesPracticed: 1,
      practiceCount: 1,
      isCustom: true,
    };
    list.push(newEntry);
    hasChanges = true;
  }

  if (hasChanges || !raw) {
    savePokedex(list);
  }

  return list;
}

/**
 * Returns all Pokédex standards, sorted by dexNumber by default.
 */
export function getPokedexStandards(): PokedexStandard[] {
  return syncPokedexWithPracticeHistory();
}

/**
 * Finds a standard by ID.
 */
export function getPokedexStandardById(id: string): PokedexStandard | null {
  const list = getPokedexStandards();
  return list.find((s) => s.id === id) || null;
}

/**
 * Toggles a standard's status between CAUGHT and LOCKED.
 * Allows user to manually check off tunes they already know or did.
 */
export function toggleStandardCaught(
  id: string,
  forceCaught?: boolean
): PokedexStandard | null {
  const list = getPokedexStandards();
  const index = list.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const current = list[index];
  const newStatus =
    forceCaught !== undefined
      ? forceCaught
        ? 'CAUGHT'
        : 'LOCKED'
      : current.status === 'CAUGHT'
      ? 'LOCKED'
      : 'CAUGHT';

  const updated: PokedexStandard = {
    ...current,
    status: newStatus,
    unlockedAt:
      newStatus === 'CAUGHT'
        ? current.unlockedAt || new Date().toISOString()
        : null,
  };

  list[index] = updated;
  savePokedex(list);
  return updated;
}

/**
 * Updates a standard's mastered keys (12 keys).
 */
export function updateStandardMasteredKeys(
  id: string,
  keys: PitchKey[]
): PokedexStandard | null {
  const list = getPokedexStandards();
  const index = list.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const updated: PokedexStandard = {
    ...list[index],
    masteredKeys: keys,
    // Knowing keys implies it's in your repertoire!
    status: keys.length > 0 ? 'CAUGHT' : list[index].status,
    unlockedAt:
      keys.length > 0 && !list[index].unlockedAt
        ? new Date().toISOString()
        : list[index].unlockedAt,
  };

  list[index] = updated;
  savePokedex(list);
  return updated;
}

/**
 * Updates personal notes for a standard.
 */
export function updateStandardNotes(
  id: string,
  personalNotes: string
): PokedexStandard | null {
  const list = getPokedexStandards();
  const index = list.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const updated: PokedexStandard = {
    ...list[index],
    personalNotes,
  };

  list[index] = updated;
  savePokedex(list);
  return updated;
}

/**
 * Adds a new custom standard manually.
 */
export function addCustomStandard(
  data: Omit<PokedexStandard, 'id' | 'dexNumber'>
): PokedexStandard {
  const list = getPokedexStandards();
  const maxDexNum = list.reduce((max, s) => Math.max(max, s.dexNumber || 0), 0);

  const newEntry: PokedexStandard = {
    ...data,
    id: `dex_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    dexNumber: maxDexNum + 1,
    status: data.status || 'CAUGHT',
    unlockedAt: data.unlockedAt || new Date().toISOString(),
    isCustom: true,
  };

  list.push(newEntry);
  savePokedex(list);
  return newEntry;
}

/**
 * Deletes a custom standard from the Dex.
 */
export function deleteCustomStandard(id: string): boolean {
  const list = getPokedexStandards();
  const filtered = list.filter((s) => s.id !== id);
  if (filtered.length === list.length) return false;

  savePokedex(filtered);
  return true;
}

/**
 * Calculates current Pokédex completion stats.
 */
export function getPokedexStats(): PokedexStats {
  const list = getPokedexStandards();
  const totalCount = list.length;
  const caughtCount = list.filter((s) => s.status === 'CAUGHT').length;
  const seenCount = list.filter((s) => s.status === 'SEEN').length;
  const lockedCount = list.filter((s) => s.status === 'LOCKED').length;
  const completionPercentage =
    totalCount > 0 ? Math.round((caughtCount / totalCount) * 100) : 0;

  return {
    totalCount,
    caughtCount,
    seenCount,
    lockedCount,
    completionPercentage,
  };
}

/**
 * Directly sets a Pokédex standard as the Shed Engine's current Active Standard.
 */
export function setPokedexStandardAsActive(
  standard: PokedexStandard,
  cycleDays: 7 | 10 | 14 = 14
): void {
  rotateActiveStandard(standard.title, standard.defaultKey, cycleDays);
}
