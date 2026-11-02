import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { useSession } from '../../session/SessionContext';
import { ResolvedBlock } from '../../types/models';
import { categoryLabel } from '../../utils/format';
import { CreamBlock } from '../CreamBlock';
import { SectionHeader } from '../SectionHeader';
import { StampBadge } from '../StampBadge';
import { StampButton } from '../StampButton';
import { Stepper } from '../Stepper';
import { AddFromLibraryModal } from './AddFromLibraryModal';

type PlanMode = 'building' | 'running';

interface IconButtonProps {
  glyph: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({ glyph, label, onPress, disabled = false }) => {
  const { colors, typography } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        styles.iconBtn,
        {
          borderColor: colors.inkBlack,
          backgroundColor: colors.recessedSurface,
          opacity: disabled ? 0.35 : 1,
        },
      ]}
    >
      {/* Stamp font + U+FE0E keep arrows as ink glyphs instead of colour emoji fallbacks */}
      <Text style={[typography.stamp, styles.iconGlyph, { color: colors.inkBlack }]}>{`${glyph}︎`}</Text>
    </Pressable>
  );
};

interface PlanRowProps {
  block: ResolvedBlock;
  mode: PlanMode;
  isFirst: boolean;
  isLast: boolean;
}

const PlanRow: React.FC<PlanRowProps> = ({ block, mode, isFirst, isLast }) => {
  const { colors, typography } = useTheme();
  const { removeBlock, moveBlock, setBlockMinutes, setCurrent, reopenBlock } = useSession();
  const { exercise, index } = block;
  const isPending = block.status === 'pending';
  const canSelect = mode === 'running' && isPending && !block.isCurrent;

  const renderStatus = () => {
    if (mode === 'running') {
      if (block.isCurrent) return <StampBadge label="▶ NOW" tone="primary" filled />;
      if (block.status === 'done') return <StampBadge label="✓ DONE" tone="olive" filled />;
      if (block.status === 'skipped') return <StampBadge label="SKIPPED" tone="neutral" />;
    }
    return (
      <Text style={[typography.monoBold, styles.index, { color: colors.inkMuted }]}>
        {String(index + 1).padStart(2, '0')}
      </Text>
    );
  };

  const info = (
    <View style={styles.info}>
      <Text
        style={[
          typography.heading,
          { color: isPending ? colors.inkBlack : colors.inkMuted },
        ]}
        numberOfLines={2}
      >
        {exercise.title}
      </Text>
      <View style={styles.badges}>
        <StampBadge label={exercise.context} type={exercise.context} />
        <StampBadge label={categoryLabel(exercise.category)} type={exercise.category} />
        {exercise.isHomework && <StampBadge label="THIS WEEK" tone="primary" filled />}
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: colors.recessedSurface,
          backgroundColor: block.isCurrent ? colors.recessedSurface : 'transparent',
        },
      ]}
    >
      <View style={styles.topLine}>
        <View style={styles.statusCol}>{renderStatus()}</View>
        {canSelect ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Practice ${exercise.title} now`}
            accessibilityState={{ selected: false }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCurrent(index);
            }}
            style={styles.infoPress}
          >
            {info}
          </Pressable>
        ) : (
          info
        )}
      </View>

      <View style={styles.controls}>
        {isPending ? (
          <>
            <Stepper
              accessibilityLabel={`${exercise.title} minutes`}
              value={block.allocatedMinutes}
              onChange={(v) => setBlockMinutes(index, v)}
              step={5}
              min={5}
              max={Math.max(60, block.allocatedMinutes)}
              format={(v) => `${v}m`}
            />
            <View style={styles.spacer} />
            <IconButton glyph="↑" label={`Move ${exercise.title} up`} onPress={() => moveBlock(index, -1)} disabled={isFirst} />
            <IconButton glyph="↓" label={`Move ${exercise.title} down`} onPress={() => moveBlock(index, 1)} disabled={isLast} />
            <IconButton glyph="✕" label={`Remove ${exercise.title}`} onPress={() => removeBlock(index)} />
          </>
        ) : (
          <>
            <Text style={[typography.mono, { color: colors.inkMuted }]}>
              {block.status === 'done' ? `${block.practicedMinutes ?? 0} MIN LOGGED` : 'SKIPPED'}
            </Text>
            <View style={styles.spacer} />
            <StampButton
              label="AGAIN"
              variant="tertiary"
              size="sm"
              accessibilityLabel={`Practice ${exercise.title} again`}
              onPress={() => reopenBlock(index)}
            />
          </>
        )}
      </View>
    </View>
  );
};

interface PlanListProps {
  mode: PlanMode;
}

export const PlanList: React.FC<PlanListProps> = ({ mode }) => {
  const { colors, typography } = useTheme();
  const { blocks, rebuildPlan } = useSession();
  const [pickerOpen, setPickerOpen] = useState(false);

  const totalMinutes = blocks.reduce((sum, b) => sum + b.allocatedMinutes, 0);
  const addButton = (
    <StampButton label="+ ADD FROM LIBRARY" variant="tertiary" size="sm" onPress={() => setPickerOpen(true)} />
  );

  return (
    <CreamBlock>
      <SectionHeader
        title="TODAY'S PLAN"
        meta={`${blocks.length} ${blocks.length === 1 ? 'EXERCISE' : 'EXERCISES'} • ${totalMinutes} MIN`}
      />

      {blocks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[typography.heading, { color: colors.inkBlack }]}>
            No exercises in today's plan.
          </Text>
          <View style={styles.emptyActions}>
            {mode === 'building' && (
              <StampButton label="SUGGEST A PLAN" variant="primary" size="sm" onPress={rebuildPlan} />
            )}
            {addButton}
          </View>
        </View>
      ) : (
        <>
          {blocks.map((block, i) => (
            <PlanRow
              key={block.exerciseId}
              block={block}
              mode={mode}
              isFirst={i === 0}
              isLast={i === blocks.length - 1}
            />
          ))}
          <View style={styles.footer}>{addButton}</View>
        </>
      )}

      <AddFromLibraryModal visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </CreamBlock>
  );
};

const styles = StyleSheet.create({
  row: {
    borderBottomWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 8,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  statusCol: {
    minWidth: 28,
    paddingTop: 2,
  },
  index: {
    fontSize: 13,
  },
  info: {
    flex: 1,
    gap: 6,
  },
  infoPress: {
    flex: 1,
    minHeight: 40,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  spacer: {
    flex: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    fontSize: 15,
  },
  empty: {
    paddingVertical: 8,
    gap: 12,
  },
  emptyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footer: {
    marginTop: 12,
    flexDirection: 'row',
  },
});
