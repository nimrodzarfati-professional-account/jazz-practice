import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { useSession } from '../../session/SessionContext';
import { PitchKey } from '../../types/models';
import { rotateActiveStandard } from '../../db/repository';
import { StampModal } from '../StampModal';
import { StampInput } from '../StampInput';
import { SegmentedStamp } from '../SegmentedStamp';
import { KeyStampGrid } from '../KeyStampGrid';
import { StampButton } from '../StampButton';

const PRESET_SONGS: { title: string; defaultKey: PitchKey }[] = [
  { title: 'Autumn Leaves', defaultKey: 'Bb' },
  { title: 'All The Things You Are', defaultKey: 'Ab' },
  { title: 'There Will Never Be Another You', defaultKey: 'Eb' },
  { title: 'Stella by Starlight', defaultKey: 'Bb' },
  { title: 'Blue Bossa', defaultKey: 'C' },
  { title: 'Take The A Train', defaultKey: 'C' },
];

type CycleId = '7' | '10' | '14';

interface ChangeSongModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ChangeSongModal: React.FC<ChangeSongModalProps> = ({ visible, onClose }) => {
  const { colors, typography } = useTheme();
  const { song, reloadFromDb } = useSession();
  const [title, setTitle] = useState('');
  const [songKey, setSongKey] = useState<PitchKey>(song.defaultKey);
  const [cycle, setCycle] = useState<CycleId>('14');

  useEffect(() => {
    if (visible) {
      setTitle('');
      setSongKey(song.defaultKey);
      setCycle(String(song.rotationCycleDays) === '7' || String(song.rotationCycleDays) === '10' ? (String(song.rotationCycleDays) as CycleId) : '14');
    }
  }, [visible, song]);

  const handleSave = () => {
    if (!title.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    rotateActiveStandard(title.trim(), songKey, Number(cycle) as 7 | 10 | 14);
    reloadFromDb();
    onClose();
  };

  const presetId = PRESET_SONGS.find((p) => p.title === title)?.title ?? null;

  return (
    <StampModal
      visible={visible}
      title="CHANGE SONG"
      subtitle="The song your maintenance exercises use for the next one or two weeks."
      onClose={onClose}
      actions={
        <>
          <StampButton label="CANCEL" variant="tertiary" onPress={onClose} />
          <StampButton label="SAVE SONG" variant="primary" disabled={!title.trim()} onPress={handleSave} />
        </>
      }
    >
      <StampInput label="SONG TITLE" value={title} onChangeText={setTitle} placeholder="Type a song title" />

      <View>
        <Text style={[typography.stamp, styles.label, { color: colors.inkBlack }]}>QUICK PICKS</Text>
        <SegmentedStamp<string>
          accessibilityLabel="Quick pick"
          options={PRESET_SONGS.map((p) => ({ id: p.title, label: `${p.title} (${p.defaultKey})` }))}
          value={presetId}
          onChange={(id) => {
            const preset = PRESET_SONGS.find((p) => p.title === id)!;
            setTitle(preset.title);
            setSongKey(preset.defaultKey);
          }}
        />
      </View>

      <KeyStampGrid
        isKeyBased
        mode="single"
        masteredKeys={[songKey]}
        onToggleKey={setSongKey}
      />

      <View>
        <Text style={[typography.stamp, styles.label, { color: colors.inkBlack }]}>KEEP THIS SONG FOR</Text>
        <SegmentedStamp<CycleId>
          accessibilityLabel="Keep this song for"
          options={[
            { id: '7', label: '7 DAYS' },
            { id: '10', label: '10 DAYS' },
            { id: '14', label: '14 DAYS' },
          ]}
          value={cycle}
          onChange={setCycle}
          fill
        />
      </View>
    </StampModal>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: 4,
  },
});
