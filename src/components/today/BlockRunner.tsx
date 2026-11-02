import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useSession } from '../../session/SessionContext';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { categoryLabel, formatClock } from '../../utils/format';
import { CreamBlock } from '../CreamBlock';
import { StampBadge } from '../StampBadge';
import { StampButton } from '../StampButton';

// Rough two-line capacity of the description at each layout width
const LONG_DESCRIPTION_CHARS = { mobile: 90, desktop: 160 };

export const BlockRunner: React.FC = () => {
  const { colors, typography } = useTheme();
  const { isDesktop } = useResponsiveLayout();
  const { current, isTimerRunning, startTimer, pauseTimer, completeCurrent, skipCurrent, extendCurrent } =
    useSession();
  const [showFullDescription, setShowFullDescription] = useState(false);

  if (!current) {
    return (
      <CreamBlock>
        <Text style={[typography.heading, { color: colors.inkBlack }]}>
          No exercise left in the plan.
        </Text>
        <Text style={[typography.mono, styles.description, { color: colors.inkMuted }]}>
          Add one from the library, or end the session to review it.
        </Text>
      </CreamBlock>
    );
  }

  const { exercise } = current;
  const allocatedSeconds = Math.max(1, current.allocatedMinutes * 60);
  const progressPct = Math.min(100, (current.elapsedSecondsNow / allocatedSeconds) * 100);
  const primaryLabel = isTimerRunning
    ? '❚❚ PAUSE'
    : current.elapsedSecondsNow === 0
    ? '▶ START'
    : '▶ RESUME';
  const isLongDescription =
    exercise.description.length > LONG_DESCRIPTION_CHARS[isDesktop ? 'desktop' : 'mobile'];

  return (
    <CreamBlock>
      <View style={styles.badges}>
        <StampBadge label={exercise.context} type={exercise.context} />
        <StampBadge label={categoryLabel(exercise.category)} type={exercise.category} />
        {exercise.isHomework && <StampBadge label="THIS WEEK" tone="primary" filled />}
        {current.assignedSongTitle && (
          <StampBadge label={`WITH SONG: ${current.assignedSongTitle}`} tone="brass" />
        )}
      </View>

      <Text accessibilityRole="header" style={[typography.title, styles.title, { color: colors.inkBlack }]}>
        {exercise.title}
      </Text>

      {exercise.description ? (
        <View>
          <Text
            style={[typography.mono, styles.description, { color: colors.inkBlack }]}
            numberOfLines={showFullDescription ? undefined : 2}
          >
            {exercise.description}
          </Text>
          {isLongDescription && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showFullDescription ? 'Show less' : 'Show more'}
              accessibilityState={{ expanded: showFullDescription }}
              onPress={() => setShowFullDescription(!showFullDescription)}
              style={styles.moreLink}
            >
              <Text style={[typography.stampSmall, { color: colors.primary }]}>
                {showFullDescription ? 'LESS ▴' : 'MORE ▾'}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <View style={[styles.timerWell, { backgroundColor: colors.recessedSurface, borderColor: colors.inkBlack }]}>
        <View
          style={[styles.progressTrack, { backgroundColor: colors.cardSurface, borderColor: colors.inkBlack }]}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progressPct) }}
        >
          <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: colors.primary }]} />
        </View>
        <View style={styles.clockRow}>
          <Text
            accessibilityLabel={`${formatClock(current.remainingSeconds)} remaining`}
            style={[typography.digits, { color: colors.inkBlack }]}
          >
            {formatClock(current.remainingSeconds)}
          </Text>
          <Text style={[typography.stampSmall, { color: colors.inkMuted }]}>
            {current.allocatedMinutes} MIN
          </Text>
        </View>

        <View style={styles.controls}>
          <StampButton
            label={primaryLabel}
            variant="primary"
            size="md"
            onPress={isTimerRunning ? pauseTimer : startTimer}
          />
          <StampButton label="✓ DONE" variant="secondary" size="sm" onPress={completeCurrent} />
          <StampButton label="SKIP →" variant="tertiary" size="sm" onPress={skipCurrent} />
          {isTimerRunning && (
            <StampButton label="+5 MIN" variant="tertiary" size="sm" onPress={() => extendCurrent(5)} />
          )}
        </View>
      </View>
    </CreamBlock>
  );
};

const styles = StyleSheet.create({
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  title: {
    marginTop: 10,
    marginBottom: 6,
  },
  description: {
    lineHeight: 18,
  },
  moreLink: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
  },
  timerWell: {
    borderWidth: 2,
    padding: 12,
    marginTop: 10,
  },
  progressTrack: {
    height: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginVertical: 8,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
});
