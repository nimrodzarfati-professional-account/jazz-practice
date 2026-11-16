import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { StandardStyle, STANDARD_STYLES } from '../../types/pokedex';
import { PitchKey } from '../../types/models';
import { StampModal } from '../StampModal';
import { StampButton } from '../StampButton';
import { StampInput } from '../StampInput';
import { KeyStampGrid } from '../KeyStampGrid';
import { SegmentedStamp } from '../SegmentedStamp';

interface AddStandardModalProps {
  visible: boolean;
  onClose: () => void;
  initialTitle?: string;
  onAdd: (input: {
    title: string;
    composer?: string;
    defaultKey: PitchKey;
    knownKeys: PitchKey[];
    style: StandardStyle;
    notes?: string;
  }) => void;
}

export const AddStandardModal: React.FC<AddStandardModalProps> = ({
  visible,
  onClose,
  initialTitle = '',
  onAdd,
}) => {
  const { colors, typography } = useTheme();

  const [title, setTitle] = useState(initialTitle);
  const [composer, setComposer] = useState('');
  const [style, setStyle] = useState<StandardStyle>('SWING');
  const [defaultKey, setDefaultKey] = useState<PitchKey>('Bb');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (visible && initialTitle) {
      setTitle(initialTitle);
    }
  }, [visible, initialTitle]);

  const handleSave = () => {
    if (!title.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    onAdd({
      title: title.trim(),
      composer: composer.trim(),
      defaultKey,
      knownKeys: [defaultKey],
      style,
      notes: notes.trim(),
    });

    setTitle('');
    setComposer('');
    setNotes('');
    onClose();
  };

  return (
    <StampModal
      visible={visible}
      title="ADD STANDARD"
      subtitle="Add a tune directly to your known repertoire."
      onClose={onClose}
      actions={
        <>
          <StampButton label="CANCEL" variant="tertiary" size="sm" onPress={onClose} />
          <StampButton
            label="SAVE AS KNOWN"
            variant="primary"
            size="sm"
            disabled={!title.trim()}
            onPress={handleSave}
          />
        </>
      }
    >
      <StampInput
        label="TUNE TITLE"
        placeholder="e.g. Alone Together"
        value={title}
        onChangeText={setTitle}
      />

      <KeyStampGrid
        isKeyBased
        mode="single"
        masteredKeys={[defaultKey]}
        onToggleKey={setDefaultKey}
        title="DEFAULT KEY"
        hint="Tap concert key"
      />

      <View>
        <Text style={[typography.stamp, styles.label, { color: colors.inkBlack }]}>
          STYLE
        </Text>
        <SegmentedStamp<StandardStyle>
          accessibilityLabel="Style"
          options={STANDARD_STYLES.map((s) => ({ id: s, label: s }))}
          value={style}
          onChange={setStyle}
        />
      </View>

      <StampInput
        label="COMPOSER (OPTIONAL)"
        placeholder="e.g. Arthur Schwartz"
        value={composer}
        onChangeText={setComposer}
      />

      <StampInput
        label="NOTES (OPTIONAL)"
        placeholder="e.g. Also play in Gm"
        value={notes}
        onChangeText={setNotes}
      />
    </StampModal>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
  },
});
