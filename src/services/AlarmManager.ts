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

export const ALARM_CHANNEL_ID = 'shed_hard_alarm_channel';

export async function setupAlarmChannel(): Promise<void> {
  if (Platform.OS === 'web') {
    console.log('[AlarmManager] Alarms are optimized for iOS & Android native lock screens.');
    return;
  }

  try {
    await notifee.requestPermission();
    await notifee.createChannel({
      id: ALARM_CHANNEL_ID,
      name: 'Shed Engine Practice Alarms',
      importance: AndroidImportance.HIGH,
      sound: 'rhodes_swell', // Bundled warm Rhodes wav in android/app/src/main/res/raw
      vibration: true,
    });

    await notifee.setNotificationCategories([
      {
        id: 'SHED_ALARM_ACTIONS',
        actions: [
          { id: 'START_SHED', title: '▶ Start Shed', foreground: true },
          { id: 'LOW_ENERGY_20M', title: '🔋 Low Energy (20m)', foreground: true },
          { id: 'CANCEL_AND_HEAL', title: '✖ Cancel & Self-Heal', destructive: true },
        ],
      },
    ]);
  } catch (err) {
    console.warn('[AlarmManager] Failed to configure alarm channel:', err);
  }
}

export async function scheduleNextShedAlarm(
  targetDate: Date,
  durationMinutes: number,
  maxIntensity: number
): Promise<void> {
  const rotationExercises = getRotationExercises();
  const activeStandard = getActiveStandard();
  const previewQueue = generateSessionQueue(
    rotationExercises,
    activeStandard,
    durationMinutes,
    maxIntensity
  );

  const topTitles = previewQueue.map((e) => `${e.title} (${e.allocatedMinutes}m)`).join(' • ');

  if (Platform.OS === 'web') {
    console.log(`[AlarmManager] Web practice alarm scheduled for ${targetDate.toLocaleTimeString()}: ${topTitles}`);
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
        id: 'next_scheduled_shed',
        title: `🎷 Shed Time (${durationMinutes}m) — Std: ${activeStandard?.title || 'No standard chosen'}`,
        body: topTitles || 'Open Shed Engine to start your rotation.',
        data: {
          queuedIds: JSON.stringify(previewQueue.map((e) => e.id)),
        },
        android: {
          channelId: ALARM_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          fullScreenAction: { id: 'default' },
          actions: [
            { title: '▶ Start Shed', pressAction: { id: 'START_SHED', launchActivity: 'default' } },
            { title: '🔋 20m Maint.', pressAction: { id: 'LOW_ENERGY_20M', launchActivity: 'default' } },
            { title: '✖ Cancel & Heal', pressAction: { id: 'CANCEL_AND_HEAL' } },
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

// Background lock-screen handler: if user taps "Cancel & Heal", boost urgency in SQLite automatically
if (Platform.OS !== 'web') {
  try {
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'CANCEL_AND_HEAL') {
        const rawIds = detail.notification?.data?.queuedIds as string | undefined;
        if (rawIds) {
          const ids: string[] = JSON.parse(rawIds);
          incrementSkippedForCanceledSession(ids);
        }
        await notifee.cancelNotification(detail.notification?.id || 'next_scheduled_shed');
      }
    });
  } catch {
    // Non-blocking in dev environments
  }
}
