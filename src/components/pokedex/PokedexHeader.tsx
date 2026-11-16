import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { PokedexStats } from '../../types/pokedex';

interface PokedexHeaderProps {
  stats: PokedexStats;
  onOpenJamCaller: () => void;
  onOpenAddStandard: () => void;
}

export const PokedexHeader: React.FC<PokedexHeaderProps> = ({
  stats,
  onOpenJamCaller,
  onOpenAddStandard,
}) => {
  const { colors, typography } = useTheme();

  return (
    <View style={[styles.casing, { borderColor: colors.inkBlack }]}>
      {/* Top Bezel: Pokédex Camera Sensor & Status LEDs */}
      <View style={styles.topBezel}>
        <View style={styles.sensorCluster}>
          {/* Big Blue Lens */}
          <View style={styles.bigLensOuter}>
            <View style={styles.bigLensInner}>
              <View style={styles.lensGlare} />
            </View>
          </View>

          {/* Three Mini LEDs */}
          <View style={styles.miniLeds}>
            <View style={[styles.led, styles.ledRed]} />
            <View style={[styles.led, styles.ledAmber]} />
            <View style={[styles.led, styles.ledGreen]} />
          </View>
        </View>

        {/* Quick Header Actions */}
        <View style={styles.headerButtons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Jam Session Caller"
            style={({ pressed }) => [
              styles.jamButton,
              {
                backgroundColor: colors.tertiary,
                borderColor: colors.inkBlack,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onOpenJamCaller();
            }}
          >
            <Text style={styles.jamButtonIcon}>⚡</Text>
            <Text style={[typography.stamp, styles.jamButtonText, { color: colors.inkBlack }]}>
              JAM CALLER
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add Standard"
            style={({ pressed }) => [
              styles.addButton,
              {
                backgroundColor: colors.cardSurface,
                borderColor: colors.inkBlack,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenAddStandard();
            }}
          >
            <Text style={[typography.stamp, styles.addButtonText, { color: colors.inkBlack }]}>
              + ADD
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Retro LCD Screen Bezel for Pokédex Stats */}
      <View style={[styles.screenFrame, { borderColor: colors.inkBlack }]}>
        <View style={styles.screenInner}>
          <View style={styles.titleRow}>
            <View>
              <Text style={[typography.title, styles.title, { color: '#E8F5E9' }]}>
                JAZZ-DEX
              </Text>
              <Text style={[typography.mono, styles.subtitle, { color: '#A5D6A7' }]}>
                STANDARDS REPERTOIRE ENCYCLOPEDIA
              </Text>
            </View>

            <View style={styles.counterBox}>
              <Text style={[typography.stamp, styles.counterNumber, { color: '#FFE082' }]}>
                {stats.caughtCount} / {stats.totalCount}
              </Text>
              <Text style={[typography.monoBold, styles.counterLabel, { color: '#CFD8DC' }]}>
                KNOWN ({stats.completionPercentage}%)
              </Text>
            </View>
          </View>

          {/* Retro Progress EXP Bar */}
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, Math.max(2, stats.completionPercentage))}%` },
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={[typography.mono, styles.progressLabelText, { color: '#90A4AE' }]}>
                CAUGHT: {stats.caughtCount}
              </Text>
              <Text style={[typography.mono, styles.progressLabelText, { color: '#90A4AE' }]}>
                IN TRAINING: {stats.seenCount}
              </Text>
              <Text style={[typography.mono, styles.progressLabelText, { color: '#90A4AE' }]}>
                TO LEARN: {stats.lockedCount}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  casing: {
    backgroundColor: '#9E2A2B', // Vintage Oxblood Crimson Pokédex Casing
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 0,
    elevation: 4,
  },
  topBezel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sensorCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bigLensOuter: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F4EFE6',
    borderWidth: 2,
    borderColor: '#181512',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigLensInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E88E5',
    borderWidth: 1.5,
    borderColor: '#0D47A1',
    position: 'relative',
    overflow: 'hidden',
  },
  lensGlare: {
    position: 'absolute',
    top: 3,
    left: 4,
    width: 8,
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  miniLeds: {
    flexDirection: 'row',
    gap: 6,
  },
  led: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#181512',
  },
  ledRed: {
    backgroundColor: '#EF5350',
  },
  ledAmber: {
    backgroundColor: '#FFCA28',
  },
  ledGreen: {
    backgroundColor: '#66BB6A',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  jamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderRadius: 4,
    shadowColor: '#181512',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  jamButtonIcon: {
    fontSize: 13,
  },
  jamButtonText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  addButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderRadius: 4,
    shadowColor: '#181512',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  addButtonText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  screenFrame: {
    backgroundColor: '#1B261D', // Retro Dark LCD Screen
    borderWidth: 2,
    borderRadius: 6,
    padding: 10,
  },
  screenInner: {
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 20,
    letterSpacing: 1.2,
  },
  subtitle: {
    fontSize: 9,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  counterBox: {
    alignItems: 'flex-end',
  },
  counterNumber: {
    fontSize: 17,
    letterSpacing: 0.8,
  },
  counterLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  progressBarWrapper: {
    gap: 4,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#0D140E',
    borderWidth: 1,
    borderColor: '#37474F',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelText: {
    fontSize: 9,
  },
});
