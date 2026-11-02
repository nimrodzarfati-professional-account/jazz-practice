import React, { ReactNode } from 'react';
import { Modal, View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface StampModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  actions: ReactNode;
  children?: ReactNode;
  maxWidth?: number;
}

export const StampModal: React.FC<StampModalProps> = ({
  visible,
  title,
  subtitle,
  onClose,
  actions,
  children,
  maxWidth = 560,
}) => {
  const { colors, typography } = useTheme();
  const { isDesktop } = useResponsiveLayout();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.scrim }]}>
        <View
          style={[
            styles.box,
            isDesktop && { maxWidth },
            { backgroundColor: colors.cardSurface, borderColor: colors.inkBlack },
          ]}
        >
          <Text accessibilityRole="header" style={[typography.title, { color: colors.inkBlack }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[typography.mono, styles.subtitle, { color: colors.inkMuted }]}>
              {subtitle}
            </Text>
          ) : null}
          {children ? (
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              {children}
            </ScrollView>
          ) : null}
          <View style={styles.actions}>{actions}</View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  box: {
    width: '100%',
    maxHeight: '92%',
    borderWidth: 3,
    padding: 16,
  },
  subtitle: {
    marginTop: 4,
    lineHeight: 17,
  },
  body: {
    marginTop: 12,
    flexGrow: 0,
  },
  bodyContent: {
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});
