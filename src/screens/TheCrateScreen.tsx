/**
 * The Crate Screen — Exercise Vault & Frictionless Ingestion
 * 
 * Aesthetic:
 * - Library card catalog & crate of vintage vinyl jackets
 * - Color-coded top tabs: Burnt Sienna (New Concept), Amber Brass (Transcribing), Olive Tweed (Maintenance)
 * - Vintage ribbon-microphone styled quick-add modal
 * - Bulk CSV / JSON archive ingestion
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { CreamBlock } from '../components/CreamBlock';
import { StampButton } from '../components/StampButton';
import { StampBadge } from '../components/StampBadge';
import {
  Exercise,
  ExerciseContext,
  ExerciseCategory,
} from '../types/models';
import {
  getExercises,
  createExercise,
  deleteExercise,
  syncPendingRecordsWithSupabase,
} from '../db/repository';
import {
  scoreExercise,
  importExercisesFromCsv,
  importExercisesFromJson,
} from '../services/SchedulerEngine';

export interface TheCrateScreenProps {
  onSelectExercise?: (exercise: Exercise) => void;
  onNavigateToShed?: () => void;
}

type FilterTab = 'ALL' | 'SOLOING' | 'COMPING' | 'MAINTENANCE' | 'TRANSCRIBING' | 'NEW CONCEPTS';

export const TheCrateScreen: React.FC<TheCrateScreenProps> = ({
  onSelectExercise,
  onNavigateToShed,
}) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick Add Modal state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newContext, setNewContext] = useState<ExerciseContext>('soloing');
  const [newCategory, setNewCategory] = useState<ExerciseCategory>('maintenance');
  const [newBpm, setNewBpm] = useState<string>('120');
  const [newDuration, setNewDuration] = useState<string>('15');
  const [newPriority, setNewPriority] = useState<string>('7');

  // Bulk Ingestion Modal state
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [bulkText, setBulkText] = useState<string>('');

  const loadVault = useCallback(async () => {
    try {
      const list = await getExercises({ includeArchived: false });
      setExercises(list);
    } catch (err) {
      console.warn('[TheCrate] Error loading exercises:', err);
    }
  }, []);

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  // Tab Filtering
  const filteredExercises = exercises.filter((ex) => {
    // Search query match
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ex.title.toLowerCase().includes(q);
      const matchDesc = ex.description.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    if (activeTab === 'ALL') return true;
    if (activeTab === 'SOLOING') return ex.context === 'soloing';
    if (activeTab === 'COMPING') return ex.context === 'comping';
    if (activeTab === 'MAINTENANCE') return ex.category === 'maintenance';
    if (activeTab === 'TRANSCRIBING') return ex.category === 'transcribing';
    if (activeTab === 'NEW CONCEPTS') return ex.category === 'new_concept';
    return true;
  });

  // Handle Quick Add
  const handleSaveQuickAdd = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Please enter an exercise title.');
      return;
    }

    try {
      await createExercise({
        title: newTitle.trim(),
        description: newDescription.trim(),
        context: newContext,
        category: newCategory,
        basePriority: parseInt(newPriority, 10) || 5,
        defaultDurationMinutes: parseInt(newDuration, 10) || 15,
        targetBpm: newBpm ? parseInt(newBpm, 10) : null,
        keyStamps: [],
        lastPracticedAt: null,
      });

      // Reset form
      setNewTitle('');
      setNewDescription('');
      setIsQuickAddOpen(false);
      await loadVault();
      Alert.alert('Success', 'Exercise added to The Crate!');
    } catch (err: any) {
      Alert.alert('Save Error', err.message);
    }
  };

  // Handle Bulk Import
  const handleExecuteBulkImport = async () => {
    if (!bulkText.trim()) {
      Alert.alert('Empty', 'Paste CSV or JSON archive text to import.');
      return;
    }

    try {
      let res;
      if (bulkText.trim().startsWith('[') || bulkText.trim().startsWith('{')) {
        res = await importExercisesFromJson(bulkText);
      } else {
        res = await importExercisesFromCsv(bulkText);
      }

      if (res.importedCount > 0) {
        await loadVault();
        setIsBulkImportOpen(false);
        setBulkText('');
        Alert.alert(
          'Import Complete',
          `Successfully imported ${res.importedCount} drills into SQLite.${res.skippedCount > 0 ? ` (${res.skippedCount} skipped)` : ''}`
        );
      } else {
        Alert.alert('Import Failed', res.errors.join('\n') || 'No records imported.');
      }
    } catch (err: any) {
      Alert.alert('Import Error', err.message);
    }
  };

  // Handle Delete Exercise
  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Archive Exercise',
      `Move "${title}" to the archive?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            await deleteExercise(id, false);
            await loadVault();
          },
        },
      ]
    );
  };

  // Handle Cloud Sync to Supabase
  const handleSyncCloud = async () => {
    try {
      const res = await syncPendingRecordsWithSupabase();
      if (res.skipped) {
        Alert.alert(
          'Supabase Offline / Not Configured',
          'Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your .env file.'
        );
      } else if (res.error) {
        Alert.alert(
          'Supabase Notice',
          `${res.error}\n\nTip: If you haven't run supabase/schema.sql in your Supabase SQL editor yet, run it once to create the cloud tables.`
        );
      } else {
        Alert.alert(
          'Cloud Sync Complete',
          `Successfully backed up ${res.syncedExercises} exercises and ${res.syncedLogs} logs to Supabase!`
        );
      }
    } catch (err: any) {
      Alert.alert('Cloud Sync Error', err.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brassRule} />
          <View style={styles.badgeRow}>
            <StampBadge label="SHED ENGINE" type="soloing" />
            <StampBadge label={`CRATE VAULT: ${exercises.length} DRILLS`} type="maintenance" />
          </View>
          <Text style={styles.headerTitle}>The Crate</Text>
          <Text style={styles.headerSubtitle}>
            Vinyl sleeve archive • Authentic lead sheets & vocabulary drills
          </Text>
          <View style={styles.brassRuleThin} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises, changes, solos..."
            placeholderTextColor="#7A6B5D"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {(['ALL', 'SOLOING', 'COMPING', 'MAINTENANCE', 'TRANSCRIBING', 'NEW CONCEPTS'] as FilterTab[]).map(
            (tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <View style={styles.actionBtn}>
            <StampButton
              label="+ RECORD NEW DRILL"
              variant="primary"
              size="md"
              onPress={() => setIsQuickAddOpen(true)}
            />
          </View>
          <View style={styles.actionBtn}>
            <StampButton
              label="BULK IMPORT"
              variant="secondary"
              size="md"
              onPress={() => setIsBulkImportOpen(true)}
            />
          </View>
        </View>

        {/* Cloud Sync Button */}
        <View style={styles.syncRow}>
          <StampButton
            label="☁ BACKUP & SYNC TO SUPABASE"
            variant="secondary"
            size="sm"
            onPress={handleSyncCloud}
          />
        </View>

        {/* Exercise Crate List */}
        <View style={styles.exerciseList}>
          {filteredExercises.length === 0 ? (
            <CreamBlock variant="dark" style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>NO DRILLS IN THIS CRATE TAB</Text>
              <Text style={styles.emptySubtitle}>
                Tap "+ RECORD NEW DRILL" to add vocabulary or import your archive.
              </Text>
            </CreamBlock>
          ) : (
            filteredExercises.map((ex) => {
              const scored = scoreExercise(ex, 3);
              const stampedCount = ex.keyStamps.filter((s) => s.stamped).length;

              // Color-coded tab accent on left border
              const categoryColor =
                ex.category === 'maintenance'
                  ? '#6B705C'
                  : ex.category === 'transcribing'
                  ? '#D49B35'
                  : '#D95D39';

              return (
                <TouchableOpacity
                  key={ex.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (onSelectExercise) onSelectExercise(ex);
                    if (onNavigateToShed) onNavigateToShed();
                  }}
                >
                  <CreamBlock variant="dark" style={[styles.exerciseCard, { borderLeftColor: categoryColor, borderLeftWidth: 6 }]}>
                    <View style={styles.cardHeader}>
                      <StampBadge label={ex.category.toUpperCase()} type={ex.category} />
                      <StampBadge label={ex.context.toUpperCase()} type={ex.context} />
                      <Text style={styles.cardMeta}>
                        URGENCY {scored.urgencyScore} // {ex.defaultDurationMinutes}M {ex.targetBpm ? `// ${ex.targetBpm} BPM` : ''}
                      </Text>
                    </View>

                    <Text style={styles.cardTitle}>{ex.title}</Text>
                    <Text style={styles.cardDescription}>{ex.description}</Text>

                    <View style={styles.cardFooter}>
                      <Text style={styles.keyCoverageText}>
                        12-KEY COVERAGE: [ {stampedCount} / 12 KEYS STAMPED ]
                      </Text>
                      <TouchableOpacity onPress={() => handleDelete(ex.id, ex.title)}>
                        <Text style={styles.archiveLink}>ARCHIVE</Text>
                      </TouchableOpacity>
                    </View>
                  </CreamBlock>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Quick Add Modal */}
      <Modal visible={isQuickAddOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <CreamBlock variant="dark" style={styles.modalContent}>
            <Text style={styles.modalTitle}>// RECORD DRILL TO CRATE</Text>
            <Text style={styles.modalSubtitle}>Vintage Studio Ribbon Microphone Input</Text>

            <TextInput
              style={styles.input}
              placeholder="Exercise Title (e.g. Donna Lee Solo Ch. 1)"
              placeholderTextColor="#7A6B5D"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Description & musical notes..."
              placeholderTextColor="#7A6B5D"
              multiline
              value={newDescription}
              onChangeText={setNewDescription}
            />

            {/* Context Toggle */}
            <Text style={styles.fieldLabel}>MUSICAL CONTEXT:</Text>
            <View style={styles.optionRow}>
              {(['soloing', 'comping'] as ExerciseContext[]).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.optionBtn, newContext === c && styles.optionBtnActive]}
                  onPress={() => setNewContext(c)}
                >
                  <Text style={[styles.optionText, newContext === c && styles.optionTextActive]}>
                    {c.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category Toggle */}
            <Text style={styles.fieldLabel}>PRACTICE CATEGORY:</Text>
            <View style={styles.optionRow}>
              {(['maintenance', 'transcribing', 'new_concept'] as ExerciseCategory[]).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.optionBtn, newCategory === cat && styles.optionBtnActive]}
                  onPress={() => setNewCategory(cat)}
                >
                  <Text style={[styles.optionText, newCategory === cat && styles.optionTextActive]}>
                    {cat.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* BPM, Duration & Priority Row */}
            <View style={styles.rowInputs}>
              <View style={styles.thirdInputWrapper}>
                <Text style={styles.fieldLabel}>DURATION:</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newDuration}
                  onChangeText={setNewDuration}
                />
              </View>
              <View style={styles.thirdInputWrapper}>
                <Text style={styles.fieldLabel}>BPM:</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newBpm}
                  onChangeText={setNewBpm}
                />
              </View>
              <View style={styles.thirdInputWrapper}>
                <Text style={styles.fieldLabel}>PRIORITY:</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="1-10"
                  value={newPriority}
                  onChangeText={setNewPriority}
                />
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.modalBtnRow}>
              <View style={styles.modalHalfBtn}>
                <StampButton
                  label="CANCEL"
                  variant="alert"
                  size="md"
                  onPress={() => setIsQuickAddOpen(false)}
                />
              </View>
              <View style={styles.modalHalfBtn}>
                <StampButton
                  label="SAVE TO SQLITE"
                  variant="primary"
                  size="md"
                  onPress={handleSaveQuickAdd}
                />
              </View>
            </View>
          </CreamBlock>
        </View>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal visible={isBulkImportOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <CreamBlock variant="dark" style={styles.modalContent}>
            <Text style={styles.modalTitle}>// BULK ARCHIVE INGESTION</Text>
            <Text style={styles.modalSubtitle}>Paste CSV or JSON exercise library below</Text>

            <TextInput
              style={[styles.input, styles.bulkTextInput]}
              placeholder={'title,context,category,basePriority,duration,bpm,description\n"Donna Lee",soloing,transcribing,8,20,210,"Chorus 1 by ear"'}
              placeholderTextColor="#7A6B5D"
              multiline
              value={bulkText}
              onChangeText={setBulkText}
            />

            <View style={styles.modalBtnRow}>
              <View style={styles.modalHalfBtn}>
                <StampButton
                  label="CANCEL"
                  variant="alert"
                  size="md"
                  onPress={() => setIsBulkImportOpen(false)}
                />
              </View>
              <View style={styles.modalHalfBtn}>
                <StampButton
                  label="PARSE & IMPORT"
                  variant="primary"
                  size="md"
                  onPress={handleExecuteBulkImport}
                />
              </View>
            </View>
          </CreamBlock>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default TheCrateScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#16110E',
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 20,
  },
  brassRule: {
    height: 4,
    backgroundColor: '#D49B35',
    marginBottom: 10,
  },
  brassRuleThin: {
    height: 1,
    backgroundColor: '#3A2F26',
    marginTop: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Fraunces_900Black',
    lineHeight: 34,
    color: '#F4EFE6',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'CourierPrime_400Regular',
    color: '#A69686',
    marginTop: 4,
    lineHeight: 18,
  },
  searchContainer: {
    marginBottom: 14,
  },
  searchInput: {
    backgroundColor: '#120D0A',
    borderWidth: 2,
    borderColor: '#3A2F26',
    color: '#F4EFE6',
    fontFamily: 'CourierPrime_400Regular',
    fontSize: 13,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  tabScroll: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabButton: {
    backgroundColor: '#241B16',
    borderWidth: 1,
    borderColor: '#3A2F26',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tabButtonActive: {
    borderColor: '#D49B35',
    backgroundColor: '#3A2F26',
  },
  tabText: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#A69686',
  },
  tabTextActive: {
    color: '#D49B35',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
  },
  syncRow: {
    marginBottom: 16,
  },
  exerciseList: {
    gap: 12,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 13,
    color: '#D49B35',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'CourierPrime_400Regular',
    fontSize: 11,
    color: '#A69686',
    textAlign: 'center',
  },
  exerciseCard: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  cardMeta: {
    marginLeft: 'auto',
    fontFamily: 'CourierPrime_700Bold',
    fontSize: 11,
    color: '#D49B35',
  },
  cardTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 18,
    lineHeight: 22,
    color: '#F4EFE6',
    marginBottom: 4,
  },
  cardDescription: {
    fontFamily: 'CourierPrime_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: '#A69686',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#3A2F26',
    paddingTop: 8,
  },
  keyCoverageText: {
    fontFamily: 'CourierPrime_700Bold',
    fontSize: 10,
    color: '#D49B35',
  },
  archiveLink: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#9E2A2B',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 14,
    letterSpacing: 2,
    color: '#D49B35',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: 'CourierPrime_400Regular',
    fontSize: 11,
    color: '#A69686',
    marginBottom: 14,
  },
  input: {
    backgroundColor: '#120D0A',
    borderWidth: 1,
    borderColor: '#3A2F26',
    color: '#F4EFE6',
    fontFamily: 'CourierPrime_400Regular',
    fontSize: 13,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  multilineInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  bulkTextInput: {
    height: 140,
    textAlignVertical: 'top',
  },
  fieldLabel: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#D49B35',
    marginBottom: 4,
    marginTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  optionBtn: {
    flex: 1,
    backgroundColor: '#120D0A',
    borderWidth: 1,
    borderColor: '#3A2F26',
    paddingVertical: 6,
    alignItems: 'center',
  },
  optionBtnActive: {
    borderColor: '#D49B35',
    backgroundColor: '#2A2018',
  },
  optionText: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#A69686',
  },
  optionTextActive: {
    color: '#D49B35',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  halfInputWrapper: {
    flex: 1,
  },
  thirdInputWrapper: {
    flex: 1,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalHalfBtn: {
    flex: 1,
  },
});
