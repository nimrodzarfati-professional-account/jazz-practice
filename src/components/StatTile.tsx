import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  tone?: 'ink' | 'primary' | 'brass';
}

export const StatTile: React.FC<StatTileProps> = ({ label, value, sub, tone = 'ink' }) => {
  const { colors, typography } = useTheme();
  const toneColor =
    tone === 'primary' ? colors.primary : tone === 'brass' ? colors.tertiary : colors.inkBlack;

  return (
    <View
      style={[styles.tile, { backgroundColor: colors.recessedSurface, borderColor: colors.inkBlack }]}
    >
      <Text style={[typography.stampSmall, { color: colors.inkMuted }]}>{label}</Text>
      <Text style={[typography.monoBold, styles.value, { color: toneColor }]}>{value}</Text>
      {sub ? (
        <Text style={[typography.mono, styles.sub, { color: colors.inkMuted }]}>{sub}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 96,
    borderWidth: 1.5,
    padding: 10,
  },
  value: {
    fontSize: 20,
    marginTop: 4,
  },
  sub: {
    fontSize: 10,
    marginTop: 2,
  },
});
