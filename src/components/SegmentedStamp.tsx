import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface SegmentedStampProps<T extends string> {
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (id: T) => void;
  tone?: 'primary' | 'brass' | 'olive';
  size?: 'sm' | 'md';
  fill?: boolean;
  accessibilityLabel?: string;
}

export function SegmentedStamp<T extends string>({
  options,
  value,
  onChange,
  tone = 'primary',
  size = 'sm',
  fill = false,
  accessibilityLabel,
}: SegmentedStampProps<T>) {
  const { colors, typography } = useTheme();
  const toneColor =
    tone === 'brass' ? colors.tertiary : tone === 'olive' ? colors.olive : colors.primary;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.row, !fill && styles.wrap]}
    >
      {options.map((opt, idx) => {
        const selected = opt.id === value;
        const label = opt.count !== undefined ? `${opt.label} (${opt.count})` : opt.label;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ? `${accessibilityLabel}: ${label}` : label}
            accessibilityState={{ selected }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(opt.id);
            }}
            style={[
              styles.segment,
              { minHeight: size === 'md' ? 44 : 36 },
              fill && styles.fill,
              idx > 0 && styles.joined,
              {
                borderColor: colors.inkBlack,
                backgroundColor: selected ? toneColor : colors.cardSurface,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                typography.stamp,
                { color: selected ? colors.onAccent : colors.inkBlack },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  wrap: {
    flexWrap: 'wrap',
  },
  segment: {
    borderWidth: 1.5,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
    paddingHorizontal: 4,
  },
  joined: {
    marginLeft: -1.5,
  },
});
