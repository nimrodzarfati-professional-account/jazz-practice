import React, { useState, useEffect } from 'react';
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
  PokedexStandard,
  STYLE_CONFIG,
  TIER_CONFIG,
} from '../../types/pokedex';
import { PitchKey } from '../../types/models';
import { StampModal } from '../StampModal';
import { StampButton } from '../StampButton';
import { KeyStampGrid } from '../KeyStampGrid';

interface StandardDetailModalProps {
  standard: PokedexStandard | null;
  visible: boolean;
  onClose: () => void;
  onToggleCaught: (id: string) => void;
  onUpdateKeys: (id: string, keys: PitchKey[]) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onSetAsActiveStandard: (standard: PokedexStandard) => void;
  isActiveStandard: boolean;
}

export const StandardDetailModal: React.FC<StandardDetailModalProps> = ({
  standard,
  visible,
  onClose,
  onToggleCaught,
  onUpdateKeys,
  onUpdateNotes,
  onSetAsActiveStandard,
  isActiveStandard,
}) => {
  const { colors, typography } = useTheme();

  const [notes, setNotes] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<PitchKey[]>([]);

  useEffect(() => {
    if (standard) {
      setNotes(standard.personalNotes || '');
      setSelectedKeys(standard.masteredKeys || []);
    }
  }, [standard]);

  if (!standard) return null;

  const isCaught = standard.status === 'CAUGHT';
  const tierCfg = TIER_CONFIG[standard.tier];
  const dexNumStr = `#${String(standard.dexNumber).padStart(3, '0')}`;

  const handleToggleKey = (key: PitchKey) => {
    const next = selectedKeys.includes(key)
      ? selectedKeys.filter((k) => k !== key)
      : [...selectedKeys, key];
    setSelectedKeys(next);
    onUpdateKeys(standard.id, next);
  };

  const handleSaveNotes = () => {
    onUpdateNotes(standard.id, notes);
  };

  return (
    <StampModal
      visible={visible}
      title={`${dexNumStr} • ${standard.title.toUpperCase()}`}
      subtitle={`${standard.composer} (${standard.year})`}
      onClose={onClose}
      actions={
        <>
          <StampButton
            label={isActiveStandard ? 'CURRENT ACTIVE TUNE' : 'SET AS ACTIVE TUNE'}
            variant={isActiveStandard ? 'secondary' : 'primary'}
            disabled={isActiveStandard}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onSetAsActiveStandard(standard);
              onClose();
            }}
          />
          <StampButton label="DONE" variant="tertiary" onPress={onClose} />
        </>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Toggle Box */}
        <View
          style={[
            styles.statusBox,
            {
              backgroundColor: isCaught ? '#F4EFE6' : '#E8DFD3',
              borderColor: colors.inkBlack,
            },
          ]}
        >
          <View style={styles.statusInfo}>
            <Text style={[typography.stamp, styles.statusLabel, { color: colors.inkBlack }]}>
              REPERTOIRE STATUS:
            </Text>
            <Text
              style={[
                typography.monoBold,
                styles.statusValue,
                { color: isCaught ? colors.secondary : colors.inkMuted },
              ]}
            >
              {isCaught
                ? '★ CAUGHT (READY FOR JAMS)'
                : standard.status === 'SEEN'
                ? '👀 IN ROTATION / TRAINING'
                : '○ LOCKED (NOT YET LEARNED)'}
            </Text>
            {standard.unlockedAt && (
              <Text style={[typography.mono, styles.unlockedDate, { color: colors.inkMuted }]}>
                Mastered: {new Date(standard.unlockedAt).toLocaleDateString()}
              </Text>
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isCaught ? 'Mark as to learn' : 'Mark as caught'}
            style={[
              styles.catchToggleBtn,
              {
                backgroundColor: isCaught ? '#9E2A2B' : colors.primary,
                borderColor: colors.inkBlack,
              },
            ]}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onToggleCaught(standard.id);
            }}
          >
            <Text style={[typography.stamp, styles.catchToggleBtnText, { color: '#F4EFE6' }]}>
              {isCaught ? '✓ CAUGHT' : '+ CATCH TUNE'}
            </Text>
          </Pressable>
        </View>

        {/* Style & Difficulty Badges */}
        <View style={styles.metaRow}>
          {standard.types.map((t) => {
            const cfg = STYLE_CONFIG[t];
            return (
              <View
                key={t}
                style={[
                  styles.stylePill,
                  { backgroundColor: cfg.bg, borderColor: colors.inkBlack },
                ]}
              >
                <Text style={styles.stylePillIcon}>{cfg.icon}</Text>
                <Text style={[typography.stamp, styles.stylePillText, { color: cfg.text }]}>
                  {cfg.label}
                </Text>
              </View>
            );
          })}

          <View
            style={[
              styles.tierPill,
              { backgroundColor: tierCfg.color, borderColor: colors.inkBlack },
            ]}
          >
            <Text style={[typography.monoBold, styles.tierPillText]}>
              {tierCfg.badge}
            </Text>
          </View>
        </View>

        {/* Musical Spec Grid */}
        <View
          style={[
            styles.specsGrid,
            {
              backgroundColor: colors.cardSurface,
              borderColor: colors.inkBlack,
            },
          ]}
        >
          <View style={styles.specCell}>
            <Text style={[typography.monoBold, styles.specCellLabel, { color: colors.inkMuted }]}>
              DEFAULT KEY
            </Text>
            <Text style={[typography.title, styles.specCellValue, { color: colors.primary }]}>
              {standard.defaultKey}
            </Text>
          </View>

          <View style={styles.specCell}>
            <Text style={[typography.monoBold, styles.specCellLabel, { color: colors.inkMuted }]}>
              TEMPO / FEEL
            </Text>
            <Text style={[typography.monoBold, styles.specCellValue, { color: colors.inkBlack }]}>
              ♩ {standard.tempoBpm}
            </Text>
            <Text style={[typography.mono, styles.specSub, { color: colors.inkMuted }]}>
              {standard.tempoLabel}
            </Text>
          </View>

          <View style={styles.specCell}>
            <Text style={[typography.monoBold, styles.specCellLabel, { color: colors.inkMuted }]}>
              FORM
            </Text>
            <Text style={[typography.monoBold, styles.specCellValue, { color: colors.inkBlack }]}>
              {standard.form}
            </Text>
          </View>
        </View>

        {/* Jam Session Call Guide (Bandstand Instructions) */}
        <View
          style={[
            styles.jamGuideBox,
            {
              backgroundColor: '#FAF5EE',
              borderColor: colors.inkBlack,
            },
          ]}
        >
          <View style={styles.jamGuideHeader}>
            <Text style={styles.jamGuideIcon}>🎺</Text>
            <Text style={[typography.stamp, styles.jamGuideTitle, { color: colors.inkBlack }]}>
              BANDSTAND JAM CALL GUIDE
            </Text>
          </View>

          <View style={styles.chordSection}>
            <Text style={[typography.monoBold, styles.chordHeader, { color: colors.inkMuted }]}>
              OPENING HOOK / CHORDS:
            </Text>
            <Text style={[typography.monoBold, styles.chordBody, { color: colors.secondary }]}>
              {standard.firstChords}
            </Text>
          </View>

          <View style={styles.callNotesSection}>
            <Text style={[typography.monoBold, styles.callNotesHeader, { color: colors.inkMuted }]}>
              HOW TO CALL IT ON STAGE:
            </Text>
            <Text style={[typography.mono, styles.callNotesBody, { color: colors.inkBlack }]}>
              {standard.jamCallNotes}
            </Text>
          </View>
        </View>

        {/* 12-Key Mastered Stamp Grid */}
        <View
          style={[
            styles.keysSection,
            {
              backgroundColor: colors.cardSurface,
              borderColor: colors.inkBlack,
            },
          ]}
        >
          <KeyStampGrid
            isKeyBased
            masteredKeys={selectedKeys}
            onToggleKey={handleToggleKey}
            title={`KEYS YOU CAN PLAY THIS IN (${selectedKeys.length}/12)`}
            hint="Tap keys you have mastered for this standard"
          />
        </View>

        {/* Personal Jam Notes */}
        <View
          style={[
            styles.notesSection,
            {
              backgroundColor: colors.cardSurface,
              borderColor: colors.inkBlack,
            },
          ]}
        >
          <Text style={[typography.stamp, styles.notesLabel, { color: colors.inkBlack }]}>
            PERSONAL REPERTOIRE NOTES:
          </Text>
          <TextInput
            multiline
            numberOfLines={3}
            placeholder="e.g. Call in C for singer; play intro on guitar; tricky change on bar 9..."
            placeholderTextColor={colors.inkMuted}
            value={notes}
            onChangeText={setNotes}
            onBlur={handleSaveNotes}
            style={[
              styles.notesInput,
              {
                fontFamily: typography.fontMono,
                color: colors.inkBlack,
                backgroundColor: '#FAF5EE',
                borderColor: colors.inkBlack,
              },
            ]}
          />
        </View>
      </ScrollView>
    </StampModal>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  statusBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 6,
    padding: 10,
    gap: 8,
  },
  statusInfo: {
    flex: 1,
    gap: 2,
  },
  statusLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  statusValue: {
    fontSize: 11,
  },
  unlockedDate: {
    fontSize: 9.5,
  },
  catchToggleBtn: {
    borderWidth: 1.5,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
  },
  catchToggleBtnText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  stylePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  stylePillIcon: {
    fontSize: 10,
  },
  stylePillText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  tierPill: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  tierPillText: {
    fontSize: 9.5,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  specsGrid: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 6,
    padding: 10,
  },
  specCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  specCellLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  specCellValue: {
    fontSize: 16,
  },
  specSub: {
    fontSize: 9,
  },
  jamGuideBox: {
    borderWidth: 2,
    borderRadius: 6,
    padding: 12,
    gap: 8,
  },
  jamGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD2BC',
    paddingBottom: 6,
  },
  jamGuideIcon: {
    fontSize: 14,
  },
  jamGuideTitle: {
    fontSize: 11,
    letterSpacing: 0.6,
  },
  chordSection: {
    gap: 2,
  },
  chordHeader: {
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  chordBody: {
    fontSize: 11,
  },
  callNotesSection: {
    gap: 2,
  },
  callNotesHeader: {
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  callNotesBody: {
    fontSize: 11,
    lineHeight: 16,
  },
  keysSection: {
    borderWidth: 1.5,
    borderRadius: 6,
    padding: 8,
  },
  notesSection: {
    borderWidth: 1.5,
    borderRadius: 6,
    padding: 10,
    gap: 6,
  },
  notesLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    fontSize: 11,
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
