import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useSession } from '../session/SessionContext';
import { Exercise, ExerciseCategory, MusicalContext } from '../types/models';
import {
  addExercise,
  bulkAddExercises,
  deleteExercise,
  setExerciseHomework,
  toggleExerciseRotation,
  updateExerciseDetails,
} from '../db/repository';
import {
  parseBulkExercisesInput,
  getLastPracticedStampLabel,
  isOverdueRotationExercise,
  getHomeworkStats,
} from '../services/CrateUtils';
import { categoryLabel } from '../utils/format';
import { CreamBlock } from '../components/CreamBlock';
import { SectionHeader } from '../components/SectionHeader';
import { SegmentedStamp } from '../components/SegmentedStamp';
import { StampBadge } from '../components/StampBadge';
import { StampButton } from '../components/StampButton';
import { StampInput } from '../components/StampInput';
import { StampModal } from '../components/StampModal';
import { StampToggle } from '../components/StampToggle';
import { Stepper } from '../components/Stepper';
import { ActionSheet } from '../components/ActionSheet';

interface LibraryScreenProps {
  onStartNow: (exerciseId: string) => void;
  onOpenKnowledge?: (query?: string) => void;
}

type MembershipFilter = 'ALL' | 'ACTIVE' | 'SAVED' | 'WEEK';
type FocusFilter = 'ALL' | MusicalContext;
type Importance = 'LOW' | 'NORMAL' | 'HIGH';
type Effort = '1' | '2' | '3' | '4' | '5';

const IMPORTANCE_PRIORITY: Record<Importance, number> = { LOW: 3, NORMAL: 5, HIGH: 8 };

function importanceOf(basePriority: number): Importance {
  if (basePriority <= 3) return 'LOW';
  if (basePriority >= 7) return 'HIGH';
  return 'NORMAL';
}

interface EditorForm {
  title: string;
  description: string;
  context: MusicalContext;
  category: ExerciseCategory;
  minutes: number;
  bpm: number;
  effort: Effort;
  importance: Importance;
  isKeyBased: boolean;
  isActive: boolean;
  isWeek: boolean;
}

const EMPTY_FORM: EditorForm = {
  title: '',
  description: '',
  context: 'SOLOING',
  category: 'NEW_CONCEPT',
  minutes: 15,
  bpm: 120,
  effort: '3',
  importance: 'NORMAL',
  isKeyBased: true,
  isActive: true,
  isWeek: false,
};

function formFromExercise(ex: Exercise): EditorForm {
  return {
    title: ex.title,
    description: ex.description,
    context: ex.context,
    category: ex.category,
    minutes: ex.durationMinutes,
    bpm: ex.currentBpm,
    effort: String(Math.max(1, Math.min(5, Math.round(ex.intensity)))) as Effort,
    importance: importanceOf(ex.basePriority),
    isKeyBased: ex.isKeyBased,
    isActive: ex.inRotation,
    isWeek: Boolean(ex.isHomework),
  };
}

const FieldLabel: React.FC<{ label: string }> = ({ label }) => {
  const { colors, typography } = useTheme();
  return <Text style={[typography.stamp, styles.fieldLabel, { color: colors.inkBlack }]}>{label}</Text>;
};

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ onStartNow, onOpenKnowledge }) => {
  const { colors, typography } = useTheme();
  const { isDesktop } = useResponsiveLayout();
  const { exercises, plan, addExercise: addToToday, reloadFromDb } = useSession();

  const [membership, setMembership] = useState<MembershipFilter>('ALL');
  const [focus, setFocus] = useState<FocusFilter>('ALL');
  const [query, setQuery] = useState('');

  const [sheetFor, setSheetFor] = useState<Exercise | null>(null);
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<Exercise | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [form, setForm] = useState<EditorForm>(EMPTY_FORM);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const inPlan = useMemo(() => new Set(plan.blocks.map((b) => b.exerciseId)), [plan.blocks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (membership === 'ACTIVE' && !ex.inRotation) return false;
      if (membership === 'SAVED' && ex.inRotation) return false;
      if (membership === 'WEEK' && !ex.isHomework) return false;
      if (focus !== 'ALL' && ex.context !== focus) return false;
      if (q && !ex.title.toLowerCase().includes(q) && !ex.description.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [exercises, membership, focus, query]);

  const activeCount = exercises.filter((e) => e.inRotation).length;
  const weekCount = exercises.filter((e) => e.isHomework).length;

  const updateForm = (patch: Partial<EditorForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  };

  const openEdit = (ex: Exercise) => {
    setEditing(ex);
    setForm(formFromExercise(ex));
    setEditorOpen(true);
  };

  const handleSave = () => {
    const title = form.title.trim();
    if (!title) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const intensity = Number(form.effort);
    // Untouched importance keeps the exact stored value instead of snapping to 3/5/8
    const basePriority =
      editing && form.importance === importanceOf(editing.basePriority)
        ? editing.basePriority
        : IMPORTANCE_PRIORITY[form.importance];
    const usesActiveStandard = form.category === 'MAINTENANCE';
    const description = form.description.trim();

    if (editing) {
      updateExerciseDetails(editing.id, {
        title,
        description,
        context: form.context,
        category: form.category,
        durationMinutes: form.minutes,
        intensity,
        basePriority,
        currentBpm: form.bpm,
        isKeyBased: form.isKeyBased,
        usesActiveStandard,
        isHomework: form.isWeek,
        homeworkStartedAt: form.isWeek
          ? editing.homeworkStartedAt || new Date().toISOString()
          : null,
      });
      toggleExerciseRotation(editing.id, form.isWeek ? true : form.isActive);
    } else {
      const nowIso = new Date().toISOString();
      addExercise({
        title,
        description,
        context: form.context,
        category: form.category,
        inRotation: form.isWeek ? true : form.isActive,
        durationMinutes: form.minutes,
        intensity,
        basePriority,
        currentBpm: form.bpm,
        isKeyBased: form.isKeyBased,
        masteredKeys: [],
        usesActiveStandard,
        lastPracticedAt: null,
        skippedCount: 0,
        rotationChangedAt: nowIso,
        accumulatedInRotationMs: 0,
        accumulatedOutRotationMs: 0,
        isHomework: form.isWeek,
        homeworkStartedAt: form.isWeek ? nowIso : null,
      });
    }
    setEditorOpen(false);
    reloadFromDb();
  };

  const handleBulkAdd = () => {
    const items = parseBulkExercisesInput(bulkText, {
      context: 'SOLOING',
      category: 'NEW_CONCEPT',
      inRotation: true,
      durationMinutes: 15,
      intensity: 3,
      currentBpm: 120,
      isKeyBased: true,
    });
    if (items.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    bulkAddExercises(items);
    setBulkText('');
    setBulkOpen(false);
    reloadFromDb();
  };

  const mutate = (action: () => void) => {
    action();
    reloadFromDb();
  };

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      <SectionHeader title="LIBRARY" size="title" meta={`${exercises.length} EXERCISES`} />
      <View style={styles.headerActions}>
        <StampButton label="+ NEW EXERCISE" variant="primary" size="sm" onPress={openCreate} />
        <StampButton label="ADD MULTIPLE" variant="tertiary" size="sm" onPress={() => setBulkOpen(true)} />
      </View>
      <StampInput value={query} onChangeText={setQuery} placeholder="Search exercises" />
      <SegmentedStamp<MembershipFilter>
        accessibilityLabel="Show"
        options={[
          { id: 'ALL', label: 'ALL', count: exercises.length },
          { id: 'ACTIVE', label: 'ACTIVE', count: activeCount },
          { id: 'SAVED', label: 'SAVED', count: exercises.length - activeCount },
          { id: 'WEEK', label: 'THIS WEEK', count: weekCount },
        ]}
        value={membership}
        onChange={setMembership}
      />
      <View style={styles.focusRow}>
        <Text style={[typography.stamp, { color: colors.inkBlack }]}>FOCUS:</Text>
        <SegmentedStamp<FocusFilter>
          accessibilityLabel="Focus"
          options={[
            { id: 'ALL', label: 'ALL' },
            { id: 'SOLOING', label: 'SOLOING' },
            { id: 'COMPING', label: 'COMPING' },
          ]}
          value={focus}
          onChange={setFocus}
        />
      </View>
    </View>
  );

  const renderCard = (ex: Exercise) => {
    const alreadyInPlan = inPlan.has(ex.id);
    const isOverdue = isOverdueRotationExercise(ex, 7);
    const hwStats = getHomeworkStats(ex);
    const meta = [
      `${ex.durationMinutes} MIN`,
      `♩${ex.currentBpm}`,
      ex.isKeyBased ? `${ex.masteredKeys.length}/12 KEYS` : null,
    ]
      .filter(Boolean)
      .join(' • ');

    return (
      <View key={ex.id} style={isDesktop ? styles.gridCell : undefined}>
        <CreamBlock>
          <View style={styles.badges}>
            <StampBadge label={ex.context} type={ex.context} />
            <StampBadge label={categoryLabel(ex.category)} type={ex.category} />
            {ex.isHomework && (
              <StampBadge
                label={hwStats.isExpired ? 'THIS WEEK • EXPIRED' : 'THIS WEEK'}
                tone={hwStats.isExpired ? 'secondary' : 'primary'}
                filled
              />
            )}
            {!ex.inRotation && <StampBadge label="SAVED" tone="neutral" />}
            <StampBadge
              label={
                isOverdue
                  ? `⚠️ ${getLastPracticedStampLabel(ex.lastPracticedAt)}`
                  : getLastPracticedStampLabel(ex.lastPracticedAt)
              }
              tone={isOverdue ? 'secondary' : 'neutral'}
            />
          </View>
          <Text style={[typography.title, styles.cardTitle, { color: colors.inkBlack }]}>{ex.title}</Text>
          {ex.description ? (
            <Text style={[typography.mono, styles.cardDesc, { color: colors.inkBlack }]} numberOfLines={3}>
              {ex.description}
            </Text>
          ) : null}
          <Text style={[typography.monoBold, styles.cardMeta, { color: colors.inkMuted }]}>{meta}</Text>
          <View style={styles.cardActions}>
            <StampButton
              label={alreadyInPlan ? "✓ IN TODAY'S PLAN" : 'ADD TO TODAY'}
              variant="primary"
              size="sm"
              disabled={alreadyInPlan}
              accessibilityLabel={alreadyInPlan ? `${ex.title} is in today's plan` : `Add ${ex.title} to today`}
              onPress={() => addToToday(ex.id, 'end')}
            />
            <StampButton
              label="EDIT"
              variant="tertiary"
              size="sm"
              accessibilityLabel={`Edit ${ex.title}`}
              onPress={() => openEdit(ex)}
            />
            <StampButton
              label="•••"
              variant="tertiary"
              size="sm"
              accessibilityLabel={`More actions for ${ex.title}`}
              onPress={() => setSheetFor(ex)}
            />
          </View>
        </CreamBlock>
      </View>
    );
  };

  const renderCards = () =>
    filtered.length === 0 ? (
      <CreamBlock>
        <Text style={[typography.heading, { color: colors.inkBlack }]}>No exercises match.</Text>
        <Text style={[typography.mono, styles.cardDesc, { color: colors.inkMuted }]}>
          Change the filters above, or add a new exercise.
        </Text>
      </CreamBlock>
    ) : (
      <View style={isDesktop ? styles.grid : undefined}>{filtered.map(renderCard)}</View>
    );

  const sheetActions = sheetFor
    ? [
        { label: 'START NOW', onPress: () => onStartNow(sheetFor.id) },
        ...(onOpenKnowledge
          ? [
              {
                label: 'SEARCH IN KNOWLEDGE CODEX',
                onPress: () => onOpenKnowledge(sheetFor.title),
              },
            ]
          : []),
        {
          label: sheetFor.inRotation ? 'SAVE FOR LATER' : 'MAKE ACTIVE',
          onPress: () => mutate(() => toggleExerciseRotation(sheetFor.id, !sheetFor.inRotation)),
        },
        ...(sheetFor.isHomework && getHomeworkStats(sheetFor).isExpired
          ? [
              {
                label: 'RENEW THIS WEEK (7D)',
                onPress: () => mutate(() => setExerciseHomework(sheetFor.id, true)),
              },
            ]
          : []),
        {
          label: sheetFor.isHomework ? 'REMOVE FROM THIS WEEK' : 'ADD TO THIS WEEK',
          onPress: () => mutate(() => setExerciseHomework(sheetFor.id, !sheetFor.isHomework)),
        },
        { label: 'DELETE', variant: 'alert' as const, onPress: () => setConfirmDeleteFor(sheetFor) },
      ]
    : [];

  return (
    <View style={[styles.root, { backgroundColor: colors.canvasBg }]}>
      {isDesktop ? (
        <View style={styles.desktopRow}>
          <ScrollView style={[styles.rail, { borderRightColor: colors.inkBlack }]} contentContainerStyle={styles.railContent}>
            <CreamBlock>{renderHeader()}</CreamBlock>
          </ScrollView>
          <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
            {renderCards()}
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <CreamBlock>{renderHeader()}</CreamBlock>
          {renderCards()}
        </ScrollView>
      )}

      <ActionSheet
        visible={sheetFor !== null}
        title={sheetFor?.title ?? ''}
        onClose={() => setSheetFor(null)}
        actions={sheetActions}
      />

      <ActionSheet
        visible={confirmDeleteFor !== null}
        title={`Delete "${confirmDeleteFor?.title ?? ''}"?`}
        onClose={() => setConfirmDeleteFor(null)}
        actions={[
          {
            label: 'DELETE',
            variant: 'alert',
            onPress: () => {
              if (!confirmDeleteFor) return;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              mutate(() => deleteExercise(confirmDeleteFor.id));
            },
          },
        ]}
      />

      <StampModal
        visible={editorOpen}
        title={editing ? 'EDIT EXERCISE' : 'NEW EXERCISE'}
        onClose={() => setEditorOpen(false)}
        actions={
          <>
            <StampButton label="CANCEL" variant="tertiary" onPress={() => setEditorOpen(false)} />
            <StampButton label="SAVE" variant="primary" disabled={!form.title.trim()} onPress={handleSave} />
          </>
        }
      >
        <StampInput label="TITLE" value={form.title} onChangeText={(title) => updateForm({ title })} />
        <StampInput
          label="DESCRIPTION"
          value={form.description}
          onChangeText={(description) => updateForm({ description })}
          multiline
        />
        <View>
          <FieldLabel label="FOCUS" />
          <SegmentedStamp<MusicalContext>
            options={[
              { id: 'SOLOING', label: 'SOLOING' },
              { id: 'COMPING', label: 'COMPING' },
            ]}
            value={form.context}
            onChange={(context) => updateForm({ context })}
            fill
          />
        </View>
        <View>
          <FieldLabel label="TYPE" />
          <SegmentedStamp<ExerciseCategory>
            options={[
              { id: 'NEW_CONCEPT', label: 'NEW CONCEPT' },
              { id: 'TRANSCRIBING', label: 'TRANSCRIBING' },
              { id: 'MAINTENANCE', label: 'MAINTENANCE' },
            ]}
            value={form.category}
            onChange={(category) => updateForm({ category })}
          />
        </View>
        <View style={styles.stepperRow}>
          <View>
            <FieldLabel label="MINUTES" />
            <Stepper
              accessibilityLabel="Minutes"
              value={form.minutes}
              onChange={(minutes) => updateForm({ minutes })}
              step={5}
              min={5}
              max={Math.max(60, form.minutes)}
              size="md"
            />
          </View>
          <View>
            <FieldLabel label="BPM" />
            <Stepper
              accessibilityLabel="Tempo"
              value={form.bpm}
              onChange={(bpm) => updateForm({ bpm })}
              step={5}
              min={30}
              max={320}
              format={(v) => `♩ ${v}`}
              size="md"
            />
          </View>
        </View>
        <View>
          <FieldLabel label="EFFORT" />
          <SegmentedStamp<Effort>
            options={(['1', '2', '3', '4', '5'] as const).map((id) => ({ id, label: id }))}
            value={form.effort}
            onChange={(effort) => updateForm({ effort })}
            fill
          />
        </View>
        <View>
          <FieldLabel label="IMPORTANCE" />
          <SegmentedStamp<Importance>
            options={[
              { id: 'LOW', label: 'LOW' },
              { id: 'NORMAL', label: 'NORMAL' },
              { id: 'HIGH', label: 'HIGH' },
            ]}
            value={form.importance}
            onChange={(importance) => updateForm({ importance })}
            fill
          />
        </View>
        <View>
          <StampToggle
            label="TRACK 12 KEYS"
            checked={form.isKeyBased}
            onChange={(isKeyBased) => updateForm({ isKeyBased })}
          />
          <StampToggle
            label="ACTIVE"
            checked={form.isActive || form.isWeek}
            onChange={(isActive) => updateForm({ isActive })}
            hint={form.isWeek ? 'This week exercises are always active' : 'Active exercises can be suggested'}
          />
          <StampToggle
            label="THIS WEEK"
            checked={form.isWeek}
            onChange={(isWeek) => updateForm({ isWeek })}
            hint="Always first in the plan for 7 days"
          />
        </View>
      </StampModal>

      <StampModal
        visible={bulkOpen}
        title="ADD MULTIPLE"
        subtitle="One per line: Title | Description | 15m | 120bpm | #soloing | #maint"
        onClose={() => setBulkOpen(false)}
        actions={
          <>
            <StampButton label="CANCEL" variant="tertiary" onPress={() => setBulkOpen(false)} />
            <StampButton label="ADD EXERCISES" variant="primary" disabled={!bulkText.trim()} onPress={handleBulkAdd} />
          </>
        }
      >
        <StampInput
          value={bulkText}
          onChangeText={setBulkText}
          multiline
          placeholder={
            'Drop 3 Shells | Voice leading on strings 2-3-4-6 | 15m | 110bpm | #comping\nGiant Steps Patterns | 1-2-3-5 cells | 20m | 150bpm | #soloing'
          }
        />
      </StampModal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  desktopRow: {
    flex: 1,
    flexDirection: 'row',
  },
  rail: {
    width: 270,
    flexGrow: 0,
    borderRightWidth: 2,
  },
  railContent: {
    padding: 16,
  },
  headerBlock: {
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  focusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCell: {
    width: '48.5%',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardTitle: {
    fontSize: 18,
    marginTop: 8,
  },
  cardDesc: {
    marginTop: 4,
    lineHeight: 17,
  },
  cardMeta: {
    marginTop: 8,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  fieldLabel: {
    marginBottom: 4,
  },
  stepperRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
});
