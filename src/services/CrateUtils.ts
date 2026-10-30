/**
 * CrateUtils — Utilities for The Crate Screen
 * 
 * - Rotation tenure calculation (current streak, total active vs vault, ratio)
 * - Shorthand line-by-line bulk exercise ingestion parser
 */
import {
  Exercise,
  ExerciseCategory,
  MusicalContext,
  RotationTenureStats,
  HomeworkStats,
} from '../types/models';

export interface BulkDefaults {
  context: MusicalContext;
  category: ExerciseCategory;
  inRotation: boolean;
  durationMinutes: number;
  intensity: number;
  currentBpm: number;
  isKeyBased: boolean;
}

/**
 * Computes live streak and lifetime rotation stats for an exercise in O(1)
 */
export function getRotationTenureStats(
  exercise: Exercise,
  now: Date = new Date()
): RotationTenureStats {
  const nowMs = now.getTime();
  const changedAtMs = exercise.rotationChangedAt
    ? new Date(exercise.rotationChangedAt).getTime()
    : nowMs;
  const currentStreakMs = Math.max(0, nowMs - (isNaN(changedAtMs) ? nowMs : changedAtMs));

  const totalInMs =
    (exercise.accumulatedInRotationMs || 0) + (exercise.inRotation ? currentStreakMs : 0);
  const totalOutMs =
    (exercise.accumulatedOutRotationMs || 0) + (!exercise.inRotation ? currentStreakMs : 0);

  const msPerDay = 86400000;
  const currentStreakDays = Math.floor(currentStreakMs / msPerDay);
  const totalInRotationDays = Math.round((totalInMs / msPerDay) * 10) / 10;
  const totalOutRotationDays = Math.round((totalOutMs / msPerDay) * 10) / 10;

  const totalMs = totalInMs + totalOutMs;
  const activeRatioPercent =
    totalMs > 0 ? Math.round((totalInMs / totalMs) * 100) : exercise.inRotation ? 100 : 0;

  // Format compact stamp label: "<1D", "5D", "2W", "3M"
  let currentStreakLabel = '<1D';
  if (currentStreakDays >= 60) {
    currentStreakLabel = `${Math.floor(currentStreakDays / 30)}M`;
  } else if (currentStreakDays >= 14) {
    currentStreakLabel = `${Math.floor(currentStreakDays / 7)}W`;
  } else if (currentStreakDays >= 1) {
    currentStreakLabel = `${currentStreakDays}D`;
  }

  return {
    currentStreakDays,
    currentStreakLabel,
    totalInRotationDays,
    totalOutRotationDays,
    activeRatioPercent,
  };
}

/**
 * Computes live homework tenure, remaining days in the 7-day week, and expiration status
 */
export function getHomeworkStats(
  exercise: Exercise,
  now: Date = new Date()
): HomeworkStats {
  if (!exercise.isHomework || !exercise.homeworkStartedAt) {
    return {
      isHomework: false,
      daysElapsed: 0,
      daysRemaining: 7,
      isExpired: false,
    };
  }

  const nowMs = now.getTime();
  const startedMs = new Date(exercise.homeworkStartedAt).getTime();
  const diffMs = Math.max(0, nowMs - (isNaN(startedMs) ? nowMs : startedMs));
  const msPerDay = 86400000;
  const daysElapsed = Math.floor(diffMs / msPerDay) + 1;
  const isExpired = diffMs >= 7 * msPerDay;
  const daysRemaining = Math.max(0, 7 - Math.floor(diffMs / msPerDay));

  return {
    isHomework: true,
    daysElapsed: Math.min(7, daysElapsed),
    daysRemaining,
    isExpired,
  };
}

/**
 * Parses multi-line bulk exercise text with pipe-separated shorthand & hashtag overrides
 * 
 * Example lines:
 * Drop 3 Shell Voicings | Smooth voice leading on strings 2-3-4-6 | 20m | 110bpm | int:2
 * Giant Steps Digital Patterns | 1-2-3-5 permutations | 15m | 160bpm | int:5 | #soloing
 * Rhythm Changes Bridge Licks
 * Autumn Leaves Comping Etude | 10m | #comping | #maint
 */
export function parseBulkExercisesInput(
  rawText: string,
  defaults: BulkDefaults
): Omit<
  Exercise,
  'id' | 'rotationChangedAt' | 'accumulatedInRotationMs' | 'accumulatedOutRotationMs'
>[] {
  return rawText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const segments = line.split('|').map((s) => s.trim()).filter(Boolean);
      if (segments.length === 0) return null;

      const title = segments[0].replace(/^[-*•\d.)\s]+/, '').trim();
      if (!title) return null;

      let durationMinutes = defaults.durationMinutes;
      let currentBpm = defaults.currentBpm;
      let intensity = defaults.intensity;
      let context = defaults.context;
      let category = defaults.category;
      let inRotation = defaults.inRotation;
      let isKeyBased = defaults.isKeyBased;
      let isHomework = false;

      const descSegments: string[] = [];

      for (const segment of segments.slice(1)) {
        const words = segment.split(/\s+/).filter(Boolean);
        const remainingWords: string[] = [];

        for (const word of words) {
          const lower = word.toLowerCase();

          // Duration override: 20m, 15min
          const minMatch = lower.match(/^(\d+)\s*m(in)?$/);
          if (minMatch) {
            durationMinutes = Math.max(5, parseInt(minMatch[1], 10));
            continue;
          }

          // Tempo override: 110bpm
          const bpmMatch = lower.match(/^(\d+)\s*bpm$/);
          if (bpmMatch) {
            currentBpm = Math.max(40, parseInt(bpmMatch[1], 10));
            continue;
          }

          // Intensity override: int:2, int:5
          const intMatch = lower.match(/^int:\s*([1-5])$/);
          if (intMatch) {
            intensity = Math.max(1, Math.min(5, parseInt(intMatch[1], 10)));
            continue;
          }

          // Context tags
          if (lower === '#soloing') {
            context = 'SOLOING';
            continue;
          }
          if (lower === '#comping') {
            context = 'COMPING';
            continue;
          }

          // Category tags
          if (lower === '#maint' || lower === '#maintenance') {
            category = 'MAINTENANCE';
            continue;
          }
          if (lower === '#transcribe' || lower === '#transcribing') {
            category = 'TRANSCRIBING';
            continue;
          }
          if (lower === '#concept' || lower === '#new_concept' || lower === '#newconcept') {
            category = 'NEW_CONCEPT';
            continue;
          }
          if (lower === '#hw' || lower === '#homework') {
            isHomework = true;
            inRotation = true;
            continue;
          }

          // Key-based tags
          if (lower === '#nokeys') {
            isKeyBased = false;
            continue;
          }
          if (lower === '#keys') {
            isKeyBased = true;
            continue;
          }

          remainingWords.push(word);
        }

        if (remainingWords.length > 0) {
          descSegments.push(remainingWords.join(' '));
        }
      }

      const description = descSegments.join(' // ').trim() || 'Custom shed routine';

      return {
        title,
        description,
        context,
        category,
        inRotation,
        durationMinutes,
        intensity,
        basePriority: 7,
        currentBpm,
        isKeyBased,
        masteredKeys: [],
        usesActiveStandard: category === 'MAINTENANCE',
        lastPracticedAt: null,
        skippedCount: 0,
        isHomework,
        homeworkStartedAt: isHomework ? new Date().toISOString() : null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

