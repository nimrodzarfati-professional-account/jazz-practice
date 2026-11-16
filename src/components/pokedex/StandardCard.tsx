import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import {
  PokedexStandard,
  STYLE_CONFIG,
  TIER_CONFIG,
} from '../../types/pokedex';

interface StandardCardProps {
  standard: PokedexStandard;
  onPress: () => void;
  onToggleCaught: () => void;
  isActiveCurrentWeek?: boolean;
}

export const StandardCard: React.FC<StandardCardProps> = ({
  standard,
  onPress,
  onToggleCaught,
  isActiveCurrentWeek = false,
}) => {
  const { colors, typography } = useTheme();

  const isCaught = standard.status === 'CAUGHT';
  const isSeen = standard.status === 'SEEN';
  const isLocked = standard.status === 'LOCKED';

  const tierCfg = TIER_CONFIG[standard.tier];
  const dexNumStr = `#${String(standard.dexNumber).padStart(3, '0')}`;

  const handleToggle = (e: any) => {
    e.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleCaught();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Standard ${standard.title}, status: ${standard.status}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isCaught
            ? colors.cardSurface
            : isSeen
            ? '#EFE8DA'
            : '#D9D0C1',
          borderColor: colors.inkBlack,
          opacity: isLocked ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      {/* Top Header Row: Dex #, Tier, Status Stamp, and 1-Tap Toggle */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={[typography.monoBold, styles.dexNum, { color: colors.inkMuted }]}>
            {dexNumStr}
          </Text>
          <View
            style={[
              styles.tierBadge,
              { backgroundColor: tierCfg.color, borderColor: colors.inkBlack },
            ]}
          >
            <Text style={[typography.monoBold, styles.tierText]}>
              {tierCfg.badge}
            </Text>
          </View>
          {isActiveCurrentWeek && (
            <View style={[styles.activeFocusBadge, { borderColor: colors.inkBlack }]}>
              <Text style={[typography.stamp, styles.activeFocusText]}>THIS WEEK</Text>
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isCaught ? 'Mark as to-learn' : 'Mark as known'}
          onPress={handleToggle}
          style={[
            styles.statusStamp,
            {
              backgroundColor: isCaught
                ? '#9E2A2B' // Pokeball red
                : isSeen
                ? colors.tertiary
                : colors.recessedSurface,
              borderColor: colors.inkBlack,
            },
          ]}
        >
          <Text
            style={[
              typography.stamp,
              styles.statusStampText,
              {
                color: isCaught ? '#F4EFE6' : colors.inkBlack,
              },
            ]}
          >
            {isCaught ? '★ CAUGHT' : isSeen ? '👀 IN SHED' : '○ UNKNOWN'}
          </Text>
        </Pressable>
      </View>

      {/* Main Standard Title & Composer */}
      <View style={styles.titleSection}>
        <Text
          numberOfLines={1}
          style={[
            typography.title,
            styles.titleText,
            {
              color: isLocked ? colors.inkMuted : colors.inkBlack,
            },
          ]}
        >
          {standard.title}
        </Text>
        <Text style={[typography.mono, styles.composerText, { color: colors.inkMuted }]}>
          {standard.composer} • {standard.year}
        </Text>
      </View>

      {/* Type Badges Row (Pokémon style types: Swing, Bossa, etc.) */}
      <View style={styles.badgeRow}>
        {standard.types.map((t) => {
          const cfg = STYLE_CONFIG[t];
          return (
            <View
              key={t}
              style={[
                styles.typeBadge,
                {
                  backgroundColor: cfg.bg,
                  borderColor: colors.inkBlack,
                },
              ]}
            >
              <Text style={styles.typeIcon}>{cfg.icon}</Text>
              <Text style={[typography.stamp, styles.typeText, { color: cfg.text }]}>
                {cfg.label}
              </Text>
            </View>
          );
        })}

        {/* Default Key Badge */}
        <View
          style={[
            styles.keyBadge,
            {
              backgroundColor: colors.primary,
              borderColor: colors.inkBlack,
            },
          ]}
        >
          <Text style={[typography.monoBold, styles.keyText, { color: colors.onDark }]}>
            KEY {standard.defaultKey}
          </Text>
        </View>

        {/* Form & Tempo */}
        <View style={styles.metaPill}>
          <Text style={[typography.mono, styles.metaPillText, { color: colors.inkMuted }]}>
            {standard.tempoLabel} • {standard.form}
          </Text>
        </View>
      </View>

      {/* Chords preview or quick call hook */}
      <View
        style={[
          styles.chordsBox,
          {
            backgroundColor: isCaught ? '#ECE5D8' : '#D1C8B7',
            borderColor: colors.inkBlack,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            typography.mono,
            styles.chordsText,
            { color: isLocked ? colors.inkMuted : colors.inkBlack },
          ]}
        >
          ♫ {standard.firstChords}
        </Text>
      </View>

      {/* Footer Info: Mastered Keys & Jam Readiness */}
      <View style={styles.footerRow}>
        <Text style={[typography.mono, styles.footerMeta, { color: colors.inkMuted }]}>
          {standard.masteredKeys?.length
            ? `Known in ${standard.masteredKeys.length} key${
                standard.masteredKeys.length > 1 ? 's' : ''
              } (${standard.masteredKeys.join(', ')})`
            : `Default key: ${standard.defaultKey}`}
        </Text>

        <Text style={[typography.stampSmall, styles.callTip, { color: colors.tertiary }]}>
          CALL GUIDE →
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 0,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dexNum: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  tierBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 9,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  activeFocusBadge: {
    backgroundColor: '#FFE082',
    borderWidth: 1,
    borderRadius: 3,
    paddingVertical: 1,
    paddingHorizontal: 5,
  },
  activeFocusText: {
    fontSize: 8.5,
    color: '#181512',
    letterSpacing: 0.5,
  },
  statusStamp: {
    borderWidth: 1.5,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
  },
  statusStampText: {
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  titleSection: {
    gap: 2,
  },
  titleText: {
    fontSize: 18,
    lineHeight: 22,
  },
  composerText: {
    fontSize: 11,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  typeIcon: {
    fontSize: 9.5,
  },
  typeText: {
    fontSize: 9,
    letterSpacing: 0.4,
  },
  keyBadge: {
    borderWidth: 1,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  keyText: {
    fontSize: 9.5,
    letterSpacing: 0.4,
  },
  metaPill: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  metaPillText: {
    fontSize: 10,
  },
  chordsBox: {
    borderWidth: 1,
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  chordsText: {
    fontSize: 10.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  footerMeta: {
    fontSize: 10,
    flex: 1,
  },
  callTip: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
