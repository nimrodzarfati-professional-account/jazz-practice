import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';

interface NavItemProps {
  code: string;
  title: string;
  subtitle?: string;
  active: boolean;
  onPress: () => void;
  compact?: boolean;
}

export const NavItem: React.FC<NavItemProps> = ({
  code,
  title,
  subtitle,
  active,
  onPress,
  compact = false,
}) => {
  const { colors, typography } = useTheme();
  const textColor = active ? colors.onAccent : colors.inkBlack;
  const subColor = active ? colors.onAccent : colors.inkMuted;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={title}
      accessibilityState={{ selected: active }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        compact ? styles.compact : styles.full,
        {
          borderColor: colors.inkBlack,
          backgroundColor: active ? colors.primary : colors.recessedSurface,
        },
      ]}
    >
      {compact ? (
        <Text
          numberOfLines={1}
          style={[typography.stamp, styles.compactTitle, { color: textColor }]}
        >
          {title}
        </Text>
      ) : (
        <View style={styles.fullRow}>
          <Text style={[typography.monoBold, styles.code, { color: textColor }]}>{code}</Text>
          <View>
            <Text style={[typography.stamp, styles.fullTitle, { color: textColor }]}>{title}</Text>
            {subtitle ? (
              <Text style={[typography.mono, styles.subtitle, { color: subColor }]}>{subtitle}</Text>
            ) : null}
          </View>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  compact: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  compactTitle: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  full: {
    minHeight: 50,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  fullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  code: {
    fontSize: 14,
  },
  fullTitle: {
    fontSize: 13,
  },
  subtitle: {
    fontSize: 10,
    marginTop: 2,
  },
});
