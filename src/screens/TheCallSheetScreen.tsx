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
import { ActiveStandard, MusicalContext, ScoredExercise } from '../types/models';
import { CreamBlock } from '../components/CreamBlock';
import { StudioFader } from '../components/StudioFader';
import { StampButton } from '../components/StampButton';
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
  const [alarmScheduled, setAlarmScheduled] = useState(false);

  const handleSetAlarm = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Schedule alarm for tomorrow morning 08:00
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.canvasBg }]}>
      {/* 1-2 Week Active Standard Strip */}
      <ActiveStandardBanner
        standard={activeStandard}
        onPressRotate={onOpenRotateStandardModal}
      />

      {/* Pre-Session Booking Faders */}
      <CreamBlock>
        <Text style={[styles.sectionTitle, { fontFamily: typography.fontDisplay, color: colors.inkBlack }]}>
          STUDIO CALL SHEET // MIXING CONSOLE
        </Text>
        <Text style={[styles.sectionSubtitle, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
          Dial in your session window and mental stamina to assemble today’s optimal routine.
        </Text>

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

      {/* Assembled Knapsack Routine Preview */}
      <CreamBlock>
        <View style={[styles.queueHeader, { borderBottomColor: colors.inkBlack }]}>
          <Text style={[styles.queueTitle, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
            SCHEDULED ROUTINE ({previewQueue.length} BLOCKS • {totalAllocatedMinutes}m)
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
                0{idx + 1}
              </Text>
              <View>
                <Text style={[styles.itemTitle, { fontFamily: typography.fontHeading, color: colors.inkBlack }]}>
                  {item.title}
                </Text>
                <Text style={[styles.itemMeta, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
                  {item.context} // {item.category} • Urgency: {item.urgencyScore}%
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

        <View style={{ marginTop: 14 }}>
          <StampButton
            label="▶ START SHED SESSION"
            variant="primary"
            size="lg"
            onPress={onStartSession}
          />
        </View>
      </CreamBlock>

      {/* Hardware OS Alarms Section */}
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  fadersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  contextFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1.5,
    paddingTop: 10,
    marginTop: 6,
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
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 6,
  },
  itemNumber: {
    fontSize: 14,
  },
  itemTitle: {
    fontSize: 14,
  },
  itemMeta: {
    fontSize: 10,
    marginTop: 1,
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
