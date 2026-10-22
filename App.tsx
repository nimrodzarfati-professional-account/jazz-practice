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
  getUserSyncState,
  saveUserSyncState,
} from './src/db/repository';
import { generateSessionQueue, reconcileQueueInPlace } from './src/services/SchedulerEngine';
import { setupAlarmChannel } from './src/services/AlarmManager';
import { pullAllFromCloud, subscribeToRealtimeChanges } from './src/services/CloudSyncService';

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
  const [activeTab, setActiveTab] = useState<TabRoute>('shed');
  const [activeStandard, setActiveStandard] = useState<ActiveStandard>(getActiveStandard);
  const [availableMinutes, setAvailableMinutes] = useState(() => {
    try {
      return getUserSyncState().availableMinutes || 30;
    } catch {
      return 30;
    }
  });
  const [intensity, setIntensity] = useState(() => {
    try {
      return getUserSyncState().intensity || 3;
    } catch {
      return 3;
    }
  });
  const [contextFilter, setContextFilter] = useState<'ALL' | MusicalContext>(() => {
    try {
      return getUserSyncState().contextFilter || 'ALL';
    } catch {
      return 'ALL';
    }
  });
  const [queue, setQueue] = useState<ScoredExercise[]>([]);

  // Rotate Standard Modal State
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [newStandardTitle, setNewStandardTitle] = useState('');
  const [newStandardKey, setNewStandardKey] = useState<PitchKey>('Bb');
  const [newCycleDays, setNewCycleDays] = useState<7 | 10 | 14>(14);

  const rebuildQueue = useCallback(() => {
    const std = getActiveStandard();
    setActiveStandard(std);
    const syncState = getUserSyncState();
    const mins = syncState.availableMinutes || availableMinutes;
    const ints = syncState.intensity || intensity;
    const filter = syncState.contextFilter || contextFilter;
    const rotationExercises = getRotationExercises();
    const newQueue = generateSessionQueue(rotationExercises, std, mins, ints, filter);
    setQueue(newQueue);
    saveUserSyncState({ activeQueueIds: newQueue.map((q) => q.id) });
  }, [availableMinutes, intensity, contextFilter]);

  const refreshData = useCallback(() => {
    const std = getActiveStandard();
    setActiveStandard(std);
    const syncState = getUserSyncState();
    if (syncState.availableMinutes && syncState.availableMinutes !== availableMinutes) {
      setAvailableMinutes(syncState.availableMinutes);
    }
    if (syncState.intensity && syncState.intensity !== intensity) {
      setIntensity(syncState.intensity);
    }
    if (syncState.contextFilter && syncState.contextFilter !== contextFilter) {
      setContextFilter(syncState.contextFilter);
    }

    const rotationExercises = getRotationExercises();
    const mins = syncState.availableMinutes || availableMinutes;
    const ints = syncState.intensity || intensity;
    const filter = syncState.contextFilter || contextFilter;

    setQueue((prevQueue) => {
      if (prevQueue.length === 0) {
        const newQueue = generateSessionQueue(rotationExercises, std, mins, ints, filter);
        saveUserSyncState({ activeQueueIds: newQueue.map((q) => q.id) });
        return newQueue;
      }
      const reconciled = reconcileQueueInPlace(prevQueue, rotationExercises, std, true);
      saveUserSyncState({ activeQueueIds: reconciled.map((q) => q.id) });
      return reconciled;
    });
  }, [availableMinutes, intensity, contextFilter]);

  const handleCrateRefreshQueue = useCallback(() => {
    const std = getActiveStandard();
    setActiveStandard(std);
    const rotationExercises = getRotationExercises();
    setQueue((prevQueue) => {
      if (prevQueue.length === 0) {
        return generateSessionQueue(
          rotationExercises,
          std,
          availableMinutes,
          intensity,
          contextFilter
        );
      }
      // Reconcile existing queue with preserveSessionBpm = false so edited base BPM in The Crate immediately updates
      const reconciled = reconcileQueueInPlace(prevQueue, rotationExercises, std, false);
      saveUserSyncState({ activeQueueIds: reconciled.map((q) => q.id) });
      return reconciled;
    });
  }, [availableMinutes, intensity, contextFilter]);

  const handleFaderChange = useCallback((
    newMins?: number,
    newIntensity?: number,
    newFilter?: 'ALL' | MusicalContext
  ) => {
    const mins = newMins ?? availableMinutes;
    const ints = newIntensity ?? intensity;
    const filter = newFilter ?? contextFilter;
    if (newMins !== undefined) setAvailableMinutes(mins);
    if (newIntensity !== undefined) setIntensity(ints);
    if (newFilter !== undefined) setContextFilter(filter);
    saveUserSyncState({
      availableMinutes: mins,
      intensity: ints,
      contextFilter: filter,
    });
    const std = getActiveStandard();
    const rotationExercises = getRotationExercises();
    const newQueue = generateSessionQueue(rotationExercises, std, mins, ints, filter);
    setQueue(newQueue);
    saveUserSyncState({ activeQueueIds: newQueue.map((q) => q.id) });
  }, [availableMinutes, intensity, contextFilter]);

  useEffect(() => {
    initDatabase();
    setupAlarmChannel();
    rebuildQueue();

    // Always hydrate from Supabase (Source of Truth); falls back to local mirror if offline
    pullAllFromCloud().then(() => {
      refreshData();
    });

    // Subscribe to realtime multi-device updates + foreground/online recovery
    const unsubscribe = subscribeToRealtimeChanges(() => {
      refreshData();
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectExerciseFromCrate = (exercise: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const singleQueueItem: ScoredExercise = {
      ...exercise,
      urgencyScore: 99,
      allocatedMinutes: exercise.durationMinutes,
      assignedStandardTitle:
        exercise.usesActiveStandard || exercise.category === 'MAINTENANCE'
          ? (activeStandard?.title && activeStandard?.defaultKey
              ? `${activeStandard.title} (${activeStandard.defaultKey})`
              : 'No standard chosen')
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
            onUpdateQueueItem={handleUpdateQueueItem}
          />
        )}
        {activeTab === 'crate' && (
          <TheCrateScreen
            onSelectExercise={handleSelectExerciseFromCrate}
            onRefreshQueue={handleCrateRefreshQueue}
          />
        )}
        {activeTab === 'callsheet' && (
          <TheCallSheetScreen
            activeStandard={activeStandard}
            availableMinutes={availableMinutes}
            intensity={intensity}
            contextFilter={contextFilter}
            previewQueue={queue}
            onChangeMinutes={(m) => {
              if (Number.isFinite(m) && m >= 15 && m <= 120) {
                handleFaderChange(m, undefined, undefined);
              }
            }}
            onChangeIntensity={(i) => {
              if (Number.isFinite(i) && i >= 1 && i <= 5) {
                handleFaderChange(undefined, i, undefined);
              }
            }}
            onChangeContextFilter={(f) => {
              handleFaderChange(undefined, undefined, f);
            }}
            onStartSession={() => setActiveTab('shed')}
            onOpenRotateStandardModal={() => setShowRotateModal(true)}
          />
        )}
      </View>

      {/* Cream Block Master Navigation Dock */}
      <View style={[styles.navBar, { backgroundColor: colors.cardSurface, borderTopColor: colors.inkBlack }]}>
        <TouchableOpacity
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
              style={[styles.modalInput, { fontFamily: typography.fontMono, borderColor: colors.inkBlack, backgroundColor: colors.cardSurface, color: colors.textDark }]}
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
