import {
  ActiveStandard,
  Exercise,
  ExerciseCategory,
  MusicalContext,
  ScoredExercise,
} from '../types/models';

const CATEGORY_DECAY_RATE: Record<ExerciseCategory, number> = {
  TRANSCRIBING: 2.2, // Highest momentum sensitivity
  NEW_CONCEPT: 1.7,
  MAINTENANCE: 1.2,
};

export function calculateUrgencyScore(exercise: Exercise, now: Date = new Date()): number {
  const daysSince = exercise.lastPracticedAt
    ? Math.max(0, (now.getTime() - new Date(exercise.lastPracticedAt).getTime()) / 86400000)
    : 7; // Default 7 days if never practiced

  const decayRate = CATEGORY_DECAY_RATE[exercise.category];

  // Only apply 12-key deficit bonus if the exercise actually uses keys
  const keyDeficitBonus = exercise.isKeyBased
    ? ((12 - exercise.masteredKeys.length) / 12) * 10
    : 0;

  const rawScore =
    exercise.basePriority * 5 +
    daysSince * decayRate * 4 +
    exercise.skippedCount * 8 +
    keyDeficitBonus;

  return Math.max(1, Math.min(99, Math.round(rawScore)));
}

export function generateSessionQueue(
  allExercises: Exercise[],
  activeStandard: ActiveStandard,
  availableMinutes: number,
  maxIntensity: number,
  contextFilter: 'ALL' | MusicalContext = 'ALL'
): ScoredExercise[] {
  // 1. Strictly filter to exercises in current Active Rotation & within Intensity cap
  const eligible = allExercises
    .filter((ex) => ex.inRotation)
    .filter((ex) => ex.intensity <= maxIntensity)
    .filter((ex) => contextFilter === 'ALL' || ex.context === contextFilter)
    .map((ex) => ({
      ...ex,
      urgencyScore: calculateUrgencyScore(ex),
      allocatedMinutes: ex.durationMinutes, // Timer comes directly from the exercise!
      assignedStandardTitle:
        ex.usesActiveStandard || ex.category === 'MAINTENANCE'
          ? `${activeStandard.title} (${activeStandard.defaultKey})`
          : undefined,
    }))
    .sort((a, b) => b.urgencyScore - a.urgencyScore);

  const packedQueue: ScoredExercise[] = [];
  let remainingMinutes = availableMinutes;
  let lastContext: MusicalContext | null = null;

  const pool = [...eligible];

  // 2. Pack exercises while alternating SOLOING and COMPING when possible
  while (pool.length > 0 && remainingMinutes >= 10) {
    let pickIndex = 0;

    if (contextFilter === 'ALL' && lastContext !== null) {
      const oppositeIndex = pool.findIndex((item) => item.context !== lastContext);
      if (oppositeIndex !== -1) {
        pickIndex = oppositeIndex;
      }
    }

    const picked = pool.splice(pickIndex, 1)[0];

    // Each exercise sets its own timer duration; trim only if it slightly exceeds remaining window
    const timerDuration = Math.min(picked.durationMinutes, remainingMinutes);

    packedQueue.push({
      ...picked,
      allocatedMinutes: timerDuration,
    });

    remainingMinutes -= timerDuration;
    lastContext = picked.context;
  }

  return packedQueue;
}
