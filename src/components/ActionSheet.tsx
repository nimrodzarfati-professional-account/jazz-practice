import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StampModal } from './StampModal';
import { StampButton, StampButtonVariant } from './StampButton';

export interface ActionSheetAction {
  label: string;
  variant?: StampButtonVariant;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  actions: ActionSheetAction[];
}

export const ActionSheet: React.FC<ActionSheetProps> = ({ visible, title, onClose, actions }) => (
  <StampModal
    visible={visible}
    title={title}
    onClose={onClose}
    maxWidth={420}
    actions={<StampButton label="CANCEL" variant="tertiary" size="md" onPress={onClose} />}
  >
    <View style={styles.stack}>
      {actions.map((action) => (
        <StampButton
          key={action.label}
          label={action.label}
          variant={action.variant ?? 'tertiary'}
          size="md"
          onPress={() => {
            onClose();
            action.onPress();
          }}
        />
      ))}
    </View>
  </StampModal>
);

const styles = StyleSheet.create({
  stack: {
    gap: 6,
  },
});
