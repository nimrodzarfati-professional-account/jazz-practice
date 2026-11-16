import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import {
  PokedexStandard,
  StandardStyle,
  StandardTier,
  STYLE_CONFIG,
} from '../../types/pokedex';
import { PitchKey } from '../../types/models';
import { StampModal } from '../StampModal';
import { StampButton } from '../StampButton';
import { StampInput } from '../StampInput';
import { KeyStampGrid } from '../KeyStampGrid';
import { SegmentedStamp } from '../SegmentedStamp';

interface AddStandardModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (standard: Omit<PokedexStandard, 'id' | 'dexNumber'>) => void;
}

const STYLES_LIST: StandardStyle[] = [
  'SWING',
  'BEBOP',
  'BOSSA',
  'BLUES',
  'BALLAD',
  'MODAL',
  'WALTZ',
  'LATIN',
  'HARD_BOP',
  'RHYTHM_CHANGES',
];

export const AddStandardModal: React.FC<AddStandardModalProps> = ({
  visible,
  onClose,
  onAdd,
}) => {
  const { colors, typography } = useTheme();

  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [style, setStyle] = useState<StandardStyle>('SWING');
  const [defaultKey, setDefaultKey] = useState<PitchKey>('Bb');
  const [form, setForm] = useState('32-Bar AABA');
  const [bpm, setBpm] = useState('140');
  const [firstChords, setFirstChords] = useState('');
  const [jamCallNotes, setJamCallNotes] = useState('');

  const handleSave = () => {
    if (!title.trim()) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const bpmNum = parseInt(bpm, 10) || 140;

    let tier: StandardTier = 'CORE';
    if (bpmNum > 220) tier = 'VETERAN';

    onAdd({
      title: title.trim(),
      composer: composer.trim() || 'Traditional',
      year: parseInt(year, 10) || new Date().getFullYear(),
      types: [style],
      defaultKey,
      masteredKeys: [defaultKey],
      form: form.trim() || '32-Bar Standard',
      tempoBpm: bpmNum,
      tempoLabel: `${style} • ♩${bpmNum}`,
      tier,
      status: 'CAUGHT',
      firstChords: firstChords.trim() || `${defaultKey}maj7 ...`,
      jamCallNotes:
        jamCallNotes.trim() ||
        `Call in ${defaultKey}. Standard 4-bar intro. Head once, solos, head out.`,
      personalNotes: 'Added manually to repertoire.',
      unlockedAt: new Date().toISOString(),
      timesPracticed: 1,
      practiceCount: 1,
      isCustom: true,
    });

    // Reset fields
    setTitle('');
    setComposer('');
    setFirstChords('');
    setJamCallNotes('');
    onClose();
  };

  return (
    <StampModal
      visible={visible}
      title="ADD STANDARD TO JAZZ-DEX"
      subtitle="Register a tune you know or want in your jam session catalog."
      onClose={onClose}
      actions={
        <>
          <StampButton label="CANCEL" variant="tertiary" onPress={onClose} />
          <StampButton
            label="SAVE TO DEX ★"
            variant="primary"
            disabled={!title.trim()}
            onPress={handleSave}
          />
        </>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <StampInput
          label="TUNE TITLE"
          placeholder="e.g. Strasbourg / St. Denis"
          value={title}
          onChangeText={setTitle}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <StampInput
              label="COMPOSER"
              placeholder="e.g. Roy Hargrove"
              value={composer}
              onChangeText={setComposer}
            />
          </View>
          <View style={styles.half}>
            <StampInput
              label="YEAR"
              placeholder="e.g. 2008"
              value={year}
              onChangeText={setYear}
              numeric
            />
          </View>
        </View>

        {/* Primary Style Selector */}
        <View style={styles.fieldSection}>
          <Text style={[typography.stamp, styles.fieldLabel, { color: colors.inkBlack }]}>
            PRIMARY STYLE
          </Text>
          <SegmentedStamp<StandardStyle>
            accessibilityLabel="Select Style"
            options={STYLES_LIST.map((s) => ({
              id: s,
              label: STYLE_CONFIG[s].label,
            }))}
            value={style}
            onChange={setStyle}
          />
        </View>

        {/* Default Key */}
        <View style={styles.fieldSection}>
          <KeyStampGrid
            isKeyBased
            mode="single"
            masteredKeys={[defaultKey]}
            onToggleKey={setDefaultKey}
            title="DEFAULT CALL KEY"
            hint="Tap the default concert pitch key"
          />
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <StampInput
              label="FORM"
              placeholder="e.g. 32-Bar AABA"
              value={form}
              onChangeText={setForm}
            />
          </View>
          <View style={styles.half}>
            <StampInput
              label="TEMPO (BPM)"
              placeholder="e.g. 150"
              value={bpm}
              onChangeText={setBpm}
              numeric
            />
          </View>
        </View>

        <StampInput
          label="CHORD HOOK (FIRST 4 BARS)"
          placeholder="e.g. Bbm7 - Eb7 | Abmaj7 - Dbmaj7"
          value={firstChords}
          onChangeText={setFirstChords}
        />

        <StampInput
          label="BANDSTAND JAM CALL TIPS"
          placeholder="e.g. 4-bar trumpet intro. Trade 4s with drums at the end. 3x tag ending."
          value={jamCallNotes}
          onChangeText={setJamCallNotes}
          multiline
        />
      </ScrollView>
    </StampModal>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    gap: 10,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  half: {
    flex: 1,
  },
  fieldSection: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
