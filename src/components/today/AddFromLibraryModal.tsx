import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { useSession } from '../../session/SessionContext';
import { StampModal } from '../StampModal';
import { StampInput } from '../StampInput';
import { SegmentedStamp } from '../SegmentedStamp';
import { StampButton } from '../StampButton';
import { StampBadge } from '../StampBadge';

type Membership = 'ACTIVE' | 'SAVED' | 'ALL';

interface AddFromLibraryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddFromLibraryModal: React.FC<AddFromLibraryModalProps> = ({ visible, onClose }) => {
  const { colors, typography } = useTheme();
  const { exercises, plan, addExercise } = useSession();
  const [query, setQuery] = useState('');
  const [membership, setMembership] = useState<Membership>('ACTIVE');
  // Exercises added while the picker is open stay listed so the row can read "ADDED"
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const inPlan = useMemo(() => new Set(plan.blocks.map((b) => b.exerciseId)), [plan.blocks]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (inPlan.has(ex.id) && !addedIds.has(ex.id)) return false;
      if (membership === 'ACTIVE' && !ex.inRotation) return false;
      if (membership === 'SAVED' && ex.inRotation) return false;
      if (q && !ex.title.toLowerCase().includes(q) && !ex.description.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [exercises, inPlan, addedIds, membership, query]);

  const close = () => {
    setAddedIds(new Set());
    setQuery('');
    onClose();
  };

  return (
    <StampModal
      visible={visible}
      title="ADD FROM LIBRARY"
      subtitle="Tap an exercise to add it to the end of today's plan."
      onClose={close}
      actions={<StampButton label="DONE" variant="primary" onPress={close} />}
    >
      <StampInput value={query} onChangeText={setQuery} placeholder="Search exercises" />
      <SegmentedStamp<Membership>
        accessibilityLabel="Show"
        options={[
          { id: 'ACTIVE', label: 'ACTIVE' },
          { id: 'SAVED', label: 'SAVED' },
          { id: 'ALL', label: 'ALL' },
        ]}
        value={membership}
        onChange={setMembership}
        fill
      />

      {rows.length === 0 ? (
        <Text style={[typography.mono, { color: colors.inkMuted }]}>
          Nothing left to add here.
        </Text>
      ) : (
        <View>
          {rows.map((ex) => {
            const added = addedIds.has(ex.id);
            return (
              <Pressable
                key={ex.id}
                accessibilityRole="button"
                accessibilityLabel={added ? `${ex.title}, added` : `Add ${ex.title}`}
                accessibilityState={{ disabled: added }}
                disabled={added}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  addExercise(ex.id, 'end');
                  setAddedIds((prev) => new Set(prev).add(ex.id));
                }}
                style={[styles.row, { borderBottomColor: colors.recessedSurface }]}
              >
                <View style={styles.rowText}>
                  <Text style={[typography.heading, { color: colors.inkBlack }]} numberOfLines={1}>
                    {ex.title}
                  </Text>
                  <Text style={[typography.mono, { color: colors.inkMuted }]}>
                    {ex.durationMinutes} MIN • {ex.context}
                    {ex.inRotation ? '' : ' • SAVED'}
                  </Text>
                </View>
                {added ? (
                  <StampBadge label="✓ ADDED" tone="olive" filled />
                ) : (
                  <Text style={[typography.stamp, { color: colors.primary }]}>+ ADD</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </StampModal>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingVertical: 8,
    borderBottomWidth: 1.5,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
