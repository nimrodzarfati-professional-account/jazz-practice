import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { Exercise, MusicalContext, ExerciseCategory } from '../types/models';
import { CreamBlock } from '../components/CreamBlock';
import { StampButton } from '../components/StampButton';
import {
  getAllVaultExercises,
  toggleExerciseRotation,
  addExercise,
  deleteExercise,
} from '../db/repository';

interface TheCrateScreenProps {
  onSelectExercise: (exercise: Exercise) => void;
  onRefreshQueue: () => void;
}

export const TheCrateScreen: React.FC<TheCrateScreenProps> = ({
  onSelectExercise,
  onRefreshQueue,
}) => {
  const { colors, typography } = useTheme();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContext, setSelectedContext] = useState<'ALL' | MusicalContext>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ExerciseCategory>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Exercise Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newContext, setNewContext] = useState<MusicalContext>('SOLOING');
  const [newCategory, setNewCategory] = useState<ExerciseCategory>('NEW_CONCEPT');
  const [newDuration, setNewDuration] = useState('15');
  const [newIntensity, setNewIntensity] = useState('3');
  const [newPriority, setNewPriority] = useState('7');
  const [newBpm, setNewBpm] = useState('120');
  const [newIsKeyBased, setNewIsKeyBased] = useState(true);

  const loadData = () => {
    const list = getAllVaultExercises();
    setExercises(list);
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const handleCreateExercise = () => {
    if (!newTitle.trim()) return;

    addExercise({
      title: newTitle.trim(),
      description: newDesc.trim() || 'Custom shed routine',
      context: newContext,
      category: newCategory,
      inRotation: true,
      durationMinutes: Math.max(5, parseInt(newDuration, 10) || 15),
      intensity: Math.max(1, Math.min(5, parseInt(newIntensity, 10) || 3)),
      basePriority: Math.max(1, Math.min(10, parseInt(newPriority, 10) || 5)),
      currentBpm: Math.max(40, parseInt(newBpm, 10) || 120),
      isKeyBased: newIsKeyBased,
      masteredKeys: [],
      usesActiveStandard: newCategory === 'MAINTENANCE',
      lastPracticedAt: null,
      skippedCount: 0,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewTitle('');
    setNewDesc('');
    setShowAddModal(false);
    loadData();
    onRefreshQueue();
  };

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch =
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesContext =
      selectedContext === 'ALL' || ex.context === selectedContext;
    const matchesCategory =
      selectedCategory === 'ALL' || ex.category === selectedCategory;
    return matchesSearch && matchesContext && matchesCategory;
  });

  const rotationCount = exercises.filter((e) => e.inRotation).length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.canvasBg }]}>
      {/* Header Banner */}
      <View style={[styles.headerBanner, { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface }]}>
        <View>
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

        <StampButton
          label="+ NEW DRILL"
          variant="primary"
          size="sm"
          onPress={() => setShowAddModal(true)}
        />
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

      {/* Context Filter Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'SOLOING', 'COMPING'] as const).map((ctx) => (
          <Pressable
            key={ctx}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedContext(ctx);
            }}
            style={[
              styles.filterTab,
              {
                borderColor: colors.inkBlack,
                backgroundColor: selectedContext === ctx ? colors.primary : colors.cardSurface,
              },
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
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

      {/* Category Filter Chips */}
      <View style={styles.chipRow}>
        {(['ALL', 'MAINTENANCE', 'TRANSCRIBING', 'NEW_CONCEPT'] as const).map((cat) => (
          <Pressable
            key={cat}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedCategory(cat);
            }}
            style={[
              styles.chip,
              {
                borderColor: colors.inkBlack,
                backgroundColor: selectedCategory === cat ? colors.secondary : colors.recessedSurface,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  fontFamily: typography.fontStamp,
                  color: selectedCategory === cat ? colors.cardSurface : colors.inkBlack,
                },
              ]}
            >
              {cat.replace('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Exercise Cards */}
      {filteredExercises.map((ex) => (
        <CreamBlock key={ex.id}>
          <View style={styles.cardHeader}>
            <View style={styles.badgeGroup}>
              <View
                style={[
                  styles.contextBadge,
                  {
                    backgroundColor: ex.context === 'SOLOING' ? colors.primary : colors.tertiary,
                  },
                ]}
              >
                <Text style={[styles.badgeText, { fontFamily: typography.fontStamp, color: colors.cardSurface }]}>
                  {ex.context}
                </Text>
              </View>

              <View
                style={[
                  styles.categoryBadge,
                  {
                    backgroundColor: colors.recessedSurface,
                    borderColor: colors.inkBlack,
                  },
                ]}
              >
                <Text style={[styles.badgeTextDark, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
                  {ex.category}
                </Text>
              </View>

              {ex.usesActiveStandard && (
                <View style={[styles.standardBadge, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.badgeText, { fontFamily: typography.fontStamp, color: colors.cardSurface }]}>
                    BOUND TO STD
                  </Text>
                </View>
              )}
            </View>

            {/* In-Rotation Switch Stamp */}
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
                {ex.inRotation ? 'IN ROTATION ✓' : '+ VAULT ONLY'}
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.drillTitle, { fontFamily: typography.fontDisplay, color: colors.inkBlack }]}>
            {ex.title}
          </Text>

          <Text style={[styles.drillDesc, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
            {ex.description}
          </Text>

          {/* Drill Metrics Bar */}
          <View style={[styles.metricsBar, { borderTopColor: colors.recessedSurface }]}>
            <Text style={[styles.metricItem, { fontFamily: typography.fontMono, color: colors.inkBlack }]}>
              ⏱ {ex.durationMinutes}m
            </Text>
            <Text style={[styles.metricItem, { fontFamily: typography.fontMono, color: colors.inkBlack }]}>
              ⚡ INT: {ex.intensity}/5
            </Text>
            <Text style={[styles.metricItem, { fontFamily: typography.fontMono, color: colors.inkBlack }]}>
              ♩ {ex.currentBpm} BPM
            </Text>
            {ex.isKeyBased && (
              <Text style={[styles.metricItem, { fontFamily: typography.fontMonoBold, color: colors.secondary }]}>
                KEYS: {ex.masteredKeys.length}/12
              </Text>
            )}
          </View>

          {/* Action Row */}
          <View style={styles.cardActionRow}>
            <StampButton
              label="▶ SHED THIS DRILL"
              variant="primary"
              size="sm"
              onPress={() => onSelectExercise(ex)}
            />
            <StampButton
              label="DELETE"
              variant="tertiary"
              size="sm"
              onPress={() => handleDelete(ex.id)}
            />
          </View>
        </CreamBlock>
      ))}

      {filteredExercises.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={[{ fontFamily: typography.fontDisplay, fontSize: 16, color: colors.textPrimary, textAlign: 'center' }]}>
            No drills found matching this filter.
          </Text>
        </View>
      )}

      {/* Add Exercise Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardSurface, borderColor: colors.inkBlack }]}>
            <Text style={[styles.modalHeader, { fontFamily: typography.fontDisplay, color: colors.inkBlack }]}>
              INGEST NEW DRILL
            </Text>

            <TextInput
              placeholder="Drill Title (e.g. Altered Dominant Licks)"
              placeholderTextColor={colors.inkMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              style={[styles.modalInput, { fontFamily: typography.fontMono, borderColor: colors.inkBlack, backgroundColor: colors.cardSurface, color: colors.textDark }]}
            />

            <TextInput
              placeholder="Description & musical focus..."
              placeholderTextColor={colors.inkMuted}
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
              style={[styles.modalInput, { fontFamily: typography.fontMono, borderColor: colors.inkBlack, backgroundColor: colors.cardSurface, color: colors.textDark, height: 60 }]}
            />

            {/* Context Selector */}
            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { fontFamily: typography.fontStamp }]}>CONTEXT:</Text>
              <Pressable
                onPress={() => setNewContext('SOLOING')}
                style={[styles.smallToggle, { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface }, newContext === 'SOLOING' && { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.toggleText, { color: newContext === 'SOLOING' ? colors.cardSurface : colors.textSecondary }]}>SOLOING</Text>
              </Pressable>
              <Pressable
                onPress={() => setNewContext('COMPING')}
                style={[styles.smallToggle, { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface }, newContext === 'COMPING' && { backgroundColor: colors.tertiary }]}
              >
                <Text style={[styles.toggleText, { color: newContext === 'COMPING' ? colors.cardSurface : colors.textSecondary }]}>COMPING</Text>
              </Pressable>
            </View>

            {/* Category Selector */}
            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { fontFamily: typography.fontStamp }]}>CATEGORY:</Text>
              {(['NEW_CONCEPT', 'TRANSCRIBING', 'MAINTENANCE'] as const).map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setNewCategory(cat)}
                  style={[styles.smallToggle, { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface }, newCategory === cat && { backgroundColor: colors.secondary }]}
                >
                  <Text style={[styles.toggleText, { color: newCategory === cat ? colors.cardSurface : colors.textSecondary }]}>{cat.split('_')[0]}</Text>
                </Pressable>
              ))}
            </View>

            {/* Numerical Values Row */}
            <View style={styles.modalInputsGrid}>
              <View style={styles.inputCol}>
                <Text style={[styles.colLabel, { color: colors.textSecondary }]}>MINUTES</Text>
                <TextInput
                  value={newDuration}
                  onChangeText={setNewDuration}
                  keyboardType="numeric"
                  style={[styles.numericInput, { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface, color: colors.textDark }]}
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={[styles.colLabel, { color: colors.textSecondary }]}>INTENSITY (1-5)</Text>
                <TextInput
                  value={newIntensity}
                  onChangeText={setNewIntensity}
                  keyboardType="numeric"
                  style={[styles.numericInput, { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface, color: colors.textDark }]}
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={[styles.colLabel, { color: colors.textSecondary }]}>BPM</Text>
                <TextInput
                  value={newBpm}
                  onChangeText={setNewBpm}
                  keyboardType="numeric"
                  style={[styles.numericInput, { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface, color: colors.textDark }]}
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={[styles.colLabel, { color: colors.textSecondary }]}>PRIORITY</Text>
                <TextInput
                  value={newPriority}
                  onChangeText={setNewPriority}
                  keyboardType="numeric"
                  style={[styles.numericInput, { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface, color: colors.textDark }]}
                />
              </View>
            </View>

            {/* Is Key Based Toggle */}
            <Pressable
              onPress={() => setNewIsKeyBased(!newIsKeyBased)}
              style={styles.keyBasedRow}
            >
              <Text style={[styles.checkbox, { color: colors.textSecondary }]}>{newIsKeyBased ? '[✓]' : '[ ]'}</Text>
              <Text style={[styles.keyBasedLabel, { fontFamily: typography.fontStamp, color: colors.textSecondary }]}>
                USE 12-KEY CIRCLE OF FIFTHS STAMP PAD
              </Text>
            </Pressable>

            {/* Modal Buttons */}
            <View style={styles.modalActions}>
              <StampButton
                label="CANCEL"
                variant="tertiary"
                onPress={() => setShowAddModal(false)}
              />
              <StampButton
                label="SAVE TO VAULT"
                variant="primary"
                onPress={handleCreateExercise}
              />
            </View>
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
    marginBottom: 12,
  },
  headerSub: { fontSize: 11, letterSpacing: 1.2 },
  headerTitle: { fontSize: 22, marginTop: 2 },
  statLine: { fontSize: 11, marginTop: 2 },
  searchBox: {
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: {
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  filterTab: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 7,
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 12,
    letterSpacing: 1,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  chipText: {
    fontSize: 10,
    letterSpacing: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  contextBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  standardBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 1,
  },
  badgeTextDark: {
    fontSize: 10,
    letterSpacing: 1,
  },
  rotationStamp: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rotationStampText: {
    fontSize: 10,
    letterSpacing: 1,
  },
  drillTitle: {
    fontSize: 19,
    marginVertical: 4,
  },
  drillDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  metricsBar: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    paddingTop: 8,
    marginBottom: 10,
  },
  metricItem: {
    fontSize: 11,
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    padding: 16,
  },
  modalHeader: {
    fontSize: 20,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1.5,
    padding: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 11,
    letterSpacing: 1,
  },
  smallToggle: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toggleText: {
    fontSize: 10,
    letterSpacing: 0.5,
    fontWeight: 'bold',
  },
  modalInputsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
  },
  colLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  numericInput: {
    borderWidth: 1.5,
    padding: 6,
    fontSize: 12,
    textAlign: 'center',
  },
  keyBasedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  checkbox: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  keyBasedLabel: {
    fontSize: 11,
    letterSpacing: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
});
