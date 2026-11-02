import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useMetronomeBeat, useSession } from '../../session/SessionContext';
import { METRONOME_VOICES, MetronomeVoice } from '../../services/AudioMetronomeService';
import { CreamBlock } from '../CreamBlock';
import { Stepper } from '../Stepper';
import { StampToggle } from '../StampToggle';
import { SegmentedStamp } from '../SegmentedStamp';

const BeatDots: React.FC = () => {
  const { colors, typography } = useTheme();
  const { isMetronomeOn, feel } = useSession();
  const currentBeat = useMetronomeBeat();

  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[1, 2, 3, 4].map((beat) => {
        const isCurrent = isMetronomeOn && currentBeat === beat;
        const isBackbeat = beat === 2 || beat === 4;
        const isMuted = feel === 'BACKBEAT_2_4' && !isBackbeat;
        return (
          <View
            key={beat}
            style={[
              styles.dot,
              {
                borderColor: colors.inkBlack,
                opacity: isMuted && !isCurrent ? 0.45 : 1,
                backgroundColor: isCurrent
                  ? isBackbeat
                    ? colors.primary
                    : colors.recessedSurface
                  : colors.cardSurface,
              },
            ]}
          >
            <Text
              style={[
                typography.monoBold,
                { color: isCurrent && isBackbeat ? colors.onAccent : colors.inkMuted },
              ]}
            >
              {beat}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

export const MetronomeStrip: React.FC = () => {
  const { colors, typography } = useTheme();
  const {
    current,
    isMetronomeOn,
    toggleMetronome,
    setBpm,
    voice,
    setVoice,
    feel,
    setFeel,
    autoStartNext,
    setAutoStartNext,
  } = useSession();
  const [soundOpen, setSoundOpen] = useState(false);
  const bpm = current?.effectiveBpm ?? 120;

  return (
    <CreamBlock>
      <View style={styles.mainRow}>
        <Stepper
          accessibilityLabel="Tempo"
          value={bpm}
          onChange={(next) => setBpm(next - bpm)}
          step={5}
          min={30}
          max={320}
          format={(v) => `♩ ${v}`}
        />
        <StampToggle label="METRONOME" checked={isMetronomeOn} onChange={toggleMetronome} />
        <BeatDots />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sound settings"
        accessibilityState={{ expanded: soundOpen }}
        onPress={() => setSoundOpen(!soundOpen)}
        style={styles.disclosure}
      >
        <Text style={[typography.stamp, { color: colors.primary }]}>
          {soundOpen ? 'SOUND ▴' : 'SOUND ▾'}
        </Text>
      </Pressable>

      {soundOpen && (
        <View style={styles.soundBody}>
          <SegmentedStamp<MetronomeVoice>
            accessibilityLabel="Metronome sound"
            options={METRONOME_VOICES}
            value={voice}
            onChange={setVoice}
            tone="brass"
          />
          <StampToggle
            label="BEATS 2 & 4 ONLY"
            checked={feel === 'BACKBEAT_2_4'}
            onChange={(on) => setFeel(on ? 'BACKBEAT_2_4' : 'ALL_FOUR_2_4_ACCENT')}
          />
          <StampToggle
            label="AUTO-START NEXT BLOCK"
            checked={autoStartNext}
            onChange={setAutoStartNext}
            hint="When a block ends while the clock runs"
          />
        </View>
      )}
    </CreamBlock>
  );
};

const styles = StyleSheet.create({
  mainRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 28,
    height: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclosure: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    marginTop: 4,
  },
  soundBody: {
    gap: 4,
  },
});
