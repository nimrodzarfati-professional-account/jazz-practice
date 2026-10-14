/**
 * StudioFader — Vertical mixing-board fader / slider
 *
 * Draggable vertical fader with a dark Bakelite cap, brass tick marks,
 * smooth reanimated dragging, and haptic ticks at each step boundary.
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography } from '../theme/tokens';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface StudioFaderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Unit label displayed after the value (e.g. 'min', 'bpm') */
  unit?: string;
  /** Accent color for the fill and tick highlight. Defaults to Brass. */
  accentColor?: string;
  /** Total height of the fader track. Default: 250 */
  height?: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TRACK_WIDTH = 12;
const CAP_WIDTH = 48;
const CAP_HEIGHT = 20;
const TICK_WIDTH = 24;
const DEFAULT_HEIGHT = 250;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const StudioFader: React.FC<StudioFaderProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = '',
  accentColor = colors.secondary,
  height = DEFAULT_HEIGHT,
}) => {
  /* ---- derived values ---- */
  const range = max - min;
  const totalSteps = Math.round(range / step);
  const trackHeight = height;

  /** Map value → pixel Y offset from TOP of track. min is at bottom, max at top. */
  const valueToY = useCallback(
    (v: number) => {
      const ratio = (v - min) / range;
      return trackHeight - ratio * trackHeight;
    },
    [min, range, trackHeight],
  );

  /** Map pixel Y offset → snapped value. */
  const yToValue = useCallback(
    (y: number) => {
      const clamped = Math.max(0, Math.min(trackHeight, y));
      const ratio = 1 - clamped / trackHeight;
      const raw = min + ratio * range;
      // Snap to step
      return Math.round(raw / step) * step;
    },
    [min, range, step, trackHeight],
  );

  /* ---- gesture shared values ---- */
  const translateY = useSharedValue(valueToY(value));
  const startY = useSharedValue(0);
  const lastStepValue = useRef(value);

  /** Callback invoked on JS thread to fire haptic + onChange */
  const emitChange = useCallback(
    (newVal: number) => {
      if (newVal !== lastStepValue.current) {
        lastStepValue.current = newVal;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(newVal);
      }
    },
    [onChange],
  );

  /* ---- Pan gesture ---- */
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          startY.value = translateY.value;
        })
        .onUpdate((event) => {
          const nextY = Math.max(
            0,
            Math.min(trackHeight, startY.value + event.translationY),
          );
          translateY.value = nextY;
          const snapped = yToValue(nextY);
          runOnJS(emitChange)(snapped);
        })
        .onEnd(() => {
          // Snap cap to nearest step position
          const snapped = yToValue(translateY.value);
          translateY.value = withSpring(valueToY(snapped), {
            damping: 20,
            stiffness: 300,
          });
        }),
    [trackHeight, yToValue, valueToY, emitChange, translateY, startY],
  );

  /* ---- animated cap style ---- */
  const animatedCapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value - CAP_HEIGHT / 2 }],
  }));

  /* ---- animated fill style (grows from bottom) ---- */
  const animatedFillStyle = useAnimatedStyle(() => ({
    height: trackHeight - translateY.value,
  }));

  /* ---- tick marks ---- */
  const ticks = useMemo(() => {
    const arr: number[] = [];
    // Show ticks at every step, but if there are too many, thin them out
    const tickStep = totalSteps > 20 ? Math.ceil(totalSteps / 10) : 1;
    for (let i = 0; i <= totalSteps; i += tickStep) {
      arr.push(i);
    }
    return arr;
  }, [totalSteps]);

  /* ---- formatted display value ---- */
  const displayValue = unit ? `${value}${unit}` : `${value}`;

  /* ---- Sync translateY when value prop changes externally ---- */
  React.useEffect(() => {
    translateY.value = withSpring(valueToY(value), {
      damping: 20,
      stiffness: 300,
    });
    lastStepValue.current = value;
  }, [value, valueToY, translateY]);

  return (
    <View style={[styles.container, { height: trackHeight + 80 }]}>
      {/* Value readout */}
      <Text style={[styles.valueReadout, { color: accentColor }]}>
        {displayValue}
      </Text>

      {/* Track + fader assembly */}
      <GestureDetector gesture={panGesture}>
        <View style={[styles.trackContainer, { height: trackHeight }]}>
          {/* Tick marks (left side) */}
          <View style={styles.tickColumn}>
            {ticks.map((tickIdx) => {
              const y = valueToY(min + tickIdx * step);
              return (
                <View
                  key={tickIdx}
                  style={[
                    styles.tick,
                    {
                      top: y - 1,
                      backgroundColor: accentColor,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Track groove */}
          <View style={styles.trackGroove}>
            {/* Fill region */}
            <Animated.View
              style={[
                styles.trackFill,
                { backgroundColor: accentColor },
                animatedFillStyle,
              ]}
            />
          </View>

          {/* Fader cap */}
          <Animated.View style={[styles.faderCap, animatedCapStyle]} />
        </View>
      </GestureDetector>

      {/* Label */}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 80,
  },
  valueReadout: {
    ...typography.mono,
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  trackContainer: {
    width: 60,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  /* Tick marks column */
  tickColumn: {
    width: TICK_WIDTH,
    position: 'relative',
  },
  tick: {
    position: 'absolute',
    left: 0,
    width: TICK_WIDTH,
    height: 2,
    borderRadius: 0,
    opacity: 0.5,
  },
  /* Dark groove track */
  trackGroove: {
    width: TRACK_WIDTH,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 0,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  trackFill: {
    width: '100%',
    borderRadius: 0,
  },
  /* Bakelite fader cap */
  faderCap: {
    position: 'absolute',
    left: (60 - CAP_WIDTH) / 2,
    top: 0,
    width: CAP_WIDTH,
    height: CAP_HEIGHT,
    backgroundColor: '#2A2320',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 0,
    // Subtle center groove line via borders
    borderTopColor: '#3A3530',
    borderBottomColor: '#1A1510',
    shadowColor: colors.border,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  label: {
    ...typography.stamp,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 10,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
});

export default StudioFader;
