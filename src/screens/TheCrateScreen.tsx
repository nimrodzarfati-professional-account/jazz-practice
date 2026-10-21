import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import {
  Exercise,
  ExerciseCategory,
  MusicalContext,
} from '../types/models';
import {
  getAllVaultExercises,
  addExercise,
  bulkAddExercises,
  updateExerciseDetails,
  toggleExerciseRotation,
  deleteExercise,
} from '../db/repository';
import {
  getRotationTenureStats,
  parseBulkExercisesInput,
} from '../services/CrateUtils';
import {
  SyncConnectionStatus,
  getSyncStatus,
  subscribeToSyncStatus,
  getCloudConfig,
  saveCloudConfig,
  pullAllFromCloud,
} from '../services/CloudSyncService';
import { CreamBlock } from '../components/CreamBlock';
import { StampButton } from '../components/StampButton';
import { StampBadge } from '../components/StampBadge';

interface TheCrateScreenProps {
  onSelectExercise: (exercise: Exercise) => void;
  onRefreshQueue: () => void;
}

type RotationFilter = 'ALL' | 'IN_ROTATION' | 'VAULT';
type ContextFilter = 'ALL' | MusicalContext;

export const TheCrateScreen: React.FC<TheCrateScreenProps> = ({
  onSelectExercise,
  onRefreshQueue,
}) => {
  const { colors, typography } = useTheme();
  const [exercises, setExercises] = useState<Exercise[]>(() => getAllVaultExercises());
  const [rotationFilter, setRotationFilter] = useState<RotationFilter>('ALL');
  const [contextFilter, setContextFilter] = useState<ContextFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncConnectionStatus>(() => getSyncStatus());

  // Add / Edit Exercise Modal State
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [contextInput, setContextInput] = useState<MusicalContext>('SOLOING');
  const [categoryInput, setCategoryInput] = useState<ExerciseCategory>('NEW_CONCEPT');
  const [durationInput, setDurationInput] = useState('15');
  const [bpmInput, setBpmInput] = useState('120');
  const [intensityInput, setIntensityInput] = useState<number>(3);
  const [priorityInput, setPriorityInput] = useState<number>(7);
  const [isKeyBasedInput, setIsKeyBasedInput] = useState<boolean>(true);
  const [inRotationInput, setInRotationInput] = useState<boolean>(true);

  // Bulk Add Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRawText, setBulkRawText] = useState('');

  // Cloud Database Modal State
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [cloudUrl, setCloudUrl] = useState('');
  const [cloudKey, setCloudKey] = useState('');

  const reloadLocalExercises = useCallback(() => {
    setExercises(getAllVaultExercises());
  }, []);

  useEffect(() => {
    reloadLocalExercises();
    const unsubStatus = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
      reloadLocalExercises();
    });
    return () => {
      unsubStatus();
    };
  }, [reloadLocalExercises]);

  const syncAfterMutation = useCallback(() => {
    reloadLocalExercises();
    onRefreshQueue();
  }, [reloadLocalExercises, onRefreshQueue]);

  const openCloudModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const cfg = getCloudConfig();
    setCloudUrl(cfg.url);
    setCloudKey(cfg.anonKey);
    setShowCloudModal(true);
  };

  const handleSaveCloudConfig = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveCloudConfig(cloudUrl, cloudKey);
    setShowCloudModal(false);
    const res = await pullAllFromCloud();
    if (res.success) {
      reloadLocalExercises();
      onRefreshQueue();
    }
  };

  const openCreateModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingExerciseId(null);
    setTitleInput('');
    setDescInput('');
    setContextInput('SOLOING');
    setCategoryInput('NEW_CONCEPT');
    setDurationInput('15');
    setBpmInput('120');
    setIntensityInput(3);
    setPriorityInput(7);
    setIsKeyBasedInput(true);
    setInRotationInput(true);
    setShowEditorModal(true);
  };

  const openEditModal = (ex: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingExerciseId(ex.id);
    setTitleInput(ex.title);
    setDescInput(ex.description);
    setContextInput(ex.context);
    setCategoryInput(ex.category);
    setDurationInput(String(ex.durationMinutes));
    setBpmInput(String(ex.currentBpm));
    setIntensityInput(ex.intensity);
    setPriorityInput(ex.basePriority);
    setIsKeyBasedInput(ex.isKeyBased);
    setInRotationInput(ex.inRotation);
    setShowEditorModal(true);
  };

  const handleSaveExercise = () => {
    const cleanTitle = titleInput.trim();
    if (!cleanTitle) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const parsedDuration = Math.max(5, Math.min(120, parseInt(durationInput, 10) || 15));
    const parsedBpm = Math.max(30, Math.min(320, parseInt(bpmInput, 10) || 120));
    const usesActiveStandard = categoryInput === 'MAINTENANCE';

    if (editingExerciseId) {
      updateExerciseDetails(editingExerciseId, {
        title: cleanTitle,
        description: descInput.trim() || 'Custom practice drill',
        context: contextInput,
        category: categoryInput,
        durationMinutes: parsedDuration,
        intensity: intensityInput,
        basePriority: priorityInput,
        currentBpm: parsedBpm,
        isKeyBased: isKeyBasedInput,
        usesActiveStandard,
      });
      toggleExerciseRotation(editingExerciseId, inRotationInput);
    } else {
      addExercise({
        title: cleanTitle,
        description: descInput.trim() || 'Custom practice drill',
        context: contextInput,
        category: categoryInput,
        inRotation: inRotationInput,
        durationMinutes: parsedDuration,
        intensity: intensityInput,
        basePriority: priorityInput,
        currentBpm: parsedBpm,
        isKeyBased: isKeyBasedInput,
        masteredKeys: [],
        usesActiveStandard,
        lastPracticedAt: null,
        skippedCount: 0,
        rotationChangedAt: new Date().toISOString(),
        accumulatedInRotationMs: 0,
        accumulatedOutRotationMs: 0,
      });
    }

    setShowEditorModal(false);
    syncAfterMutation();
  };

  const handleBulkIngest = () => {
    if (!bulkRawText.trim()) return;
    const parsedItems = parseBulkExercisesInput(bulkRawText, {
      context: 'SOLOING',
      category: 'NEW_CONCEPT',
      inRotation: true,
      durationMinutes: 15,
      intensity: 3,
      currentBpm: 120,
      isKeyBased: true,
    });
    if (parsedItems.length === 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    bulkAddExercises(parsedItems);
    setBulkRawText('');
    setShowBulkModal(false);
    syncAfterMutation();
  };

  const handleToggleRotation = (ex: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleExerciseRotation(ex.id, !ex.inRotation);
    syncAfterMutation();
  };

  const handleDeleteExercise = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteExercise(id);
    syncAfterMutation();
  };

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      if (rotationFilter === 'IN_ROTATION' && !ex.inRotation) return false;
      if (rotationFilter === 'VAULT' && ex.inRotation) return false;
      if (contextFilter !== 'ALL' && ex.context !== contextFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ex.title.toLowerCase().includes(q);
        const matchDesc = ex.description.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [exercises, rotationFilter, contextFilter, searchQuery]);

  const inRotationCount = exercises.filter((e) => e.inRotation).length;
  const vaultCount = exercises.length - inRotationCount;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.canvasBg }]}>
      <CreamBlock>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.title,
                { fontFamily: typography.fontDisplay, color: colors.inkBlack },
              ]}
            >
              THE CRATE // REPERTOIRE
            </Text>
            <Text
              style={[
                styles.subtitle,
                { fontFamily: typography.fontMono, color: colors.inkMuted },
              ]}
            >
              {inRotationCount} Active Rotation • {vaultCount} Vault Archive
            </Text>
          </View>

          {/* Live Database Status Indicator (Tap to open credentials config) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cloud database sync status and settings"
            onPress={openCloudModal}
            style={[
              styles.statusPill,
              {
                borderColor: colors.inkBlack,
                backgroundColor:
                  syncStatus === 'connected'
                    ? colors.recessedSurface
                    : colors.cardSurface,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: typography.fontStamp,
                fontSize: 10,
                letterSpacing: 0.8,
                color:
                  syncStatus === 'connected'
                    ? colors.primary
                    : syncStatus === 'syncing'
                    ? colors.tertiary
                    : colors.inkMuted,
              }}
            >
              {syncStatus === 'connected'
                ? '● LIVE DB'
                : syncStatus === 'syncing'
                ? '↻ SYNCING'
                : '○ OFFLINE CACHE'}
            </Text>
          </Pressable>
        </View>

        {/* Action Bar: Direct Add & Bulk Add */}
        <View style={styles.actionRow}>
          <View style={{ flex: 1 }}>
            <StampButton
              label="+ NEW EXERCISE"
              variant="primary"
              size="sm"
              onPress={openCreateModal}
            />
          </View>
          <View style={{ flex: 1 }}>
            <StampButton
              label="⚡ BULK ADD LINES"
              variant="tertiary"
              size="sm"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowBulkModal(true);
              }}
            />
          </View>
        </View>

        {/* Search Input */}
        <TextInput
          placeholder="Search drills, concepts, voicings..."
          placeholderTextColor={colors.inkMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[
            styles.searchInput,
            {
              fontFamily: typography.fontMono,
              borderColor: colors.inkBlack,
              backgroundColor: colors.cardSurface,
              color: colors.textDark,
            },
          ]}
        />

        {/* Rotation Filter Tabs */}
        <View style={styles.filterGroup}>
          {(
            [
              { id: 'ALL', label: `ALL (${exercises.length})` },
              { id: 'IN_ROTATION', label: `ROTATION (${inRotationCount})` },
              { id: 'VAULT', label: `VAULT (${vaultCount})` },
            ] as const
          ).map((tab) => (
            <Pressable
              key={tab.id}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${tab.label}`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setRotationFilter(tab.id);
              }}
              style={[
                styles.filterTab,
                {
                  borderColor: colors.inkBlack,
                  backgroundColor:
                    rotationFilter === tab.id ? colors.primary : colors.recessedSurface,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: typography.fontStamp,
                  fontSize: 11,
                  color: rotationFilter === tab.id ? colors.cardSurface : colors.inkBlack,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Context Filter Row */}
        <View style={[styles.filterGroup, { marginTop: 6 }]}>
          {(['ALL', 'SOLOING', 'COMPING'] as const).map((ctx) => (
            <Pressable
              key={ctx}
              accessibilityRole="button"
              accessibilityLabel={`Filter context ${ctx}`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setContextFilter(ctx);
              }}
              style={[
                styles.filterTab,
                {
                  borderColor: colors.inkBlack,
                  backgroundColor:
                    contextFilter === ctx ? colors.tertiary : colors.cardSurface,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: typography.fontStamp,
                  fontSize: 10,
                  color: contextFilter === ctx ? colors.cardSurface : colors.inkBlack,
                }}
              >
                {ctx}
              </Text>
            </Pressable>
          ))}
        </View>
      </CreamBlock>

      {/* Exercise Cards List */}
      {filteredExercises.map((ex) => {
        const tenure = getRotationTenureStats(ex);
        return (
          <CreamBlock key={ex.id}>
            <View style={styles.cardTopRow}>
              <View style={styles.badgesRow}>
                <StampBadge label={ex.context} type={ex.context} />
                <StampBadge
                  label={ex.category.replace('_', ' ')}
                  type={ex.category}
                />
                <View
                  style={[
                    styles.tenureBadge,
                    {
                      borderColor: colors.inkBlack,
                      backgroundColor: ex.inRotation
                        ? colors.recessedSurface
                        : colors.cardSurface,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: typography.fontMonoBold,
                      fontSize: 10,
                      color: colors.inkBlack,
                    }}
                  >
                    {ex.inRotation
                      ? `IN ROTATION • ${tenure.currentStreakLabel}`
                      : `VAULTED • ${tenure.currentStreakLabel}`}
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  fontFamily: typography.fontMonoBold,
                  fontSize: 12,
                  color: colors.inkBlack,
                }}
              >
                {ex.durationMinutes}m • ♩{ex.currentBpm}
              </Text>
            </View>

            <Text
              style={[
                styles.cardTitle,
                { fontFamily: typography.fontHeading, color: colors.inkBlack },
              ]}
            >
              {ex.title}
            </Text>

            <Text
              style={[
                styles.cardDesc,
                { fontFamily: typography.fontMono, color: colors.inkMuted },
              ]}
            >
              {ex.description}
            </Text>

            <View style={styles.metaStatsRow}>
              <Text
                style={{
                  fontFamily: typography.fontMono,
                  fontSize: 11,
                  color: colors.inkMuted,
                }}
              >
                Intensity {ex.intensity}/5 • Priority {ex.basePriority}/10
                {ex.isKeyBased ? ` • Keys ${ex.masteredKeys.length}/12` : ''}
              </Text>
            </View>

            <View style={[styles.cardActions, { borderTopColor: colors.recessedSurface }]}>
              <StampButton
                label="▶ SHED NOW"
                variant="primary"
                size="sm"
                onPress={() => onSelectExercise(ex)}
              />
              <StampButton
                label={ex.inRotation ? 'ARCHIVE TO VAULT' : 'PUT IN ROTATION'}
                variant="tertiary"
                size="sm"
                onPress={() => handleToggleRotation(ex)}
              />
              <StampButton
                label="EDIT"
                variant="tertiary"
                size="sm"
                onPress={() => openEditModal(ex)}
              />
              <StampButton
                label="✕"
                variant="alert"
                size="sm"
                onPress={() => handleDeleteExercise(ex.id)}
              />
            </View>
          </CreamBlock>
        );
      })}

      {/* Add / Edit Exercise Modal */}
      <Modal visible={showEditorModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              { backgroundColor: colors.cardSurface, borderColor: colors.inkBlack },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { fontFamily: typography.fontDisplay, color: colors.inkBlack },
              ]}
            >
              {editingExerciseId ? 'EDIT EXERCISE' : 'NEW EXERCISE'}
            </Text>

            <TextInput
              placeholder="Exercise title (e.g. Drop 2 Voicings)"
              placeholderTextColor={colors.inkMuted}
              value={titleInput}
              onChangeText={setTitleInput}
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

            <TextInput
              placeholder="Description / focus notes..."
              placeholderTextColor={colors.inkMuted}
              value={descInput}
              onChangeText={setDescInput}
              multiline
              style={[
                styles.modalInput,
                {
                  height: 64,
                  fontFamily: typography.fontMono,
                  borderColor: colors.inkBlack,
                  backgroundColor: colors.cardSurface,
                  color: colors.textDark,
                },
              ]}
            />

            {/* Context Toggle */}
            <Text style={[styles.fieldLabel, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
              CONTEXT:
            </Text>
            <View style={styles.optionRow}>
              {(['SOLOING', 'COMPING'] as const).map((ctx) => (
                <Pressable
                  key={ctx}
                  onPress={() => setContextInput(ctx)}
                  style={[
                    styles.optionPill,
                    {
                      borderColor: colors.inkBlack,
                      backgroundColor:
                        contextInput === ctx ? colors.primary : colors.recessedSurface,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: typography.fontStamp,
                      fontSize: 11,
                      color: contextInput === ctx ? colors.cardSurface : colors.inkBlack,
                    }}
                  >
                    {ctx}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Category Toggle */}
            <Text style={[styles.fieldLabel, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
              CATEGORY:
            </Text>
            <View style={styles.optionRow}>
              {(['NEW_CONCEPT', 'TRANSCRIBING', 'MAINTENANCE'] as const).map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategoryInput(cat)}
                  style={[
                    styles.optionPill,
                    {
                      borderColor: colors.inkBlack,
                      backgroundColor:
                        categoryInput === cat ? colors.secondary : colors.recessedSurface,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: typography.fontStamp,
                      fontSize: 10,
                      color: categoryInput === cat ? colors.cardSurface : colors.inkBlack,
                    }}
                  >
                    {cat.replace('_', ' ')}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Numeric Inputs Row */}
            <View style={styles.numericRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
                  MINUTES:
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={durationInput}
                  onChangeText={setDurationInput}
                  style={[
                    styles.modalInput,
                    {
                      fontFamily: typography.fontMonoBold,
                      borderColor: colors.inkBlack,
                      color: colors.textDark,
                    },
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
                  BPM:
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={bpmInput}
                  onChangeText={setBpmInput}
                  style={[
                    styles.modalInput,
                    {
                      fontFamily: typography.fontMonoBold,
                      borderColor: colors.inkBlack,
                      color: colors.textDark,
                    },
                  ]}
                />
              </View>
            </View>

            {/* 12-Key & Rotation Checkboxes */}
            <View style={styles.optionRow}>
              <Pressable
                onPress={() => setIsKeyBasedInput(!isKeyBasedInput)}
                style={[
                  styles.optionPill,
                  {
                    borderColor: colors.inkBlack,
                    backgroundColor: isKeyBasedInput
                      ? colors.tertiary
                      : colors.recessedSurface,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: typography.fontStamp,
                    fontSize: 10,
                    color: isKeyBasedInput ? colors.cardSurface : colors.inkBlack,
                  }}
                >
                  {isKeyBasedInput ? '✓ 12-KEY TRACKED' : 'NO KEY GRID'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setInRotationInput(!inRotationInput)}
                style={[
                  styles.optionPill,
                  {
                    borderColor: colors.inkBlack,
                    backgroundColor: inRotationInput
                      ? colors.primary
                      : colors.recessedSurface,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: typography.fontStamp,
                    fontSize: 10,
                    color: inRotationInput ? colors.cardSurface : colors.inkBlack,
                  }}
                >
                  {inRotationInput ? '✓ IN ROTATION' : 'VAULT ARCHIVE'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <StampButton
                label="CANCEL"
                variant="tertiary"
                size="sm"
                onPress={() => setShowEditorModal(false)}
              />
              <StampButton
                label="SAVE TO DB"
                variant="primary"
                size="sm"
                onPress={handleSaveExercise}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Add Modal */}
      <Modal visible={showBulkModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              { backgroundColor: colors.cardSurface, borderColor: colors.inkBlack },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { fontFamily: typography.fontDisplay, color: colors.inkBlack },
              ]}
            >
              BULK ADD EXERCISES
            </Text>
            <Text
              style={{
                fontFamily: typography.fontMono,
                fontSize: 11,
                color: colors.inkMuted,
                marginBottom: 8,
              }}
            >
              One per line: Title | Description | 15m | 120bpm | #soloing | #maint
            </Text>

            <TextInput
              placeholder={
                'Drop 3 Shells | Voice leading on strings 2-3-4-6 | 15m | 110bpm | #comping\\nGiant Steps Matrix | Digital patterns | 20m | 150bpm | #soloing'
              }
              placeholderTextColor={colors.inkMuted}
              value={bulkRawText}
              onChangeText={setBulkRawText}
              multiline
              style={[
                styles.modalInput,
                {
                  height: 120,
                  fontFamily: typography.fontMono,
                  borderColor: colors.inkBlack,
                  backgroundColor: colors.cardSurface,
                  color: colors.textDark,
                },
              ]}
            />

            <View style={styles.modalActions}>
              <StampButton
                label="CANCEL"
                variant="tertiary"
                size="sm"
                onPress={() => setShowBulkModal(false)}
              />
              <StampButton
                label="ADD ALL TO DB"
                variant="primary"
                size="sm"
                onPress={handleBulkIngest}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Cloud Database Connection Modal */}
      <Modal visible={showCloudModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: colors.cardSurface,
                borderColor: colors.inkBlack,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                {
                  fontFamily: typography.fontDisplay,
                  color: colors.inkBlack,
                },
              ]}
            >
              DATABASE CONNECTION
            </Text>
            <Text
              style={{
                fontFamily: typography.fontMono,
                fontSize: 12,
                color: colors.inkMuted,
                marginBottom: 12,
                lineHeight: 16,
              }}
            >
              Enter your Supabase credentials once to enable realtime cross-device syncing between phone and computer.
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
                padding: 8,
                backgroundColor: colors.recessedSurface,
                borderWidth: 1,
                borderColor: colors.inkBlack,
              }}
            >
              <Text style={{ fontFamily: typography.fontStamp, fontSize: 11, color: colors.inkBlack }}>
                STATUS:
              </Text>
              <Text
                style={{
                  fontFamily: typography.fontStamp,
                  fontSize: 11,
                  color:
                    syncStatus === 'connected'
                      ? colors.primary
                      : syncStatus === 'syncing'
                      ? colors.tertiary
                      : colors.inkMuted,
                }}
              >
                {syncStatus === 'connected'
                  ? '● CONNECTED (REALTIME ACTIVE)'
                  : syncStatus === 'syncing'
                  ? '↻ SYNCING WITH SUPABASE'
                  : '○ OFFLINE / CACHED LOCALLY'}
              </Text>
            </View>

            <Text
              style={[
                styles.fieldLabel,
                { fontFamily: typography.fontStamp, color: colors.inkBlack },
              ]}
            >
              EXPO_PUBLIC_SUPABASE_URL:
            </Text>
            <TextInput
              placeholder="https://xyzcompany.supabase.co"
              placeholderTextColor={colors.inkMuted}
              value={cloudUrl}
              onChangeText={setCloudUrl}
              autoCapitalize="none"
              autoCorrect={false}
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

            <Text
              style={[
                styles.fieldLabel,
                { fontFamily: typography.fontStamp, color: colors.inkBlack, marginTop: 4 },
              ]}
            >
              EXPO_PUBLIC_SUPABASE_ANON_KEY:
            </Text>
            <TextInput
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              placeholderTextColor={colors.inkMuted}
              value={cloudKey}
              onChangeText={setCloudKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
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

            <View style={styles.modalActions}>
              <StampButton
                label="CANCEL"
                variant="tertiary"
                onPress={() => setShowCloudModal(false)}
              />
              <StampButton
                label="SAVE & CONNECT"
                variant="primary"
                onPress={handleSaveCloudConfig}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statusPill: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  filterTab: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tenureBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cardTitle: {
    fontSize: 17,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  metaStatsRow: {
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    borderWidth: 3,
    padding: 16,
  },
  modalTitle: {
    fontSize: 19,
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1.5,
    padding: 8,
    fontSize: 13,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 4,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  optionPill: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numericRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
});