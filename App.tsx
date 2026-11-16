/**
 * Shed Engine V2 — Main Application Entrypoint
 *
 * Three tabs (TODAY, LIBRARY, PROGRESS) over one SessionProvider:
 * - Mobile: bottom navigation dock + single-column screens
 * - Desktop: left sidebar + centered workstation canvas
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { useResponsiveLayout } from './src/hooks/useResponsiveLayout';
import { SessionProvider, useSession } from './src/session/SessionContext';
import { TodayScreen } from './src/screens/TodayScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { StandardsScreen } from './src/screens/StandardsScreen';
import { KnowledgeScreen } from './src/screens/KnowledgeScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { ScreenErrorBoundary } from './src/components/ScreenErrorBoundary';
import { NavItem } from './src/components/NavItem';
import { StampModal } from './src/components/StampModal';
import { StampButton } from './src/components/StampButton';
import { StampBadge } from './src/components/StampBadge';
import { categoryLabel } from './src/utils/format';
import {
  toggleExerciseRotation,
  setExerciseHomework,
  resolveHomeworkDecision,
} from './src/db/repository';
import {
  isOverdueRotationExercise,
  isExpiredWeekExercise,
  getLastPracticedStampLabel,
} from './src/services/CrateUtils';

type TabRoute = 'today' | 'library' | 'standards' | 'knowledge' | 'progress';

const TABS: { id: TabRoute; code: string; title: string; subtitle: string }[] = [
  { id: 'today', code: '01', title: 'TODAY', subtitle: 'Plan & practice' },
  { id: 'library', code: '02', title: 'LIBRARY', subtitle: 'Exercises' },
  { id: 'standards', code: '03', title: 'STANDARDS', subtitle: 'Repertoire' },
  { id: 'knowledge', code: '04', title: 'CODEX', subtitle: 'Knowledge Base (MD)' },
  { id: 'progress', code: '05', title: 'PROGRESS', subtitle: 'History & settings' },
];

function AppContent() {
  const { colors, typography } = useTheme();
  const { isDesktop } = useResponsiveLayout();
  const {
    exercises,
    startNow,
    startMultipleNow,
    reloadFromDb,
  } = useSession();
  const [activeTab, setActiveTab] = useState<TabRoute>('today');
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const hasTriggeredOverdueRef = useRef(false);
  const [showWeekExpiredModal, setShowWeekExpiredModal] = useState(false);
  const hasTriggeredWeekExpiredRef = useRef(false);

  const expiredWeekExercises = useMemo(() => {
    return exercises.filter((ex) => isExpiredWeekExercise(ex));
  }, [exercises]);

  const overdueExercises = useMemo(() => {
    return exercises.filter((ex) => isOverdueRotationExercise(ex, 7));
  }, [exercises]);

  const [selectedOverdueIds, setSelectedOverdueIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!showOverdueModal) {
      setSelectedOverdueIds(new Set());
    } else {
      setSelectedOverdueIds((prev) => {
        if (prev.size === 0) {
          return new Set(overdueExercises.map((e) => e.id));
        }
        const valid = new Set<string>();
        for (const id of prev) {
          if (overdueExercises.some((e) => e.id === id)) {
            valid.add(id);
          }
        }
        return valid;
      });
    }
  }, [showOverdueModal, overdueExercises]);

  useEffect(() => {
    if (!hasTriggeredWeekExpiredRef.current && expiredWeekExercises.length > 0) {
      hasTriggeredWeekExpiredRef.current = true;
      setShowWeekExpiredModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else if (
      !hasTriggeredOverdueRef.current &&
      !showWeekExpiredModal &&
      overdueExercises.length > 0
    ) {
      hasTriggeredOverdueRef.current = true;
      setShowOverdueModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [expiredWeekExercises, overdueExercises, showWeekExpiredModal]);

  const handleStartNow = (exerciseId: string) => {
    startNow(exerciseId);
    setActiveTab('today');
  };

  const handleToggleSelectOverdue = (exerciseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOverdueIds((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  };

  const handleToggleAllOverdue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedOverdueIds.size === overdueExercises.length) {
      setSelectedOverdueIds(new Set());
    } else {
      setSelectedOverdueIds(new Set(overdueExercises.map((e) => e.id)));
    }
  };

  const handleStartSelectedShed = () => {
    const ids = Array.from(selectedOverdueIds);
    if (ids.length === 0) {
      handleDismissOverdue();
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowOverdueModal(false);
    startMultipleNow(ids, true);
    setActiveTab('today');
  };

  const handleAddSelectedToPlan = () => {
    const ids = Array.from(selectedOverdueIds);
    if (ids.length === 0) {
      handleDismissOverdue();
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowOverdueModal(false);
    startMultipleNow(ids, false);
    setActiveTab('today');
  };

  const handleSaveForLater = (exerciseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleExerciseRotation(exerciseId, false);
    reloadFromDb();
    if (overdueExercises.length <= 1) {
      setShowOverdueModal(false);
    }
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

  const handleKeepThisWeek = (exerciseId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setExerciseHomework(exerciseId, true);
    reloadFromDb();
    if (expiredWeekExercises.length <= 1) {
      setShowWeekExpiredModal(false);
    }
  };

  const handleMoveToSaveForLater = (exerciseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resolveHomeworkDecision(exerciseId, 'vault');
    reloadFromDb();
    if (expiredWeekExercises.length <= 1) {
      setShowWeekExpiredModal(false);
    }
  };

  const handleKeepActiveInRotation = (exerciseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resolveHomeworkDecision(exerciseId, 'keep');
    reloadFromDb();
    if (expiredWeekExercises.length <= 1) {
      setShowWeekExpiredModal(false);
    }
  };

  const handleKeepAllThisWeek = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    expiredWeekExercises.forEach((ex) => setExerciseHomework(ex.id, true));
    setShowWeekExpiredModal(false);
    reloadFromDb();
  };

  const handleSaveAllExpiredForLater = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    expiredWeekExercises.forEach((ex) => resolveHomeworkDecision(ex.id, 'vault'));
    setShowWeekExpiredModal(false);
    reloadFromDb();
  };

  const handleDismissWeekExpired = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowWeekExpiredModal(false);
  };

  const screen =
    activeTab === 'today' ? (
      <TodayScreen />
    ) : activeTab === 'library' ? (
      <LibraryScreen
        onStartNow={handleStartNow}
        onOpenKnowledge={() => setActiveTab('knowledge')}
      />
    ) : activeTab === 'standards' ? (
      <StandardsScreen />
    ) : activeTab === 'knowledge' ? (
      <KnowledgeScreen onStartExercise={handleStartNow} />
    ) : (
      <ProgressScreen onOpenStandards={() => setActiveTab('standards')} />
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

      {/* 7-Day "THIS WEEK" Expiration Review Modal */}
      <StampModal
        visible={showWeekExpiredModal}
        title="THIS WEEK CYCLE COMPLETED"
        subtitle={
          expiredWeekExercises.length === 1
            ? "1 drill has been in 'THIS WEEK' for over a week. Choose to keep this week or move to save for later:"
            : `${expiredWeekExercises.length} drills have been in 'THIS WEEK' for over a week. Choose to keep this week or move to save for later:`
        }
        onClose={handleDismissWeekExpired}
        actions={
          <>
            {expiredWeekExercises.length > 1 && (
              <StampButton
                label="SAVE ALL FOR LATER"
                variant="tertiary"
                size="sm"
                onPress={handleSaveAllExpiredForLater}
              />
            )}
            {expiredWeekExercises.length > 1 && (
              <StampButton
                label="KEEP ALL THIS WEEK"
                variant="primary"
                size="sm"
                onPress={handleKeepAllThisWeek}
              />
            )}
            {expiredWeekExercises.length <= 1 && (
              <StampButton
                label="DECIDE LATER"
                variant="tertiary"
                size="sm"
                onPress={handleDismissWeekExpired}
              />
            )}
          </>
        }
      >
        {expiredWeekExercises.map((item) => (
          <View
            key={item.id}
            style={[
              styles.overdueCard,
              { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
            ]}
          >
            <View style={styles.overdueInfo}>
              <View style={styles.overdueBadges}>
                <StampBadge label="THIS WEEK • 7D COMPLETED" tone="primary" filled />
                <StampBadge label={item.context} type={item.context} />
                <StampBadge label={categoryLabel(item.category)} type={item.category} />
              </View>
              <Text style={[typography.title, styles.overdueTitle, { color: colors.inkBlack }]}>
                {item.title}
              </Text>
              <Text style={[typography.monoBold, styles.overdueMeta, { color: colors.inkMuted }]}>
                {item.durationMinutes} MIN • ♩{item.currentBpm} • {getLastPracticedStampLabel(item.lastPracticedAt)}
              </Text>
            </View>
            <View style={styles.overdueActions}>
              <StampButton
                label="KEEP THIS WEEK"
                variant="primary"
                size="sm"
                onPress={() => handleKeepThisWeek(item.id)}
              />
              <StampButton
                label="SAVE FOR LATER"
                variant="tertiary"
                size="sm"
                onPress={() => handleMoveToSaveForLater(item.id)}
              />
              <StampButton
                label="KEEP ACTIVE"
                variant="tertiary"
                size="sm"
                onPress={() => handleKeepActiveInRotation(item.id)}
              />
            </View>
          </View>
        ))}
      </StampModal>

      <StampModal
        visible={showOverdueModal && overdueExercises.length > 0}
        title="OVERDUE DRILLS IN ROTATION"
        subtitle={
          overdueExercises.length === 1
            ? "1 drill in your active rotation hasn't been practiced in over 7 days. Select to shed:"
            : `${overdueExercises.length} drills in your active rotation haven't been practiced in over 7 days. Select drills to shed:`
        }
        onClose={handleDismissOverdue}
        actions={
          <>
            {overdueExercises.length > 1 && (
              <StampButton
                label={
                  selectedOverdueIds.size === overdueExercises.length
                    ? 'DESELECT ALL'
                    : 'SELECT ALL'
                }
                variant="secondary"
                size="sm"
                onPress={handleToggleAllOverdue}
              />
            )}
            {overdueExercises.length > 1 && (
              <StampButton
                label="SAVE ALL FOR LATER"
                variant="tertiary"
                size="sm"
                onPress={handleSaveAllForLater}
              />
            )}
            {selectedOverdueIds.size > 0 && (
              <StampButton
                label="ADD TO PLAN"
                variant="tertiary"
                size="sm"
                onPress={handleAddSelectedToPlan}
              />
            )}
            <StampButton
              label={
                selectedOverdueIds.size > 0
                  ? `▶ START SHED (${selectedOverdueIds.size})`
                  : 'KEEP IN ROTATION'
              }
              variant="primary"
              size="sm"
              onPress={
                selectedOverdueIds.size > 0
                  ? handleStartSelectedShed
                  : handleDismissOverdue
              }
            />
          </>
        }
      >
        {overdueExercises.map((item) => {
          const isSelected = selectedOverdueIds.has(item.id);
          return (
            <View
              key={item.id}
              style={[
                styles.overdueCard,
                {
                  borderColor: isSelected ? colors.primary : colors.inkBlack,
                  borderWidth: isSelected ? 2 : 1.5,
                  backgroundColor: colors.recessedSurface,
                },
              ]}
            >
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={`${item.title}, ${isSelected ? 'selected to shed' : 'not selected'}`}
                accessibilityState={{ checked: isSelected }}
                onPress={() => handleToggleSelectOverdue(item.id)}
                style={styles.overdueInfo}
              >
                <View style={styles.overdueBadges}>
                  <StampBadge label={item.context} type={item.context} />
                  <StampBadge label={categoryLabel(item.category)} type={item.category} />
                  <StampBadge
                    label={`⚠️ ${getLastPracticedStampLabel(item.lastPracticedAt)}`}
                    tone="secondary"
                  />
                  {isSelected && (
                    <StampBadge label="SELECTED TO SHED" tone="primary" filled />
                  )}
                </View>
                <Text style={[typography.title, styles.overdueTitle, { color: colors.inkBlack }]}>
                  {item.title}
                </Text>
                <Text style={[typography.monoBold, styles.overdueMeta, { color: colors.inkMuted }]}>
                  {item.durationMinutes} MIN • ♩{item.currentBpm}
                </Text>
              </Pressable>
              <View style={styles.overdueActions}>
                <StampButton
                  label={isSelected ? '✓ IN SHED' : '+ SHED'}
                  variant={isSelected ? 'primary' : 'secondary'}
                  size="sm"
                  accessibilityLabel={
                    isSelected ? `Deselect ${item.title}` : `Select ${item.title} to shed`
                  }
                  onPress={() => handleToggleSelectOverdue(item.id)}
                />
                <StampButton
                  label="SAVE FOR LATER"
                  variant="tertiary"
                  size="sm"
                  onPress={() => handleSaveForLater(item.id)}
                />
              </View>
            </View>
          );
        })}
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
    marginBottom: 8,
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
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
});
