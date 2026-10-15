import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PitchKey } from '../types/models';
import { useTheme } from '../theme/ThemeContext';

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
          12-KEY CIRCLE STAMP PAD ({masteredKeys.length}/12)
        </Text>
        <Text style={[styles.headerHint, { fontFamily: typography.fontMono, color: colors.inkMuted }]}>
          Tap to ink-stamp
        </Text>
      </View>

      <View style={styles.grid}>
        {CIRCLE_OF_FIFTHS.map((k) => {
          const isStamped = masteredKeys.includes(k);
          return (
            <Pressable
              key={k}
              onPress={() => handlePress(k)}
              style={[
                styles.cell,
                {
                  backgroundColor: isStamped ? colors.recessedSurface : colors.cardSurface,
                  borderColor: isStamped ? colors.secondary : colors.inkBlack,
                  transform: [{ rotate: isStamped ? '-3deg' : '0deg' }],
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
    marginTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    width: '15%',
    aspectRatio: 1.2,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  keyText: {
    fontSize: 13,
  },
  checkMark: {
    position: 'absolute',
    top: 1,
    right: 3,
    fontSize: 9,
    fontWeight: 'bold',
  },
});
