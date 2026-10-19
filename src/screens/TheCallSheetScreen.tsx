import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { ActiveStandard, MusicalContext, ScoredExercise } from '../types/models';
import { CreamBlock } from '../components/CreamBlock';
import { StudioFader } from '../components/StudioFader';
import { StampButton } from '../components/StampButton';
import { StampBadge } from '../components/StampBadge';
import { ActiveStandardBanner } from '../components/ActiveStandardBanner';
import { scheduleNextShedAlarm } from '../services/AlarmManager';

interface TheCallSheetScreenProps {
  activeStandard: ActiveStandard;
  availableMinutes: number;
  intensity: number;
  contextFilter: 'ALL' | MusicalContext;
  previewQueue: ScoredExercise[];
  onChangeMinutes: (mins: number) => void;
  onChangeIntensity: (intensity: number) => void;
  onChangeContextFilter: (filter: 'ALL' | MusicalContext) => void;
  onStartSession: () => void;
  onOpenRotateStandardModal: () => void;
}

const SESSION_PRESETS = [
  { label: 'EXPRESS 20m', minutes: 20, intensity: 3 },
  { label: 'STANDARD 45m', minutes: 45, intensity: 3 },
  { label: 'WOODSHED 90m', minutes: 90, intensity: 4 },
];

function formatUrgencyReason(item: ScoredExercise): string {
  if (item.skippedCount > 0) {
    return `${item.skippedCount}x skipped`;
  }
  if (!item.lastPracticedAt) {
    return 'Never practiced';
  }
  const days = Math.max(0, (Date.now() - new Date(item.lastPracticedAt).getTime()) / 86400000);
  if (days >= 2) {
    return `${Math.round(days)}d decay`;
  }
  if (item.isKeyBased && item.masteredKeys.length < 12) {
    return `${12 - item.masteredKeys.length} keys unmastered`;
  }
  return `Priority ${item.basePriority}/10`;
}

export const TheCallSheetScreen: React.FC<TheCallSheetScreenProps> = ({
  activeStandard,
  availableMinutes,
  intensity,
  contextFilter,
  previewQueue,
  onChangeMinutes,
  onChangeIntensity,
  onChangeContextFilter,
  onStartSession,
  onOpenRotateStandardModal,
}) => {
  const { colors, typography } = useTheme();
  const { isDesktop } = useResponsiveLayout();
  const [alarmScheduled, setAlarmScheduled] = useState(false);

  const handleSetAlarm = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const target = new Date();
    target.setDate(target.getDate() + 1);
    target.setHours(8, 0, 0, 0);

    await scheduleNextShedAlarm(target, availableMinutes, intensity);
    setAlarmScheduled(true);
    setTimeout(() => setAlarmScheduled(false), 4000);
  };

  const totalAllocatedMinutes = previewQueue.reduce(
    (acc, cur) => acc + cur.allocatedMinutes,
    0
  );

  const renderMixingConsoleCard = () => (
    <CreamBlock>
      <Text style={[styles.sectionTitle, { fontFamily: typography.fontDisplay, color: colors.inkBlack }]}>
        STUDIO CALL SHEET // MIXING CONSOLE
      </Text>
      <Text style={[styles.sectionSubtitle, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
        Dial in your session window and mental stamina to assemble today’s optimal routine.
      </Text>

      {/* 1-Tap Studio Presets */}
      <View style={styles.presetsRow}>
        {SESSION_PRESETS.map((preset) => {
          const isSelected = availableMinutes === preset.minutes && intensity === preset.intensity;
          return (
            <Pressable
              key={preset.label}
              accessibilityLabel={`Preset ${preset.label}`}
              accessibilityRole="button"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChangeMinutes(preset.minutes);
                onChangeIntensity(preset.intensity);
              }}
              style={[
                styles.presetBtn,
                {
                  borderColor: colors.inkBlack,
                  backgroundColor: isSelected ? colors.primary : colors.recessedSurface,
                },
              ]}
            >
              <Text
                style={[
                  styles.presetBtnText,
                  {
                    fontFamily: typography.fontStamp,
                    color: isSelected ? colors.cardSurface : colors.inkBlack,
                  },
                ]}
              >
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.fadersRow}>
        <StudioFader
          label="SESSION TIME"
          value={availableMinutes}
          min={15}
          max={120}
          step={5}
          unit="min"
          accentColor={colors.primary}
          onChange={onChangeMinutes}
        />

        <StudioFader
          label="CHOP BATTERY"
          value={intensity}
          min={1}
          max={5}
          step={1}
          unit="/ 5"
          accentColor={colors.tertiary}
          onChange={onChangeIntensity}
        />
      </View>

      {/* Context Selector */}
      <View style={[styles.contextFilterRow, { borderTopColor: colors.recessedSurface }]}>
        <Text style={[styles.filterLabel, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
          TARGET FOCUS:
        </Text>
        {(['ALL', 'SOLOING', 'COMPING'] as const).map((filter) => (
          <Pressable
            key={filter}
            accessibilityLabel={`Target focus ${filter}`}
            accessibilityRole="button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChangeContextFilter(filter);
            }}
            style={[
              styles.filterPill,
              {
                borderColor: colors.inkBlack,
                backgroundColor: contextFilter === filter ? colors.primary : colors.cardSurface,
              },
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                {
                  fontFamily: typography.fontStamp,
                  color: contextFilter === filter ? colors.cardSurface : colors.inkBlack,
                },
              ]}
            >
              {filter}
            </Text>
          </Pressable>
        ))}
      </View>
    </CreamBlock>
  );

  const renderAlarmsCard = () => (
    <CreamBlock>
      <Text style={[styles.sectionTitle, { fontFamily: typography.fontDisplay, color: colors.inkBlack }]}>
        HARDWARE OS PRACTICE ALARMS
      </Text>
      <Text style={[styles.sectionSubtitle, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
        Schedules native lock-screen alarms with warm Rhodes swell and self-healing skip recalculations.
      </Text>

      <View style={{ marginTop: 10 }}>
        <StampButton
          label={alarmScheduled ? '✓ ALARM ARMED FOR 08:00 AM' : '⏰ ARM NEXT MORNING ALARM (08:00 AM)'}
          variant={alarmScheduled ? 'secondary' : 'tertiary'}
          onPress={handleSetAlarm}
        />
      </View>
    </CreamBlock>
  );

  const renderScheduledRoutineCard = () => (
    <CreamBlock>
      <View style={[styles.queueHeader, { borderBottomColor: colors.inkBlack }]}>
        <Text style={[styles.queueTitle, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
          SCHEDULED ROUTINE ({previewQueue.length} BLOCKS • {totalAllocatedMinutes}m / {availableMinutes}m)
        </Text>
        <Text style={[styles.queueSubtitle, { fontFamily: typography.fontMono, color: colors.secondary }]}>
          Rotated & Decay-Weighted
        </Text>
      </View>

      {previewQueue.map((item, idx) => (
        <View
          key={`${item.id}-${idx}`}
          style={[
            styles.queueItemRow,
            {
              borderBottomColor: colors.recessedSurface,
              backgroundColor: idx % 2 === 0 ? colors.cardSurface : colors.recessedSurface,
            },
          ]}
        >
          <View style={styles.itemLeft}>
            <Text style={[styles.itemNumber, { fontFamily: typography.fontMonoBold, color: colors.inkMuted }]}>
              {String(idx + 1).padStart(2, '0')}
            </Text>
            <View style={{ flex: 1, paddingRight: 6 }}>
              <Text style={[styles.itemTitle, { fontFamily: typography.fontHeading, color: colors.inkBlack }]}>
                {item.title}
              </Text>
              <View style={styles.badgesInline}>
                <StampBadge label={item.context} type={item.context} />
                <StampBadge label={item.category.replace('_', ' ')} type={item.category} />
              </View>
              <Text style={[styles.itemMeta, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
                Urgency: {item.urgencyScore}% • {formatUrgencyReason(item)}
              </Text>
            </View>
          </View>

          <View style={[styles.durationBadge, { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface }]}>
            <Text style={[styles.durationText, { fontFamily: typography.fontMonoBold, color: colors.inkBlack }]}>
              {item.allocatedMinutes}m
            </Text>
          </View>
        </View>
      ))}

      <View style={{ marginTop: 16 }}>
        <StampButton
          label="▶ START SHED SESSION"
          variant="primary"
          size="lg"
          onPress={onStartSession}
        />
      </View>
    </CreamBlock>
  );

  /* ============================================================
   * DESKTOP / COMPUTER SIDE-BY-SIDE MIXING DESK & CLIPBOARD
   * ============================================================ */
  if (isDesktop) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.canvasBg }]}
        contentContainerStyle={styles.desktopScrollContent}
      >
        <View style={styles.desktopWorkspace}>
          <View style={styles.desktopColumns}>
            <View style={styles.desktopLeftCol}>
              {renderMixingConsoleCard()}
              {renderAlarmsCard()}
            </View>
            <View style={styles.desktopRightCol}>
              {renderScheduledRoutineCard()}
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
      <ActiveStandardBanner
        standard={activeStandard}
        onPressRotate={onOpenRotateStandardModal}
      />
      {renderMixingConsoleCard()}
      {renderScheduledRoutineCard()}
      {renderAlarmsCard()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },
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
  },
  desktopLeftCol: {
    flex: 1,
  },
  desktopRightCol: {
    flex: 1.35,
  },
  /* Shared & Mobile Styles */
  sectionTitle: {
    fontSize: 20,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetBtn: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetBtnText: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  fadersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  contextFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1.5,
    paddingTop: 10,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 11,
    letterSpacing: 1,
  },
  filterPill: {
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterPillText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    paddingBottom: 6,
    marginBottom: 8,
  },
  queueTitle: {
    fontSize: 12,
    letterSpacing: 1.2,
  },
  queueSubtitle: {
    fontSize: 11,
  },
  queueItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
    paddingRight: 6,
  },
  itemNumber: {
    fontSize: 14,
    marginTop: 2,
  },
  itemTitle: {
    fontSize: 15,
  },
  badgesInline: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 4,
    flexWrap: 'wrap',
  },
  itemMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  durationBadge: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  durationText: {
    fontSize: 12,
  },
});