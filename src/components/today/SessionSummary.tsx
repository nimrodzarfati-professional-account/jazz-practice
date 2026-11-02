import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { useSession } from '../../session/SessionContext';
import { ResolvedBlock } from '../../types/models';
import {
  graduateExerciseToMaintenance,
  resolveHomeworkDecision,
  setExerciseBaseBpm,
} from '../../db/repository';
import { getHomeworkStats } from '../../services/CrateUtils';
import { formatDateStamp } from '../../utils/format';
import { CreamBlock } from '../CreamBlock';
import { SectionHeader } from '../SectionHeader';
import { StampButton } from '../StampButton';
import { StampBadge } from '../StampBadge';

/** Totals and the FINISH action. */
export const SummaryTotals: React.FC = () => {
  const { colors, typography } = useTheme();
  const { blocks, plan, finishSession, resumeSession } = useSession();

  const practiced = blocks.reduce((sum, b) => sum + (b.status === 'done' ? b.practicedMinutes ?? 0 : 0), 0);
  const done = blocks.filter((b) => b.status === 'done').length;
  const skipped = blocks.filter((b) => b.status === 'skipped').length;
  const pending = blocks.filter((b) => b.status === 'pending').length;
  const completedOn = plan.completedAt ? new Date(plan.completedAt) : new Date();

  return (
    <CreamBlock>
      <SectionHeader title="SESSION DONE" size="title" meta={formatDateStamp(completedOn)} />
      <Text style={[typography.monoBold, styles.totals, { color: colors.inkBlack }]}>
        {practiced} MIN PRACTICED • {done} DONE • {skipped} SKIPPED
      </Text>
      {pending > 0 && (
        <Text style={[typography.mono, styles.pendingNote, { color: colors.inkMuted }]}>
          {pending} {pending === 1 ? 'exercise was' : 'exercises were'} not started. FINISH drops them.
        </Text>
      )}
      <View style={styles.finish}>
        <StampButton label="FINISH" variant="primary" size="lg" onPress={finishSession} />
        {pending > 0 && (
          <StampButton label="BACK TO SESSION" variant="tertiary" size="lg" onPress={resumeSession} />
        )}
      </View>
    </CreamBlock>
  );
};

type Decision = 'tempo' | 'maintenance' | 'week';

const DecisionRow: React.FC<{ block: ResolvedBlock; onSaved: () => void }> = ({ block, onSaved }) => {
  const { colors, typography } = useTheme();
  const [saved, setSaved] = useState<Set<Decision>>(new Set());
  const { exercise } = block;

  const isDone = block.status === 'done';
  const tempoDelta = block.bpm !== null ? block.bpm - exercise.currentBpm : 0;
  const showTempo = isDone && block.bpm !== null && (tempoDelta !== 0 || saved.has('tempo'));
  const showMaintenance = isDone && (exercise.category !== 'MAINTENANCE' || saved.has('maintenance'));
  const showWeek = getHomeworkStats(exercise).isExpired || saved.has('week');

  const markSaved = (decision: Decision, action: () => void) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    action();
    setSaved((prev) => new Set(prev).add(decision));
    onSaved();
  };

  const savedStamp = (key: string) => (
    <StampButton key={key} label="✓ SAVED" variant="tertiary" size="sm" disabled onPress={() => {}} />
  );

  const minutesText =
    block.status === 'done'
      ? `${block.practicedMinutes ?? 0} MIN`
      : block.status === 'skipped'
      ? 'SKIPPED'
      : 'NOT STARTED';

  return (
    <View style={[styles.row, { borderBottomColor: colors.recessedSurface }]}>
      <View style={styles.rowHead}>
        <Text style={[typography.heading, styles.rowTitle, { color: colors.inkBlack }]}>{exercise.title}</Text>
        <Text style={[typography.monoBold, { color: colors.inkMuted }]}>{minutesText}</Text>
      </View>

      {block.bpm !== null && (
        <View style={styles.tempoLine}>
          <Text style={[typography.monoBold, { color: colors.inkBlack }]}>♩ {block.bpm}</Text>
          {tempoDelta !== 0 && (
            <StampBadge
              label={tempoDelta > 0 ? `+${tempoDelta}` : `${tempoDelta}`}
              tone={tempoDelta > 0 ? 'primary' : 'neutral'}
              filled={tempoDelta > 0}
            />
          )}
        </View>
      )}

      {(showTempo || showMaintenance || showWeek) && (
        <View style={styles.decisions}>
          {showTempo &&
            (saved.has('tempo') ? (
              savedStamp('tempo')
            ) : (
              <StampButton
                label={`SAVE ♩${block.bpm} AS TEMPO`}
                variant="tertiary"
                size="sm"
                onPress={() => markSaved('tempo', () => setExerciseBaseBpm(exercise.id, block.bpm!))}
              />
            ))}
          {showMaintenance &&
            (saved.has('maintenance') ? (
              savedStamp('maintenance')
            ) : (
              <StampButton
                label="KEEP AS MAINTENANCE"
                variant="tertiary"
                size="sm"
                onPress={() => markSaved('maintenance', () => graduateExerciseToMaintenance(exercise.id))}
              />
            ))}
          {showWeek &&
            (saved.has('week') ? (
              savedStamp('week')
            ) : (
              <>
                <StampButton
                  label="THIS WEEK: KEEP"
                  variant="tertiary"
                  size="sm"
                  onPress={() => markSaved('week', () => resolveHomeworkDecision(exercise.id, 'keep'))}
                />
                <StampButton
                  label="SAVE FOR LATER"
                  variant="tertiary"
                  size="sm"
                  onPress={() => markSaved('week', () => resolveHomeworkDecision(exercise.id, 'vault'))}
                />
              </>
            ))}
        </View>
      )}
    </View>
  );
};

/** One row per block with the follow-up decisions that apply to it. */
export const SummaryDecisions: React.FC = () => {
  const { blocks, reloadFromDb } = useSession();

  return (
    <CreamBlock>
      <SectionHeader title="REVIEW" meta={`${blocks.length} ${blocks.length === 1 ? 'EXERCISE' : 'EXERCISES'}`} />
      {blocks.map((block) => (
        <DecisionRow key={block.exerciseId} block={block} onSaved={reloadFromDb} />
      ))}
    </CreamBlock>
  );
};

const styles = StyleSheet.create({
  totals: {
    fontSize: 13,
  },
  pendingNote: {
    marginTop: 8,
  },
  finish: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  row: {
    borderBottomWidth: 1.5,
    paddingVertical: 10,
    gap: 6,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rowTitle: {
    flex: 1,
  },
  tempoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  decisions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
});
