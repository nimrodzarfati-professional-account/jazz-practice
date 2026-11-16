import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import {
  RepertoireStandard,
  RepertoireStats,
  StandardStyle,
  STANDARD_STYLES,
  TOTAL_KNOWN_STANDARDS_BENCHMARK,
} from '../types/pokedex';
import { PitchKey } from '../types/models';
import {
  getAppSetting,
  setAppSetting,
  initDatabase,
  getPracticeLogs,
  registerPracticeLogRecordedListener,
} from './repository';
import { CATALOG_STANDARDS_TUPLES, standardIdFromTitle } from './seedPokedex';

const REPERTOIRE_WEB_MIRROR_KEY = 'shed_v2_repertoire_rows_json';
const LEGACY_POKEDEX_KEY = 'shed_v2_pokedex_json';
const MIGRATED_FLAG_KEY = 'shed_v2_repertoire_migrated_v1';

let sqliteDb: SQLite.SQLiteDatabase | null = null;
let tableInitialized = false;

let onCloudPushStandard: ((std: RepertoireStandard) => void) | null = null;
let onCloudDeleteStandard: ((id: string) => void) | null = null;

export function registerRepertoireCloudHandlers(handlers: {
  pushStandard: (std: RepertoireStandard) => void;
  deleteStandard: (id: string) => void;
}): void {
  onCloudPushStandard = handlers.pushStandard;
  onCloudDeleteStandard = handlers.deleteStandard;
}

export function normalizeStandardTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[^a-z0-9]/g, '');
}

function parseKeysJson(raw: string | undefined, fallback: PitchKey): PitchKey[] {
  if (!raw) return [fallback];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as PitchKey[];
    }
  } catch {
    // ignore
  }
  return [fallback];
}

function ensureRepertoireTable(): void {
  if (tableInitialized) return;
  initDatabase();

  if (Platform.OS !== 'web') {
    try {
      sqliteDb = SQLite.openDatabaseSync('shed_engine_v2.db');
      sqliteDb.execSync(`
        CREATE TABLE IF NOT EXISTS repertoire_standards (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          default_key TEXT NOT NULL DEFAULT 'C',
          known_keys TEXT NOT NULL DEFAULT '["C"]',
          style TEXT NOT NULL DEFAULT 'SWING',
          composer TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          is_known INTEGER NOT NULL DEFAULT 1,
          is_custom INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        );
      `);
    } catch (err) {
      console.warn('[RepertoireRepo] SQLite init fallback:', err);
      sqliteDb = null;
    }
  }

  tableInitialized = true;
  migrateLegacyPokedexIfNeeded();
}

function readStoredRows(): Map<string, RepertoireStandard> {
  ensureRepertoireTable();
  const map = new Map<string, RepertoireStandard>();

  // 1. Read Web / AppSetting Mirror
  const rawMirror = getAppSetting(REPERTOIRE_WEB_MIRROR_KEY);
  if (rawMirror) {
    try {
      const list = JSON.parse(rawMirror) as RepertoireStandard[];
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && item.id) map.set(item.id, item);
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Read Native SQLite Table (Source of Truth on device)
  if (sqliteDb) {
    try {
      const rows = sqliteDb.getAllSync<any>('SELECT * FROM repertoire_standards;');
      for (const r of rows) {
        const defaultKey = (r.default_key || 'C') as PitchKey;
        const std: RepertoireStandard = {
          id: r.id,
          title: r.title,
          composer: r.composer || '',
          defaultKey,
          knownKeys: parseKeysJson(r.known_keys, defaultKey),
          style: (r.style || 'SWING') as StandardStyle,
          notes: r.notes || '',
          isKnown: Boolean(r.is_known),
          isCustom: Boolean(r.is_custom),
          updatedAt: r.updated_at || new Date().toISOString(),
        };
        map.set(std.id, std);
      }
    } catch (err) {
      console.warn('[RepertoireRepo] Failed reading SQLite rows:', err);
    }
  }

  return map;
}

function persistRow(
  std: RepertoireStandard,
  allRowsMap?: Map<string, RepertoireStandard>,
  skipCloudPush = false
): void {
  ensureRepertoireTable();

  if (sqliteDb) {
    try {
      sqliteDb.runSync(
        `INSERT OR REPLACE INTO repertoire_standards
         (id, title, default_key, known_keys, style, composer, notes, is_known, is_custom, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          std.id,
          std.title,
          std.defaultKey,
          JSON.stringify(std.knownKeys),
          std.style,
          std.composer,
          std.notes,
          std.isKnown ? 1 : 0,
          std.isCustom ? 1 : 0,
          std.updatedAt,
        ]
      );
    } catch (err) {
      console.warn('[RepertoireRepo] SQLite write error:', err);
    }
  }

  const map = allRowsMap ?? readStoredRows();
  map.set(std.id, std);
  setAppSetting(REPERTOIRE_WEB_MIRROR_KEY, JSON.stringify(Array.from(map.values())));

  if (!skipCloudPush && onCloudPushStandard) {
    onCloudPushStandard(std);
  }
}

function migrateLegacyPokedexIfNeeded(): void {
  if (getAppSetting(MIGRATED_FLAG_KEY) === '1') return;

  const rawLegacy = getAppSetting(LEGACY_POKEDEX_KEY);
  if (rawLegacy) {
    try {
      const legacyList = JSON.parse(rawLegacy);
      if (Array.isArray(legacyList)) {
        const map = new Map<string, RepertoireStandard>();
        for (const old of legacyList) {
          if (old && (old.status === 'CAUGHT' || old.isCustom)) {
            const id = standardIdFromTitle(old.title || old.id);
            const defaultKey = (old.defaultKey || 'C') as PitchKey;
            const knownKeys = Array.isArray(old.masteredKeys) && old.masteredKeys.length > 0
              ? (old.masteredKeys as PitchKey[])
              : [defaultKey];
            const rawStyle = Array.isArray(old.types) ? old.types[0] : 'SWING';
            const style: StandardStyle = STANDARD_STYLES.includes(rawStyle) ? rawStyle : 'SWING';

            const migrated: RepertoireStandard = {
              id,
              title: old.title,
              composer: old.composer || '',
              defaultKey,
              knownKeys,
              style,
              notes: old.personalNotes || '',
              isKnown: old.status === 'CAUGHT',
              isCustom: Boolean(old.isCustom),
              updatedAt: old.unlockedAt || new Date().toISOString(),
            };
            persistRow(migrated, map, true);
          }
        }
      }
    } catch {
      // ignore corrupt legacy data
    }
  }

  setAppSetting(MIGRATED_FLAG_KEY, '1');
}

/**
 * Merges the static catalog with user's database rows and practice log history.
 */
export function getPokedexStandards(): RepertoireStandard[] {
  const storedMap = readStoredRows();
  const logs = getPracticeLogs();

  // Check if any practiced standards should be marked known automatically
  for (const log of logs) {
    if (!log.standardTitle) continue;
    const id = standardIdFromTitle(log.standardTitle);
    const existing = storedMap.get(id);
    if (!existing) {
      // Find in catalog if possible
      const tuple = CATALOG_STANDARDS_TUPLES.find(
        ([t]) => normalizeStandardTitle(t) === normalizeStandardTitle(log.standardTitle!)
      );
      const defaultKey = tuple ? tuple[1] : 'C';
      const loggedKeys =
        Array.isArray(log.masteredKeys) && log.masteredKeys.length > 0
          ? log.masteredKeys
          : [defaultKey];

      const autoKnown: RepertoireStandard = {
        id: tuple ? standardIdFromTitle(tuple[0]) : id,
        title: tuple ? tuple[0] : log.standardTitle.trim(),
        composer: tuple ? tuple[3] : '',
        defaultKey,
        knownKeys: loggedKeys,
        style: tuple ? tuple[2] : 'SWING',
        notes: '',
        isKnown: true,
        isCustom: !tuple,
        updatedAt: log.practicedAt,
      };
      persistRow(autoKnown, storedMap);
    }
  }

  const catalogIds = new Set<string>();
  const merged: RepertoireStandard[] = [];

  for (const [title, defaultKey, style, composer] of CATALOG_STANDARDS_TUPLES) {
    const id = standardIdFromTitle(title);
    if (catalogIds.has(id)) continue;
    catalogIds.add(id);

    const saved = storedMap.get(id);
    if (saved) {
      merged.push(saved);
    } else {
      merged.push({
        id,
        title,
        composer,
        defaultKey,
        knownKeys: [defaultKey],
        style,
        notes: '',
        isKnown: false,
        isCustom: false,
        updatedAt: '',
      });
    }
  }

  // Append custom user-added standards not in the static catalog
  for (const [id, saved] of storedMap.entries()) {
    if (!catalogIds.has(id)) {
      merged.push(saved);
    }
  }

  return merged.sort((a, b) => a.title.localeCompare(b.title));
}

export function getPokedexStats(standards?: RepertoireStandard[]): RepertoireStats {
  const list = standards ?? getPokedexStandards();
  const byStyle: Record<StandardStyle, number> = {
    SWING: 0,
    BALLAD: 0,
    BOSSA: 0,
    BEBOP: 0,
    BLUES: 0,
    WALTZ: 0,
    LATIN: 0,
    MODAL: 0,
  };

  let knownCount = 0;
  for (const s of list) {
    if (s.isKnown) {
      knownCount += 1;
      byStyle[s.style] = (byStyle[s.style] || 0) + 1;
    }
  }

  return {
    knownCount,
    totalCatalogBenchmark: TOTAL_KNOWN_STANDARDS_BENCHMARK,
    catalogSeededCount: list.length,
    byStyle,
  };
}

export function toggleStandardCaught(
  id: string,
  forceKnown?: boolean
): RepertoireStandard | null {
  const all = getPokedexStandards();
  const target = all.find((s) => s.id === id);
  if (!target) return null;

  const nextKnown = forceKnown !== undefined ? forceKnown : !target.isKnown;
  const updated: RepertoireStandard = {
    ...target,
    isKnown: nextKnown,
    knownKeys:
      target.knownKeys.length > 0 ? target.knownKeys : [target.defaultKey],
    updatedAt: new Date().toISOString(),
  };

  persistRow(updated);
  return updated;
}

export function updateStandardMasteredKeys(
  id: string,
  keys: PitchKey[],
  defaultKey?: PitchKey
): RepertoireStandard | null {
  const all = getPokedexStandards();
  const target = all.find((s) => s.id === id);
  if (!target) return null;

  const resolvedDefault = defaultKey ?? target.defaultKey;
  const safeKeys = keys.length > 0 ? keys : [resolvedDefault];

  const updated: RepertoireStandard = {
    ...target,
    defaultKey: resolvedDefault,
    knownKeys: safeKeys,
    isKnown: true,
    updatedAt: new Date().toISOString(),
  };

  persistRow(updated);
  return updated;
}

export function updateStandardPersonalNotes(
  id: string,
  notes: string,
  style?: StandardStyle
): RepertoireStandard | null {
  const all = getPokedexStandards();
  const target = all.find((s) => s.id === id);
  if (!target) return null;

  const updated: RepertoireStandard = {
    ...target,
    notes: notes.trim(),
    style: style ?? target.style,
    updatedAt: new Date().toISOString(),
  };

  persistRow(updated);
  return updated;
}

export function addCustomPokedexStandard(input: {
  title: string;
  composer?: string;
  defaultKey: PitchKey;
  knownKeys?: PitchKey[];
  style: StandardStyle;
  notes?: string;
}): RepertoireStandard {
  const cleanTitle = input.title.trim();
  const id = standardIdFromTitle(cleanTitle);
  const now = new Date().toISOString();

  const created: RepertoireStandard = {
    id,
    title: cleanTitle,
    composer: (input.composer || '').trim(),
    defaultKey: input.defaultKey,
    knownKeys:
      input.knownKeys && input.knownKeys.length > 0
        ? input.knownKeys
        : [input.defaultKey],
    style: input.style,
    notes: (input.notes || '').trim(),
    isKnown: true,
    isCustom: true,
    updatedAt: now,
  };

  persistRow(created);
  return created;
}

/**
 * Returns only user-saved / known repertoire rows (excludes untouched catalog defaults)
 * so CloudSyncService only pushes meaningful rows to Supabase.
 */
export function getStoredRepertoireStandards(): RepertoireStandard[] {
  return Array.from(readStoredRows().values());
}

export function deleteCustomStandard(id: string, skipCloudPush = false): void {
  ensureRepertoireTable();
  if (sqliteDb) {
    try {
      sqliteDb.runSync('DELETE FROM repertoire_standards WHERE id = ?;', [id]);
    } catch (err) {
      console.warn('[RepertoireRepo] SQLite delete error:', err);
    }
  }
  const map = readStoredRows();
  map.delete(id);
  setAppSetting(REPERTOIRE_WEB_MIRROR_KEY, JSON.stringify(Array.from(map.values())));

  if (!skipCloudPush && onCloudDeleteStandard) {
    onCloudDeleteStandard(id);
  }
}

export function upsertLocalRepertoireFromCloud(cloudItems: RepertoireStandard[]): void {
  ensureRepertoireTable();
  const map = readStoredRows();
  for (const item of cloudItems) {
    const existing = map.get(item.id);
    if (!existing || new Date(item.updatedAt) >= new Date(existing.updatedAt || 0)) {
      persistRow(item, map, true);
    }
  }
}

export function upsertSingleRepertoireFromCloud(item: RepertoireStandard): boolean {
  ensureRepertoireTable();
  const map = readStoredRows();
  const existing = map.get(item.id);
  if (!existing || new Date(item.updatedAt) >= new Date(existing.updatedAt || 0)) {
    persistRow(item, map, true);
    return true;
  }
  return false;
}

export function deleteLocalRepertoireFromCloud(id: string): void {
  deleteCustomStandard(id, true);
}

registerPracticeLogRecordedListener(() => {
  getPokedexStandards();
});
