import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import {
  RepertoireStandard,
  StandardStyle,
  STANDARD_STYLES,
} from '../../types/pokedex';
import { PitchKey } from '../../types/models';
import { StampModal } from '../StampModal';
import { StampButton } from '../StampButton';
import { StampToggle } from '../StampToggle';
import { StampInput } from '../StampInput';
import { SegmentedStamp } from '../SegmentedStamp';
import { KeyStampGrid } from '../KeyStampGrid';

interface StandardDetailModalProps {
  standard: RepertoireStandard | null;
  visible: boolean;
  onClose: () => void;
  onToggleKnown: (id: string, forceKnown?: boolean) => void;
  onUpdateKeys: (id: string, keys: PitchKey[], defaultKey: PitchKey) => void;
  onUpdateNotesAndStyle: (id: string, notes: string, style: StandardStyle) => void;
  onSetAsActiveStandard: (standard: RepertoireStandard) => void;
  isActiveStandard: boolean;
}

export const StandardDetailModal: React.FC<StandardDetailModalProps> = ({
  standard,
  visible,
  onClose,
  onToggleKnown,
  onUpdateKeys,
  onUpdateNotesAndStyle,
  onSetAsActiveStandard,
  isActiveStandard,
}) => {
  const { colors, typography } = useTheme();

  const [isKnown, setIsKnown] = useState(false);
  const [defaultKey, setDefaultKey] = useState<PitchKey>('C');
  const [knownKeys, setKnownKeys] = useState<PitchKey[]>(['C']);
  const [style, setStyle] = useState<StandardStyle>('SWING');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (standard) {
      setIsKnown(standard.isKnown);
      setDefaultKey(standard.defaultKey);
      setKnownKeys(
        standard.knownKeys.length > 0 ? standard.knownKeys : [standard.defaultKey]
      );
      setStyle(standard.style);
      setNotes(standard.notes || '');
    }
  }, [standard]);

  if (!standard) return null;

  const handleToggleKnown = (next: boolean) => {
    setIsKnown(next);
    onToggleKnown(standard.id, next);
  };

  const handleSelectDefaultKey = (key: PitchKey) => {
    setDefaultKey(key);
    const updatedKeys = knownKeys.includes(key) ? knownKeys : [...knownKeys, key];
    setKnownKeys(updatedKeys);
    setIsKnown(true);
    onUpdateKeys(standard.id, updatedKeys, key);
  };

  const handleToggleKnownKey = (key: PitchKey) => {
    const next = knownKeys.includes(key)
      ? knownKeys.filter((k) => k !== key)
      : [...knownKeys, key];
    const safeNext = next.length > 0 ? next : [defaultKey];
    setKnownKeys(safeNext);
    setIsKnown(true);
    onUpdateKeys(standard.id, safeNext, defaultKey);
  };

  const handleStyleChange = (nextStyle: StandardStyle) => {
    setStyle(nextStyle);
    onUpdateNotesAndStyle(standard.id, notes, nextStyle);
  };

  const handleDone = () => {
    if (notes !== (standard.notes || '') || style !== standard.style) {
      onUpdateNotesAndStyle(standard.id, notes, style);
    }
    onClose();
  };

  return (
    <StampModal
      visible={visible}
      title={standard.title.toUpperCase()}
      subtitle={standard.composer ? `Composer: ${standard.composer}` : 'Standard Details'}
      onClose={handleDone}
      actions={
        <>
          <StampButton
            label={isActiveStandard ? '✓ CURRENT SHED SONG' : 'SET AS SHED SONG'}
            variant="tertiary"
            size="sm"
            disabled={isActiveStandard}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onSetAsActiveStandard({
                ...standard,
                defaultKey,
                knownKeys,
                style,
                notes,
              });
              handleDone();
            }}
          />
          <StampButton label="DONE" variant="primary" size="sm" onPress={handleDone} />
        </>
      }
    >
      <View
        style={[
          styles.statusBox,
          {
            borderColor: colors.inkBlack,
            backgroundColor: colors.recessedSurface,
          },
        ]}
      >
        <StampToggle
          label="IN MY JAM REPERTOIRE (KNOWN)"
          checked={isKnown}
          onChange={handleToggleKnown}
          hint="Included when filtering or rolling tunes to call at a jam session"
        />
      </View>

      <KeyStampGrid
        isKeyBased
        mode="single"
        masteredKeys={[defaultKey]}
        onToggleKey={handleSelectDefaultKey}
        title="DEFAULT JAM KEY"
        hint="Standard concert key"
      />

      <KeyStampGrid
        isKeyBased
        mode="multi"
        masteredKeys={knownKeys}
        onToggleKey={handleToggleKnownKey}
        title={`KEYS I PLAY THIS IN (${knownKeys.length}/12)`}
        hint="Stamp every key you can call this in"
      />

      <View style={styles.field}>
        <Text style={[typography.stamp, styles.label, { color: colors.inkBlack }]}>
          FEEL / STYLE
        </Text>
        <SegmentedStamp<StandardStyle>
          accessibilityLabel="Style"
          options={STANDARD_STYLES.map((s) => ({ id: s, label: s }))}
          value={style}
          onChange={handleStyleChange}
        />
      </View>

      <StampInput
        label="NOTES"
        placeholder="e.g. Call in Eb for singer, trade 4s on out head..."
        value={notes}
        onChangeText={setNotes}
        multiline
      />
    </StampModal>
  );
};

const styles = StyleSheet.create({
  statusBox: {
    borderWidth: 1.5,
    padding: 10,
  },
  field: {
    marginTop: 4,
  },
  label: {
    marginBottom: 6,
  },
});
