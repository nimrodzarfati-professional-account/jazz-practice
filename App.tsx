/**
 * Shed Engine V2 — Main Application Entrypoint
 *
 * Three tabs (TODAY, LIBRARY, PROGRESS) over one SessionProvider:
 * - Mobile: bottom navigation dock + single-column screens
 * - Desktop: left sidebar + centered workstation canvas
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { useResponsiveLayout } from './src/hooks/useResponsiveLayout';
import { SessionProvider, useSession } from './src/session/SessionContext';
import { TodayScreen } from './src/screens/TodayScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { KnowledgeScreen } from './src/screens/KnowledgeScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { ScreenErrorBoundary } from './src/components/ScreenErrorBoundary';
import { NavItem } from './src/components/NavItem';
import { StampModal } from './src/components/StampModal';
import { StampButton } from './src/components/StampButton';
import { StampBadge } from './src/components/StampBadge';
import { categoryLabel } from './src/utils/format';
import { toggleExerciseRotation } from './src/db/repository';
import { isOverdueRotationExercise, getLastPracticedStampLabel } from './src/services/CrateUtils';

type TabRoute = 'today' | 'library' | 'knowledge' | 'progress';

const TABS: { id: TabRoute; code: string; title: string; subtitle: string }[] = [
  { id: 'today', code: '01', title: 'TODAY', subtitle: 'Plan & practice' },
  { id: 'library', code: '02', title: 'LIBRARY', subtitle: 'Exercises' },
  { id: 'knowledge', code: '03', title: 'CODEX', subtitle: 'Knowledge Base (MD)' },
  { id: 'progress', code: '04', title: 'PROGRESS', subtitle: 'History & settings' },
];

function AppContent() {
  const { colors, typography } = useTheme();
  const { isDesktop } = useResponsiveLayout();
  const { exercises, startNow, reloadFromDb } = useSession();
  const [activeTab, setActiveTab] = useState<TabRoute>('today');
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const hasTriggeredOverdueRef = useRef(false);

  const overdueExercises = useMemo(() => {
    return exercises.filter((ex) => isOverdueRotationExercise(ex, 7));
  }, [exercises]);

  useEffect(() => {
    if (!hasTriggeredOverdueRef.current && overdueExercises.length > 0) {
      hasTriggeredOverdueRef.current = true;
      setShowOverdueModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [overdueExercises]);

  const handleStartNow = (exerciseId: string) => {
    startNow(exerciseId);
    setActiveTab('today');
  };

  const handlePracticeOverdue = (exerciseId: string) => {
    setShowOverdueModal(false);
    handleStartNow(exerciseId);
  };

  const handleSaveForLater = (exerciseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleExerciseRotation(exerciseId, false);
    reloadFromDb();
  };

  const handleSaveAllForLater = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    overdueExercises.forEach((ex) => toggleExerciseRotation(ex.id, false));
    setShowOverdueModal(false);
    reloadFromDb();
  };

  const handleDismissOverdue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowOverdueModal(false);
  };

  const screen =
    activeTab === 'today' ? (
      <TodayScreen />
    ) : activeTab === 'library' ? (
      <LibraryScreen
        onStartNow={handleStartNow}
        onOpenKnowledge={() => setActiveTab('knowledge')}
      />
    ) : activeTab === 'knowledge' ? (
      <KnowledgeScreen onStartExercise={handleStartNow} />
    ) : (
      <ProgressScreen />
    );

  const navItems = TABS.map((tab) => (
    <NavItem
      key={tab.id}
      code={tab.code}
      title={tab.title}
      subtitle={tab.subtitle}
      active={activeTab === tab.id}
      compact={!isDesktop}
      onPress={() => setActiveTab(tab.id)}
    />
  ));

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.canvasBg }]}>
      <StatusBar style="light" />

      {isDesktop ? (
        <View style={styles.desktopShell}>
          <View
            accessibilityRole="tablist"
            style={[styles.sidebar, { backgroundColor: colors.cardSurface, borderColor: colors.inkBlack }]}
          >
            <View style={[styles.brand, { borderBottomColor: colors.inkBlack }]}>
              <Text style={[typography.title, styles.brandTitle, { color: colors.inkBlack }]}>SHED ENGINE</Text>
              <Text style={[typography.stampSmall, { color: colors.primary }]}>PRACTICE LOG</Text>
            </View>
            <View style={styles.sidebarNav}>{navItems}</View>
          </View>
          <View style={styles.main}>
            <ScreenErrorBoundary resetKey={activeTab}>
              {screen}
            </ScreenErrorBoundary>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.main}>
            <ScreenErrorBoundary resetKey={activeTab}>
              {screen}
            </ScreenErrorBoundary>
          </View>
          <View
            accessibilityRole="tablist"
            style={[styles.dock, { backgroundColor: colors.cardSurface, borderTopColor: colors.inkBlack }]}
          >
            {navItems}
          </View>
        </>
      )}

      <StampModal
        visible={showOverdueModal}
        title="OVERDUE DRILLS IN ROTATION"
        subtitle={
          overdueExercises.length === 1
            ? "1 drill in your active rotation hasn't been practiced in over 7 days:"
            : `${overdueExercises.length} drills in your active rotation haven't been practiced in over 7 days:`
        }
        onClose={handleDismissOverdue}
        actions={
          <>
            {overdueExercises.length > 1 && (
              <StampButton
                label="SAVE ALL FOR LATER"
                variant="tertiary"
                size="sm"
                onPress={handleSaveAllForLater}
              />
            )}
            <StampButton
              label="KEEP IN ROTATION"
              variant="primary"
              size="sm"
              onPress={handleDismissOverdue}
            />
          </>
        }
      >
        {overdueExercises.map((item) => (
          <View
            key={item.id}
            style={[
              styles.overdueCard,
              { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
            ]}
          >
            <View style={styles.overdueInfo}>
              <View style={styles.overdueBadges}>
                <StampBadge label={item.context} type={item.context} />
                <StampBadge label={categoryLabel(item.category)} type={item.category} />
                <StampBadge
                  label={`⚠️ ${getLastPracticedStampLabel(item.lastPracticedAt)}`}
                  tone="secondary"
                />
              </View>
              <Text style={[typography.title, styles.overdueTitle, { color: colors.inkBlack }]}>
                {item.title}
              </Text>
              <Text style={[typography.monoBold, styles.overdueMeta, { color: colors.inkMuted }]}>
                {item.durationMinutes} MIN • ♩{item.currentBpm}
              </Text>
            </View>
            <View style={styles.overdueActions}>
              <StampButton
                label="▶ PRACTICE"
                variant="primary"
                size="sm"
                onPress={() => handlePracticeOverdue(item.id)}
              />
              <StampButton
                label="SAVE FOR LATER"
                variant="tertiary"
                size="sm"
                onPress={() => handleSaveForLater(item.id)}
              />
            </View>
          </View>
        ))}
      </StampModal>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SessionProvider>
            <AppContent />
          </SessionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  main: {
    flex: 1,
  },
  desktopShell: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 240,
    borderRightWidth: 3,
    padding: 18,
  },
  brand: {
    borderBottomWidth: 2,
    paddingBottom: 12,
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 24,
  },
  sidebarNav: {
    gap: 10,
  },
  dock: {
    flexDirection: 'row',
    borderTopWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 6,
  },
  overdueCard: {
    borderWidth: 1.5,
    padding: 12,
    gap: 8,
  },
  overdueInfo: {
    gap: 4,
  },
  overdueBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  overdueTitle: {
    fontSize: 18,
  },
  overdueMeta: {
    fontSize: 11,
  },
  overdueActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
});
