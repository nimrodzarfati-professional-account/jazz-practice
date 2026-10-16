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

export interface StampButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'alert';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
}

export const StampButton: React.FC<StampButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
}) => {
  const { colors, typography } = useTheme();
  const [isPressed, setIsPressed] = useState(false);

  const getBackgroundColor = () => {
    if (disabled) return colors.disabled;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      case 'tertiary':
        return colors.recessedSurface;
      case 'alert':
        return colors.secondary;
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.inkMuted;
    if (variant === 'tertiary') return colors.inkBlack;
    return colors.textPrimary;
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

  const shadowOffset = isPressed ? 1 : 3;

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
        accessibilityLabel={label}
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
            borderColor: colors.inkBlack,
            opacity: disabled ? 0.6 : 1,
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
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  md: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  lg: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  label: {
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
