/**
 * The Call Sheet Screen — Dynamic Schedule, Console Faders & Studio Alarms
 * 
 * Aesthetic:
 * - 1960s Rudy Van Gelder studio booking sheet pinned to mahogany
 * - Studio mixing console faders (Session Time & Chop Battery)
 * - Tactile brass toggle switches for scheduling hard device alarms
 * - Immediate session generation & execution
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  Platform,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { CreamBlock } from '../components/CreamBlock';
import { StampButton } from '../components/StampButton';
import { StampBadge } from '../components/StampBadge';
import { StudioFader } from '../components/StudioFader';
import {
  AlarmSchedule,
  PracticeSession,
  SessionLogEntry,
  IntensityLevel,
} from '../types/models';
import {
  getAlarmSchedules,
  updateAlarmSchedule,
  getAllLogs,
} from '../db/repository';
import { generatePracticeSession } from '../services/SchedulerEngine';
import { alarmManager } from '../services/AlarmManager';

export interface TheCallSheetScreenProps {
  onStartSession?: (session: PracticeSession) => void;
  onNavigateToShed?: () => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const TheCallSheetScreen: React.FC<TheCallSheetScreenProps> = ({
  onStartSession,
  onNavigateToShed,
}) => {
  // Pre-session Audible Faders
  const [sessionMinutes, setSessionMinutes] = useState<number>(45);
  const [intensity, setIntensity] = useState<number>(3);

  // Alarms and history
  const [alarms, setAlarms] = useState<AlarmSchedule[]>([]);
  const [logs, setLogs] = useState<SessionLogEntry[]>([]);
  const [packedSession, setPackedSession] = useState<PracticeSession | null>(null);

  const loadData = useCallback(async () => {
    try {
      const alarmList = await getAlarmSchedules();
      setAlarms(alarmList);
      const logList = await getAllLogs(10);
      setLogs(logList);
    } catch (err) {
      console.warn('[TheCallSheet] Error loading alarms and logs:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    alarmManager.initNotifications();
  }, [loadData]);

  // Toggle Alarm Schedule in SQLite and OS trigger
  const handleToggleAlarm = async (alarm: AlarmSchedule) => {
    const nextEnabled = !alarm.enabled;
    try {
      await updateAlarmSchedule(alarm.id, { enabled: nextEnabled });
      setAlarms((prev) =>
        prev.map((a) => (a.id === alarm.id ? { ...a, enabled: nextEnabled } : a))
      );

      if (nextEnabled) {
        await alarmManager.scheduleAlarm({ ...alarm, enabled: true });
      } else {
        await alarmManager.syncAllAlarms();
      }
    } catch (err: any) {
      Alert.alert('Alarm Error', err.message);
    }
  };

  // Pack Call Sheet Practice Session
  const handlePackSession = async () => {
    try {
      const generated = await generatePracticeSession({
        availableMinutes: sessionMinutes,
        intensity: intensity as IntensityLevel,
        forceWarmup: true,
      });
      setPackedSession(generated);
    } catch (err: any) {
      Alert.alert('Pack Error', err.message);
    }
  };

  // Launch and Navigate
  const handleLaunchSession = () => {
    if (packedSession && onStartSession) {
      onStartSession(packedSession);
    }
    if (onNavigateToShed) {
      onNavigateToShed();
    }
  };

  // Trigger Instant Test Alarm
  const handleTestNotification = async () => {
    await alarmManager.triggerTestNotification();
    Alert.alert('Alarm Dispatched', 'Test lock-screen alarm fired. Check your notifications in 2 seconds!');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brassRule} />
          <View style={styles.badgeRow}>
            <StampBadge label="SHED ENGINE" type="soloing" />
            <StampBadge label="STUDIO BOOKING SHEET" type="comping" />
            <StampBadge label="1960 RVG CONSOLE" type="maintenance" />
          </View>
          <Text style={styles.headerTitle}>The Call Sheet</Text>
          <Text style={styles.headerSubtitle}>
            Pre-session audible mixing faders • OS alarm switches • Session logs
          </Text>
          <View style={styles.brassRuleThin} />
        </View>

        {/* Section 1: Pre-Session Audible Mixing Faders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>// 01 PRE-SESSION AUDIBLE FADERS</Text>
          <CreamBlock variant="dark" style={styles.faderCard}>
            <Text style={styles.faderInstruction}>
              Drag faders to adjust target rehearsal length and cognitive chop battery:
            </Text>
            <View style={styles.faderRow}>
              <StudioFader
                label="SESSION TIME"
                value={sessionMinutes}
                min={15}
                max={120}
                step={5}
                unit="m"
                accentColor="#D95D39"
                height={200}
                onChange={setSessionMinutes}
              />
              <View style={styles.faderDivider} />
              <StudioFader
                label="CHOP BATTERY"
                value={intensity}
                min={1}
                max={5}
                step={1}
                unit="/5"
                accentColor="#D49B35"
                height={200}
                onChange={setIntensity}
              />
            </View>

            <View style={styles.packBtnWrapper}>
              <StampButton
                label={`PACK OPTIMAL ${sessionMinutes}M CALL SHEET`}
                variant="primary"
                size="md"
                onPress={handlePackSession}
              />
            </View>
          </CreamBlock>
        </View>

        {/* Section 2: Packed Session Queue Preview */}
        {packedSession && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#D95D39' }]}>
              // 02 QUEUE GENERATED ({packedSession.totalDurationMinutes}M PACKED)
            </Text>
            {packedSession.blocks.map((block, idx) => (
              <CreamBlock
                key={`${block.exerciseId}-${idx}`}
                variant={idx === 0 ? 'light' : 'dark'}
                lifted={idx === 0}
                style={styles.queueItem}
              >
                <View style={styles.cardHeader}>
                  <StampBadge label={`BLOCK ${idx + 1}`} type={block.exercise.category} />
                  <StampBadge label={block.exercise.context.toUpperCase()} type={block.exercise.context} />
                  <Text
                    style={[
                      styles.cardMeta,
                      { color: idx === 0 ? '#1A1412' : '#D49B35' },
                    ]}
                  >
                    {block.durationMinutes} MIN {block.targetKey ? `// TARGET: ${block.targetKey}` : ''}
                  </Text>
                </View>
                <Text
                  style={[
                    idx === 0 ? styles.cardTitleLight : styles.cardTitleDark,
                    { color: idx === 0 ? '#1A1412' : '#F4EFE6' },
                  ]}
                >
                  {block.exercise.title}
                </Text>
              </CreamBlock>
            ))}

            <View style={styles.launchBtnWrapper}>
              <StampButton
                label="ENTER THE SHED CONSOLE WITH THIS QUEUE →"
                variant="primary"
                size="lg"
                hapticStyle="heavy"
                onPress={handleLaunchSession}
              />
            </View>
          </View>
        )}

        {/* Section 3: Hard OS Device Alarms & Switches */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>// 03 SCHEDULED STUDIO ALARMS</Text>
            <TouchableOpacity onPress={handleTestNotification}>
              <Text style={styles.testAlarmLink}>[ TEST NOTIFICATION ]</Text>
            </TouchableOpacity>
          </View>

          <CreamBlock variant="dark" style={styles.alarmContainer}>
            {alarms.map((alarm) => {
              const timeString = `${String(alarm.hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')}`;
              const dayName = DAY_NAMES[alarm.dayOfWeek];

              return (
                <View key={alarm.id} style={styles.alarmRow}>
                  <View style={styles.alarmInfo}>
                    <Text style={styles.alarmTime}>{timeString}</Text>
                    <Text style={styles.alarmDayLabel}>
                      {dayName.toUpperCase()} • {alarm.label} ({alarm.defaultSessionMinutes}M)
                    </Text>
                  </View>
                  <Switch
                    value={alarm.enabled}
                    onValueChange={() => handleToggleAlarm(alarm)}
                    trackColor={{ false: '#3A2F26', true: '#D49B35' }}
                    thumbColor={alarm.enabled ? '#F4EFE6' : '#7A6B5D'}
                  />
                </View>
              );
            })}
          </CreamBlock>
        </View>

        {/* Section 4: Studio Practice Log Book */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>// 04 STUDIO SESSION LOG BOOK</Text>
          {logs.length === 0 ? (
            <CreamBlock variant="dark" style={styles.emptyLogCard}>
              <Text style={styles.emptyLogText}>
                No completed session logs yet. Completed drills from The Shed will record here.
              </Text>
            </CreamBlock>
          ) : (
            logs.map((log) => (
              <CreamBlock key={log.id} variant="dark" style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logDate}>
                    {new Date(log.practicedAt).toLocaleDateString()} {new Date(log.practicedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.logDuration}>{log.durationMinutes} MIN LOGGED</Text>
                </View>
                <Text style={styles.logNotes}>
                  {log.notes || 'Routine block internalized in the shed.'}
                </Text>
                {log.keysWorked.length > 0 && (
                  <Text style={styles.logKeys}>
                    KEYS WORKED: [ {log.keysWorked.join(', ')} ]
                  </Text>
                )}
              </CreamBlock>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TheCallSheetScreen;

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
  header: {
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
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Fraunces_900Black',
    lineHeight: 34,
    color: '#F4EFE6',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'CourierPrime_400Regular',
    color: '#A69686',
    marginTop: 4,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 12,
    letterSpacing: 2,
    color: '#D49B35',
    marginBottom: 10,
  },
  testAlarmLink: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#D95D39',
  },
  faderCard: {
    padding: 16,
  },
  faderInstruction: {
    fontFamily: 'CourierPrime_400Regular',
    fontSize: 12,
    color: '#A69686',
    marginBottom: 14,
    textAlign: 'center',
  },
  faderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  faderDivider: {
    width: 2,
    height: 180,
    backgroundColor: '#3A2F26',
  },
  packBtnWrapper: {
    marginTop: 8,
  },
  queueItem: {
    marginBottom: 10,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  cardMeta: {
    marginLeft: 'auto',
    fontFamily: 'CourierPrime_700Bold',
    fontSize: 11,
  },
  cardTitleLight: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 18,
    lineHeight: 22,
  },
  cardTitleDark: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 18,
    lineHeight: 22,
  },
  launchBtnWrapper: {
    marginTop: 8,
    marginBottom: 10,
  },
  alarmContainer: {
    padding: 12,
    gap: 14,
  },
  alarmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#3A2F26',
  },
  alarmInfo: {
    flex: 1,
  },
  alarmTime: {
    fontFamily: 'CourierPrime_700Bold',
    fontSize: 22,
    color: '#D49B35',
  },
  alarmDayLabel: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#A69686',
    marginTop: 2,
  },
  emptyLogCard: {
    padding: 20,
    alignItems: 'center',
  },
  emptyLogText: {
    fontFamily: 'CourierPrime_400Regular',
    fontSize: 12,
    color: '#7A6B5D',
    textAlign: 'center',
  },
  logCard: {
    padding: 12,
    marginBottom: 10,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logDate: {
    fontFamily: 'CourierPrime_700Bold',
    fontSize: 11,
    color: '#D49B35',
  },
  logDuration: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#D95D39',
  },
  logNotes: {
    fontFamily: 'CourierPrime_400Regular',
    fontSize: 12,
    color: '#F4EFE6',
  },
  logKeys: {
    fontFamily: 'CourierPrime_700Bold',
    fontSize: 10,
    color: '#A69686',
    marginTop: 4,
  },
});
