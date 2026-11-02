import React, { useState } from 'react';
import {
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';

export type StampButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'alert';

export interface StampButtonProps {
  label: string;
  onPress: () => void;
  variant?: StampButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export const StampButton: React.FC<StampButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  accessibilityLabel,
}) => {
  const { colors, typography } = useTheme();
  const [isPressed, setIsPressed] = useState(false);

  // Disabled renders as a muted outline stamp so status labels ("✓ SAVED") stay legible
  const getBackgroundColor = () => {
    if (disabled) return colors.recessedSurface;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      case 'tertiary':
        return colors.recessedSurface;
      case 'alert':
        return colors.cardSurface;
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.inkMuted;
    switch (variant) {
      case 'primary':
        return colors.onAccent;
      case 'secondary':
        return colors.onDark;
      case 'alert':
        return colors.secondary;
      default:
        return colors.inkBlack;
    }
  };

  const handlePressIn = () => {
    if (disabled) return;
    setIsPressed(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const shadowOffset = disabled ? 0 : isPressed ? 1 : 3;

  return (
    <View style={[styles.wrapper, { marginRight: shadowOffset, marginBottom: shadowOffset }]}>
      {/* Hard ink shadow underneath */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: colors.shadowHard,
            top: shadowOffset,
            left: shadowOffset,
            right: -shadowOffset,
            bottom: -shadowOffset,
          },
        ]}
      />

      <Pressable
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.button,
          styles[size],
          {
            backgroundColor: getBackgroundColor(),
            borderColor: disabled
              ? colors.inkMuted
              : variant === 'alert'
              ? colors.secondary
              : colors.inkBlack,
          },
          style,
        ]}
      >
        <Text
          style={[
            styles.label,
            {
              fontFamily: typography.fontStamp,
              color: getTextColor(),
              fontSize: size === 'sm' ? 11 : size === 'lg' ? 14 : 12,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  button: {
    borderWidth: 2,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: {
    minHeight: 36,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  md: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  lg: {
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  label: {
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
