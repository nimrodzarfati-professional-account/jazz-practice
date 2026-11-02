import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';

interface StampToggleProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
  tone?: 'primary' | 'brass' | 'olive';
}

export const StampToggle: React.FC<StampToggleProps> = ({
  label,
  checked,
  onChange,
  hint,
  tone = 'primary',
}) => {
  const { colors, typography } = useTheme();
  const toneColor =
    tone === 'brass' ? colors.tertiary : tone === 'olive' ? colors.olive : colors.primary;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(!checked);
      }}
      style={styles.row}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: colors.inkBlack,
            backgroundColor: checked ? toneColor : colors.cardSurface,
          },
        ]}
      >
        {checked && (
          <Text style={[typography.monoBold, styles.check, { color: colors.onAccent }]}>✓</Text>
        )}
      </View>
      <View style={styles.textCol}>
        <Text style={[typography.stamp, { color: colors.inkBlack }]}>{label}</Text>
        {hint ? (
          <Text style={[typography.mono, styles.hint, { color: colors.inkMuted }]}>{hint}</Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
  },
  box: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    fontSize: 11,
    lineHeight: 13,
  },
  textCol: {
    flexShrink: 1,
  },
  hint: {
    fontSize: 11,
    marginTop: 1,
  },
});
