import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface SectionHeaderProps {
  title: string;
  meta?: string;
  right?: ReactNode;
  size?: 'label' | 'title';
  rule?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  meta,
  right,
  size = 'label',
  rule = true,
}) => {
  const { colors, typography } = useTheme();

  return (
    <View
      style={[
        styles.row,
        rule && { borderBottomWidth: 1.5, borderBottomColor: colors.inkBlack },
      ]}
    >
      <Text
        accessibilityRole="header"
        style={[
          size === 'title' ? typography.title : typography.stamp,
          styles.title,
          { color: colors.inkBlack },
        ]}
      >
        {title}
      </Text>
      {meta ? (
        <Text style={[typography.mono, { color: colors.inkMuted }]}>{meta}</Text>
      ) : null}
      {right}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 6,
    marginBottom: 10,
  },
  title: {
    flex: 1,
  },
});
