import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';

interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  step: number;
  min: number;
  max: number;
  format?: (value: number) => string;
  size?: 'sm' | 'md';
  accessibilityLabel: string;
}

export const Stepper: React.FC<StepperProps> = ({
  value,
  onChange,
  step,
  min,
  max,
  format,
  size = 'sm',
  accessibilityLabel,
}) => {
  const { colors, typography } = useTheme();
  const box = size === 'md' ? 44 : 36;
  const canDecrease = value > min;
  const canIncrease = value < max;

  const change = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta));
    if (next === value) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(next);
  };

  const renderButton = (glyph: string, delta: number, enabled: boolean, verb: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${verb} ${accessibilityLabel}`}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={() => change(delta)}
      style={[
        styles.btn,
        {
          width: box,
          height: box,
          borderColor: colors.inkBlack,
          backgroundColor: colors.recessedSurface,
          opacity: enabled ? 1 : 0.4,
        },
      ]}
    >
      <Text style={[typography.monoBold, styles.glyph, { color: colors.inkBlack }]}>{glyph}</Text>
    </Pressable>
  );

  return (
    <View style={styles.row} accessibilityLabel={accessibilityLabel}>
      {renderButton('−', -step, canDecrease, 'Decrease')}
      <View
        style={[
          styles.valueBox,
          { height: box, borderColor: colors.inkBlack, backgroundColor: colors.cardSurface },
        ]}
      >
        <Text style={[typography.monoBold, styles.value, { color: colors.inkBlack }]}>
          {format ? format(value) : String(value)}
        </Text>
      </View>
      {renderButton('+', step, canIncrease, 'Increase')}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btn: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 16,
  },
  valueBox: {
    minWidth: 54,
    paddingHorizontal: 6,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 13,
  },
});
