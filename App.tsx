/**
 * Shed Engine V2 — Main Application Entrypoint
 * 
 * Responsive Dual-Architecture:
 * - Mobile: Bottom Cream Block Master Navigation Dock + Single-Column Stack
 * - Desktop / Computer: Left Vintage Studio Rack Sidebar + Centered Workstation Canvas
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { useResponsiveLayout } from './src/hooks/useResponsiveLayout';
import { TheShedScreen } from './src/screens/TheShedScreen';
import { TheCrateScreen } from './src/screens/TheCrateScreen';
import { TheCallSheetScreen } from './src/screens/TheCallSheetScreen';
import { StampButton } from './src/components/StampButton';
import {
  ActiveStandard,
  PitchKey,
  MusicalContext,
  ScoredExercise,
  Exercise,
  CIRCLE_OF_FIFTHS,
} from './src/types/models';
import {
  getActiveStandard,
  getRotationExercises,
  rotateActiveStandard,
  initDatabase,
} from './src/db/repository';
import { generateSessionQueue } from './src/services/SchedulerEngine';
import { setupAlarmChannel } from './src/services/AlarmManager';

type TabRoute = 'shed' | 'crate' | 'callsheet';

const PRESET_STANDARDS: { title: string; defaultKey: PitchKey }[] = [
  { title: 'Stella By Starlight', defaultKey: 'Bb' },
  { title: 'Autumn Leaves', defaultKey: 'G' },
  { title: 'All The Things You Are', defaultKey: 'Ab' },
  { title: 'Cherokee', defaultKey: 'Bb' },
  { title: 'Body and Soul', defaultKey: 'Db' },
  { title: 'There Will Never Be Another You', defaultKey: 'Eb' },
  { title: 'Someday My Prince Will Come', defaultKey: 'Bb' },
  { title: 'Confirmation', defaultKey: 'F' },
  { title: 'Oleo (Rhythm Changes)', defaultKey: 'Bb' },
];

function AppContent() {
  const { colors, typography, mode, toggleTheme } = useTheme();
  const { isDesktop } = useResponsiveLayout();

  const [activeTab, setActiveTab] = useState<TabRoute>('shed');
  const [activeStandard, setActiveStandard] = useState<ActiveStandard>(getActiveStandard);
  const [availableMinutes, setAvailableMinutes] = useState(30);
  const [intensity, setIntensity] = useState(3);
  const [contextFilter, setContextFilter] = useState<'ALL' | MusicalContext>('ALL');
  const [queue, setQueue] = useState<ScoredExercise[]>([]);

  // Rotate Standard Modal State
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [newStandardTitle, setNewStandardTitle] = useState('');
  const [newStandardKey, setNewStandardKey] = useState<PitchKey>('Bb');
  const [newCycleDays, setNewCycleDays] = useState<7 | 10 | 14>(14);

  const refreshData = useCallback(() => {
    const std = getActiveStandard();
    setActiveStandard(std);
    const rotationExercises = getRotationExercises();
    const newQueue = generateSessionQueue(
      rotationExercises,
      std,
      availableMinutes,
      intensity,
      contextFilter
    );
    setQueue(newQueue);
  }, [availableMinutes, intensity, contextFilter]);

  useEffect(() => {
    initDatabase();
    setupAlarmChannel();
    refreshData();
  }, [refreshData]);

  const handleSelectExerciseFromCrate = (exercise: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const singleQueueItem: ScoredExercise = {
      ...exercise,
      urgencyScore: 99,
      allocatedMinutes: exercise.durationMinutes,
      assignedStandardTitle:
        exercise.usesActiveStandard || exercise.category === 'MAINTENANCE'
          ? activeStandard?.title && activeStandard?.defaultKey
            ? `${activeStandard.title} (${activeStandard.defaultKey})`
            : 'No standard chosen'
          : undefined,
    };
    setQueue([singleQueueItem, ...queue.filter((q) => q.id !== exercise.id)]);
    setActiveTab('shed');
  };

  const handleSaveStandardRotation = () => {
    if (!newStandardTitle.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated = rotateActiveStandard(
      newStandardTitle.trim(),
      newStandardKey,
      newCycleDays
    );
    setActiveStandard(updated);
    setShowRotateModal(false);
    setNewStandardTitle('');
    refreshData();
  };

  const handleUpdateQueueItem = useCallback((updatedItem: ScoredExercise) => {
    setQueue((prevQueue) =>
      prevQueue.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  }, []);

  // Calculate active standard elapsed days for the desktop sidebar
  const startedDate = activeStandard?.startedAt ? new Date(activeStandard.startedAt) : new Date();
  const diffTime = Date.now() - startedDate.getTime();
  const daysElapsed = Number.isNaN(diffTime)
    ? 1
    : Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
  const isDueToRotate = daysElapsed >= (activeStandard?.rotationCycleDays || 14);
  const totalQueuedMinutes = queue.reduce((acc, item) => acc + item.allocatedMinutes, 0);

  const renderActiveScreen = () => {
    if (activeTab === 'shed') {
      return (
        <TheShedScreen
          queue={queue}
          activeStandard={activeStandard}
          onRefreshData={refreshData}
          onOpenRotateStandardModal={() => setShowRotateModal(true)}
          onUpdateQueueItem={handleUpdateQueueItem}
        />
      );
    }
    if (activeTab === 'crate') {
      return (
        <TheCrateScreen
          onSelectExercise={handleSelectExerciseFromCrate}
          onRefreshQueue={refreshData}
        />
      );
    }
    return (
      <TheCallSheetScreen
        activeStandard={activeStandard}
        availableMinutes={availableMinutes}
        intensity={intensity}
        contextFilter={contextFilter}
        previewQueue={queue}
        onChangeMinutes={(m) => setAvailableMinutes(m)}
        onChangeIntensity={(i) => setIntensity(i)}
        onChangeContextFilter={(f) => setContextFilter(f)}
        onStartSession={() => setActiveTab('shed')}
        onOpenRotateStandardModal={() => setShowRotateModal(true)}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.rootContainer, { backgroundColor: colors.canvasBg }]}>
      <StatusBar style="light" />

      {isDesktop ? (
        /* ============================================================
         * DESKTOP / COMPUTER LAYOUT: Left Studio Rack + Main Desk
         * ============================================================ */
        <View style={styles.desktopShell}>
          {/* Left Vintage Studio Rack Sidebar */}
          <View
            style={[
              styles.desktopSidebar,
              {
                backgroundColor: colors.cardSurface,
                borderRightColor: colors.inkBlack,
              },
            ]}
          >
            {/* Studio Brand Plate */}
            <View style={[styles.brandPlate, { borderBottomColor: colors.inkBlack }]}>
              <Text style={[styles.brandSub, { fontFamily: typography.fontStamp, color: colors.primary }]}>
                VINTAGE STUDIO PRESS // V2
              </Text>
              <Text style={[styles.brandTitle, { fontFamily: typography.fontDisplay, color: colors.inkBlack }]}>
                SHED ENGINE
              </Text>
              <Text style={[styles.brandMeta, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
                Jazz Repertoire & Practice Console
              </Text>
            </View>

            {/* Vertical Navigation Rack */}
            <View style={styles.desktopNavSection}>
              <Text style={[styles.sidebarSectionLabel, { fontFamily: typography.fontStamp, color: colors.inkMuted }]}>
                STUDIO WORKSTATIONS
              </Text>

              {(
                [
                  { id: 'shed', code: '01', label: 'THE SHED', sub: 'Active Practice & Metronome' },
                  { id: 'crate', code: '02', label: 'THE CRATE', sub: 'Repertoire & Drill Vault' },
                  { id: 'callsheet', code: '03', label: 'CALL SHEET', sub: 'Session Faders & Scheduler' },
                ] as const
              ).map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityLabel={item.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveTab(item.id);
                    }}
                    style={[
                      styles.desktopNavBtn,
                      {
                        borderColor: colors.inkBlack,
                        backgroundColor: isActive ? colors.primary : colors.recessedSurface,
                      },
                    ]}
                  >
                    <View style={styles.desktopNavRow}>
                      <Text
                        style={[
                          styles.desktopNavCode,
                          {
                            fontFamily: typography.fontMonoBold,
                            color: isActive ? colors.cardSurface : colors.inkMuted,
                          },
                        ]}
                      >
                        {item.code}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.desktopNavTitle,
                            {
                              fontFamily: typography.fontStamp,
                              color: isActive ? colors.cardSurface : colors.inkBlack,
                            },
                          ]}
                        >
                          [ {item.label} ]
                        </Text>
                        <Text
                          style={[
                            styles.desktopNavSub,
                            {
                              fontFamily: typography.fontMono,
                              color: isActive ? colors.cardSurface : colors.inkMuted,
                            },
                          ]}
                        >
                          {item.sub}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Embedded Active Standard Rack Module */}
            <View
              style={[
                styles.sidebarStandardBox,
                {
                  backgroundColor: colors.recessedSurface,
                  borderColor: colors.inkBlack,
                },
              ]}
            >
              <View style={styles.sidebarStdHeader}>
                <Text style={[styles.sidebarStdLabel, { fontFamily: typography.fontStamp, color: colors.primary }]}>
                  ACTIVE STANDARD ({activeStandard?.defaultKey || 'Bb'})
                </Text>
                <Text
                  style={[
                    styles.sidebarStdDays,
                    {
                      fontFamily: typography.fontMonoBold,
                      color: isDueToRotate ? colors.secondary : colors.inkMuted,
                    },
                  ]}
                >
                  DAY {daysElapsed}/{activeStandard?.rotationCycleDays || 14}
                </Text>
              </View>

              <Text
                style={[
                  styles.sidebarStdTitle,
                  { fontFamily: typography.fontDisplay, color: colors.inkBlack },
                ]}
              >
                “{activeStandard?.title || 'No standard chosen'}”
              </Text>

              <Pressable
                accessibilityLabel="Switch Active Standard"
                accessibilityRole="button"
                onPress={() => setShowRotateModal(true)}
                style={[
                  styles.sidebarRotateBtn,
                  {
                    borderColor: colors.inkBlack,
                    backgroundColor: isDueToRotate ? colors.secondary : colors.cardSurface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sidebarRotateBtnText,
                    {
                      fontFamily: typography.fontStamp,
                      color: isDueToRotate ? colors.cardSurface : colors.inkBlack,
                    },
                  ]}
                >
                  ↻ SWITCH ACTIVE TUNE
                </Text>
              </Pressable>
            </View>

            {/* Session Telemetry Summary */}
            <View
              style={[
                styles.sidebarTelemetryBox,
                { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface },
              ]}
            >
              <Text style={[styles.sidebarSectionLabel, { fontFamily: typography.fontStamp, color: colors.inkMuted }]}>
                CURRENT QUEUE TELEMETRY
              </Text>
              <Text style={[styles.sidebarTelemetryLine, { fontFamily: typography.fontMono, color: colors.inkBlack }]}>
                • {queue.length} Blocks Scheduled ({totalQueuedMinutes}m)
              </Text>
              <Text style={[styles.sidebarTelemetryLine, { fontFamily: typography.fontMono, color: colors.inkBlack }]}>
                • Window: {availableMinutes}m @ Intensity {intensity}/5
              </Text>
              <Text style={[styles.sidebarTelemetryLine, { fontFamily: typography.fontMono, color: colors.inkBlack }]}>
                • Focus: {contextFilter}
              </Text>
            </View>

            {/* Footer Theme Switcher */}
            <View style={styles.sidebarFooter}>
              <Pressable
                accessibilityLabel="Toggle color theme"
                accessibilityRole="button"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleTheme();
                }}
                style={[
                  styles.desktopThemeBtn,
                  {
                    borderColor: colors.inkBlack,
                    backgroundColor: colors.recessedSurface,
                  },
                ]}
              >
                <Text style={[styles.desktopThemeText, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
                  {mode === 'default' ? '🌙 WARM DARK PRESS' : '☀️ CREAM PAPER PRESS'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Main Desktop Workspace Area */}
          <View style={[styles.desktopMainArea, { backgroundColor: colors.canvasBg }]}>
            {renderActiveScreen()}
          </View>
        </View>
      ) : (
        /* ============================================================
         * MOBILE LAYOUT: Original Full-Screen Stack + Bottom Dock
         * ============================================================ */
        <>
          <View style={styles.screenContainer}>{renderActiveScreen()}</View>

          {/* Cream Block Master Navigation Dock */}
          <View
            style={[
              styles.navBar,
              { backgroundColor: colors.cardSurface, borderTopColor: colors.inkBlack },
            ]}
          >
            <TouchableOpacity
              accessibilityLabel="The Shed"
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === 'shed' }}
              style={[
                styles.navTab,
                { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
                activeTab === 'shed' && { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('shed');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.navTabText,
                  {
                    fontFamily: typography.fontStamp,
                    color: activeTab === 'shed' ? colors.cardSurface : colors.inkBlack,
                  },
                ]}
              >
                [ THE SHED ]
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="The Crate"
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === 'crate' }}
              style={[
                styles.navTab,
                { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
                activeTab === 'crate' && { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('crate');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.navTabText,
                  {
                    fontFamily: typography.fontStamp,
                    color: activeTab === 'crate' ? colors.cardSurface : colors.inkBlack,
                  },
                ]}
              >
                [ THE CRATE ]
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Call Sheet"
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === 'callsheet' }}
              style={[
                styles.navTab,
                { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
                activeTab === 'callsheet' && { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('callsheet');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.navTabText,
                  {
                    fontFamily: typography.fontStamp,
                    color: activeTab === 'callsheet' ? colors.cardSurface : colors.inkBlack,
                  },
                ]}
              >
                [ CALL SHEET ]
              </Text>
            </TouchableOpacity>

            {/* Theme Toggle Button */}
            <TouchableOpacity
              accessibilityLabel="Toggle color theme"
              accessibilityRole="button"
              style={[
                styles.navTab,
                styles.navTabTheme,
                { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleTheme();
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.navTabText, { fontSize: 16 }]}>
                {mode === 'default' ? '🌙' : '☀️'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Rotate Standard Modal (Constrained width on Desktop) */}
      <Modal visible={showRotateModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              isDesktop && styles.modalBoxDesktop,
              { backgroundColor: colors.cardSurface, borderColor: colors.inkBlack },
            ]}
          >
            <Text style={[styles.modalTitle, { fontFamily: typography.fontDisplay, color: colors.inkBlack }]}>
              SWITCH ACTIVE STANDARD
            </Text>
            <Text style={[styles.modalSub, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
              Rotates the 1-2 week tune cycle used by all Maintenance voicings & comping drills.
            </Text>

            {/* Custom Title Input */}
            <TextInput
              placeholder="Or enter tune title..."
              placeholderTextColor={colors.inkMuted}
              value={newStandardTitle}
              onChangeText={setNewStandardTitle}
              style={[
                styles.modalInput,
                {
                  fontFamily: typography.fontMono,
                  borderColor: colors.inkBlack,
                  backgroundColor: colors.cardSurface,
                  color: colors.textDark,
                },
              ]}
            />

            {/* Quick Pick Presets */}
            <Text style={[styles.presetHeader, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
              QUICK PRESETS:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
              {PRESET_STANDARDS.map((p) => (
                <Pressable
                  key={p.title}
                  accessibilityLabel={`Preset ${p.title} in ${p.defaultKey}`}
                  accessibilityRole="button"
                  onPress={() => {
                    setNewStandardTitle(p.title);
                    setNewStandardKey(p.defaultKey);
                  }}
                  style={[
                    styles.presetPill,
                    {
                      borderColor: colors.inkBlack,
                      backgroundColor:
                        newStandardTitle === p.title ? colors.primary : colors.recessedSurface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetText,
                      {
                        fontFamily: typography.fontStamp,
                        color: newStandardTitle === p.title ? colors.cardSurface : colors.inkBlack,
                      },
                    ]}
                  >
                    {p.title} ({p.defaultKey})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Key Selector (Fixed height so it never balloons on desktop) */}
            <Text
              style={[
                styles.presetHeader,
                { fontFamily: typography.fontStamp, color: colors.inkBlack, marginTop: 8 },
              ]}
            >
              DEFAULT KEY:
            </Text>
            <View style={styles.keysGrid}>
              {CIRCLE_OF_FIFTHS.map((k) => (
                <Pressable
                  key={k}
                  accessibilityLabel={`Default key ${k}`}
                  accessibilityRole="button"
                  onPress={() => setNewStandardKey(k)}
                  style={[
                    styles.keyCell,
                    {
                      borderColor: colors.inkBlack,
                      backgroundColor:
                        newStandardKey === k ? colors.secondary : colors.recessedSurface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.keyCellText,
                      {
                        fontFamily: typography.fontMonoBold,
                        color: newStandardKey === k ? colors.cardSurface : colors.inkBlack,
                      },
                    ]}
                  >
                    {k}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Cycle Days */}
            <Text
              style={[
                styles.presetHeader,
                { fontFamily: typography.fontStamp, color: colors.inkBlack, marginTop: 10 },
              ]}
            >
              ROTATION CYCLE DURATION:
            </Text>
            <View style={styles.cycleRow}>
              {([7, 10, 14] as const).map((days) => (
                <Pressable
                  key={days}
                  accessibilityLabel={`${days} days rotation cycle`}
                  accessibilityRole="button"
                  onPress={() => setNewCycleDays(days)}
                  style={[
                    styles.cyclePill,
                    {
                      borderColor: colors.inkBlack,
                      backgroundColor:
                        newCycleDays === days ? colors.primary : colors.recessedSurface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.cycleText,
                      {
                        fontFamily: typography.fontStamp,
                        color: newCycleDays === days ? colors.cardSurface : colors.inkBlack,
                      },
                    ]}
                  >
                    {days} DAYS
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Modal Actions */}
            <View style={styles.modalButtons}>
              <StampButton
                label="CANCEL"
                variant="tertiary"
                onPress={() => setShowRotateModal(false)}
              />
              <StampButton
                label="APPLY ROTATION"
                variant="primary"
                onPress={handleSaveStandardRotation}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  /* Desktop Layout Styles */
  desktopShell: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopSidebar: {
    width: 280,
    borderRightWidth: 3,
    padding: 18,
    justifyContent: 'space-between',
  },
  brandPlate: {
    borderBottomWidth: 2,
    paddingBottom: 14,
    marginBottom: 16,
  },
  brandSub: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  brandTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  brandMeta: {
    fontSize: 11,
    marginTop: 4,
  },
  desktopNavSection: {
    gap: 10,
    marginBottom: 16,
  },
  sidebarSectionLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  desktopNavBtn: {
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  desktopNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  desktopNavCode: {
    fontSize: 14,
  },
  desktopNavTitle: {
    fontSize: 13,
    letterSpacing: 1.4,
  },
  desktopNavSub: {
    fontSize: 10,
    marginTop: 2,
  },
  sidebarStandardBox: {
    borderWidth: 2,
    padding: 12,
    marginBottom: 14,
  },
  sidebarStdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sidebarStdLabel: {
    fontSize: 10,
    letterSpacing: 1,
  },
  sidebarStdDays: {
    fontSize: 10,
  },
  sidebarStdTitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  sidebarRotateBtn: {
    borderWidth: 1.5,
    paddingVertical: 6,
    alignItems: 'center',
  },
  sidebarRotateBtnText: {
    fontSize: 10,
    letterSpacing: 1,
  },
  sidebarTelemetryBox: {
    borderWidth: 1.5,
    padding: 10,
    gap: 4,
    marginBottom: 'auto',
  },
  sidebarTelemetryLine: {
    fontSize: 11,
  },
  sidebarFooter: {
    marginTop: 14,
  },
  desktopThemeBtn: {
    borderWidth: 1.5,
    paddingVertical: 9,
    alignItems: 'center',
  },
  desktopThemeText: {
    fontSize: 11,
    letterSpacing: 1.2,
  },
  desktopMainArea: {
    flex: 1,
  },
  /* Mobile Navigation Bar */
  navBar: {
    flexDirection: 'row',
    borderTopWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 6,
  },
  navTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  navTabTheme: {
    flex: 0.4,
  },
  navTabText: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    borderWidth: 3,
    padding: 18,
  },
  modalBoxDesktop: {
    maxWidth: 520,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1.5,
    padding: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  presetHeader: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 6,
  },
  presetsScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  presetPill: {
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
  },
  presetText: {
    fontSize: 11,
  },
  keysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  keyCell: {
    width: '15%',
    height: 40,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyCellText: {
    fontSize: 12,
  },
  cycleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  cyclePill: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 8,
    alignItems: 'center',
  },
  cycleText: {
    fontSize: 11,
    letterSpacing: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
});