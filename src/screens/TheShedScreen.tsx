/**
 * The Shed Screen — Active Practice Console
 * 
 * Aesthetic:
 * - 1959 Rudy Van Gelder recording studio console
 * - Backlit amber analog tape counter / VU timer
 * - Spinning vinyl record SVG progress graphic
 * - Interactive 12-Key Circle of Fifths stamp matrix
 * - Tactile studio metronome & hands-free voice coach
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  Platform,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { CreamBlock } from '../components/CreamBlock';
import { StampButton } from '../components/StampButton';
import { StampBadge } from '../components/StampBadge';
import { KeyStampGrid } from '../components/KeyStampGrid';
import {
  Exercise,
  MusicalKey,
  KeyStampState,
  PracticeSession,
  SessionBlock,
} from '../types/models';
import {
  getExercises,
  updateExerciseKeyStamps,
  logSessionCompletion,
} from '../db/repository';
import { generatePracticeSession } from '../services/SchedulerEngine';
import { audioMetronomeService } from '../services/AudioMetronomeService';

export interface TheShedScreenProps {
  onNavigateToCrate?: () => void;
  onNavigateToCallSheet?: () => void;
}

export const TheShedScreen: React.FC<TheShedScreenProps> = ({
  onNavigateToCrate,
  onNavigateToCallSheet,
}) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [currentBlockIndex, setCurrentBlockIndex] = useState<number>(0);

  // Timer state
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);

  // Metronome state
  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(false);
  const [metronomeBeat, setMetronomeBeat] = useState<number>(1);

  // Vinyl rotation animation
  const vinylSpin = useRef(new Animated.Value(0)).current;
  const spinAnimation = useRef<Animated.CompositeAnimation | null>(null);

  // Load exercises and initialize default practice queue if none active
  const loadInitialData = useCallback(async () => {
    try {
      const exList = await getExercises();
      setExercises(exList);

      if (exList.length > 0 && !session) {
        // Generate an initial 45-minute practice session
        const initialSession = await generatePracticeSession({
          availableMinutes: 45,
          intensity: 3,
          forceWarmup: true,
        });
        setSession(initialSession);
        if (initialSession.blocks.length > 0) {
          setSecondsRemaining(initialSession.blocks[0].durationMinutes * 60);
        }
      }
    } catch (err) {
      console.error('[TheShed] Error loading session:', err);
    }
  }, [session]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Vinyl spin control
  useEffect(() => {
    if (isActive) {
      spinAnimation.current = Animated.loop(
        Animated.timing(vinylSpin, {
          toValue: 1,
          duration: 3333, // ~33 1/3 RPM realism
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinAnimation.current.start();
    } else {
      if (spinAnimation.current) {
        spinAnimation.current.stop();
      }
    }
  }, [isActive, vinylSpin]);

  // Main countdown interval timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleBlockComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (secondsRemaining === 0) {
      setIsActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsRemaining]);

  const currentBlock: SessionBlock | undefined = session?.blocks[currentBlockIndex];
  const activeExercise: Exercise | undefined =
    currentBlock?.exercise || exercises[0];

  // Format MM:SS for analog tape counter readout
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Toggle Timer
  const handleToggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsActive((prev) => !prev);
  };

  // Toggle Metronome
  const handleToggleMetronome = () => {
    const bpm = activeExercise?.targetBpm || 120;
    if (isMetronomeActive) {
      audioMetronomeService.stopMetronome();
      setIsMetronomeActive(false);
    } else {
      audioMetronomeService.startMetronome(bpm, (beat) => {
        setMetronomeBeat(beat);
      });
      setIsMetronomeActive(true);
    }
  };

  // Hands-free voice coach announcement
  const handleAnnounceBlock = async () => {
    if (!activeExercise) return;
    await audioMetronomeService.announceNextBlock(
      activeExercise.title,
      currentBlock?.targetKey,
      activeExercise.targetBpm
    );
  };

  // Handle completing current practice block
  const handleBlockComplete = async () => {
    if (!activeExercise || !session) return;

    // Log completion to SQLite database
    try {
      await logSessionCompletion({
        sessionId: session.id,
        exerciseId: activeExercise.id,
        durationMinutes: currentBlock?.durationMinutes || 15,
        keysWorked: currentBlock?.targetKey ? [currentBlock.targetKey] : [],
        bpmAchieved: activeExercise.targetBpm,
        notes: `Completed in Shed Console at ${new Date().toLocaleTimeString()}`,
      });
    } catch (err) {
      console.warn('[TheShed] Failed to log completion:', err);
    }

    // Play tactile & audio completion signal
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Advance to next block or finish session
    if (currentBlockIndex + 1 < session.blocks.length) {
      const nextIdx = currentBlockIndex + 1;
      const nextBlock = session.blocks[nextIdx];
      setCurrentBlockIndex(nextIdx);
      setSecondsRemaining(nextBlock.durationMinutes * 60);
      setIsActive(false);

      // Announce next block automatically out loud
      await audioMetronomeService.announceNextBlock(
        nextBlock.exercise.title,
        nextBlock.targetKey,
        nextBlock.exercise.targetBpm
      );
    } else {
      setIsActive(false);
      audioMetronomeService.stopMetronome();
      setIsMetronomeActive(false);
      await audioMetronomeService.announceSessionComplete(session.totalDurationMinutes);
      Alert.alert('Session Complete', 'You have completed all blocks in this shed session! Well done.');
    }
  };

  // Handle 12-key stamping
  const handleStampKey = async (key: MusicalKey) => {
    if (!activeExercise) return;

    const updatedStamps: KeyStampState[] = activeExercise.keyStamps.map((s) => {
      if (s.key === key) {
        const nextStamped = !s.stamped;
        return {
          ...s,
          stamped: nextStamped,
          bpm: nextStamped ? (activeExercise.targetBpm ?? 120) : null,
          stampedAt: nextStamped ? new Date().toISOString() : null,
        };
      }
      return s;
    });

    // Update in memory
    setExercises((prev) =>
      prev.map((e) => (e.id === activeExercise.id ? { ...e, keyStamps: updatedStamps } : e))
    );

    // Persist to local SQLite
    await updateExerciseKeyStamps(activeExercise.id, updatedStamps);
  };

  const spinInterpolation = vinylSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Blue Note Cover Header */}
        <View style={styles.albumHeader}>
          <View style={styles.brassRule} />
          <View style={styles.badgeRow}>
            <StampBadge label="SHED ENGINE" type="soloing" />
            {activeExercise && (
              <>
                <StampBadge label={activeExercise.category.toUpperCase()} type={activeExercise.category} />
                <StampBadge label={activeExercise.context.toUpperCase()} type={activeExercise.context} />
              </>
            )}
          </View>
          <Text style={styles.exerciseTitle}>
            {activeExercise ? activeExercise.title : 'Loading Studio Console...'}
          </Text>
          <Text style={styles.exerciseSubtitle}>
            {activeExercise?.description || 'Authentic analog jazz practice console'}
          </Text>
          <View style={styles.brassRuleThin} />
        </View>

        {/* Centerpiece: Backlit Amber Tape Counter & Spinning Vinyl */}
        <CreamBlock variant="dark" style={styles.tapeConsoleCard}>
          <View style={styles.consoleHeaderRow}>
            <Text style={styles.tapeLabel}>ANALOG TAPE COUNTER // RVG 1959</Text>
            {session && (
              <Text style={styles.blockProgress}>
                BLOCK {currentBlockIndex + 1} OF {session.blocks.length}
              </Text>
            )}
          </View>

          <View style={styles.timerAndVinylRow}>
            {/* Spinning Vinyl Record SVG */}
            <View style={styles.vinylContainer}>
              <Animated.View style={{ transform: [{ rotate: spinInterpolation }] }}>
                <Svg width={90} height={90} viewBox="0 0 100 100">
                  {/* Outer vinyl disc */}
                  <Circle cx="50" cy="50" r="48" fill="#120D0A" stroke="#2A221C" strokeWidth="2" />
                  {/* Vinyl grooves */}
                  <Circle cx="50" cy="50" r="40" fill="none" stroke="#251E18" strokeWidth="1" strokeDasharray="3,3" />
                  <Circle cx="50" cy="50" r="32" fill="none" stroke="#251E18" strokeWidth="1" />
                  <Circle cx="50" cy="50" r="24" fill="none" stroke="#251E18" strokeWidth="1" strokeDasharray="2,2" />
                  {/* Blue Note Center Label */}
                  <Circle cx="50" cy="50" r="16" fill="#D49B35" stroke="#16110E" strokeWidth="1.5" />
                  {/* Spindle hole */}
                  <Circle cx="50" cy="50" r="4" fill="#16110E" />
                </Svg>
              </Animated.View>
            </View>

            {/* Backlit Amber Tape Counter Display */}
            <View style={styles.counterDisplay}>
              <Text style={styles.tapeDigits}>{formatTime(secondsRemaining)}</Text>
              <Text style={styles.targetKeyBanner}>
                {currentBlock?.targetKey ? `TARGET KEY: [ ${currentBlock.targetKey} ]` : 'TARGET KEY: ALL'}
              </Text>
            </View>
          </View>

          {/* Metronome Beat Indicator */}
          {isMetronomeActive && (
            <View style={styles.metronomeBeatRow}>
              {[1, 2, 3, 4].map((beat) => (
                <View
                  key={beat}
                  style={[
                    styles.metronomeDot,
                    metronomeBeat === beat && styles.metronomeDotActive,
                  ]}
                />
              ))}
              <Text style={styles.metronomeStatus}>
                {activeExercise?.targetBpm || 120} BPM SWING
              </Text>
            </View>
          )}

          {/* Timer Transport Controls */}
          <View style={styles.transportRow}>
            <View style={styles.transportBtn}>
              <StampButton
                label={isActive ? 'PAUSE' : 'PLAY'}
                variant={isActive ? 'alert' : 'primary'}
                size="md"
                onPress={handleToggleTimer}
              />
            </View>
            <View style={styles.transportBtn}>
              <StampButton
                label={isMetronomeActive ? 'STOP CLICK' : 'START CLICK'}
                variant="secondary"
                size="md"
                onPress={handleToggleMetronome}
              />
            </View>
            <View style={styles.transportBtn}>
              <StampButton
                label="NEXT DRILL"
                variant="secondary"
                size="md"
                onPress={handleBlockComplete}
              />
            </View>
          </View>

          {/* Hands-Free Voice Announcement Button */}
          <View style={styles.voiceCoachRow}>
            <StampButton
              label="🎙️ HEAR VOICE ANNOUNCEMENT"
              variant="secondary"
              size="sm"
              onPress={handleAnnounceBlock}
            />
          </View>
        </CreamBlock>

        {/* 12-Key Circle of Fifths Stamp Matrix */}
        {activeExercise && (
          <View style={styles.matrixSection}>
            <Text style={styles.sectionTitle}>
              // 12-KEY HARMONIC STAMP PAD (CIRCLE OF FIFTHS)
            </Text>
            <CreamBlock variant="dark" style={styles.stampMatrixCard}>
              <KeyStampGrid
                stamps={activeExercise.keyStamps}
                onStampKey={handleStampKey}
              />
              <Text style={styles.matrixCaption}>
                Tap any key to stamp completion with heavy tactile click and crimson ink
              </Text>
            </CreamBlock>
          </View>
        )}

        {/* Crate Shortcut & Navigation */}
        <View style={styles.navStack}>
          <StampButton
            label="BROWSE FULL TUNE CRATE →"
            variant="secondary"
            size="md"
            onPress={onNavigateToCrate || (() => {})}
          />
          <StampButton
            label="MANAGE CALL SHEET & ALARMS →"
            variant="secondary"
            size="md"
            onPress={onNavigateToCallSheet || (() => {})}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TheShedScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#16110E',
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  albumHeader: {
    marginBottom: 20,
  },
  brassRule: {
    height: 4,
    backgroundColor: '#D49B35',
    marginBottom: 10,
  },
  brassRuleThin: {
    height: 1,
    backgroundColor: '#3A2F26',
    marginTop: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  exerciseTitle: {
    fontSize: 26,
    fontFamily: 'Fraunces_900Black',
    lineHeight: 32,
    color: '#F4EFE6',
    letterSpacing: -0.5,
  },
  exerciseSubtitle: {
    fontSize: 12,
    fontFamily: 'CourierPrime_400Regular',
    color: '#A69686',
    marginTop: 4,
    lineHeight: 18,
  },
  tapeConsoleCard: {
    marginBottom: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: '#181512',
    backgroundColor: '#241B16',
  },
  consoleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tapeLabel: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 11,
    letterSpacing: 2,
    color: '#D49B35',
  },
  blockProgress: {
    fontFamily: 'CourierPrime_700Bold',
    fontSize: 11,
    color: '#A69686',
  },
  timerAndVinylRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  vinylContainer: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterDisplay: {
    backgroundColor: '#120D0A',
    borderWidth: 2,
    borderColor: '#3A2F26',
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  tapeDigits: {
    fontFamily: 'CourierPrime_700Bold',
    fontSize: 38,
    lineHeight: 44,
    color: '#D49B35',
    textShadowColor: 'rgba(212, 155, 53, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  targetKeyBanner: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#F4EFE6',
    marginTop: 4,
  },
  metronomeBeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  metronomeDot: {
    width: 10,
    height: 10,
    backgroundColor: '#3A2F26',
  },
  metronomeDotActive: {
    backgroundColor: '#D95D39',
  },
  metronomeStatus: {
    fontFamily: 'CourierPrime_700Bold',
    fontSize: 11,
    color: '#D49B35',
    marginLeft: 6,
  },
  transportRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  transportBtn: {
    flex: 1,
  },
  voiceCoachRow: {
    alignItems: 'center',
    marginTop: 6,
  },
  matrixSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 12,
    letterSpacing: 2,
    color: '#D49B35',
    marginBottom: 10,
  },
  stampMatrixCard: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  matrixCaption: {
    fontFamily: 'CourierPrime_400Regular',
    fontSize: 11,
    color: '#7A6B5D',
    marginTop: 12,
    textAlign: 'center',
  },
  navStack: {
    gap: 10,
    marginTop: 10,
  },
});
