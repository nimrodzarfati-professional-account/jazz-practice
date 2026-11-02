import React, { useState } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useSession } from '../../session/SessionContext';
import { getLocalPref, setLocalPref } from '../../db/repository';
import { cancelNextShedAlarm, scheduleNextShedAlarm } from '../../services/AlarmManager';
import { CreamBlock } from '../CreamBlock';
import { StampToggle } from '../StampToggle';
import { Stepper } from '../Stepper';

export const ReminderRow: React.FC = () => {
  const { colors, typography } = useTheme();
  const { config } = useSession();
  const [enabled, setEnabled] = useState(() => getLocalPref('pref_reminder_enabled', '0') === '1');
  const [hour, setHour] = useState(() => Number(getLocalPref('pref_reminder_hour', '8')) || 8);

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    setLocalPref('pref_reminder_enabled', next ? '1' : '0');
    if (next) {
      scheduleNextShedAlarm(hour, config);
    } else {
      cancelNextShedAlarm();
    }
  };

  const handleHour = (next: number) => {
    setHour(next);
    setLocalPref('pref_reminder_hour', String(next));
    if (enabled) scheduleNextShedAlarm(next, config);
  };

  return (
    <CreamBlock>
      <View style={styles.row}>
        <View style={styles.toggle}>
          <StampToggle
            label="MORNING REMINDER"
            checked={enabled}
            onChange={handleToggle}
            hint={Platform.OS === 'web' ? 'Reminders ring on the phone app' : 'A notification with today’s plan'}
          />
        </View>
        <Stepper
          accessibilityLabel="Reminder hour"
          value={hour}
          onChange={handleHour}
          step={1}
          min={5}
          max={12}
          format={(v) => `${v}:00`}
        />
      </View>
      {enabled && (
        <Text style={[typography.mono, styles.note, { color: colors.inkMuted }]}>
          Next reminder at {hour}:00.
        </Text>
      )}
    </CreamBlock>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  toggle: {
    flex: 1,
    minWidth: 180,
  },
  note: {
    marginTop: 6,
  },
});
