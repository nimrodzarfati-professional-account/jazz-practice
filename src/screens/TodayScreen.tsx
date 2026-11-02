import React, { ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useSession } from '../session/SessionContext';
import { formatDateStamp } from '../utils/format';
import { CreamBlock } from '../components/CreamBlock';
import { Callout } from '../components/Callout';
import { KeyStampGrid } from '../components/KeyStampGrid';
import { StampButton } from '../components/StampButton';
import { SuggestPanel } from '../components/today/SuggestPanel';
import { PlanList } from '../components/today/PlanList';
import { BlockRunner } from '../components/today/BlockRunner';
import { MetronomeStrip } from '../components/today/MetronomeStrip';
import { SummaryDecisions, SummaryTotals } from '../components/today/SessionSummary';

const SessionBar: React.FC = () => {
  const { colors, typography } = useTheme();
  const { blocks, current, remainingPlanMinutes, endSession } = useSession();
  const position = current ? `BLOCK ${current.index + 1} OF ${blocks.length}` : `${blocks.length} BLOCKS`;

  return (
    <CreamBlock shadowOffset={3} style={styles.sessionBar}>
      <Text style={[typography.stamp, styles.sessionBarText, { color: colors.inkBlack }]}>
        {position} • {remainingPlanMinutes} MIN LEFT
      </Text>
      <StampButton label="END SESSION" variant="tertiary" size="sm" onPress={endSession} />
    </CreamBlock>
  );
};

const KeysCard: React.FC = () => {
  const { current, toggleKey } = useSession();
  if (!current?.exercise.isKeyBased) return null;
  return (
    <CreamBlock>
      <KeyStampGrid
        isKeyBased
        masteredKeys={current.exercise.masteredKeys}
        onToggleKey={toggleKey}
      />
    </CreamBlock>
  );
};

export const TodayScreen: React.FC = () => {
  const { colors, typography } = useTheme();
  const { isDesktop } = useResponsiveLayout();
  const { status, blocks, staleRunning, resumeStale, endSession, startSession } = useSession();

  const header = (
    <View style={[styles.header, { borderBottomColor: colors.primary }]}>
      <Text accessibilityRole="header" style={[typography.title, styles.headerTitle, { color: colors.textPrimary }]}>
        TODAY
      </Text>
      <Text style={[typography.monoBold, { color: colors.tertiary }]}>{formatDateStamp()}</Text>
    </View>
  );

  const staleCallout =
    staleRunning && status === 'running' ? (
      <Callout
        tone="warn"
        title="YESTERDAY'S SESSION IS STILL OPEN"
        body="Pick up where you left off, or close it and review what you practiced."
        actions={
          <>
            <StampButton label="RESUME" variant="primary" size="sm" onPress={resumeStale} />
            <StampButton
              label="END & REVIEW"
              variant="tertiary"
              size="sm"
              onPress={() => {
                resumeStale();
                endSession();
              }}
            />
          </>
        }
      />
    ) : null;

  const startCta = (
    <View style={styles.cta}>
      <StampButton
        label="▶ START SESSION"
        variant="primary"
        size="lg"
        disabled={blocks.length === 0}
        onPress={startSession}
      />
    </View>
  );

  let left: ReactNode;
  let right: ReactNode;
  if (status === 'building') {
    left = (
      <>
        <SuggestPanel />
        {isDesktop && startCta}
      </>
    );
    right = (
      <>
        <PlanList mode="building" />
        {!isDesktop && startCta}
      </>
    );
  } else if (status === 'running') {
    left = (
      <>
        <SessionBar />
        <BlockRunner />
        <MetronomeStrip />
        <KeysCard />
      </>
    );
    right = <PlanList mode="running" />;
  } else {
    left = <SummaryTotals />;
    right = <SummaryDecisions />;
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.canvasBg }}
      contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}
    >
      <View style={[styles.page, isDesktop && styles.pageDesktop]}>
        {header}
        {staleCallout}
        <View style={isDesktop ? styles.columns : undefined}>
          <View style={isDesktop ? styles.leftCol : undefined}>{left}</View>
          <View style={isDesktop ? styles.rightCol : undefined}>{right}</View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  scrollDesktop: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  page: {
    width: '100%',
  },
  pageDesktop: {
    maxWidth: 1240,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    paddingBottom: 8,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 22,
  },
  leftCol: {
    flex: 1.2,
  },
  rightCol: {
    flex: 1,
  },
  cta: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  sessionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  sessionBarText: {
    flex: 1,
  },
});
