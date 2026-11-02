/**
 * StampBadge — Vintage ink rubber stamp impression badge
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontFamilies } from '../theme/tokens';
import type { ExerciseCategory, MusicalContext } from '../types/models';

export type StampBadgeType = ExerciseCategory | MusicalContext;
export type StampBadgeTone = 'primary' | 'secondary' | 'brass' | 'olive' | 'neutral';

export interface StampBadgeProps {
  label: string;
  type?: StampBadgeType;
  tone?: StampBadgeTone;
  filled?: boolean;
}

function labelRotation(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0;
  }
  const normalized = ((hash % 500) / 500) * 4 - 2;
  return Math.round(normalized * 100) / 100;
}

function toneForType(type: StampBadgeType | undefined): StampBadgeTone {
  switch (type) {
    case 'SOLOING':
    case 'NEW_CONCEPT':
      return 'primary';
    case 'COMPING':
    case 'TRANSCRIBING':
      return 'brass';
    case 'MAINTENANCE':
      return 'olive';
    default:
      return 'primary';
  }
}

export const StampBadge: React.FC<StampBadgeProps> = ({ label, type, tone, filled = false }) => {
  const { colors } = useTheme();
  const resolvedTone = tone ?? toneForType(type);

  const toneColor = useMemo(() => {
    switch (resolvedTone) {
      case 'secondary':
        return colors.secondary;
      case 'brass':
        return colors.tertiary;
      case 'olive':
        return colors.olive;
      case 'neutral':
        return colors.inkMuted;
      default:
        return colors.primary;
    }
  }, [resolvedTone, colors]);

  const filledTextColor =
    resolvedTone === 'secondary'
      ? colors.onDark
      : resolvedTone === 'neutral'
      ? colors.cardSurface
      : colors.onAccent;

  const rotation = useMemo(() => labelRotation(label), [label]);

  const containerStyle: ViewStyle = {
    borderColor: toneColor,
    backgroundColor: filled ? toneColor : 'transparent',
    transform: [{ rotate: `${rotation}deg` }],
  };

  const textStyle: TextStyle = {
    color: filled ? filledTextColor : toneColor,
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
  },
});

export default StampBadge;
