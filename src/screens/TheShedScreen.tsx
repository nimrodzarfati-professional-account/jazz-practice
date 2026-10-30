import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { ActiveStandard, PitchKey, ScoredExercise } from '../types/models';
import { CreamBlock } from '../components/CreamBlock';
import { ActiveStandardBanner } from '../components/ActiveStandardBanner';
import { KeyStampGrid } from '../components/KeyStampGrid';
import { StampButton } from '../components/StampButton';
import { StampBadge } from '../components/StampBadge';
import {
  graduateExerciseToMaintenance,
  updateExerciseProgress,
  getUserSyncState,
  saveUserSyncState,
  resolveHomeworkDecision,
} from '../db/repository';
import { getHomeworkStats } from '../services/CrateUtils';
import {
  playBlockCompleteChime,
  audioMetronomeService,
  METRONOME_VOICES,
  MetronomeVoice,
  MetronomeFeelMode,
} from '../services/AudioMetronomeService';

interface TheShedScreenProps {
  queue: ScoredExercise[];
  activeStandard: ActiveStandard;
  onRefreshData: () => void;
  onOpenRotateStandardModal: () => void;
  onUpdateQueueItem?: (updatedExercise: ScoredExercise) => void;
  currentExerciseIndex?: number;
  onIndexChange?: (index: number) => void;
}

export const TheShedScreen: React.FC<TheShedScreenProps> = ({
  queue,
  activeStandard,
  onRefreshData,
  onOpenRotateStandardModal,
  onUpdateQueueItem,
  currentExerciseIndex,
  onIndexChange,
}) => {
  const { colors, typography } = useTheme();
  const { isDesktop } = useResponsiveLayout();

  // Practice session starts on the first exercise (index 0)
  const [activeIndex, setActiveIndex] = useState(() => {
    if (typeof currentExerciseIndex === 'number') {
      return Math.max(0, Math.min(queue.length - 1, currentExerciseIndex));
    }
    return 0;
  });

  // Logging in-flight and spam prevention states
  const [isLogging, setIsLogging] = useState(false);
  const [loggedExerciseIds, setLoggedExerciseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof currentExerciseIndex === 'number') {
      setActiveIndex(Math.max(0, Math.min(queue.length - 1, currentExerciseIndex)));
    }
  }, [currentExerciseIndex, queue.length]);
  const safeActiveIndex = queue.length > 0 ? Math.max(0, Math.min(activeIndex, queue.length - 1)) : 0;
  const activeExercise = queue[safeActiveIndex] || null;

  useEffect(() => {
    if (queue.length > 0 && activeIndex >= queue.length) {
      setActiveIndex(queue.length - 1);
    }
  }, [queue.length, activeIndex]);

  // Timer is automatically set by the active exercise's allocatedMinutes
  const [secondsLeft, setSecondsLeft] = useState<number>(
    activeExercise ? activeExercise.allocatedMinutes * 60 : 900
  );
  const [isRunning, setIsRunning] = useState(false);
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [feelMode, setFeelMode] = useState<MetronomeFeelMode>(() => {
    try {
      const savedFeel = getUserSyncState().metronomeFeel;
      if (savedFeel) audioMetronomeService.setFeelMode(savedFeel);
      return savedFeel || audioMetronomeService.getFeelMode();
    } catch {
      return audioMetronomeService.getFeelMode();
    }
  });
  const [metronomeVoice, setMetronomeVoice] = useState<MetronomeVoice>(() => {
    try {
      const savedVoice = getUserSyncState().metronomeVoice;
      if (savedVoice) audioMetronomeService.setVoice(savedVoice);
      return savedVoice || audioMetronomeService.getVoice();
    } catch {
      return audioMetronomeService.getVoice();
    }
  });

  // Reset logging state on exercise change
  useEffect(() => {
    setIsLogging(false);
  }, [activeExercise?.id]);

  // Whenever the active exercise changes, reset the timer to THAT exercise's duration
  useEffect(() => {
    if (activeExercise) {
      setIsRunning(false);
      setSecondsLeft(activeExercise.allocatedMinutes * 60);
      if (isMetronomeOn) {
        audioMetronomeService.startMetronome(activeExercise.currentBpm, (beat) => {
          setCurrentBeat(beat);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExercise?.id, activeExercise?.allocatedMinutes]);

  // Clean up metronome on unmount
  useEffect(() => {
    return () => {
      audioMetronomeService.stopMetronome();
    };
  }, []);

  const updateActiveIndex = (nextIdx: number) => {
    const safeIdx = Math.max(0, Math.min(queue.length - 1, nextIdx));
    setActiveIndex(safeIdx);
    if (onIndexChange) {
      onIndexChange(safeIdx);
    }
    saveUserSyncState({ activeQueueIndex: safeIdx });
  };

  const handleBlockFinished = () => {
    if (isLogging || !activeExercise || loggedExerciseIds.has(activeExercise.id)) {
      return;
    }
    setIsLogging(true);
    setIsRunning(false);
    playBlockCompleteChime(); // Studio chime only — NO voice TTS

    setLoggedExerciseIds((prev) => new Set(prev).add(activeExercise.id));

    updateExerciseProgress(
      activeExercise.id,
      activeExercise.currentBpm,
      activeExercise.masteredKeys,
      true
    );
    onRefreshData();

    // Auto-advance to next queued exercise if available
    if (activeIndex < queue.length - 1) {
      const nextIdx = activeIndex + 1;
      updateActiveIndex(nextIdx);
    } else {
      setTimeout(() => {
        setIsLogging(false);
      }, 1500);
    }
  };

  const handleHomeworkDecision = (exerciseId: string, decision: 'keep' | 'vault') => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resolveHomeworkDecision(exerciseId, decision);
    onRefreshData();
    if (decision === 'vault' && activeIndex < queue.length - 1) {
      updateActiveIndex(activeIndex);
    }
  };

  const handleBlockFinishedRef = useRef(handleBlockFinished);
  handleBlockFinishedRef.current = handleBlockFinished;

  // Countdown tick loop — depends strictly on isRunning and activeExercise?.id
  useEffect(() => {
    if (!isRunning || !activeExercise?.id) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, activeExercise?.id]);

  // Separate trigger for block finished when timer reaches zero
  useEffect(() => {
    if (isRunning && secondsLeft === 0) {
      handleBlockFinishedRef.current();
    }
  }, [isRunning, secondsLeft]);

  const handleToggleKey = (key: PitchKey) => {
    if (!activeExercise) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const exists = activeExercise.masteredKeys.includes(key);
    const updatedKeys = exists
      ? activeExercise.masteredKeys.filter((k) => k !== key)
      : [...activeExercise.masteredKeys, key];

    updateExerciseProgress(activeExercise.id, activeExercise.currentBpm, updatedKeys, false);
    const updated = { ...activeExercise, masteredKeys: updatedKeys };
    if (onUpdateQueueItem) {
      onUpdateQueueItem(updated);
    }
  };

  const handleBpmStep = (delta: number) => {
    if (!activeExercise) return;
    const newBpm = Math.max(30, Math.min(320, activeExercise.currentBpm + delta));
    if (newBpm === activeExercise.currentBpm) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Session-only BPM update: do NOT write to SQLite / Supabase here
    const updated = { ...activeExercise, currentBpm: newBpm };
    if (onUpdateQueueItem) {
      onUpdateQueueItem(updated);
    }
    if (isMetronomeOn) {
      audioMetronomeService.startMetronome(newBpm, (beat) => {
        setCurrentBeat(beat);
      });
    }
  };

  const handleGraduate = () => {
    if (!activeExercise) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    graduateExerciseToMaintenance(activeExercise.id);
    onRefreshData();
  };

  const toggleMetronome = () => {
    if (!activeExercise) return;
    if (isMetronomeOn) {
      audioMetronomeService.stopMetronome();
      setIsMetronomeOn(false);
      setCurrentBeat(0);
    } else {
      audioMetronomeService.startMetronome(activeExercise.currentBpm, (beat) => {
        setCurrentBeat(beat);
      });
      setIsMetronomeOn(true);
    }
  };

  const handleNextDrill = () => {
    if (activeIndex < queue.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updateActiveIndex(activeIndex + 1);
    }
  };

  const handlePrevDrill = () => {
    if (activeIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updateActiveIndex(activeIndex - 1);
    }
  };

  if (!activeExercise) {
    return (
      <View style={[styles.emptyWrap, { backgroundColor: colors.canvasBg }]}>
        <CreamBlock>
          <Text style={[{ fontFamily: typography.fontDisplay, fontSize: 18, color: colors.inkBlack, textAlign: 'center' }]}>
            No active exercises match your current settings.
          </Text>
          <Text style={[{ fontFamily: typography.fontMono, fontSize: 13, color: colors.inkMuted, marginTop: 8, textAlign: 'center' }]}>
            Go to [ PRACTICE VAULT ] to activate exercises, or [ SESSION PLAN ] to adjust your time and energy level.
          </Text>
        </CreamBlock>
      </View>
    );
  }

  const totalAllocatedSec = Math.max(1, activeExercise.allocatedMinutes * 60);
  const progressPct = Math.max(0, Math.min(100, ((totalAllocatedSec - secondsLeft) / totalAllocatedSec) * 100));

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const homeworkStats = getHomeworkStats(activeExercise);

  const renderTimerAndMetronome = () => (
    <View
      style={[
        styles.timerWell,
        { backgroundColor: colors.recessedSurface, borderColor: colors.inkBlack },
      ]}
    >
      {/* Linear Progress Bar */}
      <View style={[styles.progressBarTrack, { backgroundColor: colors.cardSurface, borderColor: colors.inkBlack }]}>
        <View style={[styles.progressBarFill, { width: `${progressPct}%`, backgroundColor: colors.primary }]} />
      </View>

      <View style={styles.timerTopRow}>
        <View>
          <Text style={{ fontFamily: typography.fontStamp, fontSize: 10, color: colors.inkMuted }}>
            PRACTICE TIMER ({activeExercise.allocatedMinutes} MIN)
          </Text>
          <Text style={[styles.timerDigits, { fontFamily: typography.fontMonoBold, color: colors.inkBlack }]}>
            {mm}:{ss}
          </Text>
        </View>

        <View style={styles.timerControls}>
          <StampButton
            label={isRunning ? '⏸ PAUSE' : '▶ START'}
            variant="primary"
            size="sm"
            onPress={() => {
              if (!isRunning && secondsLeft === 0 && activeExercise) {
                setSecondsLeft(activeExercise.allocatedMinutes * 60);
              }
              setIsRunning(!isRunning);
            }}
          />
          <StampButton
            label={
              activeExercise && loggedExerciseIds.has(activeExercise.id)
                ? '✓ LOGGED'
                : isLogging
                ? 'SAVING...'
                : '✓ MARK AS FINISHED'
            }
            variant="secondary"
            size="sm"
            disabled={isLogging || Boolean(activeExercise && loggedExerciseIds.has(activeExercise.id))}
            onPress={handleBlockFinished}
          />
        </View>
      </View>

      {/* Metronome Control Row with -5 / +5 Steppers & Visual 4-Beat Pulse */}
      <View style={[styles.metronomeSection, { borderTopColor: colors.inkBlack }]}>
        <View style={styles.bpmRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decrease BPM by 5"
            onPress={() => handleBpmStep(-5)}
            style={[styles.bpmStepBtn, { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface }]}
          >
            <Text style={[styles.bpmStepText, { fontFamily: typography.fontMonoBold, color: colors.inkBlack }]}>-5</Text>
          </Pressable>

          <Text style={[styles.bpmValueText, { fontFamily: typography.fontMonoBold, color: colors.inkBlack }]}>
            ♩ {activeExercise.currentBpm} BPM
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase BPM by 5"
            onPress={() => handleBpmStep(5)}
            style={[styles.bpmStepBtn, { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface }]}
          >
            <Text style={[styles.bpmStepText, { fontFamily: typography.fontMonoBold, color: colors.inkBlack }]}>+5</Text>
          </Pressable>

          <StampButton
            label={isMetronomeOn ? 'STOP METRONOME' : 'START METRONOME'}
            variant={isMetronomeOn ? 'secondary' : 'tertiary'}
            size="sm"
            onPress={toggleMetronome}
          />
        </View>

        {/* Metronome Sound Voice Selector */}
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
          {METRONOME_VOICES.map((v) => {
            const isSelected = metronomeVoice === v.id;
            return (
              <Pressable
                key={v.id}
                accessibilityLabel={`Metronome sound ${v.label}`}
                accessibilityRole="button"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  audioMetronomeService.setVoice(v.id);
                  setMetronomeVoice(v.id);
                  saveUserSyncState({ metronomeVoice: v.id });
                }}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: colors.inkBlack,
                  paddingVertical: 4,
                  alignItems: 'center',
                  backgroundColor: isSelected ? colors.tertiary : colors.cardSurface,
                }}
              >
                <Text
                  style={{
                    fontFamily: typography.fontStamp,
                    fontSize: 9,
                    letterSpacing: 0.6,
                    color: isSelected ? colors.cardSurface : colors.inkBlack,
                  }}
                >
                  {v.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Enforced Jazz 2 & 4 Pocket Toggle + Visual 4-Beat Pulse */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <Pressable
            accessibilityLabel="Toggle 2 and 4 backbeat mode"
            accessibilityRole="button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const nextMode: MetronomeFeelMode =
                feelMode === 'BACKBEAT_2_4' ? 'ALL_FOUR_2_4_ACCENT' : 'BACKBEAT_2_4';
              audioMetronomeService.setFeelMode(nextMode);
              setFeelMode(nextMode);
              saveUserSyncState({ metronomeFeel: nextMode });
            }}
            style={{
              borderWidth: 1.5,
              borderColor: colors.inkBlack,
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: feelMode === 'BACKBEAT_2_4' ? colors.secondary : colors.cardSurface,
            }}
          >
            <Text
              style={{
                fontFamily: typography.fontStamp,
                fontSize: 10,
                letterSpacing: 0.8,
                color: feelMode === 'BACKBEAT_2_4' ? colors.cardSurface : colors.inkBlack,
              }}
            >
              {feelMode === 'BACKBEAT_2_4' ? '✓ BEATS 2 & 4 ONLY' : 'ALL 4 BEATS'}
            </Text>
          </Pressable>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3, 4].map((beat) => {
              const isCurrent = isMetronomeOn && currentBeat === beat;
              const isBackbeat = beat === 2 || beat === 4;
              const isMutedBeat = feelMode === 'BACKBEAT_2_4' && !isBackbeat;
              return (
                <View
                  key={`beat-${beat}`}
                  style={[
                    styles.beatDot,
                    {
                      borderColor: colors.inkBlack,
                      opacity: isMutedBeat && !isCurrent ? 0.45 : 1,
                      backgroundColor: isCurrent
                        ? isBackbeat
                          ? colors.primary
                          : colors.recessedSurface
                        : colors.cardSurface,
                      transform: [{ scale: isCurrent && isBackbeat ? 1.2 : 1 }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.beatNumber,
                      {
                        fontFamily: typography.fontMonoBold,
                        color: isCurrent && isBackbeat ? colors.cardSurface : colors.inkMuted,
                      },
                    ]}
                  >
                    {beat}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );

  const renderActiveCardContent = () => (
    <CreamBlock>
      <View style={styles.metaRow}>
        <View style={styles.badgeRow}>
          <StampBadge label={activeExercise.context} type={activeExercise.context} />
          <StampBadge label={activeExercise.category.replace('_', ' ')} type={activeExercise.category} />
          {activeExercise.isHomework && (
            <View
              style={[
                styles.homeworkBadge,
                {
                  borderColor: colors.inkBlack,
                  backgroundColor: homeworkStats.isExpired ? colors.secondary : colors.primary,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: typography.fontStamp,
                  fontSize: 9,
                  color: colors.cardSurface,
                }}
              >
                {homeworkStats.isExpired ? '⚠️ HW DUE' : `📝 HW (${homeworkStats.daysRemaining}D)`}
              </Text>
            </View>
          )}
        </View>
        <Text style={{ fontFamily: typography.fontMonoBold, fontSize: 12, color: colors.inkBlack }}>
          {activeExercise.allocatedMinutes} MIN • PRIORITY {activeExercise.urgencyScore}%
        </Text>
      </View>

      <Text style={[styles.title, { fontFamily: typography.fontDisplay, color: colors.inkBlack }]}>
        {activeExercise.title}
      </Text>

      {/* Homework Expired Decision Prompt: Vault or Keep */}
      {activeExercise.isHomework && homeworkStats.isExpired && (
        <View
          style={[
            styles.homeworkDecisionCard,
            { backgroundColor: colors.recessedSurface, borderColor: colors.secondary },
          ]}
        >
          <Text style={{ fontFamily: typography.fontStamp, fontSize: 12, color: colors.secondary }}>
            ⚠️ 7-DAY HOMEWORK CYCLE COMPLETE
          </Text>
          <Text
            style={{
              fontFamily: typography.fontMono,
              fontSize: 12,
              color: colors.inkBlack,
              marginTop: 4,
              marginBottom: 8,
              lineHeight: 16,
            }}
          >
            This exercise has finished its 1-week homework period. Would you like to keep practicing it in your active routine or archive it to the vault?
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <StampButton
                label="📥 MOVE TO VAULT"
                variant="tertiary"
                size="sm"
                onPress={() => handleHomeworkDecision(activeExercise.id, 'vault')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <StampButton
                label="✓ KEEP IN ROTATION"
                variant="primary"
                size="sm"
                onPress={() => handleHomeworkDecision(activeExercise.id, 'keep')}
              />
            </View>
          </View>
        </View>
      )}

      {/* Active Homework In-Progress Callout */}
      {activeExercise.isHomework && !homeworkStats.isExpired && (
        <View
          style={[
            styles.homeworkCallout,
            { backgroundColor: colors.recessedSurface, borderColor: colors.primary },
          ]}
        >
          <Text style={{ fontFamily: typography.fontStamp, fontSize: 11, color: colors.primary }}>
            📝 WEEKLY HOMEWORK • DAY {homeworkStats.daysElapsed} OF 7 ({homeworkStats.daysRemaining} DAYS REMAINING)
          </Text>
        </View>
      )}

      {/* Bound Active Standard Callout for Maintenance Exercises */}
      {activeExercise.assignedStandardTitle && (
        <View
          style={[
            styles.standardCallout,
            { backgroundColor: colors.recessedSurface, borderColor: colors.inkBlack },
          ]}
        >
          <Text style={{ fontFamily: typography.fontStamp, fontSize: 12, color: colors.secondary }}>
            🎵 PRACTICE WITH SONG: {activeExercise.assignedStandardTitle}
          </Text>
        </View>
      )}

      <Text style={[styles.desc, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
        {activeExercise.description}
      </Text>

      {/* Exercise-Driven Countdown Timer Readout */}
      {renderTimerAndMetronome()}

      {/* Queue Navigator: Block X of Y */}
      <View style={[styles.navRow, { borderColor: colors.recessedSurface }]}>
        <StampButton
          label="← PREV"
          variant="tertiary"
          size="sm"
          disabled={activeIndex === 0}
          onPress={handlePrevDrill}
        />
        <Text style={[{ fontFamily: typography.fontStamp, fontSize: 11, color: colors.inkMuted }]}>
          EXERCISE {activeIndex + 1} OF {queue.length}
        </Text>
        <StampButton
          label="NEXT →"
          variant="tertiary"
          size="sm"
          disabled={activeIndex >= queue.length - 1}
          onPress={handleNextDrill}
        />
      </View>

      {/* Conditional 12-Key Grid (Renders ONLY if activeExercise.isKeyBased === true) */}
      <KeyStampGrid
        isKeyBased={activeExercise.isKeyBased}
        masteredKeys={activeExercise.masteredKeys}
        onToggleKey={handleToggleKey}
      />

      {/* 1-Tap Graduate to Maintenance Button (Shown for NEW_CONCEPT or TRANSCRIBING) */}
      {activeExercise.category !== 'MAINTENANCE' && (
        <View style={{ marginTop: 14 }}>
          <StampButton
            label="🎓 MOVE TO MAINTENANCE (LINK TO CURRENT SONG)"
            variant="tertiary"
            onPress={handleGraduate}
          />
        </View>
      )}
    </CreamBlock>
  );

  /* ============================================================
   * DESKTOP TWO-COLUMN CONTROL ROOM
   * ============================================================ */
  if (isDesktop) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.canvasBg }]}
        contentContainerStyle={styles.desktopScrollContent}
      >
        <View style={styles.desktopWorkspace}>
          {/* Top Active Standard Header Strip */}
          <ActiveStandardBanner
            standard={activeStandard}
            onPressRotate={onOpenRotateStandardModal}
          />

          <View style={styles.desktopColumns}>
            {/* Left Column: Active Exercise Focus & Transport */}
            <View style={styles.desktopLeftCol}>
              {renderActiveCardContent()}
            </View>

            {/* Right Column: Full Session Routine Workstation */}
            <View style={styles.desktopRightCol}>
              <CreamBlock>
                <View style={[styles.desktopQueueHeader, { borderBottomColor: colors.inkBlack }]}>
                  <Text style={[{ fontFamily: typography.fontDisplay, fontSize: 18, color: colors.inkBlack }]}>
                    SESSION ROUTINE
                  </Text>
                  <Text style={[{ fontFamily: typography.fontMono, fontSize: 11, color: colors.inkMuted }]}>
                    {queue.length} ITEMS QUEUED
                  </Text>
                </View>

                {queue.map((item, idx) => {
                  const isCurrent = idx === activeIndex;
                  return (
                    <Pressable
                      key={`${item.id}-${idx}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Select exercise ${item.title}`}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        updateActiveIndex(idx);
                      }}
                      style={[
                        styles.desktopQueueRow,
                        {
                          borderColor: isCurrent ? colors.primary : colors.inkBlack,
                          backgroundColor: isCurrent ? colors.recessedSurface : colors.cardSurface,
                        },
                      ]}
                    >
                      <View style={{ width: 28 }}>
                        <Text
                          style={{
                            fontFamily: typography.fontMonoBold,
                            fontSize: 12,
                            color: isCurrent ? colors.primary : colors.inkMuted,
                          }}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </Text>
                      </View>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text
                          style={{
                            fontFamily: typography.fontDisplay,
                            fontSize: 14,
                            color: isCurrent ? colors.primary : colors.inkBlack,
                          }}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                          <StampBadge label={item.context} type={item.context} />
                          <StampBadge label={item.category.replace('_', ' ')} type={item.category} />
                          {item.isHomework && (
                            <View
                              style={[
                                styles.homeworkBadge,
                                {
                                  borderColor: colors.inkBlack,
                                  backgroundColor: colors.primary,
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  fontFamily: typography.fontStamp,
                                  fontSize: 8,
                                  color: colors.cardSurface,
                                }}
                              >
                                HW
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={{
                            fontFamily: typography.fontMonoBold,
                            fontSize: 12,
                            color: colors.inkBlack,
                          }}
                        >
                          {item.allocatedMinutes}m
                        </Text>
                        <Text
                          style={{
                            fontFamily: typography.fontMono,
                            fontSize: 10,
                            color: colors.inkMuted,
                          }}
                        >
                          ♩ {item.currentBpm}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </CreamBlock>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  /* ============================================================
   * MOBILE SINGLE-COLUMN STACK
   * ============================================================ */
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.canvasBg }]}>
      {/* Clickable Horizontal Active Queue Strip */}
      {queue.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.queueStrip}
          contentContainerStyle={styles.queueStripContent}
        >
          {queue.map((item, idx) => {
            const isCurrent = idx === activeIndex;
            return (
              <Pressable
                key={`${item.id}-${idx}`}
                accessibilityRole="button"
                accessibilityLabel={`Exercise ${idx + 1} of ${queue.length}: ${item.title}`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateActiveIndex(idx);
                }}
                style={[
                  styles.queuePill,
                  {
                    borderColor: colors.inkBlack,
                    backgroundColor: isCurrent ? colors.primary : colors.cardSurface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.queuePillText,
                    {
                      fontFamily: typography.fontStamp,
                      color: isCurrent ? colors.cardSurface : colors.inkBlack,
                    },
                  ]}
                >
                  {String(idx + 1).padStart(2, '0')} {item.title.length > 18 ? item.title.substring(0, 16) + '...' : item.title} ({item.allocatedMinutes}m)
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* 1-2 Week Active Jazz Standard Strip */}
      <ActiveStandardBanner
        standard={activeStandard}
        onPressRotate={onOpenRotateStandardModal}
      />

      {/* Active Exercise Cream Card */}
      {renderActiveCardContent()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  /* Desktop Layout Styles */
  desktopScrollContent: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  desktopWorkspace: {
    width: '100%',
    maxWidth: 1240,
  },
  desktopColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 22,
    marginTop: 10,
  },
  desktopLeftCol: {
    flex: 1.35,
  },
  desktopRightCol: {
    flex: 1,
  },
  desktopQueueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    paddingBottom: 6,
    marginBottom: 8,
  },
  desktopQueueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  /* Mobile & Shared Styles */
  queueStrip: {
    marginBottom: 10,
  },
  queueStripContent: {
    gap: 6,
    flexDirection: 'row',
  },
  queuePill: {
    borderWidth: 1.5,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  queuePillText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  title: { fontSize: 21, marginTop: 8, marginBottom: 6 },
  standardCallout: { borderWidth: 1.5, padding: 7, marginBottom: 8 },
  homeworkBadge: {
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignSelf: 'center',
  },
  homeworkCallout: {
    borderWidth: 1.5,
    padding: 7,
    marginBottom: 8,
  },
  homeworkDecisionCard: {
    borderWidth: 2,
    padding: 10,
    marginBottom: 10,
  },
  desc: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  timerWell: {
    borderWidth: 2,
    padding: 12,
    marginBottom: 10,
  },
  progressBarTrack: {
    height: 6,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  timerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timerDigits: {
    fontSize: 32,
    letterSpacing: 1.5,
  },
  timerControls: {
    flexDirection: 'row',
    gap: 8,
  },
  metronomeSection: {
    borderTopWidth: 1.5,
    paddingTop: 8,
    marginTop: 4,
  },
  bpmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bpmStepBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 0,
  },
  bpmStepText: {
    fontSize: 12,
  },
  bpmValueText: {
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  beatDot: {
    width: 32,
    height: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beatNumber: {
    fontSize: 12,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginVertical: 10,
    paddingVertical: 6,
  },
});
