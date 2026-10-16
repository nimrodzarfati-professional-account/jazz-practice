/**
 * StampBadge — Vintage ink rubber stamp impression badge
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontFamilies } from '../theme/tokens';
import type { ExerciseCategory, MusicalContext } from '../types/models';

export type StampBadgeType = ExerciseCategory | MusicalContext;

export interface StampBadgeProps {
  label: string;
  type: StampBadgeType;
}

function labelRotation(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0;
  }
  const normalized = ((hash % 500) / 500) * 4 - 2;
  return Math.round(normalized * 100) / 100;
}

export const StampBadge: React.FC<StampBadgeProps> = ({ label, type }) => {
  const { colors } = useTheme();

  const badgeColor = useMemo(() => {
    switch (type) {
      case 'SOLOING':
      case 'TRANSCRIBING':
      case 'NEW_CONCEPT':
        return colors.primary;
      case 'COMPING':
        return colors.tertiary;
      case 'MAINTENANCE':
        return colors.secondary;
      default:
        return colors.primary;
    }
  }, [type, colors]);

  const rotation = useMemo(() => labelRotation(label), [label]);

  const containerStyle: ViewStyle = {
    borderColor: badgeColor,
    transform: [{ rotate: `${rotation}deg` }],
  };

  const textStyle: TextStyle = {
    color: badgeColor,
  };

  return (
    <View style={[styles.badge, containerStyle]}>
      <Text style={[styles.label, textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 0,
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  label: {
    fontFamily: fontFamilies.stamp,
    fontSize: 10,
    letterSpacing: 1.5,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
});

export default StampBadge;
