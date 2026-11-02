import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useSession } from '../../session/SessionContext';
import { songLabel } from '../../session/sessionPlanner';
import { CreamBlock } from '../CreamBlock';
import { StampButton } from '../StampButton';
import { ChangeSongModal } from './ChangeSongModal';

export const CurrentSongCard: React.FC = () => {
  const { colors, typography } = useTheme();
  const { song } = useSession();
  const [modalOpen, setModalOpen] = useState(false);
  const [openedAtMs] = useState(() => Date.now());

  const startedMs = new Date(song.startedAt).getTime();
  const dayNumber = Number.isNaN(startedMs)
    ? 1
    : Math.max(1, Math.floor((openedAtMs - startedMs) / 86400000) + 1);
  const cycleDays = song.rotationCycleDays || 14;
  const isOverdue = dayNumber >= cycleDays;

  return (
    <CreamBlock>
      <View style={styles.topRow}>
        <Text style={[typography.stamp, { color: colors.tertiary }]}>CURRENT SONG</Text>
        <Text style={[typography.monoBold, { color: isOverdue ? colors.secondary : colors.inkMuted }]}>
          {isOverdue ? 'TIME TO CHANGE' : `DAY ${dayNumber} OF ${cycleDays}`}
        </Text>
      </View>
      <Text style={[typography.title, styles.title, { color: colors.inkBlack }]}>{songLabel(song)}</Text>
      <View style={styles.actions}>
        <StampButton label="CHANGE SONG" variant="tertiary" size="sm" onPress={() => setModalOpen(true)} />
      </View>
      <ChangeSongModal visible={modalOpen} onClose={() => setModalOpen(false)} />
    </CreamBlock>
  );
};

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
  },
});
