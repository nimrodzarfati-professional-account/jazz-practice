/**
 * The Shed Engine Dynamic Scheduler & Self-Healing Generator
 * 
 * Implements:
 * 1. Multi-factor mathematical urgency & decay scoring
 * 2. Circle of Fifths next-target-key selection
 * 3. Bounded Knapsack session queue packer based on available time & intensity
 * 4. Cancel & Adapt recalculation for missed/aborted sessions
 * 5. Frictionless CSV / JSON archive ingestion
 */
import {
  Exercise,
  ExerciseCategory,
  ExerciseContext,
  MusicalKey,
  CIRCLE_OF_FIFTHS,
  SessionConfig,
  SessionBlock,
  PracticeSession,
  CATEGORY_DECAY_RATES,
  ScoredExercise,
  IntensityLevel,
} from '../types/models';
import {
  getExercises,
  createPracticeSession,
  updatePracticeSession,
  createExercise,
} from '../db/repository';

/* ------------------------------------------------------------------ */
/*  1. Mathematical Scoring & Decay Algorithm                          */
/* ------------------------------------------------------------------ */

/**
 * Calculates days elapsed since the given ISO date string.
 * If null (never practiced), returns a default penalty of 14 days.
 */
export function calculateDaysSincePracticed(lastPracticedAt: string | null): number {
  if (!lastPracticedAt) {
    return 14; // Default unpracticed decay penalty
  }
  const lastTime = new Date(lastPracticedAt).getTime();
  if (isNaN(lastTime)) {
    return 14;
  }
  const diffMs = Date.now() - lastTime;
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determines the next logical key to practice in Circle of Fifths order.
 * Selects the first unstamped key, or the oldest stamped key if all 12 are complete.
 */
export function determineTargetKey(exercise: Exercise): MusicalKey {
  const unstamped = CIRCLE_OF_FIFTHS.find((key) => {
    const stamp = exercise.keyStamps.find((s) => s.key === key);
    return !stamp || !stamp.stamped;
  });

  if (unstamped) {
    return unstamped;
  }

  // All 12 keys stamped: pick the one with the oldest stampedAt date
  let oldestKey: MusicalKey = CIRCLE_OF_FIFTHS[0];
  let oldestDate = Infinity;

  for (const stamp of exercise.keyStamps) {
    if (stamp.stampedAt) {
      const time = new Date(stamp.stampedAt).getTime();
      if (time < oldestDate) {
        oldestDate = time;
        oldestKey = stamp.key;
      }
    }
  }

  return oldestKey;
}

/**
 * Computes a normalized mathematical urgency score (1.0 to 100.0) for an exercise.
 * 
 * Formula:
 * - Base Priority component: 1-10 mapped to 0-35 points
 * - Temporal Decay component: log-scaled days * category decay rate mapped to 0-45 points
 * - 12-Key Harmonic Gap component: proportion of unstamped keys mapped to 0-20 points
 */
export function scoreExercise(
  exercise: Exercise,
  targetIntensity: IntensityLevel = 3
): ScoredExercise {
  const daysSince = calculateDaysSincePracticed(exercise.lastPracticedAt);
  const decayRate = CATEGORY_DECAY_RATES[exercise.category] || 1.0;

  // 1. Base Priority Score (0 - 35)
  const baseScore = (Math.min(10, Math.max(1, exercise.basePriority)) / 10) * 35;

  // 2. Temporal Decay Score (0 - 45) using log curve so long absences level off
  // transcribing decays 1.5x, maintenance 1.0x, new_concept 0.7x
  const effectiveDays = daysSince * decayRate;
  const decayScore = Math.min(45, Math.log1p(effectiveDays) * 15);

  // 3. 12-Key Coverage Gap (0 - 20)
  const stampedCount = exercise.keyStamps.filter((s) => s.stamped).length;
  const unstampedRatio = (12 - stampedCount) / 12;
  const keyGapScore = unstampedRatio * 20;

  // 4. Intensity Adjustment
  // Low intensity (1-2) boosts maintenance and reduces new_concepts
  // High intensity (4-5) boosts transcribing and new_concepts
  let intensityModifier = 1.0;
  if (targetIntensity <= 2) {
    if (exercise.category === 'maintenance') intensityModifier = 1.3;
    if (exercise.category === 'new_concept') intensityModifier = 0.6;
  } else if (targetIntensity >= 4) {
    if (exercise.category === 'transcribing') intensityModifier = 1.3;
    if (exercise.category === 'new_concept') intensityModifier = 1.2;
    if (exercise.category === 'maintenance') intensityModifier = 0.85;
  }

  const rawUrgency = (baseScore + decayScore + keyGapScore) * intensityModifier;
  const urgencyScore = Math.round(Math.min(100, Math.max(1, rawUrgency)) * 10) / 10;

  // Compute suggested duration based on intensity and category
  let suggestedDuration = exercise.defaultDurationMinutes;
  if (targetIntensity <= 2) {
    suggestedDuration = Math.max(10, Math.round(suggestedDuration * 0.75));
  } else if (targetIntensity >= 4) {
    suggestedDuration = Math.min(45, Math.round(suggestedDuration * 1.25));
  }

  return {
    exercise,
    urgencyScore,
    suggestedDuration,
    suggestedKey: determineTargetKey(exercise),
  };
}

/* ------------------------------------------------------------------ */
/*  2. The Knapsack Session Generator                                  */
/* ------------------------------------------------------------------ */

export interface GenerationOptions {
  availableMinutes: number; // 15 to 120
  intensity: IntensityLevel; // 1 to 5
  preferredContext?: ExerciseContext;
  forceWarmup?: boolean;
}

/**
 * Dynamically packs an optimal practice session queue using a multi-constraint
 * heuristic knapsack algorithm.
 * 
 * Guarantees:
 * 1. Total session duration matches or is close to availableMinutes (±5m).
 * 2. Starts with a maintenance warm-up drill if session >= 25m.
 * 3. Balances Soloing and Comping contexts if session >= 35m.
 * 4. Selects highest-urgency drills per minute of investment.
 */
export async function generatePracticeSession(
  options: GenerationOptions
): Promise<PracticeSession> {
  const { availableMinutes, intensity, preferredContext, forceWarmup = true } = options;
  const allExercises = await getExercises({ includeArchived: false });

  if (allExercises.length === 0) {
    throw new Error('No exercises available in database to generate practice session.');
  }

  // Score all exercises
  const scoredList = allExercises
    .map((ex) => scoreExercise(ex, intensity))
    .sort((a, b) => b.urgencyScore - a.urgencyScore);

  let remainingMinutes = availableMinutes;
  const selectedBlocks: SessionBlock[] = [];
  const usedExerciseIds = new Set<string>();

  // Rule 1: Warmup block (Maintenance) for sessions >= 25 minutes
  if (forceWarmup && availableMinutes >= 25) {
    const warmupCandidate = scoredList.find(
      (item) => item.exercise.category === 'maintenance' && !usedExerciseIds.has(item.exercise.id)
    );

    if (warmupCandidate) {
      const warmupDuration = Math.min(15, Math.max(10, Math.floor(availableMinutes * 0.2)));
      selectedBlocks.push({
        exerciseId: warmupCandidate.exercise.id,
        exercise: warmupCandidate.exercise,
        durationMinutes: warmupDuration,
        targetKey: warmupCandidate.suggestedKey,
        targetBpm: warmupCandidate.exercise.targetBpm,
        completed: false,
        skipped: false,
      });
      usedExerciseIds.add(warmupCandidate.exercise.id);
      remainingMinutes -= warmupDuration;
    }
  }

  // Rule 2: Multi-constraint Knapsack packing
  // We want to alternate or balance soloing and comping where possible
  while (remainingMinutes >= 10) {
    // Filter out already used exercises
    const candidates = scoredList.filter((item) => !usedExerciseIds.has(item.exercise.id));
    if (candidates.length === 0) {
      break; // All exercises used
    }

    // Determine context balance: count current contexts in selectedBlocks
    const soloingCount = selectedBlocks.filter((b) => b.exercise.context === 'soloing').length;
    const compingCount = selectedBlocks.filter((b) => b.exercise.context === 'comping').length;

    let targetContext: ExerciseContext | null = null;
    if (availableMinutes >= 35) {
      if (soloingCount > compingCount + 1) targetContext = 'comping';
      else if (compingCount > soloingCount + 1) targetContext = 'soloing';
    }
    if (preferredContext && selectedBlocks.length === 0) {
      targetContext = preferredContext;
    }

    // Pick best candidate matching context balance and fitting within remaining time
    let bestPick: ScoredExercise | undefined;

    if (targetContext) {
      bestPick = candidates.find(
        (c) => c.exercise.context === targetContext && c.suggestedDuration <= remainingMinutes + 5
      );
    }

    if (!bestPick) {
      bestPick = candidates.find((c) => c.suggestedDuration <= remainingMinutes + 5);
    }

    // Fallback: pick highest urgency candidate and clamp its duration
    if (!bestPick) {
      bestPick = candidates[0];
    }

    // Determine actual block duration
    let blockDuration = Math.min(remainingMinutes, bestPick.suggestedDuration);
    if (remainingMinutes - blockDuration < 10) {
      // Absorb small remainder into this block
      blockDuration = remainingMinutes;
    }

    selectedBlocks.push({
      exerciseId: bestPick.exercise.id,
      exercise: bestPick.exercise,
      durationMinutes: blockDuration,
      targetKey: bestPick.suggestedKey,
      targetBpm: bestPick.exercise.targetBpm,
      completed: false,
      skipped: false,
    });

    usedExerciseIds.add(bestPick.exercise.id);
    remainingMinutes -= blockDuration;
  }

  // Calculate total scheduled time
  const totalDurationMinutes = selectedBlocks.reduce((acc, b) => acc + b.durationMinutes, 0);

  const sessionConfig: SessionConfig = {
    availableMinutes,
    intensity,
  };

  // Persist session to local SQLite database
  const session = await createPracticeSession({
    config: sessionConfig,
    blocks: selectedBlocks,
    cancelled: false,
    totalDurationMinutes,
    startedAt: null,
    completedAt: null,
  });

  return session;
}

/* ------------------------------------------------------------------ */
/*  3. Cancel & Adapt Recalculation Handler                           */
/* ------------------------------------------------------------------ */

export interface CancelResult {
  sessionId: string;
  cancelledAt: string;
  rescheduledUrgencyCount: number;
  topOverdueExercises: ScoredExercise[];
}

/**
 * Handles session cancellation (e.g. from lock-screen notification action
 * or tapping "Cancel & Reschedule"). Marks session cancelled, recalculates
 * urgency across the vault, and returns top overdue drills for the makeup slot.
 */
export async function handleSessionCancellation(
  sessionId: string
): Promise<CancelResult> {
  const now = new Date().toISOString();

  // 1. Mark session cancelled in SQLite
  await updatePracticeSession(sessionId, {
    cancelled: true,
  });

  // 2. Re-score all exercises to compute current urgency landscape
  const allExercises = await getExercises({ includeArchived: false });
  const scored = allExercises
    .map((ex) => scoreExercise(ex, 3))
    .sort((a, b) => b.urgencyScore - a.urgencyScore);

  return {
    sessionId,
    cancelledAt: now,
    rescheduledUrgencyCount: allExercises.length,
    topOverdueExercises: scored.slice(0, 3),
  };
}

/* ------------------------------------------------------------------ */
/*  4. Frictionless Ingestion (CSV & JSON Parsers)                     */
/* ------------------------------------------------------------------ */

export interface IngestionResult {
  importedCount: number;
  skippedCount: number;
  errors: string[];
}

/**
 * Parses raw JSON string into exercises and inserts them into the database.
 */
export async function importExercisesFromJson(jsonText: string): Promise<IngestionResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err: any) {
    return {
      importedCount: 0,
      skippedCount: 0,
      errors: [`JSON parse error: ${err.message}`],
    };
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.title || typeof item.title !== 'string') {
      errors.push(`Row ${i + 1}: Missing exercise title`);
      skipped++;
      continue;
    }

    const context: ExerciseContext = item.context === 'comping' ? 'comping' : 'soloing';
    let category: ExerciseCategory = 'maintenance';
    if (item.category === 'transcribing') category = 'transcribing';
    else if (item.category === 'new_concept') category = 'new_concept';

    try {
      await createExercise({
        title: item.title.trim(),
        description: item.description ? String(item.description).trim() : '',
        context,
        category,
        basePriority: typeof item.basePriority === 'number' ? Math.min(10, Math.max(1, item.basePriority)) : 5,
        defaultDurationMinutes: typeof item.defaultDurationMinutes === 'number' ? item.defaultDurationMinutes : 15,
        targetBpm: typeof item.targetBpm === 'number' ? item.targetBpm : null,
        keyStamps: [],
        lastPracticedAt: item.lastPracticedAt ? String(item.lastPracticedAt) : null,
      });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 1} (${item.title}): ${err.message}`);
      skipped++;
    }
  }

  return { importedCount: imported, skippedCount: skipped, errors };
}

/**
 * Parses CSV text format into exercises.
 * Expected columns: title, context, category, basePriority, defaultDurationMinutes, targetBpm, description
 */
export async function importExercisesFromCsv(csvText: string): Promise<IngestionResult> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      importedCount: 0,
      skippedCount: 0,
      errors: ['CSV must contain a header line and at least one data row.'],
    };
  }

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const titleIdx = headers.indexOf('title');
  const contextIdx = headers.indexOf('context');
  const categoryIdx = headers.indexOf('category');
  const priorityIdx = headers.indexOf('basepriority') !== -1 ? headers.indexOf('basepriority') : headers.indexOf('priority');
  const durationIdx = headers.indexOf('defaultdurationminutes') !== -1 ? headers.indexOf('defaultdurationminutes') : headers.indexOf('duration');
  const bpmIdx = headers.indexOf('targetbpm') !== -1 ? headers.indexOf('targetbpm') : headers.indexOf('bpm');
  const descIdx = headers.indexOf('description') !== -1 ? headers.indexOf('description') : headers.indexOf('desc');

  if (titleIdx === -1) {
    return {
      importedCount: 0,
      skippedCount: 0,
      errors: ['CSV header must include a "title" column.'],
    };
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map((col) => col.trim().replace(/^["']|["']$/g, ''));
    const title = row[titleIdx];

    if (!title) {
      skipped++;
      continue;
    }

    const contextRaw = contextIdx !== -1 ? row[contextIdx]?.toLowerCase() : '';
    const context: ExerciseContext = contextRaw === 'comping' ? 'comping' : 'soloing';

    const categoryRaw = categoryIdx !== -1 ? row[categoryIdx]?.toLowerCase() : '';
    let category: ExerciseCategory = 'maintenance';
    if (categoryRaw === 'transcribing') category = 'transcribing';
    else if (categoryRaw === 'new_concept' || categoryRaw === 'new concept') category = 'new_concept';

    const basePriority = priorityIdx !== -1 && row[priorityIdx] ? parseInt(row[priorityIdx], 10) : 5;
    const defaultDuration = durationIdx !== -1 && row[durationIdx] ? parseInt(row[durationIdx], 10) : 15;
    const targetBpm = bpmIdx !== -1 && row[bpmIdx] ? parseInt(row[bpmIdx], 10) : null;
    const description = descIdx !== -1 && row[descIdx] ? row[descIdx] : '';

    try {
      await createExercise({
        title,
        description,
        context,
        category,
        basePriority: isNaN(basePriority) ? 5 : Math.min(10, Math.max(1, basePriority)),
        defaultDurationMinutes: isNaN(defaultDuration) ? 15 : defaultDuration,
        targetBpm: targetBpm && !isNaN(targetBpm) ? targetBpm : null,
        keyStamps: [],
        lastPracticedAt: null,
      });
      imported++;
    } catch (err: any) {
      errors.push(`Row ${i + 1} (${title}): ${err.message}`);
      skipped++;
    }
  }

  return { importedCount: imported, skippedCount: skipped, errors };
}
