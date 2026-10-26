import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PitchKey } from '../types/models';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const CIRCLE_OF_FIFTHS: PitchKey[] = [
  'C', 'F', 'Bb', 'Eb', 'Ab', 'Db',
  'Gb', 'B', 'E', 'A', 'D', 'G',
];

interface KeyStampGridProps {
  isKeyBased: boolean;
  masteredKeys: PitchKey[];
  onToggleKey: (key: PitchKey) => void;
}

export const KeyStampGrid: React.FC<KeyStampGridProps> = ({
  isKeyBased,
  masteredKeys,
  onToggleKey,
}) => {
  const { colors, typography } = useTheme();
  const { isDesktop } = useResponsiveLayout();

  // Hide completely if the exercise is not key-related
  if (!isKeyBased) {
    return null;
  }

  const handlePress = (key: PitchKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onToggleKey(key);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { borderBottomColor: colors.inkBlack }]}>
        <Text style={[styles.headerTitle, { fontFamily: typography.fontStamp, color: colors.inkBlack }]}>
          12-KEY PROGRESS ({masteredKeys.length}/12)
        </Text>
        <Text style={[styles.headerHint, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
          Tap keys you finished
        </Text>
      </View>

      <View style={styles.grid}>
        {CIRCLE_OF_FIFTHS.map((k) => {
          const isStamped = masteredKeys.includes(k);
          return (
            <Pressable
              key={k}
              accessibilityLabel={`Key of ${k}, ${isStamped ? 'mastered' : 'not mastered'}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isStamped }}
              onPress={() => handlePress(k)}
              style={[
                styles.cell,
                isDesktop ? styles.cellDesktop : styles.cellMobile,
                {
                  backgroundColor: isStamped ? colors.recessedSurface : colors.cardSurface,
                  borderColor: isStamped ? colors.secondary : colors.inkBlack,
                  transform: [{ rotate: isStamped ? '-2deg' : '0deg' }],
                },
              ]}
            >
              <Text
                style={[
                  styles.keyText,
                  {
                    fontFamily: typography.fontMonoBold,
                    color: isStamped ? colors.secondary : colors.inkBlack,
                  },
                ]}
              >
                {k}
              </Text>
              {isStamped && (
                <Text style={[styles.checkMark, { color: colors.secondary }]}>✓</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    paddingBottom: 4,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 12,
    letterSpacing: 1.2,
  },
  headerHint: {
    fontSize: 11,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cell: {
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cellMobile: {
    width: '15%',
    height: 44,
  },
  cellDesktop: {
    width: '15.4%',
    maxWidth: 76,
    height: 46,
  },
  keyText: {
    fontSize: 13,
  },
  checkMark: {
    position: 'absolute',
    top: 2,
    right: 4,
    fontSize: 9,
    fontWeight: 'bold',
  },
});
