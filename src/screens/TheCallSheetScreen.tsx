import React, { useState, useEffect, useMemo } from 'react';
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
import {
  ActiveStandard,
  MusicalContext,
  ScoredExercise,
  SessionLogEntry,
} from '../types/models';
import { getPracticeLogs } from '../db/repository';
import { subscribeToSyncStatus } from '../services/CloudSyncService';
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

type HistoryTabMode = 'RECENT' | 'BPM_GAINS';

interface ExerciseBpmSummary {
  exerciseId: string;
  exerciseTitle: string;
  sessionsCount: number;
  totalMinutes: number;
  startBpm: number;
  latestBpm: number;
  peakBpm: number;
  bpmDelta: number;
  latestKeysCount: number;
  lastPracticedAt: string;
}

const SESSION_PRESETS = [
  { label: 'QUICK 20m', minutes: 20, intensity: 3 },
  { label: 'REGULAR 45m', minutes: 45, intensity: 3 },
  { label: 'LONG 90m', minutes: 90, intensity: 4 },
];

function formatUrgencyReason(item: ScoredExercise): string {
  if (item.skippedCount > 0) {
    return `Skipped ${item.skippedCount}x`;
  }
  if (!item.lastPracticedAt) {
    return 'Not practiced yet';
  }
  const days = Math.max(0, (Date.now() - new Date(item.lastPracticedAt).getTime()) / 86400000);
  if (days >= 2) {
    return `${Math.round(days)}d since practiced`;
  }
  if (item.isKeyBased && item.masteredKeys.length < 12) {
    return `${12 - item.masteredKeys.length} keys left`;
  }
  return `Importance ${item.basePriority}/10`;
}

function formatTotalDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function formatLogTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'UNKNOWN DATE';
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = monthNames[date.getMonth()];
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${month} ${day} • ${hours}:${mins}`;
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
  const [practiceLogs, setPracticeLogs] = useState<SessionLogEntry[]>(() => getPracticeLogs());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [historyTab, setHistoryTab] = useState<HistoryTabMode>('RECENT');
  const [showAllLogs, setShowAllLogs] = useState(false);

  // Keep practice logs synced with local and cloud updates
  useEffect(() => {
    setNowMs(Date.now());
    setPracticeLogs(getPracticeLogs());
    const unsubscribe = subscribeToSyncStatus(() => {
      setNowMs(Date.now());
      setPracticeLogs(getPracticeLogs());
    });
    return () => {
      unsubscribe();
    };
  }, [previewQueue]);

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

  // Compute global telemetry, per-log BPM deltas, and per-exercise BPM progression
  const historyAnalytics = useMemo(() => {
    const totalMinutesPracticed = practiceLogs.reduce(
      (sum, entry) => sum + (Number(entry.durationMinutes) || 0),
      0
    );

    const sevenDaysAgoMs = nowMs - 7 * 86400000;
    let sevenDayMinutes = 0;
    let sevenDayBlocks = 0;

    // Group logs chronologically (oldest -> newest) per exercise to calculate BPM deltas
    const chronological = [...practiceLogs].sort((a, b) =>
      a.practicedAt.localeCompare(b.practicedAt)
    );

    const logDeltaMap = new Map<string, number>();
    const byExerciseMap = new Map<string, ExerciseBpmSummary>();

    for (const entry of chronological) {
      const practicedMs = new Date(entry.practicedAt).getTime();
      if (!Number.isNaN(practicedMs) && practicedMs >= sevenDaysAgoMs) {
        sevenDayMinutes += Number(entry.durationMinutes) || 0;
        sevenDayBlocks += 1;
      }

      const key = entry.exerciseId || entry.exerciseTitle;
      const existing = byExerciseMap.get(key);
      const bpm = Number(entry.bpmAchieved) || 120;
      const mins = Number(entry.durationMinutes) || 15;
      const keysCount = Array.isArray(entry.masteredKeys) ? entry.masteredKeys.length : 0;

      if (!existing) {
        logDeltaMap.set(entry.id, 0);
        byExerciseMap.set(key, {
          exerciseId: key,
          exerciseTitle: entry.exerciseTitle,
          sessionsCount: 1,
          totalMinutes: mins,
          startBpm: bpm,
          latestBpm: bpm,
          peakBpm: bpm,
          bpmDelta: 0,
          latestKeysCount: keysCount,
          lastPracticedAt: entry.practicedAt,
        });
      } else {
        // Delta for this log entry relative to the previous session of the same exercise
        const stepDelta = bpm - existing.latestBpm;
        logDeltaMap.set(entry.id, stepDelta);

        existing.sessionsCount += 1;
        existing.totalMinutes += mins;
        existing.latestBpm = bpm;
        existing.peakBpm = Math.max(existing.peakBpm, bpm);
        existing.bpmDelta = existing.latestBpm - existing.startBpm;
        existing.latestKeysCount = keysCount;
        existing.lastPracticedAt = entry.practicedAt;
      }
    }

    const exerciseSummaries = Array.from(byExerciseMap.values()).sort(
      (a, b) => b.lastPracticedAt.localeCompare(a.lastPracticedAt)
    );

    const bestBpmGain = exerciseSummaries.reduce(
      (max, item) => Math.max(max, item.bpmDelta),
      0
    );

    return {
      totalMinutesPracticed,
      sevenDayMinutes,
      sevenDayBlocks,
      bestBpmGain,
      logDeltaMap,
      exerciseSummaries,
    };
  }, [practiceLogs, nowMs]);

  const visibleLogs = showAllLogs ? practiceLogs : practiceLogs.slice(0, 6);

  const renderMixingConsoleCard = () => (
    <CreamBlock>
      <Text style={[styles.sectionTitle, { fontFamily: typography.fontDisplay, color: colors.inkBlack }]}>
        SESSION PLANNER
      </Text>
      <Text style={[styles.sectionSubtitle, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
        Choose your available time and energy level to build today’s practice plan.
      </Text>

      {/* 1-Tap Studio Presets */}
      <View style={styles.presetsRow}>
        {SESSION_PRESETS.map((preset) => {
          const isSelected = availableMinutes === preset.minutes && intensity === preset.intensity;
          return (
            <Pressable
              key={preset.label}
              accessibilityRole="button"
              accessibilityLabel={`Preset ${preset.label}`}
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
          label="PRACTICE TIME"
          value={Number.isFinite(availableMinutes) ? availableMinutes : 30}
          min={15}
          max={120}
          step={5}
          unit="min"
          accentColor={colors.primary}
          onChange={(val) => {
            if (Number.isFinite(val)) onChangeMinutes(val);
          }}
        />

        <StudioFader
          label="ENERGY LEVEL"
          value={Number.isFinite(intensity) ? intensity : 3}
          min={1}
          max={5}
          step={1}
          unit="/ 5"
          accentColor={colors.tertiary}
          onChange={(val) => {
            if (Number.isFinite(val)) onChangeIntensity(val);
          }}
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
            accessibilityRole="button"
            accessibilityLabel={`Target focus ${filter}`}
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

  const renderRoutinePreviewCard = () => (
    <CreamBlock>
      <View style={[styles.queueHeader, { borderBottomColor: colors.inkBlack }]}>
        <Text style={[styles.queueTitle, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
          TODAY'S PRACTICE PLAN ({previewQueue.length} EXERCISES • {totalAllocatedMinutes}m)
        </Text>
        <Text style={[styles.queueSubtitle, { fontFamily: typography.fontMono, color: colors.secondary }]}>
          Sorted by Priority
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
                {item.isHomework && (
                  <View
                    style={[
                      styles.homeworkBadge,
                      { borderColor: colors.inkBlack, backgroundColor: colors.secondary },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: typography.fontStamp,
                        fontSize: 9,
                        color: colors.cardSurface,
                      }}
                    >
                      📝 HOMEWORK
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.itemMeta, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
                Priority: {item.urgencyScore}% • {formatUrgencyReason(item)}
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
          label="▶ START PRACTICE"
          variant="primary"
          size="lg"
          onPress={onStartSession}
        />
      </View>
    </CreamBlock>
  );

  const renderAlarmsCard = () => (
    <CreamBlock>
      <Text style={[styles.sectionTitle, { fontFamily: typography.fontDisplay, color: colors.inkBlack }]}>
        DAILY PRACTICE REMINDER
      </Text>
      <Text style={[styles.sectionSubtitle, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
        Sets a morning phone reminder for your practice session. Skipped exercises are automatically prioritized next time.
      </Text>

      <View style={{ marginTop: 10 }}>
        <StampButton
          label={alarmScheduled ? '✓ REMINDER SET FOR 8:00 AM' : '⏰ SET MORNING REMINDER (8:00 AM)'}
          variant={alarmScheduled ? 'secondary' : 'tertiary'}
          onPress={handleSetAlarm}
        />
      </View>
    </CreamBlock>
  );

  const renderDesktopPracticeHistoryCard = () => (
    <CreamBlock>
      {/* Top Header & View Switcher */}
      <View style={[styles.historyHeaderRow, { borderBottomColor: colors.inkBlack }]}>
        <View>
          <Text style={[styles.sectionTitle, { fontFamily: typography.fontDisplay, color: colors.inkBlack, marginBottom: 2 }]}>
            STUDIO TAPE LOG // PRACTICE HISTORY
          </Text>
          <Text style={{ fontFamily: typography.fontMono, fontSize: 11, color: colors.inkMuted }}>
            {practiceLogs.length} logged blocks • {historyAnalytics.totalMinutesPracticed} total minutes on tape
          </Text>
        </View>

        <View style={styles.historyModeSwitch}>
          {(
            [
              { id: 'RECENT', label: 'TAPE LOG' },
              { id: 'BPM_GAINS', label: 'BPM PROGRESS' },
            ] as const
          ).map((tab) => {
            const isSelected = historyTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                accessibilityLabel={`Switch history view to ${tab.label}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setHistoryTab(tab.id);
                }}
                style={[
                  styles.historyModePill,
                  {
                    borderColor: colors.inkBlack,
                    backgroundColor: isSelected ? colors.primary : colors.recessedSurface,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: typography.fontStamp,
                    fontSize: 10,
                    letterSpacing: 0.8,
                    color: isSelected ? colors.cardSurface : colors.inkBlack,
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 3-Box Studio Telemetry Readout */}
      <View style={styles.telemetryGrid}>
        <View
          style={[
            styles.telemetryBox,
            { backgroundColor: colors.recessedSurface, borderColor: colors.inkBlack },
          ]}
        >
          <Text style={[styles.telemetryLabel, { fontFamily: typography.fontStamp, color: colors.inkMuted }]}>
            TOTAL SHED TIME
          </Text>
          <Text style={[styles.telemetryValue, { fontFamily: typography.fontMonoBold, color: colors.inkBlack }]}>
            {formatTotalDuration(historyAnalytics.totalMinutesPracticed)}
          </Text>
          <Text style={[styles.telemetrySub, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
            {historyAnalytics.totalMinutesPracticed} mins • {practiceLogs.length} blocks
          </Text>
        </View>

        <View
          style={[
            styles.telemetryBox,
            { backgroundColor: colors.recessedSurface, borderColor: colors.inkBlack },
          ]}
        >
          <Text style={[styles.telemetryLabel, { fontFamily: typography.fontStamp, color: colors.inkMuted }]}>
            LAST 7 DAYS
          </Text>
          <Text style={[styles.telemetryValue, { fontFamily: typography.fontMonoBold, color: colors.primary }]}>
            {formatTotalDuration(historyAnalytics.sevenDayMinutes)}
          </Text>
          <Text style={[styles.telemetrySub, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
            {historyAnalytics.sevenDayBlocks} blocks completed
          </Text>
        </View>

        <View
          style={[
            styles.telemetryBox,
            { backgroundColor: colors.recessedSurface, borderColor: colors.inkBlack },
          ]}
        >
          <Text style={[styles.telemetryLabel, { fontFamily: typography.fontStamp, color: colors.inkMuted }]}>
            TOP TEMPO GAIN
          </Text>
          <Text
            style={[
              styles.telemetryValue,
              {
                fontFamily: typography.fontMonoBold,
                color: historyAnalytics.bestBpmGain > 0 ? colors.secondary : colors.inkBlack,
              },
            ]}
          >
            {historyAnalytics.bestBpmGain > 0 ? `+${historyAnalytics.bestBpmGain} BPM` : 'BASELINE'}
          </Text>
          <Text style={[styles.telemetrySub, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
            {historyAnalytics.exerciseSummaries.length} active drills tracked
          </Text>
        </View>
      </View>

      {/* Empty State */}
      {practiceLogs.length === 0 ? (
        <View
          style={[
            styles.emptyHistoryBox,
            { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
          ]}
        >
          <Text style={{ fontFamily: typography.fontHeading, fontSize: 15, color: colors.inkBlack }}>
            No practice blocks logged yet.
          </Text>
          <Text style={{ fontFamily: typography.fontMono, fontSize: 12, color: colors.inkMuted, marginTop: 4 }}>
            Complete a timer block or tap [ ✓ LOG BLOCK ] in The Shed to record your session and track BPM gains.
          </Text>
        </View>
      ) : historyTab === 'RECENT' ? (
        /* TAB 1: Recent Session Log Entries */
        <View>
          {visibleLogs.map((entry, idx) => {
            const bpmDelta = historyAnalytics.logDeltaMap.get(entry.id) || 0;
            const keysCount = Array.isArray(entry.masteredKeys) ? entry.masteredKeys.length : 0;

            return (
              <View
                key={entry.id}
                style={[
                  styles.historyLogRow,
                  {
                    borderBottomColor: colors.recessedSurface,
                    backgroundColor: idx % 2 === 0 ? colors.cardSurface : colors.recessedSurface,
                  },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={styles.logMetaTopRow}>
                    <Text style={{ fontFamily: typography.fontMonoBold, fontSize: 11, color: colors.inkMuted }}>
                      {formatLogTimestamp(entry.practicedAt)}
                    </Text>
                    {entry.standardTitle && (
                      <View
                        style={[
                          styles.logStandardPill,
                          { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface },
                        ]}
                      >
                        <Text style={{ fontFamily: typography.fontStamp, fontSize: 9, color: colors.secondary }}>
                          🎵 {entry.standardTitle}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={{ fontFamily: typography.fontHeading, fontSize: 15, color: colors.inkBlack, marginTop: 2 }}>
                    {entry.exerciseTitle}
                  </Text>

                  <Text style={{ fontFamily: typography.fontMono, fontSize: 11, color: colors.inkMuted, marginTop: 2 }}>
                    Keys Mastered: {keysCount}/12
                    {entry.notes ? ` • ${entry.notes}` : ''}
                  </Text>
                </View>

                {/* Right Telemetry Badges: BPM + Delta + Minutes */}
                <View style={styles.logRightCol}>
                  <View style={styles.bpmBadgeRow}>
                    <View
                      style={[
                        styles.bpmReadoutBadge,
                        { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface },
                      ]}
                    >
                      <Text style={{ fontFamily: typography.fontMonoBold, fontSize: 12, color: colors.inkBlack }}>
                        ♩ {entry.bpmAchieved} BPM
                      </Text>
                    </View>

                    {bpmDelta !== 0 && (
                      <View
                        style={[
                          styles.bpmDeltaBadge,
                          {
                            borderColor: colors.inkBlack,
                            backgroundColor: bpmDelta > 0 ? colors.primary : colors.recessedSurface,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontFamily: typography.fontStamp,
                            fontSize: 10,
                            color: bpmDelta > 0 ? colors.cardSurface : colors.inkBlack,
                          }}
                        >
                          {bpmDelta > 0 ? `+${bpmDelta} BPM` : `${bpmDelta} BPM`}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={{ fontFamily: typography.fontMonoBold, fontSize: 11, color: colors.inkMuted, marginTop: 4 }}>
                    {entry.durationMinutes}m logged
                  </Text>
                </View>
              </View>
            );
          })}

          {practiceLogs.length > 6 && (
            <View style={{ marginTop: 12 }}>
              <StampButton
                label={
                  showAllLogs
                    ? '▲ SHOW RECENT 6 LOGS'
                    : `▼ SHOW ALL ${practiceLogs.length} SESSION LOGS`
                }
                variant="tertiary"
                size="sm"
                onPress={() => setShowAllLogs(!showAllLogs)}
              />
            </View>
          )}
        </View>
      ) : (
        /* TAB 2: BPM Progression Aggregated by Exercise */
        <View style={{ gap: 8 }}>
          {historyAnalytics.exerciseSummaries.map((summary) => {
            const bpmProgressPct = Math.max(
              8,
              Math.min(100, Math.round((summary.latestBpm / 240) * 100))
            );
            return (
              <View
                key={summary.exerciseId}
                style={[
                  styles.bpmSummaryCard,
                  { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
                ]}
              >
                <View style={styles.bpmSummaryTopRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontFamily: typography.fontHeading, fontSize: 15, color: colors.inkBlack }}>
                      {summary.exerciseTitle}
                    </Text>
                    <Text style={{ fontFamily: typography.fontMono, fontSize: 11, color: colors.inkMuted, marginTop: 2 }}>
                      {summary.sessionsCount} {summary.sessionsCount === 1 ? 'session' : 'sessions'} •{' '}
                      {summary.totalMinutes}m total • {summary.latestKeysCount}/12 keys
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontFamily: typography.fontMonoBold, fontSize: 13, color: colors.inkBlack }}>
                        ♩ {summary.startBpm} → ♩ {summary.latestBpm} BPM
                      </Text>
                      <View
                        style={[
                          styles.bpmDeltaBadge,
                          {
                            borderColor: colors.inkBlack,
                            backgroundColor:
                              summary.bpmDelta > 0
                                ? colors.primary
                                : summary.bpmDelta < 0
                                ? colors.secondary
                                : colors.cardSurface,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontFamily: typography.fontStamp,
                            fontSize: 10,
                            color:
                              summary.bpmDelta !== 0 ? colors.cardSurface : colors.inkMuted,
                          }}
                        >
                          {summary.bpmDelta > 0
                            ? `+${summary.bpmDelta} BPM`
                            : summary.bpmDelta < 0
                            ? `${summary.bpmDelta} BPM`
                            : 'STEADY'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontFamily: typography.fontMono, fontSize: 10, color: colors.inkMuted, marginTop: 2 }}>
                      Peak: ♩ {summary.peakBpm} BPM
                    </Text>
                  </View>
                </View>

                {/* Tempo Meter Bar */}
                <View
                  style={[
                    styles.bpmMeterTrack,
                    { backgroundColor: colors.cardSurface, borderColor: colors.inkBlack },
                  ]}
                >
                  <View
                    style={[
                      styles.bpmMeterFill,
                      {
                        width: `${bpmProgressPct}%`,
                        backgroundColor: summary.bpmDelta > 0 ? colors.primary : colors.tertiary,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </CreamBlock>
  );

  return (
    <ScrollView
      style={[styles.container, isDesktop && styles.containerDesktop, { backgroundColor: colors.canvasBg }]}
      contentContainerStyle={isDesktop ? { paddingBottom: 32 } : undefined}
    >
      {/* 1-2 Week Active Standard Strip */}
      <ActiveStandardBanner
        standard={activeStandard}
        onPressRotate={onOpenRotateStandardModal}
      />

      {isDesktop ? (
        <View style={styles.desktopColumns}>
          <View style={styles.desktopLeftCol}>
            {renderMixingConsoleCard()}
            {renderAlarmsCard()}
          </View>
          <View style={styles.desktopRightCol}>
            {renderRoutinePreviewCard()}
            {renderDesktopPracticeHistoryCard()}
          </View>
        </View>
      ) : (
        <>
          {renderMixingConsoleCard()}
          {renderRoutinePreviewCard()}
          {renderAlarmsCard()}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  homeworkBadge: {
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  container: { flex: 1, padding: 14 },
  containerDesktop: { padding: 24 },
  desktopColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
  },
  desktopLeftCol: {
    width: 420,
  },
  desktopRightCol: {
    flex: 1,
  },
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
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1.5,
    paddingBottom: 10,
    marginBottom: 12,
    gap: 12,
  },
  historyModeSwitch: {
    flexDirection: 'row',
    gap: 6,
  },
  historyModePill: {
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  telemetryBox: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  telemetryLabel: {
    fontSize: 10,
    letterSpacing: 1,
  },
  telemetryValue: {
    fontSize: 20,
    marginVertical: 2,
  },
  telemetrySub: {
    fontSize: 10,
  },
  emptyHistoryBox: {
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyLogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  logMetaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  logStandardPill: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  logRightCol: {
    alignItems: 'flex-end',
  },
  bpmBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bpmReadoutBadge: {
    borderWidth: 1.5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  bpmDeltaBadge: {
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bpmSummaryCard: {
    borderWidth: 1.5,
    padding: 10,
  },
  bpmSummaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bpmMeterTrack: {
    height: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bpmMeterFill: {
    height: '100%',
  },
});
