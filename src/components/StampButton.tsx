/**
 * StampButton — Vintage rubber stamp press button
 *
 * Pressable with a press-in animation: the hard offset shadow shrinks
 * from 3px → 1px to simulate a stamp being pressed onto paper.
 * Triggers expo-haptics on press. Oswald bold uppercase text.
 */
import React, { useCallback, useRef } from 'react';
import {
  Pressable,
  Text,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography } from '../theme/tokens';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface StampButtonProps {
  label: string;
  onPress: () => void;
  /** Accent color mapping: primary=Sienna, secondary=Brass, alert=Oxblood */
  variant: 'primary' | 'secondary' | 'alert';
  /** Button size preset. Default: 'md' */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** Haptic feedback weight. Default: 'medium' */
  hapticStyle?: 'light' | 'medium' | 'heavy';
}

/* ------------------------------------------------------------------ */
/*  Variant → color map                                                */
/* ------------------------------------------------------------------ */

const VARIANT_COLORS: Record<StampButtonProps['variant'], string> = {
  primary: colors.primary,   // #D95D39
  secondary: colors.secondary, // #D49B35
  alert: colors.alert,       // #9E2A2B
};

/* ------------------------------------------------------------------ */
/*  Size presets                                                       */
/* ------------------------------------------------------------------ */

interface SizePreset {
  paddingVertical: number;
  paddingHorizontal: number;
  fontSize: number;
  letterSpacing: number;
}

const SIZE_PRESETS: Record<NonNullable<StampButtonProps['size']>, SizePreset> = {
  sm: { paddingVertical: 6, paddingHorizontal: 14, fontSize: 11, letterSpacing: 1.5 },
  md: { paddingVertical: 10, paddingHorizontal: 22, fontSize: 14, letterSpacing: 2 },
  lg: { paddingVertical: 14, paddingHorizontal: 32, fontSize: 18, letterSpacing: 2.5 },
};

/* ------------------------------------------------------------------ */
/*  Haptic map                                                         */
/* ------------------------------------------------------------------ */

const HAPTIC_MAP: Record<
  NonNullable<StampButtonProps['hapticStyle']>,
  Haptics.ImpactFeedbackStyle
> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const StampButton: React.FC<StampButtonProps> = ({
  label,
  onPress,
  variant,
  size = 'md',
  disabled = false,
  hapticStyle = 'medium',
}) => {
  const offsetAnim = useRef(new Animated.Value(3)).current;

  const bg = VARIANT_COLORS[variant];
  const preset = SIZE_PRESETS[size];

  const handlePressIn = useCallback(() => {
    Animated.timing(offsetAnim, {
      toValue: 1,
      duration: 60,
      useNativeDriver: false,
    }).start();
  }, [offsetAnim]);

  const handlePressOut = useCallback(() => {
    Animated.timing(offsetAnim, {
      toValue: 3,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [offsetAnim]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    Haptics.impactAsync(HAPTIC_MAP[hapticStyle]);
    onPress();
  }, [disabled, hapticStyle, onPress]);

  const animatedShadow: Animated.WithAnimatedObject<ViewStyle> = {
    shadowColor: colors.border,
    shadowOffset: {
      width: offsetAnim,
      height: offsetAnim,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  };

  const animatedTranslate = {
    transform: [
      {
        translateX: offsetAnim.interpolate({
          inputRange: [1, 3],
          outputRange: [2, 0],
        }),
      },
      {
        translateY: offsetAnim.interpolate({
          inputRange: [1, 3],
          outputRange: [2, 0],
        }),
      },
    ],
  };

  const buttonStyle: ViewStyle = {
    backgroundColor: disabled ? colors.textMuted : bg,
    paddingVertical: preset.paddingVertical,
    paddingHorizontal: preset.paddingHorizontal,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
  };

  const labelStyle: TextStyle = {
    ...typography.stamp,
    fontSize: preset.fontSize,
    letterSpacing: preset.letterSpacing,
    color: colors.text,
    textAlign: 'center',
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={[buttonStyle, animatedShadow, animatedTranslate]}>
        <Text style={labelStyle}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
};

/* ------------------------------------------------------------------ */
/*  (no additional StyleSheet needed — everything is inline/animated)  */
/* ------------------------------------------------------------------ */

export default StampButton;
