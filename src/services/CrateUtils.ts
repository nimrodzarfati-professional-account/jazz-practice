/**
 * CrateUtils — Utilities for the Library screen
 * 
 * - Weekly ("this week") status
 * - Shorthand line-by-line bulk exercise ingestion parser
 */
import {
  Exercise,
  ExerciseCategory,
  MusicalContext,
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
 * Checks if an exercise has been in "THIS WEEK" for 7 or more days and has completed its weekly cycle
 */
export function isExpiredWeekExercise(
  exercise: Exercise,
  now: Date = new Date()
): boolean {
  if (!exercise.isHomework || !exercise.homeworkStartedAt) return false;
  return getHomeworkStats(exercise, now).isExpired;
}

/**
 * Formats time elapsed since last practiced into a human-readable stamp (e.g. "3d ago", "7m ago", "Never practiced")
 */
export function formatTimeSincePracticed(
  lastPracticedAt: string | null,
  now: Date = new Date()
): string {
  if (!lastPracticedAt) return 'Never practiced';
  const nowMs = now.getTime();
  const practicedMs = new Date(lastPracticedAt).getTime();
  if (isNaN(practicedMs)) return 'Never practiced';

  const diffMs = Math.max(0, nowMs - practicedMs);
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (days >= 60) {
    return `${Math.floor(days / 30)}mo ago`;
  }
  if (days >= 14) {
    return `${Math.floor(days / 7)}w ago`;
  }
  if (days >= 1) {
    return `${days}d ago`;
  }
  if (hours >= 1) {
    return `${hours}h ago`;
  }
  if (mins >= 1) {
    return `${mins}m ago`;
  }
  return 'Just now';
}

/**
 * Formats a concise stamp label for the exercise card badge (e.g. "LAST: 3D AGO", "LAST: TODAY", "LAST: NEVER")
 */
export function getLastPracticedStampLabel(
  lastPracticedAt: string | null,
  now: Date = new Date()
): string {
  if (!lastPracticedAt) return 'LAST: NEVER';
  const nowMs = now.getTime();
  const practicedMs = new Date(lastPracticedAt).getTime();
  if (isNaN(practicedMs)) return 'LAST: NEVER';

  const diffMs = Math.max(0, nowMs - practicedMs);
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (days >= 60) {
    return `LAST: ${Math.floor(days / 30)}MO AGO`;
  }
  if (days >= 14) {
    return `LAST: ${Math.floor(days / 7)}W AGO`;
  }
  if (days >= 1) {
    return `LAST: ${days}D AGO`;
  }
  if (hours >= 1) {
    return `LAST: ${hours}H AGO`;
  }
  if (mins >= 1) {
    return `LAST: ${mins}M AGO`;
  }
  return 'LAST: TODAY';
}

/**
 * Returns number of days elapsed since the exercise was last practiced.
 * If never practiced, returns days spent in current rotation streak (or 999 if unknown).
 */
export function getDaysSincePracticed(
  exercise: Exercise,
  now: Date = new Date()
): number {
  const nowMs = now.getTime();
  if (exercise.lastPracticedAt) {
    const practicedMs = new Date(exercise.lastPracticedAt).getTime();
    if (!isNaN(practicedMs)) {
      return Math.max(0, (nowMs - practicedMs) / 86400000);
    }
  }
  if (exercise.rotationChangedAt) {
    const changedMs = new Date(exercise.rotationChangedAt).getTime();
    if (!isNaN(changedMs)) {
      return Math.max(0, (nowMs - changedMs) / 86400000);
    }
  }
  return 999;
}

/**
 * Checks if an exercise is in active rotation and has not been practiced for more than the specified threshold (default: 7 days)
 */
export function isOverdueRotationExercise(
  exercise: Exercise,
  thresholdDays: number = 7,
  now: Date = new Date()
): boolean {
  if (!exercise.inRotation) return false;
  return getDaysSincePracticed(exercise, now) > thresholdDays;
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

      const description = descSegments.join(' // ').trim() || 'Custom exercise';

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

