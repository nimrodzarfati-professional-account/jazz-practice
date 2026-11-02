/**
 * SessionProvider — single owner of today's session plan, the practice timer and the metronome.
 *
 * Screens read derived values and call actions through useSession(). Actions read the latest
 * state from refs, so they are stable and safe to call back-to-back in one handler.
 */
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActiveStandard,
  Exercise,
  PitchKey,
  ResolvedBlock,
  SessionBlock,
  SessionConfig,
  SessionPlan,
  SessionStatus,
} from '../types/models';
import {
  getActiveStandard,
  getAllVaultExercises,
  getLocalPref,
  getSessionPlan,
  getUserSyncState,
  incrementExerciseSkipped,
  initDatabase,
  saveSessionPlan,
  saveUserSyncState,
  setLocalPref,
  updateExerciseProgress,
} from '../db/repository';
import { pullAllFromCloud, subscribeToRealtimeChanges } from '../services/CloudSyncService';
import { scheduleNextShedAlarm, setupAlarmChannel } from '../services/AlarmManager';
import {
  audioMetronomeService,
  MetronomeFeelMode,
  MetronomeVoice,
  playBlockCompleteChime,
} from '../services/AudioMetronomeService';
import {
  clampMinutes,
  elapsedSecondsOf,
  isBoundToSong,
  isSameLocalDay,
  MAX_BLOCK_MINUTES,
  MAX_EXTENDED_MINUTES,
  newBlock,
  newPlan,
  nextPendingIndex,
  normalizeBlocks,
  songLabel,
  suggestPlan,
} from './sessionPlanner';

const CONFIG_DEBOUNCE_MS = 300;
const BPM_SAVE_DEBOUNCE_MS = 750;

export interface SessionActions {
  reloadFromDb: () => void;
  setConfig: (partial: Partial<SessionConfig>) => void;
  rebuildPlan: () => void;
  addExercise: (exerciseId: string, where?: 'end' | 'afterCurrent') => void;
  removeBlock: (index: number) => void;
  moveBlock: (index: number, dir: -1 | 1) => void;
  setBlockMinutes: (index: number, minutes: number) => void;
  startSession: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  extendCurrent: (minutes: number) => void;
  completeCurrent: () => void;
  skipCurrent: () => void;
  setCurrent: (index: number) => void;
  reopenBlock: (index: number) => void;
  endSession: () => void;
  resumeSession: () => void;
  finishSession: () => void;
  resumeStale: () => void;
  startNow: (exerciseId: string) => void;
  setBpm: (delta: number) => void;
  toggleMetronome: () => void;
  setVoice: (voice: MetronomeVoice) => void;
  setFeel: (feel: MetronomeFeelMode) => void;
  toggleKey: (key: PitchKey) => void;
  setAutoStartNext: (enabled: boolean) => void;
}

export interface SessionContextValue extends SessionActions {
  plan: SessionPlan;
  blocks: ResolvedBlock[];
  current: ResolvedBlock | null;
  status: SessionStatus;
  isTimerRunning: boolean;
  isMetronomeOn: boolean;
  staleRunning: boolean;
  config: SessionConfig;
  remainingPlanMinutes: number;
  song: ActiveStandard;
  exercises: Exercise[];
  voice: MetronomeVoice;
  feel: MetronomeFeelMode;
  autoStartNext: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);
const BeatContext = createContext<number>(0);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

/** The metronome's current beat (1-4, 0 when stopped). Kept apart so beats re-render only the dots. */
export function useMetronomeBeat(): number {
  return useContext(BeatContext);
}

// ==============================================================================
// Pure plan helpers
// ==============================================================================

function mapById(exercises: Exercise[]): Map<string, Exercise> {
  return new Map(exercises.map((e) => [e.id, e]));
}

function replaceBlock(blocks: SessionBlock[], index: number, block: SessionBlock): SessionBlock[] {
  return blocks.map((b, i) => (i === index ? block : b));
}

function resetBlock(block: SessionBlock): SessionBlock {
  return { ...block, status: 'pending', elapsedSeconds: 0, practicedMinutes: null };
}

/** Drops unknown exercises and keeps currentIndex pointing at the same exercise. */
function normalizePlan(plan: SessionPlan, exercisesById: Map<string, Exercise>): SessionPlan {
  const currentId = plan.blocks[plan.currentIndex]?.exerciseId;
  const blocks = normalizeBlocks(plan.blocks, exercisesById);
  let currentIndex = currentId ? blocks.findIndex((b) => b.exerciseId === currentId) : -1;
  let runningSince = plan.runningSince;
  if (currentIndex === -1) {
    currentIndex = Math.max(0, nextPendingIndex(blocks, Math.min(plan.currentIndex, blocks.length) - 1));
    runningSince = null;
  }
  return { ...plan, blocks, currentIndex, runningSince };
}

/** Folds the running interval into the current block (capped at its allocation) and pauses. */
function foldRunning(plan: SessionPlan, nowMs: number): SessionPlan {
  if (!plan.runningSince) return plan;
  const block = plan.blocks[plan.currentIndex];
  if (!block) return { ...plan, runningSince: null };
  const elapsed = Math.min(
    block.allocatedMinutes * 60,
    elapsedSecondsOf(block, true, plan.runningSince, nowMs)
  );
  return {
    ...plan,
    blocks: replaceBlock(plan.blocks, plan.currentIndex, { ...block, elapsedSeconds: elapsed }),
    runningSince: null,
  };
}

function configFromUserState(): SessionConfig {
  const state = getUserSyncState();
  return {
    availableMinutes: state.availableMinutes || 45,
    intensity: state.intensity || 3,
    contextFilter: state.contextFilter || 'ALL',
  };
}

/**
 * Day-boundary and relaunch rules. Returns whether the stored plan needs saving.
 */
function applyMountRules(
  stored: SessionPlan | null,
  exercises: Exercise[],
  song: ActiveStandard
): { plan: SessionPlan; changed: boolean; staleRunning: boolean } {
  const nowIso = new Date().toISOString();
  const fresh = (config: SessionConfig) => newPlan(config, suggestPlan(config, exercises, song));

  // No plan yet: an in-memory suggestion is persisted on the first edit.
  if (!stored) {
    return { plan: fresh(configFromUserState()), changed: false, staleRunning: false };
  }

  const config: SessionConfig = {
    ...stored.config,
    contextFilter: stored.config.contextFilter ?? 'ALL',
  };

  if (stored.status === 'complete' && !isSameLocalDay(stored.completedAt ?? stored.updatedAt, nowIso)) {
    return { plan: fresh(config), changed: true, staleRunning: false };
  }
  if (stored.status === 'building' && !stored.isCustomized && !isSameLocalDay(stored.createdAt, nowIso)) {
    return { plan: fresh(config), changed: true, staleRunning: false };
  }

  const staleRunning =
    stored.status === 'running' && !!stored.startedAt && !isSameLocalDay(stored.startedAt, nowIso);
  if (stored.runningSince) {
    return { plan: foldRunning(stored, Date.now()), changed: true, staleRunning };
  }
  return { plan: stored, changed: false, staleRunning };
}

interface InitialState {
  plan: SessionPlan;
  exercises: Exercise[];
  song: ActiveStandard;
  staleRunning: boolean;
  voice: MetronomeVoice;
  feel: MetronomeFeelMode;
  autoStartNext: boolean;
}

function bootstrap(): InitialState {
  initDatabase();
  const exercises = getAllVaultExercises();
  const song = getActiveStandard();
  // Rules are applied in memory only; they are persisted after the first cloud pull so a
  // freshly opened device cannot overwrite the plan another device is using.
  const { plan, staleRunning } = applyMountRules(getSessionPlan(), exercises, song);
  const userState = getUserSyncState();
  const voice = userState.metronomeVoice || 'PENDULUM';
  const feel = userState.metronomeFeel || 'BACKBEAT_2_4';
  audioMetronomeService.setVoice(voice);
  audioMetronomeService.setFeelMode(feel);
  return {
    plan,
    exercises,
    song,
    staleRunning,
    voice,
    feel,
    autoStartNext: getLocalPref('pref_auto_start_next', '1') === '1',
  };
}

// ==============================================================================
// Provider
// ==============================================================================

export function SessionProvider({ children }: { children: ReactNode }) {
  const initRef = useRef<InitialState | null>(null);
  if (!initRef.current) initRef.current = bootstrap();
  const init = initRef.current;

  const [plan, setPlanState] = useState<SessionPlan>(init.plan);
  const [exercises, setExercisesState] = useState<Exercise[]>(init.exercises);
  const [song, setSongState] = useState<ActiveStandard>(init.song);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isMetronomeOn, setIsMetronomeOnState] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [staleRunning, setStaleRunning] = useState(init.staleRunning);
  const [voice, setVoiceState] = useState<MetronomeVoice>(init.voice);
  const [feel, setFeelState] = useState<MetronomeFeelMode>(init.feel);
  const [autoStartNext, setAutoStartNextState] = useState(init.autoStartNext);

  const planRef = useRef(init.plan);
  const exercisesRef = useRef(init.exercises);
  const exMapRef = useRef(mapById(init.exercises));
  const songRef = useRef(init.song);
  const metronomeOnRef = useRef(false);
  const autoStartNextRef = useRef(init.autoStartNext);
  // True while this device set the running clock. Only the owner auto-completes a block at zero,
  // so two devices showing the same running plan never log the same block twice.
  const timerOwnerRef = useRef(false);
  // True while a debounced change lives only in memory; reloads must not overwrite it.
  const dirtyRef = useRef(false);
  const reconcileRef = useRef<(() => void) | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const actionsRef = useRef<SessionActions | null>(null);
  if (!actionsRef.current) {
    // ---------- state plumbing ----------
    const setPlanLocal = (next: SessionPlan) => {
      planRef.current = next;
      setPlanState(next);
    };

    const persistNow = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      dirtyRef.current = false;
      setPlanLocal(saveSessionPlan(planRef.current));
    };

    const commit = (next: SessionPlan, mode: 'now' | 'debounced' = 'now') => {
      setPlanLocal(normalizePlan(next, exMapRef.current));
      if (mode === 'now') {
        persistNow();
        return;
      }
      dirtyRef.current = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(persistNow, BPM_SAVE_DEBOUNCE_MS);
    };

    const working = () => normalizePlan(planRef.current, exMapRef.current);

    const refreshExercises = () => {
      const list = getAllVaultExercises();
      exercisesRef.current = list;
      exMapRef.current = mapById(list);
      setExercisesState(list);
    };

    /**
     * A suggestion the user has not touched follows the library: making an exercise active or
     * changing its minutes shows up in today's plan without a rebuild. In memory only; the plan
     * is persisted by the user's next action, never by a reload.
     */
    const followLibrary = (p: SessionPlan): SessionPlan => {
      if (p.status !== 'building' || p.isCustomized) return p;
      const blocks = suggestPlan(p.config, exercisesRef.current, songRef.current);
      const same =
        blocks.length === p.blocks.length &&
        blocks.every(
          (b, i) =>
            b.exerciseId === p.blocks[i].exerciseId &&
            b.allocatedMinutes === p.blocks[i].allocatedMinutes
        );
      return same ? p : { ...p, blocks, currentIndex: 0 };
    };

    const reloadFromDb = () => {
      refreshExercises();
      const std = getActiveStandard();
      songRef.current = std;
      setSongState(std);
      if (dirtyRef.current) return;
      const stored = getSessionPlan();
      if (stored && stored.runningSince !== planRef.current.runningSince) {
        // Another device (or a relaunch) changed the clock; this device no longer owns it
        timerOwnerRef.current = false;
      }
      setPlanLocal(followLibrary(stored ?? planRef.current));
    };

    const nowIso = () => new Date().toISOString();

    const effectiveBpmAt = (p: SessionPlan, index: number): number | null => {
      const block = p.blocks[index];
      const ex = block ? exMapRef.current.get(block.exerciseId) : undefined;
      return block && ex ? block.bpm ?? ex.currentBpm : null;
    };

    const freshSuggestion = (config: SessionConfig) =>
      newPlan(config, suggestPlan(config, exercisesRef.current, songRef.current));

    // ---------- metronome ----------
    const startClick = (bpm: number) => {
      audioMetronomeService.startMetronome(bpm, (beat) => setCurrentBeat(beat));
    };

    const stopMetronome = () => {
      audioMetronomeService.stopMetronome();
      metronomeOnRef.current = false;
      setIsMetronomeOnState(false);
      setCurrentBeat(0);
    };

    const retuneMetronome = (p: SessionPlan) => {
      if (!metronomeOnRef.current) return;
      const bpm = effectiveBpmAt(p, p.currentIndex);
      if (bpm !== null) audioMetronomeService.setBpm(bpm);
    };

    // ---------- timer flow ----------
    const advance = (p: SessionPlan, wasRunning: boolean) => {
      const next = nextPendingIndex(p.blocks, p.currentIndex);
      if (next === -1) {
        stopMetronome();
        commit({ ...p, runningSince: null, status: 'complete', completedAt: nowIso() });
        return;
      }
      const autoStart = wasRunning && autoStartNextRef.current;
      const nextPlan = { ...p, currentIndex: next, runningSince: autoStart ? nowIso() : null };
      commit(nextPlan);
      if (autoStart) {
        timerOwnerRef.current = true;
        setNowMs(Date.now());
      }
      retuneMetronome(nextPlan);
    };

    const currentPending = (p: SessionPlan) => {
      if (p.status !== 'running') return null;
      const block = p.blocks[p.currentIndex];
      if (!block || block.status !== 'pending') return null;
      const exercise = exMapRef.current.get(block.exerciseId);
      return exercise ? { block, exercise } : null;
    };

    const startTimer = () => {
      const p = working();
      if (!currentPending(p) || p.runningSince) return;
      commit({ ...p, runningSince: nowIso() });
      timerOwnerRef.current = true;
      setNowMs(Date.now());
      if (metronomeOnRef.current && !audioMetronomeService.getIsTicking()) {
        const bpm = effectiveBpmAt(p, p.currentIndex);
        if (bpm !== null) startClick(bpm);
      }
    };

    const pauseTimer = () => {
      const p = working();
      if (!p.runningSince) return;
      commit(foldRunning(p, Date.now()));
    };

    const completeCurrent = () => {
      const p0 = working();
      if (!currentPending(p0)) return;
      const wasRunning = p0.runningSince !== null;
      const p = foldRunning(p0, Date.now());
      const block = p.blocks[p.currentIndex];
      const exercise = exMapRef.current.get(block.exerciseId)!;
      const minutes = Math.max(1, Math.ceil(block.elapsedSeconds / 60));
      updateExerciseProgress(
        exercise.id,
        block.bpm ?? exercise.currentBpm,
        exercise.masteredKeys,
        true,
        minutes
      );
      playBlockCompleteChime();
      const blocks = replaceBlock(p.blocks, p.currentIndex, {
        ...block,
        status: 'done',
        practicedMinutes: minutes,
      });
      refreshExercises();
      advance({ ...p, blocks }, wasRunning);
    };

    const skipCurrent = () => {
      const p0 = working();
      const target = currentPending(p0);
      if (!target) return;
      const wasRunning = p0.runningSince !== null;
      const p = foldRunning(p0, Date.now());
      incrementExerciseSkipped(target.exercise.id);
      const blocks = replaceBlock(p.blocks, p.currentIndex, {
        ...p.blocks[p.currentIndex],
        status: 'skipped',
      });
      refreshExercises();
      advance({ ...p, blocks }, wasRunning);
    };

    const setCurrent = (index: number) => {
      const p = foldRunning(working(), Date.now());
      if (p.status !== 'running' || p.blocks[index]?.status !== 'pending') return;
      const next = { ...p, currentIndex: index, runningSince: null };
      commit(next);
      retuneMetronome(next);
    };

    const endSession = () => {
      const p = foldRunning(working(), Date.now());
      stopMetronome();
      commit({ ...p, status: 'complete', completedAt: nowIso() });
    };

    /** Escape hatch from the summary when the session was ended with exercises still pending. */
    const resumeSession = () => {
      const p = working();
      if (p.status !== 'complete') return;
      const next = nextPendingIndex(p.blocks, -1);
      if (next === -1) return;
      commit({ ...p, status: 'running', completedAt: null, currentIndex: next, runningSince: null });
    };

    const finishSession = () => {
      commit(freshSuggestion(working().config));
      setStaleRunning(false);
    };

    // ---------- plan editing ----------
    const addExercise = (exerciseId: string, where: 'end' | 'afterCurrent' = 'end') => {
      const p = working();
      const exercise = exMapRef.current.get(exerciseId);
      if (!exercise || p.blocks.some((b) => b.exerciseId === exerciseId)) return;
      const blocks = [...p.blocks];
      const insertAt =
        where === 'afterCurrent' && p.status === 'running' ? p.currentIndex + 1 : blocks.length;
      blocks.splice(insertAt, 0, newBlock(exerciseId, exercise.durationMinutes));
      let next: SessionPlan = { ...p, blocks, isCustomized: true };
      // Adding to a finished session reopens it on the new exercise
      if (p.status === 'complete') {
        next = { ...next, status: 'running', completedAt: null, currentIndex: insertAt, runningSince: null };
      }
      commit(next);
    };

    const removeBlock = (index: number) => {
      const p = working();
      if (!p.blocks[index]) return;
      const wasCurrent = index === p.currentIndex;
      const blocks = p.blocks.filter((_, i) => i !== index);
      let currentIndex = p.currentIndex;
      if (wasCurrent) {
        currentIndex = Math.max(0, nextPendingIndex(blocks, index - 1));
      } else if (index < p.currentIndex) {
        currentIndex -= 1;
      }
      const next = {
        ...p,
        blocks,
        currentIndex,
        runningSince: wasCurrent ? null : p.runningSince,
        isCustomized: true,
      };
      commit(next);
      if (wasCurrent) retuneMetronome(next);
    };

    const moveBlock = (index: number, dir: -1 | 1) => {
      const p = working();
      const target = index + dir;
      if (!p.blocks[index] || !p.blocks[target]) return;
      const blocks = [...p.blocks];
      [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
      let currentIndex = p.currentIndex;
      if (index === p.currentIndex) currentIndex = target;
      else if (target === p.currentIndex) currentIndex = index;
      commit({ ...p, blocks, currentIndex, isCustomized: true });
    };

    const setBlockMinutes = (index: number, minutes: number) => {
      const p = working();
      const block = p.blocks[index];
      if (!block) return;
      const allocatedMinutes = clampMinutes(minutes, Math.max(MAX_BLOCK_MINUTES, block.allocatedMinutes));
      commit({
        ...p,
        blocks: replaceBlock(p.blocks, index, { ...block, allocatedMinutes }),
        isCustomized: true,
      });
    };

    const rebuildPlan = () => {
      const p = working();
      if (p.status !== 'building') return;
      commit({
        ...p,
        blocks: suggestPlan(p.config, exercisesRef.current, songRef.current),
        isCustomized: false,
        currentIndex: 0,
      });
    };

    const setConfig = (partial: Partial<SessionConfig>) => {
      // Inputs feel live; persistence and re-suggestion happen once the user stops moving.
      const p = planRef.current;
      setPlanLocal({ ...p, config: { ...p.config, ...partial } });
      dirtyRef.current = true;
      if (configTimerRef.current) clearTimeout(configTimerRef.current);
      configTimerRef.current = setTimeout(() => {
        configTimerRef.current = null;
        const latest = working();
        saveUserSyncState({
          availableMinutes: latest.config.availableMinutes,
          intensity: latest.config.intensity,
          contextFilter: latest.config.contextFilter,
        });
        const next =
          !latest.isCustomized && latest.status === 'building'
            ? { ...latest, blocks: suggestPlan(latest.config, exercisesRef.current, songRef.current), currentIndex: 0 }
            : latest;
        commit(next);
      }, CONFIG_DEBOUNCE_MS);
    };

    const startSession = () => {
      const p = working();
      if (p.status !== 'building' || p.blocks.length === 0) return;
      commit({
        ...p,
        status: 'running',
        startedAt: nowIso(),
        currentIndex: Math.max(0, nextPendingIndex(p.blocks, -1)),
        runningSince: null,
      });
    };

    const extendCurrent = (minutes: number) => {
      const p = working();
      const target = currentPending(p);
      if (!target) return;
      commit({
        ...p,
        blocks: replaceBlock(p.blocks, p.currentIndex, {
          ...target.block,
          allocatedMinutes: Math.min(MAX_EXTENDED_MINUTES, target.block.allocatedMinutes + minutes),
        }),
      });
    };

    const reopenBlock = (index: number) => {
      const p = foldRunning(working(), Date.now());
      const block = p.blocks[index];
      if (!block || block.status === 'pending') return;
      const next: SessionPlan = {
        ...p,
        blocks: replaceBlock(p.blocks, index, resetBlock(block)),
        status: 'running',
        completedAt: null,
        currentIndex: index,
        runningSince: null,
      };
      commit(next);
      retuneMetronome(next);
    };

    const startNow = (exerciseId: string) => {
      const exercise = exMapRef.current.get(exerciseId);
      if (!exercise) return;
      let p = working();
      if (p.status === 'complete') {
        p = freshSuggestion(p.config);
        setStaleRunning(false);
      }
      const existing = p.blocks.find((b) => b.exerciseId === exerciseId);
      const block = existing
        ? existing.status === 'pending'
          ? existing
          : resetBlock(existing)
        : newBlock(exerciseId, exercise.durationMinutes);
      const startedNow = nowIso();
      let next: SessionPlan;

      if (p.status === 'building') {
        next = {
          ...p,
          blocks: [block, ...p.blocks.filter((b) => b.exerciseId !== exerciseId)],
          isCustomized: true,
          status: 'running',
          startedAt: startedNow,
          currentIndex: 0,
          runningSince: startedNow,
        };
      } else {
        const paused = foldRunning(p, Date.now());
        const currentId = paused.blocks[paused.currentIndex]?.exerciseId;
        if (currentId === exerciseId && paused.blocks[paused.currentIndex].status === 'pending') {
          next = { ...paused, runningSince: startedNow };
        } else {
          const blocks = paused.blocks.filter((b) => b.exerciseId !== exerciseId);
          const insertAt = (currentId ? blocks.findIndex((b) => b.exerciseId === currentId) : -1) + 1;
          blocks.splice(insertAt, 0, block);
          next = {
            ...paused,
            blocks,
            isCustomized: true,
            currentIndex: insertAt,
            runningSince: startedNow,
          };
        }
      }
      commit(next);
      timerOwnerRef.current = true;
      setNowMs(Date.now());
      retuneMetronome(next);
    };

    /** After the first cloud pull: re-read everything, apply the day-boundary rules, re-arm the reminder. */
    const reconcileAfterPull = () => {
      reloadFromDb();
      if (dirtyRef.current) return;
      const { plan: reconciled, changed, staleRunning: stale } = applyMountRules(
        getSessionPlan() ?? planRef.current,
        exercisesRef.current,
        songRef.current
      );
      if (changed) {
        setPlanLocal(normalizePlan(reconciled, exMapRef.current));
        persistNow();
      } else {
        setPlanLocal(followLibrary(reconciled));
      }
      setStaleRunning(stale);
      if (getLocalPref('pref_reminder_enabled', '0') === '1') {
        // One-shot reminders are re-armed for the next morning each time the app opens.
        scheduleNextShedAlarm(Number(getLocalPref('pref_reminder_hour', '8')) || 8, planRef.current.config);
      }
    };
    reconcileRef.current = reconcileAfterPull;

    // ---------- tempo, keys, sound ----------
    const setBpm = (delta: number) => {
      const p = working();
      const target = currentPending(p);
      if (!target) return;
      const base = target.block.bpm ?? target.exercise.currentBpm;
      const bpm = Math.max(30, Math.min(320, base + delta));
      if (bpm === base) return;
      commit(
        { ...p, blocks: replaceBlock(p.blocks, p.currentIndex, { ...target.block, bpm }) },
        'debounced'
      );
      if (metronomeOnRef.current) audioMetronomeService.setBpm(bpm);
    };

    const toggleMetronome = () => {
      if (metronomeOnRef.current) {
        stopMetronome();
        return;
      }
      const p = working();
      startClick(effectiveBpmAt(p, p.currentIndex) ?? 120);
      metronomeOnRef.current = true;
      setIsMetronomeOnState(true);
    };

    const setVoice = (next: MetronomeVoice) => {
      audioMetronomeService.setVoice(next);
      setVoiceState(next);
      saveUserSyncState({ metronomeVoice: next });
    };

    const setFeel = (next: MetronomeFeelMode) => {
      audioMetronomeService.setFeelMode(next);
      setFeelState(next);
      saveUserSyncState({ metronomeFeel: next });
    };

    const toggleKey = (key: PitchKey) => {
      const p = working();
      const target = currentPending(p);
      if (!target) return;
      const { exercise, block } = target;
      const keys = exercise.masteredKeys.includes(key)
        ? exercise.masteredKeys.filter((k) => k !== key)
        : [...exercise.masteredKeys, key];
      updateExerciseProgress(exercise.id, block.bpm ?? exercise.currentBpm, keys, false);
      refreshExercises();
    };

    const setAutoStartNext = (enabled: boolean) => {
      setLocalPref('pref_auto_start_next', enabled ? '1' : '0');
      autoStartNextRef.current = enabled;
      setAutoStartNextState(enabled);
    };

    actionsRef.current = {
      reloadFromDb,
      setConfig,
      rebuildPlan,
      addExercise,
      removeBlock,
      moveBlock,
      setBlockMinutes,
      startSession,
      startTimer,
      pauseTimer,
      extendCurrent,
      completeCurrent,
      skipCurrent,
      setCurrent,
      reopenBlock,
      endSession,
      resumeSession,
      finishSession,
      resumeStale: () => setStaleRunning(false),
      startNow,
      setBpm,
      toggleMetronome,
      setVoice,
      setFeel,
      toggleKey,
      setAutoStartNext,
    };
  }
  const actions = actionsRef.current;

  // Mount: cloud pull + reconcile, realtime, wall-clock tick.
  useEffect(() => {
    let cancelled = false;
    setupAlarmChannel();

    pullAllFromCloud().then(() => {
      if (cancelled) return;
      reconcileRef.current?.();
    });

    const unsubscribe = subscribeToRealtimeChanges(() => actions.reloadFromDb());

    const tick = setInterval(() => {
      const p = normalizePlan(planRef.current, exMapRef.current);
      if (!p.runningSince || p.status !== 'running') return;
      const now = Date.now();
      setNowMs(now);
      const block = p.blocks[p.currentIndex];
      // A device merely mirroring another device's running plan shows the countdown but leaves
      // completing (and logging) the block to the device that started the clock.
      if (
        timerOwnerRef.current &&
        block &&
        elapsedSecondsOf(block, true, p.runningSince, now) >= block.allocatedMinutes * 60
      ) {
        actions.completeCurrent();
      }
    }, 1000);

    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(tick);
      if (configTimerRef.current) clearTimeout(configTimerRef.current);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveSessionPlan(planRef.current);
      }
      audioMetronomeService.stopMetronome();
    };
  }, [actions]);

  const exMap = useMemo(() => mapById(exercises), [exercises]);
  const view = useMemo(() => normalizePlan(plan, exMap), [plan, exMap]);

  const blocks = useMemo<ResolvedBlock[]>(
    () =>
      view.blocks.map((block, index) => {
        const exercise = exMap.get(block.exerciseId)!;
        const isCurrent = view.status === 'running' && index === view.currentIndex;
        const allocatedSeconds = block.allocatedMinutes * 60;
        const elapsedSecondsNow = Math.min(
          allocatedSeconds,
          elapsedSecondsOf(block, isCurrent, view.runningSince, nowMs)
        );
        return {
          ...block,
          index,
          exercise,
          effectiveBpm: block.bpm ?? exercise.currentBpm,
          elapsedSecondsNow,
          remainingSeconds: Math.max(0, allocatedSeconds - elapsedSecondsNow),
          isCurrent,
          assignedSongTitle: isBoundToSong(exercise) ? songLabel(song) : undefined,
        };
      }),
    [view, exMap, nowMs, song]
  );

  const current = blocks.find((b) => b.isCurrent && b.status === 'pending') ?? null;
  const remainingPlanMinutes = blocks
    .filter((b) => b.status === 'pending')
    .reduce((sum, b) => sum + Math.ceil(b.remainingSeconds / 60), 0);

  const value: SessionContextValue = {
    ...actions,
    plan: view,
    blocks,
    current,
    status: view.status,
    isTimerRunning: view.runningSince !== null,
    isMetronomeOn,
    staleRunning,
    config: view.config,
    remainingPlanMinutes,
    song,
    exercises,
    voice,
    feel,
    autoStartNext,
  };

  return (
    <SessionContext.Provider value={value}>
      <BeatContext.Provider value={currentBeat}>{children}</BeatContext.Provider>
    </SessionContext.Provider>
  );
}
