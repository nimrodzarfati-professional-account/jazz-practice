import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import {
  StandardStatus,
  StandardStyle,
  STYLE_CONFIG,
} from '../../types/pokedex';
import { CIRCLE_OF_FIFTHS, PitchKey } from '../../types/models';

export type StatusFilter = 'ALL' | StandardStatus;

interface PokedexFilterBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  styleFilter: 'ALL' | StandardStyle;
  onStyleChange: (style: 'ALL' | StandardStyle) => void;
  keyFilter: 'ALL' | PitchKey;
  onKeyChange: (key: 'ALL' | PitchKey) => void;
  counts: {
    all: number;
    caught: number;
    seen: number;
    locked: number;
  };
}

const ALL_STYLES: StandardStyle[] = [
  'SWING',
  'BOSSA',
  'BEBOP',
  'BLUES',
  'BALLAD',
  'MODAL',
  'WALTZ',
  'LATIN',
  'HARD_BOP',
  'RHYTHM_CHANGES',
];

export const PokedexFilterBar: React.FC<PokedexFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  styleFilter,
  onStyleChange,
  keyFilter,
  onKeyChange,
  counts,
}) => {
  const { colors, typography } = useTheme();

  return (
    <View style={styles.container}>
      {/* Search Input Box */}
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.cardSurface,
            borderColor: colors.inkBlack,
          },
        ]}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          accessibilityLabel="Search jazz standards"
          placeholder="Search by title, composer, or chords..."
          placeholderTextColor={colors.inkMuted}
          value={searchQuery}
          onChangeText={onSearchChange}
          style={[
            styles.input,
            {
              fontFamily: typography.fontMono,
              color: colors.inkBlack,
            },
          ]}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <Pressable
            accessibilityLabel="Clear search"
            onPress={() => onSearchChange('')}
            style={styles.clearBtn}
          >
            <Text style={[typography.monoBold, { color: colors.inkMuted }]}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Repertoire Status Filter Tabs */}
      <View style={styles.statusRow}>
        {(
          [
            { id: 'ALL', label: `ALL (${counts.all})` },
            { id: 'CAUGHT', label: `⭐ KNOWN (${counts.caught})` },
            { id: 'SEEN', label: `👀 TRAINING (${counts.seen})` },
            { id: 'LOCKED', label: `🔒 TO LEARN (${counts.locked})` },
          ] as { id: StatusFilter; label: string }[]
        ).map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
              style={[
                styles.statusTab,
                {
                  borderColor: colors.inkBlack,
                  backgroundColor: isActive
                    ? tab.id === 'CAUGHT'
                      ? colors.primary
                      : tab.id === 'SEEN'
                      ? colors.tertiary
                      : colors.inkBlack
                    : colors.cardSurface,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onStatusChange(tab.id);
              }}
            >
              <Text
                numberOfLines={1}
                style={[
                  typography.stamp,
                  styles.statusTabText,
                  {
                    color: isActive ? colors.onDark : colors.inkBlack,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Style Type Pills Carousel (Pokemon Type Style) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.typeScroll}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="All Styles"
          style={[
            styles.typePill,
            {
              backgroundColor: styleFilter === 'ALL' ? colors.inkBlack : colors.cardSurface,
              borderColor: colors.inkBlack,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onStyleChange('ALL');
          }}
        >
          <Text
            style={[
              typography.stamp,
              styles.typePillText,
              {
                color: styleFilter === 'ALL' ? colors.onDark : colors.inkBlack,
              },
            ]}
          >
            ALL STYLES
          </Text>
        </Pressable>

        {ALL_STYLES.map((style) => {
          const cfg = STYLE_CONFIG[style];
          const isSelected = styleFilter === style;
          return (
            <Pressable
              key={style}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${cfg.label}`}
              style={[
                styles.typePill,
                {
                  backgroundColor: isSelected ? cfg.bg : colors.cardSurface,
                  borderColor: colors.inkBlack,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onStyleChange(isSelected ? 'ALL' : style);
              }}
            >
              <Text style={styles.typePillIcon}>{cfg.icon}</Text>
              <Text
                style={[
                  typography.stamp,
                  styles.typePillText,
                  {
                    color: isSelected ? cfg.text : colors.inkBlack,
                  },
                ]}
              >
                {cfg.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Quick Key Filter Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.keyScroll}
      >
        <Text style={[typography.monoBold, styles.keyPrefix, { color: colors.inkMuted }]}>
          KEY:
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="All Keys"
          style={[
            styles.keyPill,
            {
              backgroundColor: keyFilter === 'ALL' ? colors.inkBlack : colors.cardSurface,
              borderColor: colors.inkBlack,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onKeyChange('ALL');
          }}
        >
          <Text
            style={[
              typography.monoBold,
              styles.keyPillText,
              { color: keyFilter === 'ALL' ? colors.onDark : colors.inkBlack },
            ]}
          >
            ALL
          </Text>
        </Pressable>

        {CIRCLE_OF_FIFTHS.map((key) => {
          const isSelected = keyFilter === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`Filter key of ${key}`}
              style={[
                styles.keyPill,
                {
                  backgroundColor: isSelected ? colors.primary : colors.cardSurface,
                  borderColor: colors.inkBlack,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onKeyChange(isSelected ? 'ALL' : key);
              }}
            >
              <Text
                style={[
                  typography.monoBold,
                  styles.keyPillText,
                  { color: isSelected ? colors.onDark : colors.inkBlack },
                ]}
              >
                {key}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 0,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 2,
  },
  clearBtn: {
    padding: 4,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusTab: {
    flex: 1,
    minHeight: 34,
    borderWidth: 1.5,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 1,
  },
  statusTabText: {
    fontSize: 9.5,
    letterSpacing: 0.4,
  },
  typeScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 9,
    shadowColor: '#000',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 1,
  },
  typePillIcon: {
    fontSize: 11,
  },
  typePillText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  keyScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  keyPrefix: {
    fontSize: 10,
    marginRight: 2,
  },
  keyPill: {
    minWidth: 32,
    height: 26,
    borderWidth: 1.5,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
  },
  keyPillText: {
    fontSize: 11,
  },
});
