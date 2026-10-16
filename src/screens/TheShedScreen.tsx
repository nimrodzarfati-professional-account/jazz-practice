import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { ActiveStandard, PitchKey, ScoredExercise } from '../types/models';
import { CreamBlock } from '../components/CreamBlock';
import { ActiveStandardBanner } from '../components/ActiveStandardBanner';
import { KeyStampGrid } from '../components/KeyStampGrid';
import { StampButton } from '../components/StampButton';
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
}

export const TheShedScreen: React.FC<TheShedScreenProps> = ({
  queue,
  activeStandard,
  onRefreshData,
  onOpenRotateStandardModal,
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

  // Whenever the active exercise changes, reset the timer to THAT exercise's duration
  useEffect(() => {
    if (activeExercise) {
      setIsRunning(false);
      setSecondsLeft(activeExercise.allocatedMinutes * 60);
      if (isMetronomeOn) {
        audioMetronomeService.startMetronome(activeExercise.currentBpm);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExercise?.id, activeExercise?.allocatedMinutes]);

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
    const exists = activeExercise.masteredKeys.includes(key);
    const updatedKeys = exists
      ? activeExercise.masteredKeys.filter((k) => k !== key)
      : [...activeExercise.masteredKeys, key];

    updateExerciseProgress(activeExercise.id, activeExercise.currentBpm, updatedKeys, false);
    onRefreshData();
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
    } else {
      audioMetronomeService.startMetronome(activeExercise.currentBpm);
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

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.canvasBg }]}>
      {/* 1-2 Week Active Jazz Standard Strip */}
      <ActiveStandardBanner
        standard={activeStandard}
        onPressRotate={onOpenRotateStandardModal}
      />

      {/* Active Exercise Cream Card */}
      <CreamBlock>
        <View style={styles.metaRow}>
          <Text
            style={[
              styles.badge,
              {
                backgroundColor: colors.primary,
                color: colors.cardSurface,
                fontFamily: typography.fontStamp,
              },
            ]}
          >
            {activeExercise.context} // {activeExercise.category}
          </Text>
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
            <StampButton
              label={isMetronomeOn ? 'STOP CLICK' : `CLICK (${activeExercise.currentBpm})`}
              variant="tertiary"
              size="sm"
              onPress={toggleMetronome}
            />
          </View>
        </View>

        {/* Queue Navigator: Block X of Y */}
        <View style={styles.navRow}>
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
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, letterSpacing: 1 },
  title: { fontSize: 21, marginTop: 8, marginBottom: 6 },
  standardCallout: { borderWidth: 1.5, padding: 7, marginBottom: 8 },
  desc: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  timerWell: {
    borderWidth: 2,
    padding: 12,
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
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#DDD2BC',
    marginVertical: 6,
  },
});
