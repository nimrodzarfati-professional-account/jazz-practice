/**
 * KeyStampGrid — Circle of Fifths 12-key stamp pad
 *
 * A 4×3 grid of musical keys in Circle of Fifths order.
 * Tapping an unstamped key applies a crimson ink stamp overlay;
 * tapping a stamped key unstamps it. Heavy haptic on stamp,
 * light haptic on unstamp.
 */
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography, hardShadow } from '../theme/tokens';
import { KeyStampState, MusicalKey, CIRCLE_OF_FIFTHS } from '../types/models';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface KeyStampGridProps {
  stamps: KeyStampState[];
  onStampKey: (key: MusicalKey) => void;
  disabled?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Deterministic rotation per key for stamp rough-look                */
/* ------------------------------------------------------------------ */

function keyRotation(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 37 + key.charCodeAt(i)) | 0;
  }
  // Map to -3..+3 degrees
  const normalized = ((hash % 700) / 700) * 6 - 3;
  return Math.round(normalized * 100) / 100;
}

/* ------------------------------------------------------------------ */
/*  Single key cell                                                    */
/* ------------------------------------------------------------------ */

interface KeyCellProps {
  state: KeyStampState;
  onPress: (key: MusicalKey) => void;
  disabled: boolean;
}

const KeyCell: React.FC<KeyCellProps> = React.memo(
  ({ state, onPress, disabled }) => {
    const rotation = useMemo(() => keyRotation(state.key), [state.key]);

    const handlePress = useCallback(() => {
      if (disabled) return;
      if (state.stamped) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      onPress(state.key);
    }, [disabled, state.stamped, state.key, onPress]);

    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.cell,
          pressed && styles.cellPressed,
        ]}
      >
        {/* Base key name (always visible) */}
        <Text style={styles.keyLabel}>{state.key}</Text>

        {/* Stamped overlay */}
        {state.stamped && (
          <View
            style={[
              styles.stampOverlay,
              { transform: [{ rotate: `${rotation}deg` }] },
            ]}
          >
            <Text style={styles.stampText}>{state.key}</Text>
          </View>
        )}

        {/* BPM readout for stamped keys */}
        {state.stamped && state.bpm !== undefined && (
          <Text style={styles.bpmLabel}>{state.bpm}</Text>
        )}
      </Pressable>
    );
  },
);

/* ------------------------------------------------------------------ */
/*  Grid component                                                     */
/* ------------------------------------------------------------------ */

export const KeyStampGrid: React.FC<KeyStampGridProps> = ({
  stamps,
  onStampKey,
  disabled = false,
}) => {
  // Build a lookup from key → stamp state
  const stampMap = useMemo(() => {
    const map = new Map<MusicalKey, KeyStampState>();
    stamps.forEach((s) => map.set(s.key, s));
    return map;
  }, [stamps]);

  // Ensure we render in Circle of Fifths order
  const orderedStates: KeyStampState[] = useMemo(
    () =>
      CIRCLE_OF_FIFTHS.map((key) =>
        stampMap.get(key) ?? {
          key,
          stamped: false,
          bpm: null,
          stampedAt: null,
        },
      ),
    [stampMap],
  );

  // Split into 3 rows of 4
  const rows: KeyStampState[][] = useMemo(() => {
    const r: KeyStampState[][] = [];
    for (let i = 0; i < orderedStates.length; i += 4) {
      r.push(orderedStates.slice(i, i + 4));
    }
    return r;
  }, [orderedStates]);

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((state) => (
            <KeyCell
              key={state.key}
              state={state}
              onPress={onStampKey}
              disabled={disabled}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const CELL_SIZE = 72;

const styles = StyleSheet.create({
  grid: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...hardShadow(2),
  },
  cellPressed: {
    opacity: 0.85,
    ...hardShadow(1),
  },
  keyLabel: {
    ...typography.mono,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  /* Stamped crimson ink overlay */
  stampOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(158, 42, 43, 0.15)',
    borderWidth: 2,
    borderColor: colors.alert,
    borderRadius: 0,
  },
  stampText: {
    ...typography.stamp,
    fontSize: 22,
    color: colors.alert,
    letterSpacing: 1,
  },
  bpmLabel: {
    ...typography.mono,
    position: 'absolute',
    bottom: 4,
    fontSize: 9,
    color: colors.secondary,
    textAlign: 'center',
  },
});

export default KeyStampGrid;
