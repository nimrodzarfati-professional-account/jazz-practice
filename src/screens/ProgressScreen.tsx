import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { CurrentSongCard } from '../components/progress/CurrentSongCard';
import { HistoryPanel } from '../components/progress/HistoryPanel';
import { ReminderRow } from '../components/progress/ReminderRow';
import { SettingsCard } from '../components/progress/SettingsCard';

export const ProgressScreen: React.FC = () => {
  const { colors, typography } = useTheme();
  const { isDesktop } = useResponsiveLayout();

  const song = <CurrentSongCard />;
  const history = <HistoryPanel />;
  const extras = (
    <>
      <ReminderRow />
      <SettingsCard />
    </>
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.canvasBg }}
      contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}
    >
      <View style={[styles.page, isDesktop && styles.pageDesktop]}>
        <View style={[styles.header, { borderBottomColor: colors.primary }]}>
          <Text accessibilityRole="header" style={[typography.title, styles.headerTitle, { color: colors.textPrimary }]}>
            PROGRESS
          </Text>
        </View>
        {isDesktop ? (
          <View style={styles.columns}>
            <View style={styles.leftCol}>
              {song}
              {extras}
            </View>
            <View style={styles.rightCol}>{history}</View>
          </View>
        ) : (
          <>
            {song}
            {history}
            {extras}
          </>
        )}
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
    flex: 1,
  },
  rightCol: {
    flex: 1.5,
  },
});
