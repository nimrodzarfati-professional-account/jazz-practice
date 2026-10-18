import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';

interface StudioFaderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
  accentColor?: string;
  height?: number;
}

export const StudioFader: React.FC<StudioFaderProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = '',
  accentColor,
  height = 180,
}) => {
  const { colors, typography } = useTheme();
  const faderAccent = accentColor || colors.tertiary;

  const clampValue = (val: number) => {
    const stepped = Math.round((val - min) / step) * step + min;
    return Math.max(min, Math.min(max, stepped));
  };

  const startValueRef = useRef(value);
  const currentValueRef = useRef(value);
  currentValueRef.current = value;

  const handleTrackPress = (evt: GestureResponderEvent) => {
    const { locationY } = evt.nativeEvent;
    const fraction = 1 - Math.max(0, Math.min(1, locationY / height));
    const rawVal = min + fraction * (max - min);
    const newVal = clampValue(rawVal);
    if (newVal !== currentValueRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(newVal);
    }
  };

  const handleStepChange = (delta: number) => {
    const newVal = clampValue(currentValueRef.current + delta);
    if (newVal !== currentValueRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(newVal);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startValueRef.current = currentValueRef.current;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const deltaFraction = -gestureState.dy / height;
        const rawVal = startValueRef.current + deltaFraction * (max - min);
        const newVal = clampValue(rawVal);
        if (newVal !== currentValueRef.current) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(newVal);
        }
      },
    })
  ).current;

  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const capTop = height - (percent / 100) * (height - 28) - 28;

  const tickCount = 6;
  const ticks = Array.from({ length: tickCount }, (_, i) => i);

  return (
    <View style={styles.faderContainer}>
      <View
        style={[
          styles.readoutBox,
          {
            backgroundColor: colors.cardSurface,
            borderColor: colors.inkBlack,
          },
        ]}
      >
        <Text
          style={[
            styles.valueText,
            { fontFamily: typography.fontMonoBold, color: colors.inkBlack },
          ]}
        >
          {value}
          {unit ? ` ${unit}` : ''}
        </Text>
      </View>

      <View style={[styles.trackWrapper, { height }]}>
        <View style={styles.ticksColumn}>
          {ticks.map((t) => (
            <View
              key={`tick-l-${t}`}
              style={[
                styles.tickLine,
                {
                  backgroundColor:
                    t === 0 || t === tickCount - 1 ? colors.tertiary : colors.inkMuted,
                },
              ]}
            />
          ))}
        </View>

        <Pressable
          style={[
            styles.trackSlot,
            {
              height,
              backgroundColor: colors.inkBlack,
              borderColor: colors.inkBlack,
            },
          ]}
          onPress={handleTrackPress}
        >
          <View
            style={[
              styles.trackFill,
              {
                height: `${percent}%`,
                backgroundColor: faderAccent,
              },
            ]}
          />

          <View
            {...panResponder.panHandlers}
            style={[
              styles.faderCap,
              {
                top: Math.max(0, Math.min(height - 28, capTop)),
                backgroundColor: colors.recessedSurface,
                borderColor: colors.inkBlack,
              },
            ]}
          >
            <View style={[styles.capIndicator, { backgroundColor: colors.primary }]} />
          </View>
        </Pressable>

        <View style={styles.ticksColumn}>
          {ticks.map((t) => (
            <View
              key={`tick-r-${t}`}
              style={[
                styles.tickLine,
                {
                  backgroundColor:
                    t === 0 || t === tickCount - 1 ? colors.tertiary : colors.inkMuted,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.stepperRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => handleStepChange(-step)}
          style={[
            styles.stepBtn,
            { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
          ]}
        >
          <Text
            style={[
              styles.stepBtnText,
              { fontFamily: typography.fontMonoBold, color: colors.inkBlack },
            ]}
          >
            -
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={() => handleStepChange(step)}
          style={[
            styles.stepBtn,
            { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
          ]}
        >
          <Text
            style={[
              styles.stepBtnText,
              { fontFamily: typography.fontMonoBold, color: colors.inkBlack },
            ]}
          >
            +
          </Text>
        </Pressable>
      </View>

      <Text
        style={[
          styles.label,
          { fontFamily: typography.fontStamp, color: colors.inkBlack },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  faderContainer: {
    alignItems: 'center',
    paddingVertical: 6,
    flex: 1,
  },
  readoutBox: {
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  trackWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 6,
  },
  ticksColumn: {
    height: '100%',
    justifyContent: 'space-between',
    paddingVertical: 4,
    width: 10,
  },
  tickLine: {
    width: 8,
    height: 1.5,
  },
  trackSlot: {
    width: 24,
    borderWidth: 2,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 4,
  },
  trackFill: {
    width: '100%',
    opacity: 0.85,
  },
  faderCap: {
    position: 'absolute',
    left: -11,
    width: 42,
    height: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  capIndicator: {
    width: 26,
    height: 2.5,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  stepBtn: {
    borderWidth: 1.5,
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 14,
    lineHeight: 16,
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
