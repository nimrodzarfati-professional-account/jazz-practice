import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  Pressable,
  Share,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { Exercise, MusicalContext, ExerciseCategory } from '../types/models';
import { CreamBlock } from '../components/CreamBlock';
import { StampButton } from '../components/StampButton';
import { StampBadge } from '../components/StampBadge';
import {
  getAllVaultExercises,
  toggleExerciseRotation,
  addExercise,
  bulkAddExercises,
  updateExerciseDetails,
  deleteExercise,
  exportVaultData,
  importVaultData,
} from '../db/repository';
import {
  getRotationTenureStats,
  parseBulkExercisesInput,
  BulkDefaults,
} from '../services/CrateUtils';

interface TheCrateScreenProps {
  onSelectExercise: (exercise: Exercise) => void;
  onRefreshQueue: () => void;
}

const SAMPLE_BULK_PACK = `Drop 3 Shell Voicings | Smooth voice leading on strings 2-3-4-6 | 20m | 110bpm | int:2
Giant Steps Digital Patterns | 1-2-3-5 permutations | 15m | 160bpm | int:5 | #soloing
Barry Harris 6th Diminished | Harmonized movement on dominant chords | 15m | 110bpm | #soloing | #concept
Charleston Comping Variations | Syncopated anticipation drills | 10m | 140bpm | int:2 | #comping | #maint`;

export const TheCrateScreen: React.FC<TheCrateScreenProps> = ({
  onSelectExercise,
  onRefreshQueue,
}) => {
  const { colors, typography } = useTheme();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRotationFilter, setSelectedRotationFilter] = useState<'ALL' | 'ACTIVE' | 'VAULT'>('ALL');
  const [selectedContext, setSelectedContext] = useState<'ALL' | MusicalContext>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ExerciseCategory>('ALL');

  // Collapsible Index Cards Expanded State
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  // Unified Ingest Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'SINGLE' | 'BULK' | 'SYNC'>('SINGLE');
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  // Sync / Backup State
  const [syncExportJson, setSyncExportJson] = useState('');
  const [syncImportJson, setSyncImportJson] = useState('');
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Single Drill Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formContext, setFormContext] = useState<MusicalContext>('SOLOING');
  const [formCategory, setFormCategory] = useState<ExerciseCategory>('NEW_CONCEPT');
  const [formDuration, setFormDuration] = useState('15');
  const [formIntensity, setFormIntensity] = useState('3');
  const [formPriority, setFormPriority] = useState('7');
  const [formBpm, setFormBpm] = useState('120');
  const [formIsKeyBased, setFormIsKeyBased] = useState(true);

  // Bulk Paste State
  const [bulkRawText, setBulkRawText] = useState('');
  const [bulkContext, setBulkContext] = useState<MusicalContext>('SOLOING');
  const [bulkCategory, setBulkCategory] = useState<ExerciseCategory>('NEW_CONCEPT');
  const [bulkDuration, setBulkDuration] = useState('15');
  const [bulkIntensity, setBulkIntensity] = useState('3');
  const [bulkBpm, setBulkBpm] = useState('120');
  const [bulkIsKeyBased, setBulkIsKeyBased] = useState(true);
  const [bulkInRotation, setBulkInRotation] = useState(true);

  const loadData = () => {
    const list = getAllVaultExercises();
    setExercises(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingExerciseId(null);
    setModalMode('SINGLE');
    setFormTitle('');
    setFormDesc('');
    setFormContext('SOLOING');
    setFormCategory('NEW_CONCEPT');
    setFormDuration('15');
    setFormIntensity('3');
    setFormPriority('7');
    setFormBpm('120');
    setFormIsKeyBased(true);
    setBulkRawText('');
    setShowModal(true);
  };

  const openEditModal = (ex: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingExerciseId(ex.id);
    setModalMode('SINGLE');
    setFormTitle(ex.title);
    setFormDesc(ex.description);
    setFormContext(ex.context);
    setFormCategory(ex.category);
    setFormDuration(String(ex.durationMinutes));
    setFormIntensity(String(ex.intensity));
    setFormPriority(String(ex.basePriority));
    setFormBpm(String(ex.currentBpm));
    setFormIsKeyBased(ex.isKeyBased);
    setShowModal(true);
  };

  const toggleCardExpansion = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCardIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleToggleRotation = (id: string, currentStatus: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleExerciseRotation(id, !currentStatus);
    loadData();
    onRefreshQueue();
  };

  const handleDelete = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteExercise(id);
    loadData();
    onRefreshQueue();
  };

  const handleSaveSingleExercise = () => {
    if (!formTitle.trim()) return;

    const payload = {
      title: formTitle.trim(),
      description: formDesc.trim() || 'Custom shed routine',
      context: formContext,
      category: formCategory,
      durationMinutes: Math.max(5, parseInt(formDuration, 10) || 15),
      intensity: Math.max(1, Math.min(5, parseInt(formIntensity, 10) || 3)),
      basePriority: Math.max(1, Math.min(10, parseInt(formPriority, 10) || 5)),
      currentBpm: Math.max(40, parseInt(formBpm, 10) || 120),
      isKeyBased: formIsKeyBased,
      usesActiveStandard: formCategory === 'MAINTENANCE',
    };

    if (editingExerciseId) {
      updateExerciseDetails(editingExerciseId, payload);
    } else {
      addExercise({
        ...payload,
        inRotation: true,
        masteredKeys: [],
        lastPracticedAt: null,
        skippedCount: 0,
        rotationChangedAt: new Date().toISOString(),
        accumulatedInRotationMs: 0,
        accumulatedOutRotationMs: 0,
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    loadData();
    onRefreshQueue();
  };

  const bulkDefaults: BulkDefaults = useMemo(
    () => ({
      context: bulkContext,
      category: bulkCategory,
      inRotation: bulkInRotation,
      durationMinutes: Math.max(5, parseInt(bulkDuration, 10) || 15),
      intensity: Math.max(1, Math.min(5, parseInt(bulkIntensity, 10) || 3)),
      currentBpm: Math.max(40, parseInt(bulkBpm, 10) || 120),
      isKeyBased: bulkIsKeyBased,
    }),
    [bulkContext, bulkCategory, bulkInRotation, bulkDuration, bulkIntensity, bulkBpm, bulkIsKeyBased]
  );

  const parsedBulkItems = useMemo(
    () => parseBulkExercisesInput(bulkRawText, bulkDefaults),
    [bulkRawText, bulkDefaults]
  );

  const handleSaveBulkExercises = () => {
    if (parsedBulkItems.length === 0) return;

    bulkAddExercises(parsedBulkItems);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBulkRawText('');
    setShowModal(false);
    loadData();
    onRefreshQueue();
  };

  const handleOpenSync = () => {
    setModalMode('SYNC');
    const json = exportVaultData();
    setSyncExportJson(json);
    setSyncStatusMsg(null);
  };

  const handleCopyExport = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(syncExportJson);
        setSyncStatusMsg({ text: `✓ Copied ${exercises.length} drills to clipboard!`, isError: false });
        return;
      } catch {}
    }
    try {
      await Share.share({
        title: 'Jazz Practice Shed Engine Repertoire Backup',
        message: syncExportJson,
      });
      setSyncStatusMsg({ text: `✓ Backup ready to share/copy!`, isError: false });
    } catch {
      setSyncStatusMsg({ text: 'Select and copy the JSON text below', isError: false });
    }
  };

  const handleRunImport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = importVaultData(syncImportJson);
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSyncStatusMsg({ text: `✓ Successfully imported & restored ${result.count} drills!`, isError: false });
      loadData();
      onRefreshQueue();
      setSyncImportJson('');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSyncStatusMsg({ text: `✗ ${result.error}`, isError: true });
    }
  };

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch =
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRotation =
      selectedRotationFilter === 'ALL' ||
      (selectedRotationFilter === 'ACTIVE' && ex.inRotation) ||
      (selectedRotationFilter === 'VAULT' && !ex.inRotation);

    const matchesContext =
      selectedContext === 'ALL' || ex.context === selectedContext;

    const matchesCategory =
      selectedCategory === 'ALL' || ex.category === selectedCategory;

    return matchesSearch && matchesRotation && matchesContext && matchesCategory;
  });

  const rotationCount = exercises.filter((e) => e.inRotation).length;
  const vaultedCount = exercises.length - rotationCount;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.canvasBg }]}>
      {/* Header Banner — Zero extra buttons added */}
      <View
        style={[
          styles.headerBanner,
          { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
        ]}
      >
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.headerSub, { fontFamily: typography.fontStamp, color: colors.primary }]}>
            THE TUNE CRATE // ARCHIVE & REPERTOIRE
          </Text>
          <Text style={[styles.headerTitle, { fontFamily: typography.fontDisplay, color: colors.inkBlack }]}>
            VAULT CATALOG
          </Text>
          <Text style={[styles.statLine, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
            {rotationCount} IN ROTATION • {exercises.length} TOTAL IN VAULT
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <StampButton
            label="⇄ SYNC"
            variant="tertiary"
            size="sm"
            onPress={() => {
              openAddModal();
              handleOpenSync();
            }}
          />
          <StampButton
            label="+ INGEST"
            variant="primary"
            size="sm"
            onPress={openAddModal}
          />
        </View>
      </View>

      {/* Search Input */}
      <View style={[styles.searchBox, { backgroundColor: colors.cardSurface, borderColor: colors.inkBlack }]}>
        <TextInput
          placeholder="SEARCH TUNES, LICKS, OR CONCEPTS..."
          placeholderTextColor={colors.inkMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { fontFamily: typography.fontMono, color: colors.inkBlack }]}
        />
      </View>

      {/* Compact 2-Tier Filter Strip */}
      <View style={styles.filterStripContainer}>
        {/* Tier 1: Rotation Status Filter */}
        <View style={styles.filterRow}>
          {[
            { key: 'ALL', label: `ALL (${exercises.length})` },
            { key: 'ACTIVE', label: `ACTIVE (${rotationCount})` },
            { key: 'VAULT', label: `VAULT (${vaultedCount})` },
          ].map((item) => (
            <Pressable
              key={item.key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedRotationFilter(item.key as any);
              }}
              style={[
                styles.filterTab,
                {
                  borderColor: colors.inkBlack,
                  backgroundColor:
                    selectedRotationFilter === item.key ? colors.primary : colors.cardSurface,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  {
                    fontFamily: typography.fontStamp,
                    color:
                      selectedRotationFilter === item.key ? colors.cardSurface : colors.inkBlack,
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tier 2: Focus & Category Sub-Filters */}
        <View style={styles.subFilterRow}>
          <View style={styles.contextPillGroup}>
            {(['ALL', 'SOLOING', 'COMPING'] as const).map((ctx) => (
              <Pressable
                key={ctx}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedContext(ctx);
                }}
                style={[
                  styles.subFilterPill,
                  {
                    borderColor: colors.inkBlack,
                    backgroundColor:
                      selectedContext === ctx ? colors.secondary : colors.recessedSurface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.subFilterText,
                    {
                      fontFamily: typography.fontStamp,
                      color: selectedContext === ctx ? colors.cardSurface : colors.inkBlack,
                    },
                  ]}
                >
                  {ctx}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.categoryPillGroup}>
            {[
              { key: 'ALL', label: 'ALL CAT' },
              { key: 'NEW_CONCEPT', label: 'NEW' },
              { key: 'TRANSCRIBING', label: 'TRANS' },
              { key: 'MAINTENANCE', label: 'MAINT' },
            ].map((cat) => (
              <Pressable
                key={cat.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(cat.key as any);
                }}
                style={[
                  styles.subFilterPill,
                  {
                    borderColor: colors.inkBlack,
                    backgroundColor:
                      selectedCategory === cat.key ? colors.tertiary : colors.recessedSurface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.subFilterText,
                    {
                      fontFamily: typography.fontStamp,
                      color: selectedCategory === cat.key ? colors.cardSurface : colors.inkBlack,
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* De-Cluttered Collapsible Index Cards */}
      {filteredExercises.map((ex) => {
        const stats = getRotationTenureStats(ex);
        const isExpanded = !!expandedCardIds[ex.id];

        return (
          <CreamBlock key={ex.id}>
            {/* Row 1: Badges on Left, Rotation Stamp with Integrated Streak on Right */}
            <View style={styles.cardRow1}>
              <View style={styles.badgeGroup}>
                <StampBadge label={ex.context} type={ex.context} />
                <StampBadge label={ex.category.replace('_', ' ')} type={ex.category} />

                {ex.usesActiveStandard && (
                  <View style={[styles.standardBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.badgeText, { fontFamily: typography.fontStamp, color: colors.cardSurface }]}>
                      BOUND TO STD
                    </Text>
                  </View>
                )}
              </View>

              {/* Inline Rotation Stamp with Live Tenure */}
              <Pressable
                onPress={() => handleToggleRotation(ex.id, ex.inRotation)}
                style={[
                  styles.rotationStamp,
                  {
                    backgroundColor: ex.inRotation ? colors.secondary : colors.cardSurface,
                    borderColor: colors.inkBlack,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rotationStampText,
                    {
                      fontFamily: typography.fontStamp,
                      color: ex.inRotation ? colors.cardSurface : colors.inkBlack,
                    },
                  ]}
                >
                  {ex.inRotation
                    ? `IN ROTATION • ${stats.currentStreakLabel} ✓`
                    : `VAULTED • ${stats.currentStreakLabel}`}
                </Text>
              </Pressable>
            </View>

            {/* Row 2: Drill Title + 1-Tap Quick Shed Action */}
            <View style={styles.cardRow2}>
              <Text
                style={[
                  styles.drillTitle,
                  { fontFamily: typography.fontDisplay, color: colors.inkBlack, flex: 1 },
                ]}
                numberOfLines={isExpanded ? undefined : 2}
              >
                {ex.title}
              </Text>
              <View style={{ marginLeft: 8 }}>
                <StampButton
                  label="▶ SHED"
                  variant="primary"
                  size="sm"
                  onPress={() => onSelectExercise(ex)}
                />
              </View>
            </View>

            {/* Row 3: Compact Single-Line Telemetry Bar + Expandable Indicator */}
            <Pressable onPress={() => toggleCardExpansion(ex.id)} style={styles.cardRow3}>
              <Text style={[styles.telemetryText, { fontFamily: typography.fontMono, color: colors.inkBlack }]}>
                ⏱ {ex.durationMinutes}m • ⚡ {ex.intensity}/5 • ♩ {ex.currentBpm} BPM
                {ex.isKeyBased ? ` • KEYS ${ex.masteredKeys.length}/12` : ''}
              </Text>
              <Text style={[styles.detailsToggleText, { fontFamily: typography.fontStamp, color: colors.primary }]}>
                [ {isExpanded ? 'DETAILS ▲' : 'DETAILS ▼'} ]
              </Text>
            </Pressable>

            {/* Expanded Drawer: Full Description, Rotation Ledger Box & Accidental-Safe Actions */}
            {isExpanded && (
              <View style={[styles.expandedDrawer, { borderTopColor: colors.recessedSurface }]}>
                <Text style={[styles.expandedDesc, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
                  {ex.description}
                </Text>

                {/* Rotation Ledger Box: Active Time vs. Vault Time Telemetry */}
                <View
                  style={[
                    styles.ledgerBox,
                    { backgroundColor: colors.recessedSurface, borderColor: colors.inkBlack },
                  ]}
                >
                  <View style={styles.ledgerHeaderRow}>
                    <Text style={[styles.ledgerTitle, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
                      ROTATION LEDGER // LIFETIME TELEMETRY
                    </Text>
                    <Text style={[styles.ledgerRatioText, { fontFamily: typography.fontMonoBold, color: colors.secondary }]}>
                      ACTIVE RATIO: {stats.activeRatioPercent}%
                    </Text>
                  </View>

                  {/* Studio Ratio Meter Bar */}
                  <View
                    style={[
                      styles.ratioTrack,
                      { backgroundColor: colors.cardSurface, borderColor: colors.inkBlack },
                    ]}
                  >
                    <View
                      style={[
                        styles.ratioFill,
                        {
                          width: `${stats.activeRatioPercent}%`,
                          backgroundColor: colors.secondary,
                        },
                      ]}
                    />
                  </View>

                  <Text style={[styles.ledgerStatsText, { fontFamily: typography.fontMono, color: colors.inkBlack }]}>
                    ACTIVE: {stats.totalInRotationDays}d total ({stats.currentStreakDays}d streak)  //  VAULTED: {stats.totalOutRotationDays}d total
                  </Text>
                </View>

                {/* Secondary Actions Row tucked safely into drawer */}
                <View style={styles.expandedActionRow}>
                  <StampButton
                    label="✎ EDIT DRILL"
                    variant="tertiary"
                    size="sm"
                    onPress={() => openEditModal(ex)}
                  />
                  <StampButton
                    label="DELETE FROM VAULT"
                    variant="tertiary"
                    size="sm"
                    onPress={() => handleDelete(ex.id)}
                  />
                </View>
              </View>
            )}
          </CreamBlock>
        );
      })}

      {filteredExercises.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={[{ fontFamily: typography.fontDisplay, fontSize: 16, color: colors.textPrimary, textAlign: 'center' }]}>
            No drills found matching this filter.
          </Text>
        </View>
      )}

      {/* Unified Ingest Modal: [ SINGLE DRILL ] vs [ BULK PASTE ] */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardSurface, borderColor: colors.inkBlack }]}>
            {/* Top Mode Switcher (Visible only when creating new) */}
            {editingExerciseId ? (
              <Text style={[styles.modalHeader, { fontFamily: typography.fontDisplay, color: colors.inkBlack }]}>
                EDIT VAULT DRILL
              </Text>
            ) : (
              <View style={styles.modalModeSwitcher}>
                <Pressable
                  onPress={() => setModalMode('SINGLE')}
                  style={[
                    styles.modeSwitchBtn,
                    {
                      borderColor: colors.inkBlack,
                      backgroundColor:
                        modalMode === 'SINGLE' ? colors.primary : colors.recessedSurface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modeSwitchText,
                      {
                        fontFamily: typography.fontStamp,
                        color: modalMode === 'SINGLE' ? colors.cardSurface : colors.inkBlack,
                      },
                    ]}
                  >
                    [ SINGLE ]
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setModalMode('BULK')}
                  style={[
                    styles.modeSwitchBtn,
                    {
                      borderColor: colors.inkBlack,
                      backgroundColor:
                        modalMode === 'BULK' ? colors.primary : colors.recessedSurface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modeSwitchText,
                      {
                        fontFamily: typography.fontStamp,
                        color: modalMode === 'BULK' ? colors.cardSurface : colors.inkBlack,
                      },
                    ]}
                  >
                    [ BULK ]
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleOpenSync}
                  style={[
                    styles.modeSwitchBtn,
                    {
                      borderColor: colors.inkBlack,
                      backgroundColor:
                        modalMode === 'SYNC' ? colors.primary : colors.recessedSurface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modeSwitchText,
                      {
                        fontFamily: typography.fontStamp,
                        color: modalMode === 'SYNC' ? colors.cardSurface : colors.inkBlack,
                      },
                    ]}
                  >
                    [ SYNC / BACKUP ]
                  </Text>
                </Pressable>
              </View>
            )}

            {/* SINGLE DRILL FORM */}
            {modalMode === 'SINGLE' && (
              <View>
                <TextInput
                  placeholder="Drill Title (e.g. Altered Dominant Licks)"
                  placeholderTextColor={colors.inkMuted}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  style={[styles.modalInput, { fontFamily: typography.fontMono, borderColor: colors.inkBlack, backgroundColor: colors.cardSurface, color: colors.textDark }]}
                />

                <TextInput
                  placeholder="Description & musical focus..."
                  placeholderTextColor={colors.inkMuted}
                  value={formDesc}
                  onChangeText={setFormDesc}
                  multiline
                  style={[styles.modalInput, { fontFamily: typography.fontMono, borderColor: colors.inkBlack, backgroundColor: colors.cardSurface, color: colors.textDark, height: 50 }]}
                />

                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>CONTEXT:</Text>
                  <Pressable
                    onPress={() => setFormContext('SOLOING')}
                    style={[styles.smallToggle, { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface }, formContext === 'SOLOING' && { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.toggleText, { color: formContext === 'SOLOING' ? colors.cardSurface : colors.inkBlack }]}>SOLOING</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setFormContext('COMPING')}
                    style={[styles.smallToggle, { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface }, formContext === 'COMPING' && { backgroundColor: colors.tertiary }]}
                  >
                    <Text style={[styles.toggleText, { color: formContext === 'COMPING' ? colors.cardSurface : colors.inkBlack }]}>COMPING</Text>
                  </Pressable>
                </View>

                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>CATEGORY:</Text>
                  {(['NEW_CONCEPT', 'TRANSCRIBING', 'MAINTENANCE'] as const).map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setFormCategory(cat)}
                      style={[styles.smallToggle, { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface }, formCategory === cat && { backgroundColor: colors.secondary }]}
                    >
                      <Text style={[styles.toggleText, { color: formCategory === cat ? colors.cardSurface : colors.inkBlack }]}>{cat.split('_')[0]}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.modalInputsGrid}>
                  <View style={styles.inputCol}>
                    <Text style={[styles.colLabel, { color: colors.inkMuted }]}>MINUTES</Text>
                    <TextInput
                      value={formDuration}
                      onChangeText={setFormDuration}
                      keyboardType="numeric"
                      style={[styles.numericInput, { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface, color: colors.textDark }]}
                    />
                  </View>
                  <View style={styles.inputCol}>
                    <Text style={[styles.colLabel, { color: colors.inkMuted }]}>INT (1-5)</Text>
                    <TextInput
                      value={formIntensity}
                      onChangeText={setFormIntensity}
                      keyboardType="numeric"
                      style={[styles.numericInput, { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface, color: colors.textDark }]}
                    />
                  </View>
                  <View style={styles.inputCol}>
                    <Text style={[styles.colLabel, { color: colors.inkMuted }]}>BPM</Text>
                    <TextInput
                      value={formBpm}
                      onChangeText={setFormBpm}
                      keyboardType="numeric"
                      style={[styles.numericInput, { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface, color: colors.textDark }]}
                    />
                  </View>
                  <View style={styles.inputCol}>
                    <Text style={[styles.colLabel, { color: colors.inkMuted }]}>PRIORITY</Text>
                    <TextInput
                      value={formPriority}
                      onChangeText={setFormPriority}
                      keyboardType="numeric"
                      style={[styles.numericInput, { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface, color: colors.textDark }]}
                    />
                  </View>
                </View>

                <Pressable
                  onPress={() => setFormIsKeyBased(!formIsKeyBased)}
                  style={styles.keyBasedRow}
                >
                  <Text style={[styles.checkbox, { color: colors.inkBlack }]}>{formIsKeyBased ? '[✓]' : '[ ]'}</Text>
                  <Text style={[styles.keyBasedLabel, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
                    ENABLE 12-KEY CIRCLE OF FIFTHS
                  </Text>
                </Pressable>

                <View style={styles.modalActions}>
                  <StampButton
                    label="CANCEL"
                    variant="tertiary"
                    onPress={() => setShowModal(false)}
                  />
                  <StampButton
                    label={editingExerciseId ? 'UPDATE DRILL' : 'SAVE TO VAULT'}
                    variant="primary"
                    onPress={handleSaveSingleExercise}
                  />
                </View>
              </View>
            )}

            {/* BULK PASTE FORM */}
            {modalMode === 'BULK' && !editingExerciseId && (
              <View>
                <View style={styles.bulkTitleRow}>
                  <Text style={[styles.modalSubHeader, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
                    BATCH DRILL INGESTION
                  </Text>
                  <Pressable
                    onPress={() => setBulkRawText(SAMPLE_BULK_PACK)}
                    style={[styles.samplePackBtn, { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface }]}
                  >
                    <Text style={{ fontFamily: typography.fontStamp, color: colors.primary, fontSize: 10 }}>
                      + LOAD SAMPLE PACK
                    </Text>
                  </Pressable>
                </View>

                <Text style={[styles.bulkHelpText, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
                  One per line: Title | Desc | 15m | 120bpm | int:3 | #soloing
                </Text>

                <TextInput
                  placeholder={'Drop 3 Shells | Voice leading | 20m | 110bpm\nGiant Steps Patterns | 15m | #soloing'}
                  placeholderTextColor={colors.inkMuted}
                  value={bulkRawText}
                  onChangeText={setBulkRawText}
                  multiline
                  textAlignVertical="top"
                  style={[
                    styles.modalInput,
                    {
                      fontFamily: typography.fontMono,
                      borderColor: colors.inkBlack,
                      backgroundColor: colors.cardSurface,
                      color: colors.textDark,
                      height: 120,
                    },
                  ]}
                />

                {/* Batch Defaults */}
                <Text style={[styles.modalLabel, { fontFamily: typography.fontStamp, color: colors.inkBlack, marginBottom: 4 }]}>
                  BATCH DEFAULTS:
                </Text>

                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>CTX:</Text>
                  <Pressable
                    onPress={() => setBulkContext('SOLOING')}
                    style={[styles.smallToggle, { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface }, bulkContext === 'SOLOING' && { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.toggleText, { color: bulkContext === 'SOLOING' ? colors.cardSurface : colors.inkBlack }]}>SOLO</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setBulkContext('COMPING')}
                    style={[styles.smallToggle, { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface }, bulkContext === 'COMPING' && { backgroundColor: colors.tertiary }]}
                  >
                    <Text style={[styles.toggleText, { color: bulkContext === 'COMPING' ? colors.cardSurface : colors.inkBlack }]}>COMP</Text>
                  </Pressable>

                  <Text style={[styles.modalLabel, { fontFamily: typography.fontStamp, color: colors.inkBlack, marginLeft: 6 }]}>CAT:</Text>
                  {(['NEW_CONCEPT', 'TRANSCRIBING', 'MAINTENANCE'] as const).map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setBulkCategory(cat)}
                      style={[styles.smallToggle, { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface }, bulkCategory === cat && { backgroundColor: colors.secondary }]}
                    >
                      <Text style={[styles.toggleText, { color: bulkCategory === cat ? colors.cardSurface : colors.inkBlack }]}>{cat.split('_')[0]}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.modalInputsGrid}>
                  <View style={styles.inputCol}>
                    <Text style={[styles.colLabel, { color: colors.inkMuted }]}>MINS</Text>
                    <TextInput
                      value={bulkDuration}
                      onChangeText={setBulkDuration}
                      keyboardType="numeric"
                      style={[styles.numericInput, { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface, color: colors.textDark }]}
                    />
                  </View>
                  <View style={styles.inputCol}>
                    <Text style={[styles.colLabel, { color: colors.inkMuted }]}>INT (1-5)</Text>
                    <TextInput
                      value={bulkIntensity}
                      onChangeText={setBulkIntensity}
                      keyboardType="numeric"
                      style={[styles.numericInput, { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface, color: colors.textDark }]}
                    />
                  </View>
                  <View style={styles.inputCol}>
                    <Text style={[styles.colLabel, { color: colors.inkMuted }]}>BPM</Text>
                    <TextInput
                      value={bulkBpm}
                      onChangeText={setBulkBpm}
                      keyboardType="numeric"
                      style={[styles.numericInput, { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface, color: colors.textDark }]}
                    />
                  </View>
                </View>

                <View style={styles.bulkCheckboxesRow}>
                  <Pressable
                    onPress={() => setBulkInRotation(!bulkInRotation)}
                    style={styles.keyBasedRow}
                  >
                    <Text style={[styles.checkbox, { color: colors.inkBlack }]}>{bulkInRotation ? '[✓]' : '[ ]'}</Text>
                    <Text style={[styles.keyBasedLabel, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
                      START IN ROTATION
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setBulkIsKeyBased(!bulkIsKeyBased)}
                    style={styles.keyBasedRow}
                  >
                    <Text style={[styles.checkbox, { color: colors.inkBlack }]}>{bulkIsKeyBased ? '[✓]' : '[ ]'}</Text>
                    <Text style={[styles.keyBasedLabel, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
                      12-KEY FOR ALL
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.modalActions}>
                  <StampButton
                    label="CANCEL"
                    variant="tertiary"
                    onPress={() => setShowModal(false)}
                  />
                  <StampButton
                    label={`INGEST ${parsedBulkItems.length} DRILL${parsedBulkItems.length === 1 ? '' : 'S'}`}
                    variant="primary"
                    disabled={parsedBulkItems.length === 0}
                    onPress={handleSaveBulkExercises}
                  />
                </View>
              </View>
            )}

            {/* SYNC / BACKUP FORM */}
            {modalMode === 'SYNC' && !editingExerciseId && (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator>
                <Text style={[styles.bulkHelpText, { fontFamily: typography.fontMono, color: colors.inkBlack, marginBottom: 4 }]}>
                  TRANSFER REPERTOIRE (MOBILE ↔ COMPUTER)
                </Text>
                <Text style={[styles.bulkHelpText, { fontFamily: typography.fontMono, color: colors.inkMuted, marginBottom: 12, fontSize: 11 }]}>
                  Your drills are saved locally on this device. To transfer between devices:
                  {'\n'}1. Tap EXPORT on your mobile phone to copy your entire repertoire.
                  {'\n'}2. Paste it into IMPORT on your computer and tap RESTORE.
                </Text>

                {syncStatusMsg && (
                  <View style={[styles.searchBox, { padding: 8, marginBottom: 10, borderColor: colors.inkBlack, backgroundColor: syncStatusMsg.isError ? colors.secondary : colors.primary }]}>
                    <Text style={{ fontFamily: typography.fontStamp, color: colors.cardSurface, fontSize: 12 }}>
                      {syncStatusMsg.text}
                    </Text>
                  </View>
                )}

                {/* EXPORT SECTION */}
                <View style={{ marginBottom: 16, borderTopWidth: 1, borderTopColor: colors.inkMuted, paddingTop: 10 }}>
                  <Text style={[styles.modalLabel, { fontFamily: typography.fontStamp, color: colors.primary, marginBottom: 6 }]}>
                    1. EXPORT REPERTOIRE ({exercises.length} DRILLS)
                  </Text>
                  <StampButton
                    label="📋 COPY / SHARE BACKUP JSON"
                    variant="primary"
                    size="sm"
                    onPress={handleCopyExport}
                  />
                  <TextInput
                    value={syncExportJson}
                    editable={false}
                    multiline
                    selectTextOnFocus
                    style={[
                      styles.modalInput,
                      {
                        fontFamily: typography.fontMono,
                        borderColor: colors.inkBlack,
                        backgroundColor: colors.recessedSurface,
                        color: colors.inkBlack,
                        height: 70,
                        marginTop: 8,
                        fontSize: 10,
                      },
                    ]}
                  />
                </View>

                {/* IMPORT SECTION */}
                <View style={{ marginBottom: 16, borderTopWidth: 1, borderTopColor: colors.inkMuted, paddingTop: 10 }}>
                  <Text style={[styles.modalLabel, { fontFamily: typography.fontStamp, color: colors.tertiary, marginBottom: 6 }]}>
                    2. IMPORT / RESTORE ON THIS DEVICE
                  </Text>
                  <TextInput
                    placeholder="Paste exported backup JSON here..."
                    placeholderTextColor={colors.inkMuted}
                    value={syncImportJson}
                    onChangeText={setSyncImportJson}
                    multiline
                    style={[
                      styles.modalInput,
                      {
                        fontFamily: typography.fontMono,
                        borderColor: colors.inkBlack,
                        backgroundColor: colors.cardSurface,
                        color: colors.textDark,
                        height: 80,
                        fontSize: 11,
                      },
                    ]}
                  />
                  <View style={{ marginTop: 8 }}>
                    <StampButton
                      label="📥 RESTORE & SYNC REPERTOIRE"
                      variant="primary"
                      size="sm"
                      disabled={!syncImportJson.trim()}
                      onPress={handleRunImport}
                    />
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <StampButton
                    label="CLOSE"
                    variant="tertiary"
                    onPress={() => setShowModal(false)}
                  />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },
  headerBanner: {
    borderWidth: 2,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerSub: { fontSize: 11, letterSpacing: 1.2 },
  headerTitle: { fontSize: 22, marginTop: 2 },
  statLine: { fontSize: 11, marginTop: 2 },
  searchBox: {
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 8,
  },
  searchInput: {
    fontSize: 13,
  },
  filterStripContainer: {
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  filterTab: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 6,
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  subFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    flexWrap: 'wrap',
  },
  contextPillGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  categoryPillGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  subFilterPill: {
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  subFilterText: {
    fontSize: 9,
    letterSpacing: 0.8,
  },
  cardRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
    paddingRight: 6,
  },
  standardBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    letterSpacing: 1,
  },
  rotationStamp: {
    borderWidth: 1.5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  rotationStampText: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  cardRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  drillTitle: {
    fontSize: 17,
    lineHeight: 21,
  },
  cardRow3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  telemetryText: {
    fontSize: 11,
  },
  detailsToggleText: {
    fontSize: 10,
    letterSpacing: 1,
  },
  expandedDrawer: {
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 8,
  },
  expandedDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  ledgerBox: {
    borderWidth: 1.5,
    padding: 8,
    marginBottom: 10,
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ledgerTitle: {
    fontSize: 10,
    letterSpacing: 1,
  },
  ledgerRatioText: {
    fontSize: 10,
  },
  ratioTrack: {
    height: 6,
    borderWidth: 1,
    marginBottom: 6,
    overflow: 'hidden',
  },
  ratioFill: {
    height: '100%',
  },
  ledgerStatsText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  expandedActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    borderWidth: 3,
    padding: 14,
  },
  modalHeader: {
    fontSize: 18,
    marginBottom: 10,
  },
  modalSubHeader: {
    fontSize: 12,
    letterSpacing: 1,
  },
  modalModeSwitcher: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeSwitchBtn: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 7,
    alignItems: 'center',
  },
  modeSwitchText: {
    fontSize: 11,
    letterSpacing: 1,
  },
  modalInput: {
    borderWidth: 1.5,
    padding: 7,
    fontSize: 12,
    marginBottom: 8,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  modalLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  smallToggle: {
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  toggleText: {
    fontSize: 9,
    letterSpacing: 0.5,
    fontWeight: 'bold',
  },
  modalInputsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  inputCol: {
    flex: 1,
  },
  colLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  numericInput: {
    borderWidth: 1.5,
    padding: 5,
    fontSize: 11,
    textAlign: 'center',
  },
  keyBasedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  checkbox: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  keyBasedLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  bulkCheckboxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  bulkTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  samplePackBtn: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  bulkHelpText: {
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 6,
  },
});
