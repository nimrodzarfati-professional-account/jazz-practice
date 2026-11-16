import {
  ActiveStandard,
  Exercise,
  ExerciseCategory,
  MusicalContext,
  ScoredExercise,
} from '../types/models';
import { getDaysSincePracticed, isOverdueRotationExercise } from './CrateUtils';

const CATEGORY_DECAY_RATE: Record<ExerciseCategory, number> = {
  TRANSCRIBING: 2.2, // Highest momentum sensitivity
  NEW_CONCEPT: 1.7,
  MAINTENANCE: 1.2,
};

// Blocks are never trimmed below this many minutes
const MIN_BLOCK_MINUTES = 5;

export function calculateUrgencyScore(exercise: Exercise, now: Date = new Date()): number {
  // Weekly Homework: maximum urgency (99) to guarantee top placement during its 7-day cycle
  if (exercise.isHomework) {
    return 99;
  }

  const daysSince = Math.min(60, getDaysSincePracticed(exercise, now));
  const isOverdue = isOverdueRotationExercise(exercise, 7, now);
  const decayRate = CATEGORY_DECAY_RATE[exercise.category];

  // Only apply 12-key deficit bonus if the exercise actually uses keys
  const keyDeficitBonus = exercise.isKeyBased
    ? ((12 - exercise.masteredKeys.length) / 12) * 10
    : 0;

  // Overdue drills receive a significant boost so they rank ahead of normal rotation drills
  const overdueBonus = isOverdue ? 35 : 0;

  const rawScore =
    exercise.basePriority * 5 +
    daysSince * decayRate * 4 +
    exercise.skippedCount * 8 +
    keyDeficitBonus +
    overdueBonus;

  // If overdue, score is bounded between 80 and 95 (homework is 99)
  if (isOverdue) {
    return Math.max(80, Math.min(95, Math.round(rawScore)));
  }

  // Normal drills are bounded between 1 and 79
  return Math.max(1, Math.min(79, Math.round(rawScore)));
}

function isSameLocalDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function practicedToday(exercise: Exercise, now: Date): boolean {
  if (!exercise.lastPracticedAt) return false;
  const practiced = new Date(exercise.lastPracticedAt);
  return !Number.isNaN(practiced.getTime()) && isSameLocalDate(practiced, now);
}

export function generateSessionQueue(
  allExercises: Exercise[],
  activeStandard: ActiveStandard,
  availableMinutes: number,
  maxIntensity: number,
  contextFilter: 'ALL' | MusicalContext = 'ALL',
  now: Date = new Date()
): ScoredExercise[] {
  const safeIntensity = Number.isFinite(maxIntensity) ? maxIntensity : 3;
  const safeMinutes = Number.isFinite(availableMinutes) ? availableMinutes : 30;
  const intensityOf = (ex: Exercise) => (Number.isFinite(ex.intensity) ? ex.intensity : 3);

  // 1. Only active exercises are scheduled
  const active = allExercises.filter((ex) => ex.inRotation);
  if (active.length === 0) return [];

  // 2. Energy cap, ignored when it would exclude every active exercise
  let pool = active.filter((ex) => intensityOf(ex) <= safeIntensity);
  if (pool.length === 0) pool = active;

  // 3. Focus filter, skipped when it would exclude everything left
  if (contextFilter !== 'ALL') {
    const byContext = pool.filter((ex) => ex.context === contextFilter);
    if (byContext.length > 0) pool = byContext;
  }

  // 4. Prefer exercises not already practiced today
  const fresh = pool.filter((ex) => !practicedToday(ex, now));
  if (fresh.length > 0) pool = fresh;

  // 5. Score and size each block
  const scored: ScoredExercise[] = pool
    .map((ex) => ({
      ...ex,
      urgencyScore: calculateUrgencyScore(ex, now),
      // A block is never shorter than the minimum, even for an oddly short exercise
      allocatedMinutes: Math.max(
        MIN_BLOCK_MINUTES,
        Number.isFinite(ex.durationMinutes) && ex.durationMinutes > 0
          ? Math.round(ex.durationMinutes)
          : 15
      ),
      assignedStandardTitle:
        ex.usesActiveStandard || ex.category === 'MAINTENANCE'
          ? (activeStandard?.title && activeStandard?.defaultKey
              ? `${activeStandard.title} (${activeStandard.defaultKey})`
              : 'No song chosen')
          : undefined,
    }))
    .sort((a, b) => b.urgencyScore - a.urgencyScore);

  // 6. Priority partitioning:
  //    a) Weekly Homework (always packed first during its 7-day cycle)
  //    b) Overdue drills (>7 days without practice, prioritized in shed recommendation)
  //    c) Other active rotation exercises
  const homework = scored.filter((ex) => ex.isHomework);
  const overdue = scored.filter((ex) => !ex.isHomework && isOverdueRotationExercise(ex, 7, now));
  const others = scored.filter((ex) => !ex.isHomework && !isOverdueRotationExercise(ex, 7, now));

  const packedQueue: ScoredExercise[] = [];
  let remainingMinutes = safeMinutes;
  let lastContext: MusicalContext | null = null;

  // 7. Pack while at least one minimum-length block still fits. Every exercise is at least
  //    MIN_BLOCK_MINUTES long, so a block trimmed to the remaining window is never shorter.
  const pack = (list: ScoredExercise[], alternate: boolean): void => {
    const pending = [...list];
    while (pending.length > 0 && remainingMinutes >= MIN_BLOCK_MINUTES) {
      let pickIndex = 0;
      if (alternate && contextFilter === 'ALL' && lastContext !== null) {
        const oppositeIndex = pending.findIndex((item) => item.context !== lastContext);
        if (oppositeIndex !== -1) {
          pickIndex = oppositeIndex;
        }
      }

      const picked = pending.splice(pickIndex, 1)[0];
      const blockMinutes = Math.min(picked.allocatedMinutes, remainingMinutes);

      packedQueue.push({ ...picked, allocatedMinutes: blockMinutes });
      remainingMinutes -= blockMinutes;
      lastContext = picked.context;
    }
  };

  pack(homework, false);
  pack(overdue, true);
  pack(others, true);

  return packedQueue;
}
