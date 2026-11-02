import React, { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useSession } from '../../session/SessionContext';
import { getCloudConfig, pullAllFromCloud, saveCloudConfig } from '../../services/CloudSyncService';
import { StampModal } from '../StampModal';
import { StampInput } from '../StampInput';
import { StampButton } from '../StampButton';

interface CloudModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CloudModal: React.FC<CloudModalProps> = ({ visible, onClose }) => {
  const { reloadFromDb } = useSession();
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');

  useEffect(() => {
    if (visible) {
      const cfg = getCloudConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
    }
  }, [visible]);

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveCloudConfig(url, anonKey);
    onClose();
    const res = await pullAllFromCloud();
    if (res.success) reloadFromDb();
  };

  return (
    <StampModal
      visible={visible}
      title="CLOUD SYNC"
      subtitle="Enter your Supabase project details once to keep your phone and computer in sync."
      onClose={onClose}
      actions={
        <>
          <StampButton label="CANCEL" variant="tertiary" onPress={onClose} />
          <StampButton label="SAVE & CONNECT" variant="primary" onPress={handleSave} />
        </>
      }
    >
      <StampInput
        label="SUPABASE URL"
        value={url}
        onChangeText={setUrl}
        placeholder="https://your-project.supabase.co"
      />
      <StampInput label="ANON KEY" value={anonKey} onChangeText={setAnonKey} placeholder="YOUR_ANON_KEY" secure />
    </StampModal>
  );
};
