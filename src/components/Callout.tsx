import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface CalloutProps {
  tone: 'song' | 'week' | 'warn' | 'neutral';
  title: string;
  body?: string;
  actions?: ReactNode;
}

export const Callout: React.FC<CalloutProps> = ({ tone, title, body, actions }) => {
  const { colors, typography } = useTheme();
  const toneColor =
    tone === 'song'
      ? colors.tertiary
      : tone === 'week'
      ? colors.primary
      : tone === 'warn'
      ? colors.secondary
      : colors.inkBlack;

  return (
    <View
      style={[
        styles.box,
        { backgroundColor: colors.recessedSurface, borderColor: toneColor },
      ]}
    >
      <Text style={[typography.stamp, { color: toneColor }]}>{title}</Text>
      {body ? (
        <Text style={[typography.mono, styles.body, { color: colors.inkBlack }]}>{body}</Text>
      ) : null}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    padding: 10,
    marginBottom: 14,
  },
  body: {
    marginTop: 4,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
});
