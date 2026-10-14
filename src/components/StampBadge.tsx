/**
 * StampBadge — Vintage ink rubber stamp impression badge
 *
 * Small inline badge for exercise categories. Looks like a rubber
 * stamp impression: slightly rotated, tight padding, color-coded
 * by category. Flat — no shadow.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, typography } from '../theme/tokens';
import type { ExerciseCategory, ExerciseContext } from '../types/models';

export type StampBadgeType = ExerciseCategory | ExerciseContext;

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface StampBadgeProps {
  label: string;
  /** Exercise category or context — determines badge color */
  type: StampBadgeType;
}

/* ------------------------------------------------------------------ */
/*  Category / Context → color map                                     */
/* ------------------------------------------------------------------ */

const BADGE_COLORS: Record<StampBadgeType, string> = {
  soloing: colors.primary,      // Sienna #D95D39
  comping: colors.secondary,    // Brass  #D49B35
  maintenance: colors.tertiary, // Olive  #6B705C
  transcribing: colors.secondary,
  new_concept: colors.primary,
};

/* ------------------------------------------------------------------ */
/*  Deterministic rotation seeded from label string                    */
/* ------------------------------------------------------------------ */

function labelRotation(label: string): number {
  // Simple hash → range [-2, +2] degrees
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0;
  }
  // Map to -2..+2
  const normalized = ((hash % 500) / 500) * 4 - 2;
  return Math.round(normalized * 100) / 100;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const StampBadge: React.FC<StampBadgeProps> = ({ label, type }) => {
  const badgeColor = BADGE_COLORS[type];

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

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 0,
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  label: {
    ...typography.stamp,
    fontSize: 10,
    letterSpacing: 1.5,
    lineHeight: 14,
  },
});

export default StampBadge;
