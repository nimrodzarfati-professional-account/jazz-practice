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

  const clampValue = (val: number): number => {
    if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
      const fallback = Number.isFinite(currentValueRef.current) ? currentValueRef.current : min;
      return Math.max(min, Math.min(max, fallback));
    }
    const safeStep = step > 0 ? step : 1;
    const stepped = Math.round((val - min) / safeStep) * safeStep + min;
    return Math.max(min, Math.min(max, stepped));
  };

  const startValueRef = useRef(Number.isFinite(value) ? value : min);
  const currentValueRef = useRef(Number.isFinite(value) ? value : min);
  currentValueRef.current = Number.isFinite(value) ? value : min;
  const isDraggingRef = useRef(false);

  const extractY = (evt: GestureResponderEvent): number | undefined => {
    const nativeEvt = evt.nativeEvent as any;
    const currentTarget = (evt.currentTarget || evt.target) as any;

    if (currentTarget && typeof currentTarget.getBoundingClientRect === 'function') {
      const rect = currentTarget.getBoundingClientRect();
      const clientY = typeof nativeEvt.clientY === 'number'
        ? nativeEvt.clientY
        : (nativeEvt.touches && nativeEvt.touches[0] ? nativeEvt.touches[0].clientY : undefined);
      if (typeof clientY === 'number' && typeof rect.top === 'number') {
        return clientY - rect.top;
      }
    }

    if (typeof nativeEvt.locationY === 'number' && !Number.isNaN(nativeEvt.locationY)) {
      return nativeEvt.locationY;
    }
    if (typeof nativeEvt.offsetY === 'number' && !Number.isNaN(nativeEvt.offsetY)) {
      return nativeEvt.offsetY;
    }
    return undefined;
  };

  const calculateValueFromY = (yPos: number): number => {
    const fraction = 1 - Math.max(0, Math.min(1, yPos / height));
    const rawVal = min + fraction * (max - min);
    return clampValue(rawVal);
  };

  const handleStepChange = (delta: number) => {
    const currentVal = Number.isFinite(currentValueRef.current) ? currentValueRef.current : min;
    const newVal = clampValue(currentVal + delta);
    if (Number.isFinite(newVal) && newVal !== currentValueRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(newVal);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        isDraggingRef.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const yPos = extractY(evt);
        if (typeof yPos === 'number' && !Number.isNaN(yPos)) {
          const newVal = calculateValueFromY(yPos);
          startValueRef.current = newVal;
          if (newVal !== currentValueRef.current) {
            onChange(newVal);
          }
        } else {
          startValueRef.current = Number.isFinite(currentValueRef.current) ? currentValueRef.current : min;
        }
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        isDraggingRef.current = true;
        const directY = extractY(evt);
        let newVal: number;
        if (typeof directY === 'number' && !Number.isNaN(directY)) {
          newVal = calculateValueFromY(directY);
        } else {
          const dy = typeof gestureState.dy === 'number' && Number.isFinite(gestureState.dy) ? gestureState.dy : 0;
          const deltaFraction = -dy / height;
          const baseVal = Number.isFinite(startValueRef.current) ? startValueRef.current : min;
          newVal = clampValue(baseVal + deltaFraction * (max - min));
        }
        if (Number.isFinite(newVal) && newVal !== currentValueRef.current) {
          onChange(newVal);
        }
      },
      onPanResponderRelease: () => {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
      },
    })
  ).current;

  const safeValue = Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
  const percent = max > min ? ((safeValue - min) / (max - min)) * 100 : 0;
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
          {safeValue}
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

        <View
          {...panResponder.panHandlers}
          accessible={true}
          accessibilityRole="adjustable"
          accessibilityLabel={`${label} fader`}
          accessibilityValue={{ min, max, now: safeValue }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment') {
              handleStepChange(step);
            } else if (event.nativeEvent.actionName === 'decrement') {
              handleStepChange(-step);
            }
          }}
          style={[
            styles.trackSlot,
            {
              height,
              backgroundColor: colors.inkBlack,
              borderColor: colors.inkBlack,
            },
          ]}
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
        </View>

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
          onPress={() => handleStepChange(-step)}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
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
          onPress={() => handleStepChange(step)}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
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
