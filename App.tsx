/**
 * Shed Engine V2 — Main Application Entrypoint
 *
 * Strict All-Cream Vintage Press Architecture:
 * - 1-2 Week Active Standard cycle & rotation modal
 * - In-Rotation vs. Repertoire Vault synchronization
 * - Dynamic Urgency Knapsack Scheduler with alternating context packing
 * - Exercise-driven timer countdown with studio Rhodes chimes
 * - Hard OS lock-screen alarms with self-healing cancel handlers
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
  const { colors, typography } = useTheme();
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
          ? `${activeStandard.title} (${activeStandard.defaultKey})`
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

  return (
    <SafeAreaView style={[styles.rootContainer, { backgroundColor: colors.canvasBg }]}>
      <StatusBar style="light" />

      {/* Primary Screen Area */}
      <View style={styles.screenContainer}>
        {activeTab === 'shed' && (
          <TheShedScreen
            queue={queue}
            activeStandard={activeStandard}
            onRefreshData={refreshData}
            onOpenRotateStandardModal={() => setShowRotateModal(true)}
          />
        )}
        {activeTab === 'crate' && (
          <TheCrateScreen
            onSelectExercise={handleSelectExerciseFromCrate}
            onRefreshQueue={refreshData}
          />
        )}
        {activeTab === 'callsheet' && (
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
        )}
      </View>

      {/* Blue Note Master Navigation Dock */}
      <View style={[styles.navBar, { backgroundColor: colors.bgSurface, borderColor: colors.inkBlack }]}>
        <TouchableOpacity
          style={[styles.navTab, activeTab === 'shed' && styles.navTabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('shed');
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.navTabText, activeTab === 'shed' && styles.navTabTextActive]}>
            [ THE SHED ]
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, activeTab === 'crate' && styles.navTabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('crate');
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.navTabText, activeTab === 'crate' && styles.navTabTextActive]}>
            [ THE CRATE ]
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, activeTab === 'callsheet' && styles.navTabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('callsheet');
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.navTabText, activeTab === 'callsheet' && styles.navTabTextActive]}>
            [ CALL SHEET ]
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rotate Standard Modal */}
      <Modal visible={showRotateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardSurface, borderColor: colors.inkBlack }]}>
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
              style={[styles.modalInput, { fontFamily: typography.fontMono, borderColor: colors.inkBlack }]}
            />

            {/* Quick Pick Presets */}
            <Text style={[styles.presetHeader, { fontFamily: typography.fontStamp }]}>
              QUICK PRESETS:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
              {PRESET_STANDARDS.map((p) => (
                <Pressable
                  key={p.title}
                  onPress={() => {
                    setNewStandardTitle(p.title);
                    setNewStandardKey(p.defaultKey);
                  }}
                  style={[
                    styles.presetPill,
                    {
                      borderColor: colors.inkBlack,
                      backgroundColor: newStandardTitle === p.title ? colors.primary : colors.recessedSurface,
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

            {/* Key Selector */}
            <Text style={[styles.presetHeader, { fontFamily: typography.fontStamp, marginTop: 8 }]}>
              DEFAULT KEY:
            </Text>
            <View style={styles.keysGrid}>
              {CIRCLE_OF_FIFTHS.map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setNewStandardKey(k)}
                  style={[
                    styles.keyCell,
                    {
                      borderColor: colors.inkBlack,
                      backgroundColor: newStandardKey === k ? colors.secondary : colors.recessedSurface,
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
            <Text style={[styles.presetHeader, { fontFamily: typography.fontStamp, marginTop: 10 }]}>
              ROTATION CYCLE DURATION:
            </Text>
            <View style={styles.cycleRow}>
              {([7, 10, 14] as const).map((days) => (
                <Pressable
                  key={days}
                  onPress={() => setNewCycleDays(days)}
                  style={[
                    styles.cyclePill,
                    {
                      borderColor: colors.inkBlack,
                      backgroundColor: newCycleDays === days ? colors.primary : colors.recessedSurface,
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
  navBar: {
    flexDirection: 'row',
    borderTopWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
  },
  navTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3A2F26',
    backgroundColor: '#16110E',
  },
  navTabActive: {
    borderColor: '#D49B35',
    backgroundColor: '#2A2018',
    borderBottomWidth: 3,
    borderBottomColor: '#D95D39',
  },
  navTabText: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 12,
    letterSpacing: 2,
    color: '#A69686',
  },
  navTabTextActive: {
    color: '#D49B35',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    borderWidth: 3,
    padding: 16,
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
    marginBottom: 8,
    backgroundColor: '#FAF6EE',
  },
  presetHeader: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 4,
  },
  presetsScroll: {
    flexDirection: 'row',
    marginBottom: 6,
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
    gap: 4,
    marginBottom: 6,
  },
  keyCell: {
    width: '15%',
    aspectRatio: 1.2,
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
    paddingVertical: 6,
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
