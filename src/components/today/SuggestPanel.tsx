import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useSession } from '../../session/SessionContext';
import { MusicalContext } from '../../types/models';
import { CreamBlock } from '../CreamBlock';
import { SegmentedStamp } from '../SegmentedStamp';
import { StudioFader } from '../StudioFader';
import { StampButton } from '../StampButton';

const PRESETS = [
  { id: 'quick', label: 'QUICK 20', minutes: 20, intensity: 3 },
  { id: 'regular', label: 'REGULAR 45', minutes: 45, intensity: 3 },
  { id: 'long', label: 'LONG 90', minutes: 90, intensity: 4 },
] as const;
type PresetId = (typeof PRESETS)[number]['id'];

type FocusId = 'ALL' | MusicalContext;
const FOCUS_OPTIONS: { id: FocusId; label: string }[] = [
  { id: 'ALL', label: 'ALL' },
  { id: 'SOLOING', label: 'SOLOING' },
  { id: 'COMPING', label: 'COMPING' },
];

export const SuggestPanel: React.FC = () => {
  const { colors, typography } = useTheme();
  const { config, plan, setConfig, rebuildPlan } = useSession();
  const isEmpty = plan.blocks.length === 0;
  // Open while the inputs still drive the plan; collapsed once the user has made it their own
  const [expanded, setExpanded] = useState(isEmpty || !plan.isCustomized);

  useEffect(() => {
    if (isEmpty) setExpanded(true);
  }, [isEmpty]);

  const activePreset =
    PRESETS.find((p) => p.minutes === config.availableMinutes && p.intensity === config.intensity)?.id ??
    null;
  const focusText = config.contextFilter === 'ALL' ? 'ALL FOCUS' : config.contextFilter;

  const toggleLink = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={expanded ? 'Hide plan settings' : 'Adjust plan settings'}
      accessibilityState={{ expanded }}
      onPress={() => setExpanded(!expanded)}
      style={styles.link}
    >
      <Text style={[typography.stamp, { color: colors.primary }]}>
        {expanded ? 'HIDE ▴' : 'ADJUST ▾'}
      </Text>
    </Pressable>
  );

  return (
    <CreamBlock>
      <View style={styles.summaryRow}>
        <Text style={[typography.stamp, styles.summaryText, { color: colors.inkBlack }]}>
          SUGGESTION • {config.availableMinutes} MIN • ENERGY {config.intensity} • {focusText}
        </Text>
        {toggleLink}
      </View>

      {expanded && (
        <View style={styles.body}>
          <SegmentedStamp<PresetId>
            accessibilityLabel="Preset"
            options={PRESETS.map((p) => ({ id: p.id, label: p.label }))}
            value={activePreset}
            onChange={(id) => {
              const preset = PRESETS.find((p) => p.id === id)!;
              setConfig({ availableMinutes: preset.minutes, intensity: preset.intensity });
            }}
            fill
          />

          <View style={styles.faders}>
            <StudioFader
              label="TIME"
              value={config.availableMinutes}
              min={15}
              max={120}
              step={5}
              unit="min"
              height={150}
              accentColor={colors.primary}
              onChange={(v) => setConfig({ availableMinutes: v })}
            />
            <StudioFader
              label="ENERGY"
              value={config.intensity}
              min={1}
              max={5}
              step={1}
              unit="/ 5"
              height={150}
              accentColor={colors.tertiary}
              onChange={(v) => setConfig({ intensity: v })}
            />
          </View>

          <View style={styles.focusRow}>
            <Text style={[typography.stamp, { color: colors.inkBlack }]}>FOCUS</Text>
            <View style={styles.focusSegments}>
              <SegmentedStamp<FocusId>
                accessibilityLabel="Focus"
                options={FOCUS_OPTIONS}
                value={config.contextFilter}
                onChange={(id) => setConfig({ contextFilter: id })}
                fill
              />
            </View>
          </View>

          {plan.isCustomized && (
            <View style={styles.rebuildRow}>
              <StampButton label="REBUILD PLAN" variant="tertiary" size="sm" onPress={rebuildPlan} />
              <Text style={[typography.mono, { color: colors.inkMuted }]}>Replaces your edits</Text>
            </View>
          )}
        </View>
      )}
    </CreamBlock>
  );
};

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    flex: 1,
  },
  link: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  body: {
    marginTop: 10,
    gap: 12,
  },
  faders: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  focusSegments: {
    flex: 1,
  },
  rebuildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
