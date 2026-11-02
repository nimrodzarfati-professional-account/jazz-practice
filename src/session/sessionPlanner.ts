/**
 * Pure session-plan helpers (no React, no database).
 */
import {
  ActiveStandard,
  Exercise,
  SessionBlock,
  SessionConfig,
  SessionPlan,
} from '../types/models';
import { generateSessionQueue } from '../services/SchedulerEngine';

export const MIN_BLOCK_MINUTES = 5;
export const MAX_BLOCK_MINUTES = 60;
export const MAX_EXTENDED_MINUTES = 120;

export function newBlock(exerciseId: string, allocatedMinutes: number): SessionBlock {
  return {
    exerciseId,
    allocatedMinutes: clampMinutes(allocatedMinutes, MAX_BLOCK_MINUTES),
    status: 'pending',
    elapsedSeconds: 0,
    bpm: null,
    practicedMinutes: null,
  };
}

export function clampMinutes(minutes: number, max: number = MAX_BLOCK_MINUTES): number {
  const safe = Number.isFinite(minutes) ? Math.round(minutes) : 15;
  return Math.max(MIN_BLOCK_MINUTES, Math.min(max, safe));
}

export function suggestPlan(
  config: SessionConfig,
  exercises: Exercise[],
  song: ActiveStandard,
  now: Date = new Date()
): SessionBlock[] {
  return generateSessionQueue(
    exercises,
    song,
    config.availableMinutes,
    config.intensity,
    config.contextFilter,
    now
  ).map((q) => newBlock(q.id, q.allocatedMinutes));
}

export function newPlan(
  config: SessionConfig,
  blocks: SessionBlock[],
  now: Date = new Date()
): SessionPlan {
  const iso = now.toISOString();
  return {
    id: 'plan_1',
    status: 'building',
    blocks,
    currentIndex: 0,
    runningSince: null,
    isCustomized: false,
    config,
    createdAt: iso,
    startedAt: null,
    completedAt: null,
    updatedAt: iso,
  };
}

/**
 * Drops blocks whose exercise no longer exists and clamps minutes. Blocks may exceed 60 minutes
 * only through extendCurrent, so the upper clamp is the extended maximum.
 */
export function normalizeBlocks(
  blocks: SessionBlock[],
  exercisesById: Map<string, Exercise>
): SessionBlock[] {
  const seen = new Set<string>();
  const result: SessionBlock[] = [];
  for (const block of blocks) {
    if (!exercisesById.has(block.exerciseId) || seen.has(block.exerciseId)) continue;
    seen.add(block.exerciseId);
    result.push({
      ...block,
      allocatedMinutes: clampMinutes(block.allocatedMinutes, MAX_EXTENDED_MINUTES),
    });
  }
  return result;
}

export function elapsedSecondsOf(
  block: SessionBlock,
  isCurrent: boolean,
  runningSince: string | null,
  nowMs: number
): number {
  const running =
    isCurrent && runningSince ? Math.max(0, (nowMs - Date.parse(runningSince)) / 1000) : 0;
  return block.elapsedSeconds + running;
}

export function nextPendingIndex(blocks: SessionBlock[], from: number): number {
  for (let i = from + 1; i < blocks.length; i++) {
    if (blocks[i].status === 'pending') return i;
  }
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].status === 'pending') return i;
  }
  return -1;
}

export function isSameLocalDay(isoA: string, isoB: string): boolean {
  const a = new Date(isoA);
  const b = new Date(isoB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function songLabel(song: ActiveStandard): string {
  return `${song.title} (${song.defaultKey})`;
}

export function isBoundToSong(exercise: Exercise): boolean {
  return exercise.usesActiveStandard || exercise.category === 'MAINTENANCE';
}
