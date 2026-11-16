import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import {
  PokedexStandard,
  StandardStyle,
} from '../../types/pokedex';
import { PitchKey, CIRCLE_OF_FIFTHS } from '../../types/models';
import { StampModal } from '../StampModal';
import { StampButton } from '../StampButton';

interface JamSessionModalProps {
  visible: boolean;
  onClose: () => void;
  standards: PokedexStandard[];
  onSetAsActiveStandard: (standard: PokedexStandard) => void;
  onOpenStandardDetail: (standard: PokedexStandard) => void;
}

export const JamSessionModal: React.FC<JamSessionModalProps> = ({
  visible,
  onClose,
  standards,
  onSetAsActiveStandard,
  onOpenStandardDetail,
}) => {
  const { colors, typography } = useTheme();

  const [selectedStyle, setSelectedStyle] = useState<'ALL' | StandardStyle>('ALL');
  const [selectedKey, setSelectedKey] = useState<'ALL' | PitchKey>('ALL');
  const [onlyCaught, setOnlyCaught] = useState(true);
  const [rolledStandard, setRolledStandard] = useState<PokedexStandard | null>(null);

  // Eligible tunes pool
  const candidatePool = useMemo(() => {
    return standards.filter((s) => {
      if (onlyCaught && s.status !== 'CAUGHT') return false;
      if (selectedStyle !== 'ALL' && !s.types.includes(selectedStyle)) return false;
      if (selectedKey !== 'ALL' && s.defaultKey !== selectedKey && !s.masteredKeys?.includes(selectedKey)) {
        return false;
      }
      return true;
    });
  }, [standards, onlyCaught, selectedStyle, selectedKey]);

  const handleRollTune = () => {
    if (candidatePool.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Pick random from pool (different from currently rolled if possible)
    let pick: PokedexStandard;
    if (candidatePool.length === 1) {
      pick = candidatePool[0];
    } else {
      const filtered = candidatePool.filter((s) => s.id !== rolledStandard?.id);
      pick = filtered[Math.floor(Math.random() * filtered.length)];
    }
    setRolledStandard(pick);
  };

  return (
    <StampModal
      visible={visible}
      title="JAM SESSION CALLER"
      subtitle="Standing on the bandstand? Roll a standard from your repertoire to suggest to the band."
      onClose={onClose}
      actions={
        <>
          <StampButton
            label="I CHOOSE YOU! ⚡"
            variant="primary"
            disabled={candidatePool.length === 0}
            onPress={handleRollTune}
          />
          <StampButton label="DONE" variant="tertiary" onPress={onClose} />
        </>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Pool Filtering Controls */}
        <View
          style={[
            styles.filterBox,
            { backgroundColor: colors.cardSurface, borderColor: colors.inkBlack },
          ]}
        >
          {/* Repertoire Scope Toggle */}
          <View style={styles.scopeRow}>
            <Text style={[typography.stamp, styles.scopeLabel, { color: colors.inkBlack }]}>
              SUGGEST FROM:
            </Text>
            <View style={styles.toggleRow}>
              <Pressable
                style={[
                  styles.togglePill,
                  {
                    backgroundColor: onlyCaught ? colors.primary : colors.cardSurface,
                    borderColor: colors.inkBlack,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setOnlyCaught(true);
                }}
              >
                <Text
                  style={[
                    typography.stamp,
                    styles.togglePillText,
                    { color: onlyCaught ? colors.onDark : colors.inkBlack },
                  ]}
                >
                  KNOWN TUNES ONLY
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.togglePill,
                  {
                    backgroundColor: !onlyCaught ? colors.inkBlack : colors.cardSurface,
                    borderColor: colors.inkBlack,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setOnlyCaught(false);
                }}
              >
                <Text
                  style={[
                    typography.stamp,
                    styles.togglePillText,
                    { color: !onlyCaught ? colors.onDark : colors.inkBlack },
                  ]}
                >
                  ENTIRE DEX
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Style Filter Pills */}
          <View style={styles.styleSection}>
            <Text style={[typography.monoBold, styles.filterHeading, { color: colors.inkMuted }]}>
              DESIRED FEEL:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
              {(['ALL', 'SWING', 'BOSSA', 'BEBOP', 'BLUES', 'BALLAD', 'WALTZ', 'LATIN'] as (
                | 'ALL'
                | StandardStyle
              )[]).map((st) => {
                const isSelected = selectedStyle === st;
                return (
                  <Pressable
                    key={st}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: isSelected ? colors.tertiary : colors.cardSurface,
                        borderColor: colors.inkBlack,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedStyle(st);
                    }}
                  >
                    <Text
                      style={[
                        typography.stamp,
                        styles.filterPillText,
                        { color: colors.inkBlack },
                      ]}
                    >
                      {st}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Key Filter */}
          <View style={styles.keySection}>
            <Text style={[typography.monoBold, styles.filterHeading, { color: colors.inkMuted }]}>
              DESIRED KEY:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
              {(['ALL', ...CIRCLE_OF_FIFTHS] as ('ALL' | PitchKey)[]).map((k) => {
                const isSelected = selectedKey === k;
                return (
                  <Pressable
                    key={k}
                    style={[
                      styles.keyPill,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.cardSurface,
                        borderColor: colors.inkBlack,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedKey(k);
                    }}
                  >
                    <Text
                      style={[
                        typography.monoBold,
                        styles.keyPillText,
                        { color: isSelected ? colors.onDark : colors.inkBlack },
                      ]}
                    >
                      {k}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <Text style={[typography.mono, styles.poolCount, { color: colors.inkMuted }]}>
            Pool size: {candidatePool.length} standard{candidatePool.length === 1 ? '' : 's'} available
          </Text>
        </View>

        {/* Rolled Standard Presentation Card */}
        {rolledStandard ? (
          <View
            style={[
              styles.chosenCard,
              {
                backgroundColor: '#FFFDF9',
                borderColor: colors.inkBlack,
              },
            ]}
          >
            {/* Pokédex Retro Tag */}
            <View style={styles.chosenHeader}>
              <View style={styles.chosenTag}>
                <Text style={[typography.monoBold, styles.chosenTagText]}>
                  ★ SUGGESTED TUNE
                </Text>
              </View>
              <Text style={[typography.monoBold, styles.dexNumText, { color: colors.inkMuted }]}>
                #{String(rolledStandard.dexNumber).padStart(3, '0')}
              </Text>
            </View>

            {/* Standard Title & Composer */}
            <Text style={[typography.title, styles.chosenTitle, { color: colors.inkBlack }]}>
              {rolledStandard.title}
            </Text>
            <Text style={[typography.mono, styles.chosenComposer, { color: colors.inkMuted }]}>
              {rolledStandard.composer} ({rolledStandard.year})
            </Text>

            {/* Callout: What to announce to band */}
            <View
              style={[
                styles.bandCallBox,
                { backgroundColor: '#FAF5EE', borderColor: colors.inkBlack },
              ]}
            >
              <Text style={[typography.stamp, styles.callHeading, { color: colors.secondary }]}>
                🎤 WHAT TO CALL ON BANDSTAND:
              </Text>
              <Text style={[typography.title, styles.callScript, { color: colors.inkBlack }]}>
                "{rolledStandard.title} in {rolledStandard.defaultKey}!"
              </Text>
              <Text style={[typography.monoBold, styles.callMeta, { color: colors.inkBlack }]}>
                Feel: {rolledStandard.tempoLabel} (♩ {rolledStandard.tempoBpm}) • Form: {rolledStandard.form}
              </Text>
            </View>

            {/* Opening hook chords */}
            <View style={styles.hookSection}>
              <Text style={[typography.monoBold, styles.hookLabel, { color: colors.inkMuted }]}>
                CHORD HOOK:
              </Text>
              <Text style={[typography.monoBold, styles.hookChords, { color: colors.primary }]}>
                {rolledStandard.firstChords}
              </Text>
            </View>

            {/* Jam Instructions */}
            <View style={styles.instructionSection}>
              <Text style={[typography.monoBold, styles.instructionLabel, { color: colors.inkMuted }]}>
                ARRANGEMENT TIP:
              </Text>
              <Text style={[typography.mono, styles.instructionBody, { color: colors.inkBlack }]}>
                {rolledStandard.jamCallNotes}
              </Text>
            </View>

            {/* Actions for Rolled Standard */}
            <View style={styles.chosenActions}>
              <StampButton
                label="ROLL ANOTHER 🎲"
                variant="tertiary"
                size="sm"
                onPress={handleRollTune}
              />
              <StampButton
                label="VIEW DETAILS 📖"
                variant="tertiary"
                size="sm"
                onPress={() => {
                  onClose();
                  onOpenStandardDetail(rolledStandard);
                }}
              />
              <StampButton
                label="SHED THIS WEEK 🎯"
                variant="secondary"
                size="sm"
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  onSetAsActiveStandard(rolledStandard);
                  onClose();
                }}
              />
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.emptyState,
              { backgroundColor: colors.cardSurface, borderColor: colors.inkBlack },
            ]}
          >
            <Text style={styles.emptyIcon}>🎷</Text>
            <Text style={[typography.title, styles.emptyTitle, { color: colors.inkBlack }]}>
              WHO'S THAT STANDARD?
            </Text>
            <Text style={[typography.mono, styles.emptyBody, { color: colors.inkMuted }]}>
              Tap the button below to randomly draw a tune from your repertoire with ready-to-call bandstand cues!
            </Text>
          </View>
        )}
      </ScrollView>
    </StampModal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingBottom: 8,
  },
  filterBox: {
    borderWidth: 1.5,
    borderRadius: 6,
    padding: 10,
    gap: 10,
  },
  scopeRow: {
    gap: 4,
  },
  scopeLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  togglePill: {
    flex: 1,
    minHeight: 30,
    borderWidth: 1.5,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  togglePillText: {
    fontSize: 9.5,
    letterSpacing: 0.4,
  },
  styleSection: {
    gap: 4,
  },
  keySection: {
    gap: 4,
  },
  filterHeading: {
    fontSize: 9.5,
    letterSpacing: 0.4,
  },
  pillRow: {
    flexDirection: 'row',
  },
  filterPill: {
    borderWidth: 1.5,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: 6,
  },
  filterPillText: {
    fontSize: 9.5,
    letterSpacing: 0.4,
  },
  keyPill: {
    minWidth: 28,
    height: 24,
    borderWidth: 1.5,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginRight: 5,
  },
  keyPillText: {
    fontSize: 10,
  },
  poolCount: {
    fontSize: 10,
  },
  chosenCard: {
    borderWidth: 2,
    borderRadius: 6,
    padding: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 0,
    elevation: 4,
  },
  chosenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chosenTag: {
    backgroundColor: '#9E2A2B',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  chosenTagText: {
    color: '#FFF',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  dexNumText: {
    fontSize: 11,
  },
  chosenTitle: {
    fontSize: 22,
    lineHeight: 26,
  },
  chosenComposer: {
    fontSize: 11,
  },
  bandCallBox: {
    borderWidth: 1.5,
    borderRadius: 5,
    padding: 10,
    gap: 4,
  },
  callHeading: {
    fontSize: 10,
    letterSpacing: 0.6,
  },
  callScript: {
    fontSize: 18,
    lineHeight: 22,
  },
  callMeta: {
    fontSize: 10.5,
  },
  hookSection: {
    gap: 2,
  },
  hookLabel: {
    fontSize: 9.5,
  },
  hookChords: {
    fontSize: 12,
  },
  instructionSection: {
    gap: 2,
  },
  instructionLabel: {
    fontSize: 9.5,
  },
  instructionBody: {
    fontSize: 11,
    lineHeight: 16,
  },
  chosenActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  emptyState: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
