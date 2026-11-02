import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import {
  isCloudConfigured,
  subscribeToSyncStatus,
  SyncConnectionStatus,
} from '../../services/CloudSyncService';
import { CreamBlock } from '../CreamBlock';
import { SectionHeader } from '../SectionHeader';
import { StampToggle } from '../StampToggle';
import { StampButton } from '../StampButton';
import { StampBadge } from '../StampBadge';
import { CloudModal } from './CloudModal';

function syncLabel(status: SyncConnectionStatus): string {
  if (status === 'connected') return 'SYNC • CLOUD';
  if (status === 'syncing' && isCloudConfigured()) return 'SYNC • CONNECTING';
  return 'SYNC • DEVICE ONLY';
}

export const SettingsCard: React.FC = () => {
  const { colors, typography, mode, toggleTheme } = useTheme();
  const [status, setStatus] = useState<SyncConnectionStatus>('syncing');
  const [cloudOpen, setCloudOpen] = useState(false);

  useEffect(() => subscribeToSyncStatus(setStatus), []);

  return (
    <CreamBlock>
      <SectionHeader title="SETTINGS" />
      <StampToggle
        label="WARM PAPER"
        checked={mode === 'warm'}
        onChange={toggleTheme}
        hint="Dark brown cards instead of cream"
      />
      <View style={styles.syncRow}>
        <StampBadge
          label={syncLabel(status)}
          tone={status === 'connected' ? 'olive' : 'neutral'}
          filled={status === 'connected'}
        />
        <View style={styles.spacer} />
        <StampButton label="CONNECT…" variant="tertiary" size="sm" onPress={() => setCloudOpen(true)} />
      </View>
      <Text style={[typography.mono, styles.note, { color: colors.inkMuted }]}>
        Without cloud sync, everything is saved on this device.
      </Text>
      <CloudModal visible={cloudOpen} onClose={() => setCloudOpen(false)} />
    </CreamBlock>
  );
};

const styles = StyleSheet.create({
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  spacer: {
    flex: 1,
  },
  note: {
    marginTop: 8,
  },
});
