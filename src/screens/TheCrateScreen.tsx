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
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
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
  setExerciseHomework,
  resolveHomeworkDecision,
} from '../db/repository';
import {
  getRotationTenureStats,
  getHomeworkStats,
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

type RotationFilter = 'ALL' | 'IN_ROTATION' | 'VAULT' | 'HOMEWORK';
type ContextFilter = 'ALL' | MusicalContext;

export const TheCrateScreen: React.FC<TheCrateScreenProps> = ({
  onSelectExercise,
  onRefreshQueue,
}) => {
  const { colors, typography } = useTheme();
  const { isDesktop } = useResponsiveLayout();

  const [exercises, setExercises] = useState<Exercise[]>(() => getAllVaultExercises());
  const [rotationFilter, setRotationFilter] = useState<RotationFilter>('ALL');
  const [contextFilter, setContextFilter] = useState<ContextFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncConnectionStatus>(() => getSyncStatus());

  // Editor Modal State
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [contextInput, setContextInput] = useState<MusicalContext>('SOLOING');
  const [categoryInput, setCategoryInput] = useState<ExerciseCategory>('NEW_CONCEPT');
  const [durationInput, setDurationInput] = useState('15');
  const [bpmInput, setBpmInput] = useState('120');
  const [isKeyBasedInput, setIsKeyBasedInput] = useState(true);
  const [inRotationInput, setInRotationInput] = useState(true);
  const [isHomeworkInput, setIsHomeworkInput] = useState(false);

  // Bulk Ingest Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRawText, setBulkRawText] = useState('');

  // Cloud Database Modal State
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [cloudUrl, setCloudUrl] = useState('');
  const [cloudKey, setCloudKey] = useState('');

  // Refresh exercises from database
  const reloadExercises = useCallback(() => {
    setExercises(getAllVaultExercises());
  }, []);

  // Listen to cloud status changes & external sync updates
  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
      reloadExercises();
    });
    return () => {
      unsubscribe();
    };
  }, [reloadExercises]);

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
      reloadExercises();
      onRefreshQueue();
    }
  };

  const syncAfterMutation = () => {
    reloadExercises();
    onRefreshQueue();
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
    setIsKeyBasedInput(true);
    setInRotationInput(true);
    setIsHomeworkInput(false);
    setShowEditorModal(true);
  };

  const openEditModal = (ex: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingExerciseId(ex.id);
    setTitleInput(ex.title);
    setDescInput(ex.description || '');
    setContextInput(ex.context);
    setCategoryInput(ex.category);
    setDurationInput(String(ex.durationMinutes));
    setBpmInput(String(ex.currentBpm));
    setIsKeyBasedInput(ex.isKeyBased);
    setInRotationInput(ex.inRotation);
    setIsHomeworkInput(Boolean(ex.isHomework));
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
        intensity: 3,
        basePriority: 5,
        currentBpm: parsedBpm,
        isKeyBased: isKeyBasedInput,
        usesActiveStandard,
        isHomework: isHomeworkInput,
        homeworkStartedAt: isHomeworkInput ? (editingExerciseId ? (exercises.find(e => e.id === editingExerciseId)?.homeworkStartedAt || new Date().toISOString()) : new Date().toISOString()) : null,
      });
      toggleExerciseRotation(editingExerciseId, isHomeworkInput ? true : inRotationInput);
    } else {
      addExercise({
        title: cleanTitle,
        description: descInput.trim() || 'Custom practice drill',
        context: contextInput,
        category: categoryInput,
        inRotation: inRotationInput,
        durationMinutes: parsedDuration,
        intensity: 3,
        basePriority: 5,
        currentBpm: parsedBpm,
        isKeyBased: isKeyBasedInput,
        masteredKeys: [],
        usesActiveStandard,
        lastPracticedAt: null,
        skippedCount: 0,
        rotationChangedAt: new Date().toISOString(),
        accumulatedInRotationMs: 0,
        accumulatedOutRotationMs: 0,
        isHomework: isHomeworkInput,
        homeworkStartedAt: isHomeworkInput ? new Date().toISOString() : null,
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

  const handleHomeworkDecision = (id: string, decision: 'keep' | 'vault') => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resolveHomeworkDecision(id, decision);
    syncAfterMutation();
  };

  const handleToggleHomework = (ex: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExerciseHomework(ex.id, !ex.isHomework);
    syncAfterMutation();
  };

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      if (rotationFilter === 'IN_ROTATION' && !ex.inRotation) return false;
      if (rotationFilter === 'VAULT' && ex.inRotation) return false;
      if (rotationFilter === 'HOMEWORK' && !ex.isHomework) return false;
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
  const homeworkCount = exercises.filter((e) => e.isHomework).length;

  const renderExerciseCard = (ex: Exercise) => {
    const tenure = getRotationTenureStats(ex);
    const hwStats = getHomeworkStats(ex);
    return (
      <View key={ex.id} style={isDesktop ? styles.desktopCardCell : undefined}>
        <CreamBlock>
          <View style={styles.cardTopRow}>
            <View style={styles.badgesRow}>
              <StampBadge label={ex.context} type={ex.context} />
              <StampBadge
                label={ex.category.replace('_', ' ')}
                type={ex.category}
              />
              {ex.isHomework && (
                <View
                  style={[
                    styles.homeworkBadge,
                    {
                      borderColor: colors.inkBlack,
                      backgroundColor: hwStats.isExpired ? colors.secondary : colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: typography.fontStamp,
                      fontSize: 9,
                      color: colors.cardSurface,
                    }}
                  >
                    {hwStats.isExpired ? '⚠️ HW DUE' : `📝 HW (${hwStats.daysRemaining}D)`}
                  </Text>
                </View>
              )}
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
                    ? `ACTIVE • ${tenure.currentStreakLabel}`
                    : `IN VAULT • ${tenure.currentStreakLabel}`}
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

          {ex.isHomework && hwStats.isExpired && (
            <View
              style={[
                styles.homeworkDecisionBanner,
                { borderColor: colors.secondary, backgroundColor: colors.recessedSurface },
              ]}
            >
              <Text style={{ fontFamily: typography.fontStamp, fontSize: 11, color: colors.secondary }}>
                ⚠️ WEEKLY HOMEWORK COMPLETE (7 DAYS)
              </Text>
              <Text
                style={{
                  fontFamily: typography.fontMono,
                  fontSize: 11,
                  color: colors.inkBlack,
                  marginVertical: 4,
                  lineHeight: 15,
                }}
              >
                1-week homework period finished. Keep in rotation or move to vault?
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <StampButton
                    label="📥 TO VAULT"
                    variant="tertiary"
                    size="sm"
                    onPress={() => handleHomeworkDecision(ex.id, 'vault')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <StampButton
                    label="✓ KEEP ACTIVE"
                    variant="primary"
                    size="sm"
                    onPress={() => handleHomeworkDecision(ex.id, 'keep')}
                  />
                </View>
              </View>
            </View>
          )}

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
              Energy {ex.intensity}/5 • Priority {ex.basePriority}/10
              {ex.isKeyBased ? ` • Keys ${ex.masteredKeys.length}/12` : ''}
            </Text>
          </View>

          <View style={[styles.cardActions, { borderTopColor: colors.recessedSurface }]}>
            <StampButton
              label="▶ PRACTICE NOW"
              variant="primary"
              size="sm"
              onPress={() => onSelectExercise(ex)}
            />
            <StampButton
              label={ex.inRotation ? 'MOVE TO VAULT' : 'MAKE ACTIVE'}
              variant="tertiary"
              size="sm"
              onPress={() => handleToggleRotation(ex)}
            />
            <StampButton
              label={ex.isHomework ? '✕ DROP HW' : '📝 SET HW'}
              variant="tertiary"
              size="sm"
              onPress={() => handleToggleHomework(ex)}
            />
            <StampButton
              label="EDIT"
              variant="tertiary"
              size="sm"
              onPress={() => openEditModal(ex)}
            />
            <StampButton
              label="DELETE"
              variant="alert"
              size="sm"
              onPress={() => handleDeleteExercise(ex.id)}
            />
          </View>
        </CreamBlock>
      </View>
    );
  };

  /* ============================================================
   * DESKTOP TWO-PANE WORKSTATION
   * ============================================================ */
  if (isDesktop) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.canvasBg }]}
        contentContainerStyle={styles.desktopScrollContent}
      >
        <View style={styles.desktopWorkspace}>
          {/* Header Banner */}
          <CreamBlock>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.title,
                    { fontFamily: typography.fontDisplay, color: colors.inkBlack },
                  ]}
                >
                  PRACTICE VAULT
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { fontFamily: typography.fontMono, color: colors.inkMuted },
                  ]}
                >
                  {inRotationCount} Active • {vaultCount} Saved in Vault • {exercises.length} Total Drills
                </Text>
              </View>

              {/* Live Database Status Indicator */}
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
          </CreamBlock>

          <View style={styles.desktopCrateBody}>
            {/* Left Filter & Action Rail */}
            <View style={styles.desktopFilterRail}>
              <CreamBlock>
                <Text style={[styles.railLabel, { fontFamily: typography.fontStamp, color: colors.inkMuted }]}>
                  ACTIONS
                </Text>
                <View style={{ gap: 8, marginBottom: 16 }}>
                  <StampButton
                    label="+ NEW EXERCISE"
                    variant="primary"
                    size="sm"
                    onPress={openCreateModal}
                  />
                  <StampButton
                    label="⚡ ADD MULTIPLE"
                    variant="tertiary"
                    size="sm"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowBulkModal(true);
                    }}
                  />
                </View>

                <Text style={[styles.railLabel, { fontFamily: typography.fontStamp, color: colors.inkMuted }]}>
                  ROTATION STATUS
                </Text>
                <View style={styles.railGroup}>
                  {(
                    [
                      { id: 'ALL', label: `ALL (${exercises.length})` },
                      { id: 'IN_ROTATION', label: `ACTIVE (${inRotationCount})` },
                      { id: 'VAULT', label: `VAULT (${vaultCount})` },
                      { id: 'HOMEWORK', label: `HOMEWORK (${homeworkCount})` },
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
                        styles.railBtn,
                        {
                          borderColor: colors.inkBlack,
                          backgroundColor:
                            rotationFilter === tab.id ? colors.primary : colors.cardSurface,
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

                <Text style={[styles.railLabel, { fontFamily: typography.fontStamp, color: colors.inkMuted, marginTop: 12 }]}>
                  MUSICAL CONTEXT
                </Text>
                <View style={styles.railGroup}>
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
                        styles.railBtn,
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
                          fontSize: 11,
                          color: contextFilter === ctx ? colors.cardSurface : colors.inkBlack,
                        }}
                      >
                        {ctx}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </CreamBlock>
            </View>

            {/* Right Pane: Search Bar & Cards Grid */}
            <View style={{ flex: 1 }}>
              <TextInput
                placeholder="Search tunes, licks, or concepts..."
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

              <View style={styles.desktopCardsGrid}>
                {filteredExercises.map(renderExerciseCard)}
              </View>
            </View>
          </View>
        </View>

        {/* Editor Modal */}
        {renderEditorModal()}
        {/* Bulk Add Modal */}
        {renderBulkModal()}
        {/* Cloud Modal */}
        {renderCloudModal()}
      </ScrollView>
    );
  }

  function renderEditorModal() {
    return (
      <Modal visible={showEditorModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              isDesktop && styles.modalBoxDesktop,
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
                  {isKeyBasedInput ? '✓ TRACK ALL 12 KEYS' : 'NO KEY TRACKING'}
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
                  {inRotationInput ? '✓ ACTIVE IN PLAN' : 'SAVE TO VAULT'}
                </Text>
              </Pressable>
            </View>

            {/* Weekly Homework Toggle */}
            <View style={styles.optionRow}>
              <Pressable
                onPress={() => {
                  const nextVal = !isHomeworkInput;
                  setIsHomeworkInput(nextVal);
                  if (nextVal) {
                    setInRotationInput(true);
                  }
                }}
                style={[
                  styles.optionPill,
                  {
                    borderColor: colors.inkBlack,
                    backgroundColor: isHomeworkInput
                      ? colors.secondary
                      : colors.recessedSurface,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: typography.fontStamp,
                    fontSize: 10,
                    color: isHomeworkInput ? colors.cardSurface : colors.inkBlack,
                  }}
                >
                  {isHomeworkInput
                    ? '✓ WEEKLY HOMEWORK (7 DAYS HIGH URGENCY)'
                    : 'REGULAR EXERCISE'}
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
                label="SAVE EXERCISE"
                variant="primary"
                size="sm"
                onPress={handleSaveExercise}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function renderBulkModal() {
    return (
      <Modal visible={showBulkModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              isDesktop && styles.modalBoxDesktop,
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
                'Drop 3 Shells | Voice leading on strings 2-3-4-6 | 15m | 110bpm | #comping\nGiant Steps Matrix | Digital patterns | 20m | 150bpm | #soloing'
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
                label="ADD EXERCISES"
                variant="primary"
                size="sm"
                onPress={handleBulkIngest}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function renderCloudModal() {
    return (
      <Modal visible={showCloudModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              isDesktop && styles.modalBoxDesktop,
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
                  ? '● CLOUD SAVED'
                  : syncStatus === 'syncing'
                  ? '↻ SYNCING'
                  : '○ SAVED ON DEVICE'}
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
    );
  }

  /* ============================================================
   * MOBILE SINGLE-COLUMN STACK
   * ============================================================ */
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
              PRACTICE VAULT
            </Text>
            <Text
              style={[
                styles.subtitle,
                { fontFamily: typography.fontMono, color: colors.inkMuted },
              ]}
            >
              {inRotationCount} Active • {vaultCount} Saved in Vault
            </Text>
          </View>

          {/* Live Database Status Indicator */}
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
              label="⚡ ADD MULTIPLE"
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
          placeholder="Search exercises..."
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
              { id: 'IN_ROTATION', label: `ACTIVE (${inRotationCount})` },
              { id: 'VAULT', label: `VAULT (${vaultCount})` },
              { id: 'HOMEWORK', label: `HW (${homeworkCount})` },
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
      {filteredExercises.map(renderExerciseCard)}

      {/* Modals */}
      {renderEditorModal()}
      {renderBulkModal()}
      {renderCloudModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 14,
  },
  /* Desktop Layout Styles */
  desktopScrollContent: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  desktopWorkspace: {
    width: '100%',
    maxWidth: 1240,
  },
  desktopCrateBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    marginTop: 10,
  },
  desktopFilterRail: {
    width: 270,
  },
  railLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 6,
    marginTop: 4,
  },
  railGroup: {
    gap: 6,
    marginBottom: 12,
  },
  railBtn: {
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  desktopCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  desktopCardCell: {
    width: '49%',
    marginBottom: 10,
  },
  /* Mobile & Shared Styles */
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
  homeworkBadge: {
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  homeworkDecisionBanner: {
    borderWidth: 2,
    padding: 8,
    marginBottom: 8,
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
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    borderWidth: 3,
    padding: 16,
  },
  modalBoxDesktop: {
    maxWidth: 560,
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
