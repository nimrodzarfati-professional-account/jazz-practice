import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useSession } from '../../session/SessionContext';
import { SessionLogEntry } from '../../types/models';
import { getPracticeLogs } from '../../db/repository';
import { subscribeToSyncStatus } from '../../services/CloudSyncService';
import { formatDateStamp, formatDuration, formatTimeOfDay, localDayKey } from '../../utils/format';
import { CreamBlock } from '../CreamBlock';
import { SectionHeader } from '../SectionHeader';
import { SegmentedStamp } from '../SegmentedStamp';
import { StatTile } from '../StatTile';
import { StampBadge } from '../StampBadge';
import { StampButton } from '../StampButton';

type HistoryView = 'RECENT' | 'TEMPO';

interface ExerciseTempoSummary {
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

const RECENT_LIMIT = 8;

export const HistoryPanel: React.FC = () => {
  const { colors, typography } = useTheme();
  const { plan } = useSession();
  const [logs, setLogs] = useState<SessionLogEntry[]>(() => getPracticeLogs());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [view, setView] = useState<HistoryView>('RECENT');
  const [showAll, setShowAll] = useState(false);

  // Re-read on sync status changes and whenever the session plan changes (a block was logged)
  useEffect(() => {
    const refresh = () => {
      setNowMs(Date.now());
      setLogs(getPracticeLogs());
    };
    refresh();
    return subscribeToSyncStatus(refresh);
  }, [plan.updatedAt]);

  const analytics = useMemo(() => {
    const totalMinutes = logs.reduce((sum, e) => sum + (Number(e.durationMinutes) || 0), 0);
    const sevenDaysAgoMs = nowMs - 7 * 86400000;
    let sevenDayMinutes = 0;
    let sevenDayBlocks = 0;

    // Oldest -> newest per exercise to compute tempo deltas
    const chronological = [...logs].sort((a, b) => a.practicedAt.localeCompare(b.practicedAt));
    const logDelta = new Map<string, number>();
    const byExercise = new Map<string, ExerciseTempoSummary>();

    for (const entry of chronological) {
      const practicedMs = new Date(entry.practicedAt).getTime();
      if (!Number.isNaN(practicedMs) && practicedMs >= sevenDaysAgoMs) {
        sevenDayMinutes += Number(entry.durationMinutes) || 0;
        sevenDayBlocks += 1;
      }

      const key = entry.exerciseId || entry.exerciseTitle;
      const existing = byExercise.get(key);
      const bpm = Number(entry.bpmAchieved) || 120;
      const mins = Number(entry.durationMinutes) || 15;
      const keysCount = Array.isArray(entry.masteredKeys) ? entry.masteredKeys.length : 0;

      if (!existing) {
        logDelta.set(entry.id, 0);
        byExercise.set(key, {
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
        logDelta.set(entry.id, bpm - existing.latestBpm);
        existing.sessionsCount += 1;
        existing.totalMinutes += mins;
        existing.latestBpm = bpm;
        existing.peakBpm = Math.max(existing.peakBpm, bpm);
        existing.bpmDelta = existing.latestBpm - existing.startBpm;
        existing.latestKeysCount = keysCount;
        existing.lastPracticedAt = entry.practicedAt;
      }
    }

    const summaries = Array.from(byExercise.values()).sort((a, b) =>
      b.lastPracticedAt.localeCompare(a.lastPracticedAt)
    );
    const bestGain = summaries.reduce((max, s) => Math.max(max, s.bpmDelta), 0);

    return { totalMinutes, sevenDayMinutes, sevenDayBlocks, logDelta, summaries, bestGain };
  }, [logs, nowMs]);

  const visibleLogs = showAll ? logs : logs.slice(0, RECENT_LIMIT);
  const groupedLogs = useMemo(() => {
    const groups: { day: string; label: string; entries: SessionLogEntry[] }[] = [];
    for (const entry of visibleLogs) {
      const day = localDayKey(entry.practicedAt);
      const last = groups[groups.length - 1];
      if (last && last.day === day) {
        last.entries.push(entry);
      } else {
        const date = new Date(entry.practicedAt);
        groups.push({
          day,
          label: Number.isNaN(date.getTime()) ? 'UNKNOWN DATE' : formatDateStamp(date),
          entries: [entry],
        });
      }
    }
    return groups;
  }, [visibleLogs]);

  const renderRecent = () => (
    <View>
      {groupedLogs.map((group) => (
        <View key={group.day} style={styles.dayGroup}>
          <SectionHeader title={group.label} meta={`${group.entries.length} LOGGED`} />
          {group.entries.map((entry) => {
            const delta = analytics.logDelta.get(entry.id) ?? 0;
            return (
              <View key={entry.id} style={[styles.logRow, { borderBottomColor: colors.recessedSurface }]}>
                <View style={styles.logMain}>
                  <Text style={[typography.heading, { color: colors.inkBlack }]}>{entry.exerciseTitle}</Text>
                  <View style={styles.logMeta}>
                    <Text style={[typography.mono, { color: colors.inkMuted }]}>
                      {formatTimeOfDay(entry.practicedAt)} • {entry.masteredKeys?.length ?? 0}/12 KEYS
                    </Text>
                    {entry.standardTitle ? <StampBadge label={entry.standardTitle} tone="neutral" /> : null}
                  </View>
                </View>
                <View style={styles.logRight}>
                  <Text style={[typography.monoBold, { color: colors.inkBlack }]}>♩ {entry.bpmAchieved}</Text>
                  {delta !== 0 && (
                    <StampBadge
                      label={delta > 0 ? `+${delta}` : `${delta}`}
                      tone={delta > 0 ? 'primary' : 'neutral'}
                      filled={delta > 0}
                    />
                  )}
                  <Text style={[typography.mono, { color: colors.inkMuted }]}>{entry.durationMinutes} MIN</Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
      {logs.length > RECENT_LIMIT && (
        <View style={styles.more}>
          <StampButton
            label={showAll ? 'SHOW RECENT ▴' : `SHOW ALL ${logs.length} ▾`}
            variant="tertiary"
            size="sm"
            onPress={() => setShowAll(!showAll)}
          />
        </View>
      )}
    </View>
  );

  const renderTempo = () => (
    <View style={styles.tempoList}>
      {analytics.summaries.map((s) => (
        <View
          key={s.exerciseId}
          style={[styles.tempoRow, { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface }]}
        >
          <View style={styles.logMain}>
            <Text style={[typography.heading, { color: colors.inkBlack }]}>{s.exerciseTitle}</Text>
            <Text style={[typography.mono, { color: colors.inkMuted }]}>
              {s.sessionsCount} {s.sessionsCount === 1 ? 'SESSION' : 'SESSIONS'} • {s.totalMinutes} MIN •{' '}
              {s.latestKeysCount}/12 KEYS
            </Text>
          </View>
          <View style={styles.logRight}>
            <Text style={[typography.monoBold, { color: colors.inkBlack }]}>
              ♩ {s.startBpm} → {s.latestBpm}
            </Text>
            <StampBadge
              label={s.bpmDelta > 0 ? `+${s.bpmDelta}` : s.bpmDelta < 0 ? `${s.bpmDelta}` : 'STEADY'}
              tone={s.bpmDelta > 0 ? 'primary' : 'neutral'}
              filled={s.bpmDelta > 0}
            />
            <Text style={[typography.mono, { color: colors.inkMuted }]}>PEAK ♩ {s.peakBpm}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <CreamBlock>
      <SectionHeader title="HISTORY" size="title" meta={`${logs.length} LOGGED`} />

      <View style={styles.tiles}>
        <StatTile
          label="PRACTICED"
          value={formatDuration(analytics.totalMinutes)}
          sub={`${logs.length} exercises logged`}
        />
        <StatTile
          label="LAST 7 DAYS"
          value={formatDuration(analytics.sevenDayMinutes)}
          sub={`${analytics.sevenDayBlocks} logged`}
          tone="primary"
        />
        <StatTile
          label="BEST TEMPO GAIN"
          value={analytics.bestGain > 0 ? `+${analytics.bestGain}` : '—'}
          sub={`${analytics.summaries.length} exercises tracked`}
          tone="brass"
        />
      </View>

      <View style={styles.switch}>
        <SegmentedStamp<HistoryView>
          accessibilityLabel="History view"
          options={[
            { id: 'RECENT', label: 'RECENT' },
            { id: 'TEMPO', label: 'TEMPO' },
          ]}
          value={view}
          onChange={setView}
        />
      </View>

      {logs.length === 0 ? (
        <View style={[styles.empty, { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface }]}>
          <Text style={[typography.heading, { color: colors.inkBlack }]}>Nothing logged yet.</Text>
          <Text style={[typography.mono, { color: colors.inkMuted }]}>
            Finish an exercise on TODAY to start your history.
          </Text>
        </View>
      ) : view === 'RECENT' ? (
        renderRecent()
      ) : (
        renderTempo()
      )}
    </CreamBlock>
  );
};

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  switch: {
    marginVertical: 14,
  },
  dayGroup: {
    marginBottom: 12,
  },
  logRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1.5,
  },
  logMain: {
    flex: 1,
    gap: 4,
  },
  logMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  logRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  more: {
    flexDirection: 'row',
    marginTop: 4,
  },
  tempoList: {
    gap: 8,
  },
  tempoRow: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1.5,
    padding: 10,
  },
  empty: {
    borderWidth: 1.5,
    padding: 12,
    gap: 4,
  },
});
