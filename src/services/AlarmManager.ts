import { Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
  EventType,
} from '@notifee/react-native';
import {
  getActiveStandard,
  getRotationExercises,
  incrementSkippedForCanceledSession,
} from '../db/repository';
import { generateSessionQueue } from './SchedulerEngine';
import { SessionConfig } from '../types/models';

export const ALARM_CHANNEL_ID = 'shed_hard_alarm_channel';
const ALARM_NOTIFICATION_ID = 'next_scheduled_shed';

export async function setupAlarmChannel(): Promise<void> {
  if (Platform.OS === 'web') {
    console.log('[AlarmManager] Alarms are optimized for iOS & Android native lock screens.');
    return;
  }

  try {
    await notifee.requestPermission();
    await notifee.createChannel({
      id: ALARM_CHANNEL_ID,
      name: 'Practice reminders',
      importance: AndroidImportance.HIGH,
      sound: 'rhodes_swell', // Bundled warm Rhodes wav in android/app/src/main/res/raw
      vibration: true,
    });

    await notifee.setNotificationCategories([
      {
        id: 'SHED_ALARM_ACTIONS',
        actions: [
          { id: 'START_SHED', title: '▶ Start', foreground: true },
          { id: 'LOW_ENERGY_20M', title: 'Short session (20 min)', foreground: true },
          { id: 'CANCEL_AND_HEAL', title: '✕ Skip today', destructive: true },
        ],
      },
    ]);
  } catch (err) {
    console.warn('[AlarmManager] Failed to configure alarm channel:', err);
  }
}

/** Next occurrence of `hour`:00 — today if still ahead, otherwise tomorrow. */
function nextOccurrenceOf(hour: number, now: Date = new Date()): Date {
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

export async function scheduleNextShedAlarm(hour: number, config: SessionConfig): Promise<void> {
  const targetDate = nextOccurrenceOf(hour);
  const activeStandard = getActiveStandard();
  const previewQueue = generateSessionQueue(
    getRotationExercises(),
    activeStandard,
    config.availableMinutes,
    config.intensity,
    config.contextFilter
  );

  const topTitles = previewQueue.map((e) => `${e.title} (${e.allocatedMinutes} min)`).join(' • ');

  if (Platform.OS === 'web') {
    console.log(`[AlarmManager] Web practice alarm scheduled for ${targetDate.toLocaleString()}: ${topTitles}`);
    return;
  }

  try {
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: targetDate.getTime(),
      alarmManager: { allowWhileIdle: true },
    };

    await notifee.createTriggerNotification(
      {
        id: ALARM_NOTIFICATION_ID,
        title: `Practice time (${config.availableMinutes} min) — Song: ${activeStandard?.title || 'none chosen'}`,
        body: topTitles || 'Open the app to plan today’s practice.',
        data: {
          queuedIds: JSON.stringify(previewQueue.map((e) => e.id)),
        },
        android: {
          channelId: ALARM_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          fullScreenAction: { id: 'default' },
          actions: [
            { title: '▶ Start', pressAction: { id: 'START_SHED', launchActivity: 'default' } },
            { title: 'Short (20 min)', pressAction: { id: 'LOW_ENERGY_20M', launchActivity: 'default' } },
            { title: '✕ Skip today', pressAction: { id: 'CANCEL_AND_HEAL' } },
          ],
        },
        ios: {
          categoryId: 'SHED_ALARM_ACTIONS',
          interruptionLevel: 'timeSensitive',
          sound: 'rhodes_swell.wav',
        },
      },
      trigger
    );
  } catch (err) {
    console.warn('[AlarmManager] Failed to schedule trigger notification:', err);
  }
}

export async function cancelNextShedAlarm(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await notifee.cancelNotification(ALARM_NOTIFICATION_ID);
  } catch (err) {
    console.warn('[AlarmManager] Failed to cancel reminder:', err);
  }
}

// Background lock-screen handler: if the user taps "Skip today", boost urgency in SQLite automatically
if (Platform.OS !== 'web') {
  try {
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'CANCEL_AND_HEAL') {
        const rawIds = detail.notification?.data?.queuedIds as string | undefined;
        if (rawIds) {
          const ids: string[] = JSON.parse(rawIds);
          incrementSkippedForCanceledSession(ids);
        }
        await notifee.cancelNotification(detail.notification?.id || ALARM_NOTIFICATION_ID);
      }
    });
  } catch {
    // Non-blocking in dev environments
  }
}
