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

  const handleTrackPress = (evt: GestureResponderEvent) => {
    const { locationY } = evt.nativeEvent;
    // Top is max, bottom is min
    const fraction = 1 - Math.max(0, Math.min(1, locationY / height));
    const rawVal = min + fraction * (max - min);
    const newVal = clampValue(rawVal);
    if (newVal !== value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(newVal);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        // Delta Y inverted: dragging up increases value
        const deltaFraction = -gestureState.dy / height;
        const rawVal = value + deltaFraction * (max - min);
        const newVal = clampValue(rawVal);
        if (newVal !== value) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(newVal);
        }
      },
    })
  ).current;

  // Percentage from bottom (0% at min, 100% at max)
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
  // Cap position from top
  const capTop = height - (percent / 100) * (height - 28) - 28;

  // Tick marks
  const tickCount = 6;
  const ticks = Array.from({ length: tickCount }, (_, i) => i);

  return (
    <View style={styles.faderContainer}>
      {/* Top Value Readout */}
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

      {/* Main Track & Cap Area */}
      <View style={[styles.trackWrapper, { height }]}>
        {/* Analog Tick Marks on Left and Right */}
        <View style={styles.ticksColumn}>
          {ticks.map((t) => (
            <View
              key={`tick-${t}`}
              style={[
                styles.tickLine,
                { backgroundColor: t === 0 || t === tickCount - 1 ? colors.tertiary : colors.inkMuted },
              ]}
            />
          ))}
        </View>

        {/* Fader Slot */}
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
          {/* Active Fill from bottom */}
          <View
            style={[
              styles.trackFill,
              {
                height: `${percent}%`,
                backgroundColor: faderAccent,
              },
            ]}
          />

          {/* Draggable Studio Bakelite Fader Cap */}
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
            {/* Center Indent Marker */}
            <View style={[styles.capIndicator, { backgroundColor: colors.primary }]} />
          </View>
        </Pressable>

        <View style={styles.ticksColumn}>
          {ticks.map((t) => (
            <View
              key={`tick-r-${t}`}
              style={[
                styles.tickLine,
                { backgroundColor: t === 0 || t === tickCount - 1 ? colors.tertiary : colors.inkMuted },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Bottom Label */}
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
    minWidth: 54,
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
    width: 22,
    borderWidth: 2,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 4,
  },
  trackFill: {
    width: '100%',
    opacity: 0.8,
  },
  faderCap: {
    position: 'absolute',
    left: -12,
    width: 42,
    height: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  capIndicator: {
    width: 28,
    height: 2,
  },
  label: {
    marginTop: 8,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
