/**
 * Shed Engine V2 — Main Application Entrypoint
 *
 * Three tabs (TODAY, LIBRARY, PROGRESS) over one SessionProvider:
 * - Mobile: bottom navigation dock + single-column screens
 * - Desktop: left sidebar + centered workstation canvas
 */
import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { useResponsiveLayout } from './src/hooks/useResponsiveLayout';
import { SessionProvider, useSession } from './src/session/SessionContext';
import { TodayScreen } from './src/screens/TodayScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { NavItem } from './src/components/NavItem';

type TabRoute = 'today' | 'library' | 'progress';

const TABS: { id: TabRoute; code: string; title: string; subtitle: string }[] = [
  { id: 'today', code: '01', title: 'TODAY', subtitle: 'Plan & practice' },
  { id: 'library', code: '02', title: 'LIBRARY', subtitle: 'Exercises' },
  { id: 'progress', code: '03', title: 'PROGRESS', subtitle: 'History & settings' },
];

function AppContent() {
  const { colors, typography } = useTheme();
  const { isDesktop } = useResponsiveLayout();
  const { startNow } = useSession();
  const [activeTab, setActiveTab] = useState<TabRoute>('today');

  const handleStartNow = (exerciseId: string) => {
    startNow(exerciseId);
    setActiveTab('today');
  };

  const screen =
    activeTab === 'today' ? (
      <TodayScreen />
    ) : activeTab === 'library' ? (
      <LibraryScreen onStartNow={handleStartNow} />
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
          <View style={styles.main}>{screen}</View>
        </View>
      ) : (
        <>
          <View style={styles.main}>{screen}</View>
          <View
            accessibilityRole="tablist"
            style={[styles.dock, { backgroundColor: colors.cardSurface, borderTopColor: colors.inkBlack }]}
          >
            {navItems}
          </View>
        </>
      )}
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
});
