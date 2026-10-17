import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { ActiveStandard, PitchKey, ScoredExercise } from '../types/models';
import { CreamBlock } from '../components/CreamBlock';
import { ActiveStandardBanner } from '../components/ActiveStandardBanner';
import { KeyStampGrid } from '../components/KeyStampGrid';
import { StampButton } from '../components/StampButton';
import { StampBadge } from '../components/StampBadge';
import {
  graduateExerciseToMaintenance,
  updateExerciseProgress,
} from '../db/repository';
import { playBlockCompleteChime, audioMetronomeService } from '../services/AudioMetronomeService';

interface TheShedScreenProps {
  queue: ScoredExercise[];
  activeStandard: ActiveStandard;
  onRefreshData: () => void;
  onOpenRotateStandardModal: () => void;
  onUpdateQueueItem?: (updatedExercise: ScoredExercise) => void;
}

export const TheShedScreen: React.FC<TheShedScreenProps> = ({
  queue,
  activeStandard,
  onRefreshData,
  onOpenRotateStandardModal,
  onUpdateQueueItem,
}) => {
  const { colors, typography } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeExercise = queue[activeIndex] || null;

  // Timer is automatically set by the active exercise's allocatedMinutes
  const [secondsLeft, setSecondsLeft] = useState<number>(
    activeExercise ? activeExercise.allocatedMinutes * 60 : 900
  );
  const [isRunning, setIsRunning] = useState(false);
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

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

  // Countdown tick loop
  useEffect(() => {
    if (!isRunning || !activeExercise) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleBlockFinished();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, activeExercise]);

  const handleBlockFinished = () => {
    setIsRunning(false);
    playBlockCompleteChime(); // Studio chime only — NO voice TTS
    if (activeExercise) {
      updateExerciseProgress(
        activeExercise.id,
        activeExercise.currentBpm,
        activeExercise.masteredKeys,
        true
      );
      onRefreshData();
      // Auto-advance to next queued exercise if available
      if (activeIndex < queue.length - 1) {
        setActiveIndex((idx) => idx + 1);
      }
    }
  };

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

    updateExerciseProgress(activeExercise.id, newBpm, activeExercise.masteredKeys, false);
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
      setActiveIndex((idx) => idx + 1);
    }
  };

  const handlePrevDrill = () => {
    if (activeIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setActiveIndex((idx) => idx - 1);
    }
  };

  if (!activeExercise) {
    return (
      <View style={[styles.emptyWrap, { backgroundColor: colors.canvasBg }]}>
        <CreamBlock>
          <Text style={[{ fontFamily: typography.fontDisplay, fontSize: 18, color: colors.inkBlack, textAlign: 'center' }]}>
            No exercises in Active Rotation match this filter.
          </Text>
          <Text style={[{ fontFamily: typography.fontMono, fontSize: 13, color: colors.inkMuted, marginTop: 8, textAlign: 'center' }]}>
            Head to [ THE CRATE ] to add drills to your rotation, or [ CALL SHEET ] to adjust your faders.
          </Text>
        </CreamBlock>
      </View>
    );
  }

  const totalAllocatedSec = Math.max(1, activeExercise.allocatedMinutes * 60);
  const progressPct = Math.max(0, Math.min(100, ((totalAllocatedSec - secondsLeft) / totalAllocatedSec) * 100));

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

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
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveIndex(idx);
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
      <CreamBlock>
        <View style={styles.metaRow}>
          <View style={styles.badgeRow}>
            <StampBadge label={activeExercise.context} type={activeExercise.context} />
            <StampBadge label={activeExercise.category.replace('_', ' ')} type={activeExercise.category} />
          </View>
          <Text style={{ fontFamily: typography.fontMonoBold, fontSize: 12, color: colors.inkBlack }}>
            {activeExercise.allocatedMinutes}m BLOCK • URGENCY {activeExercise.urgencyScore}%
          </Text>
        </View>

        <Text style={[styles.title, { fontFamily: typography.fontDisplay, color: colors.inkBlack }]}>
          {activeExercise.title}
        </Text>

        {/* Bound Active Standard Callout for Maintenance Exercises */}
        {activeExercise.assignedStandardTitle && (
          <View
            style={[
              styles.standardCallout,
              { backgroundColor: colors.recessedSurface, borderColor: colors.inkBlack },
            ]}
          >
            <Text style={{ fontFamily: typography.fontStamp, fontSize: 12, color: colors.secondary }}>
              🎵 PRACTICE OVER STANDARD: {activeExercise.assignedStandardTitle}
            </Text>
          </View>
        )}

        <Text style={[styles.desc, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
          {activeExercise.description}
        </Text>

        {/* Exercise-Driven Countdown Timer Readout */}
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
                EXERCISE TIMER ({activeExercise.allocatedMinutes} MIN SET)
              </Text>
              <Text style={[styles.timerDigits, { fontFamily: typography.fontMonoBold, color: colors.inkBlack }]}>
                {mm}:{ss}
              </Text>
            </View>

            <View style={styles.timerControls}>
              <StampButton
                label={isRunning ? '⏸ PAUSE' : '▶ START'}
                variant="primary"
                size="md"
                onPress={() => setIsRunning(!isRunning)}
              />
            </View>
          </View>

          {/* Metronome Control Row with -5 / +5 Steppers & Visual 4-Beat Pulse */}
          <View style={[styles.metronomeSection, { borderTopColor: colors.inkBlack }]}>
            <View style={styles.bpmRow}>
              <Pressable
                onPress={() => handleBpmStep(-5)}
                style={[styles.bpmStepBtn, { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface }]}
              >
                <Text style={[styles.bpmStepText, { fontFamily: typography.fontMonoBold, color: colors.inkBlack }]}>-5</Text>
              </Pressable>

              <Text style={[styles.bpmValueText, { fontFamily: typography.fontMonoBold, color: colors.inkBlack }]}>
                ♩ {activeExercise.currentBpm} BPM
              </Text>

              <Pressable
                onPress={() => handleBpmStep(5)}
                style={[styles.bpmStepBtn, { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface }]}
              >
                <Text style={[styles.bpmStepText, { fontFamily: typography.fontMonoBold, color: colors.inkBlack }]}>+5</Text>
              </Pressable>

              <StampButton
                label={isMetronomeOn ? 'STOP CLICK' : 'START CLICK'}
                variant={isMetronomeOn ? 'secondary' : 'tertiary'}
                size="sm"
                onPress={toggleMetronome}
              />
            </View>

            {/* Visual 4-Beat Pulse Indicators */}
            <View style={styles.beatPulseRow}>
              {[1, 2, 3, 4].map((beat) => {
                const isCurrent = isMetronomeOn && currentBeat === beat;
                const isDownbeat = beat === 1;
                return (
                  <View
                    key={`beat-${beat}`}
                    style={[
                      styles.beatDot,
                      {
                        borderColor: colors.inkBlack,
                        backgroundColor: isCurrent
                          ? isDownbeat
                            ? colors.primary
                            : colors.tertiary
                          : colors.cardSurface,
                        transform: [{ scale: isCurrent ? 1.2 : 1 }],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.beatNumber,
                        {
                          fontFamily: typography.fontMonoBold,
                          color: isCurrent ? colors.cardSurface : colors.inkMuted,
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
            BLOCK {activeIndex + 1} OF {queue.length}
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
              label="🎓 GRADUATE TO MAINTENANCE (BIND TO STANDARD)"
              variant="tertiary"
              onPress={handleGraduate}
            />
          </View>
        )}
      </CreamBlock>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
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
    marginBottom: 10,
  },
  timerDigits: { fontSize: 34, letterSpacing: -1 },
  timerControls: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-end',
  },
  metronomeSection: {
    borderTopWidth: 1.5,
    paddingTop: 10,
  },
  bpmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bpmStepBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpmStepText: {
    fontSize: 12,
  },
  bpmValueText: {
    fontSize: 13,
    flex: 1,
    textAlign: 'center',
  },
  beatPulseRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  beatDot: {
    width: 32,
    height: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beatNumber: {
    fontSize: 11,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginVertical: 6,
  },
});
