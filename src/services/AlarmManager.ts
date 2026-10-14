/**
 * Native Notification & Alarm Engine for Shed Engine
 * 
 * Powered by expo-notifications:
 * - Configures custom notification categories with interactive lock-screen actions:
 *   "Start Shed", "Snooze 30m", "Low Energy (Cut to 20m)", and "Cancel & Reschedule"
 * - Synchronizes recurring alarm schedules with local device alarms
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AlarmSchedule } from '../types/models';
import { getAlarmSchedules } from '../db/repository';
import { handleSessionCancellation } from './SchedulerEngine';

export const ALARM_CATEGORY_ID = 'SHED_PRACTICE_ALARM';

export const ACTION_START_SHED = 'ACTION_START_SHED';
export const ACTION_SNOOZE_30 = 'ACTION_SNOOZE_30';
export const ACTION_LOW_ENERGY = 'ACTION_LOW_ENERGY';
export const ACTION_CANCEL_RESCHEDULE = 'ACTION_CANCEL_RESCHEDULE';

// Global notification presentation settings
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

class AlarmManager {
  private isInitialized: boolean = false;

  /**
   * Initializes notification permissions, channels, and interactive categories.
   */
  public async initNotifications(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // 1. Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[AlarmManager] Notification permissions not granted');
        return false;
      }

      // 2. Android Notification Channel configuration (high importance / alarm style)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('shed-alarms', {
          name: 'Shed Routine Alarms',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#D49B35', // Saxophone Brass
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          sound: 'default',
        });
      }

      // 3. Register interactive lock-screen action categories
      await Notifications.setNotificationCategoryAsync(ALARM_CATEGORY_ID, [
        {
          identifier: ACTION_START_SHED,
          buttonTitle: '▶ Start Shed',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: ACTION_LOW_ENERGY,
          buttonTitle: '⚡ Low Energy (20m)',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: ACTION_SNOOZE_30,
          buttonTitle: '⏰ Snooze 30m',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: ACTION_CANCEL_RESCHEDULE,
          buttonTitle: '✕ Cancel & Reschedule',
          options: {
            opensAppToForeground: false,
            isDestructive: true,
          },
        },
      ]);

      // 4. Register action response listener
      this.setupResponseListener();

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.warn('[AlarmManager] Failed to init notifications:', err);
      return false;
    }
  }

  /**
   * Listens for user interactions with notification buttons.
   */
  private setupResponseListener(): void {
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      const actionIdentifier = response.actionIdentifier;
      const data = response.notification.request.content.data;

      switch (actionIdentifier) {
        case ACTION_SNOOZE_30:
          // Schedule a reminder in 30 minutes
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Shed Engine // Snooze Reminder',
              body: 'Your 30-minute snooze has ended. The Shed is ready.',
              categoryIdentifier: ALARM_CATEGORY_ID,
              sound: true,
              data: { ...data, snoozed: true },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 1800,
            },
          });
          break;

        case ACTION_CANCEL_RESCHEDULE:
          if (data?.sessionId) {
            await handleSessionCancellation(data.sessionId as string);
          }
          break;

        case ACTION_START_SHED:
        case ACTION_LOW_ENERGY:
          // Foreground will handle starting the session
          break;
      }
    });
  }

  /**
   * Schedules a recurring weekly alarm based on an AlarmSchedule model.
   */
  public async scheduleAlarm(schedule: AlarmSchedule): Promise<string | null> {
    await this.initNotifications();
    if (!schedule.enabled) return null;

    try {
      // Map 0-6 day of week to expo-notifications weekly trigger (1=Sunday, 7=Saturday)
      const weekday = schedule.dayOfWeek + 1;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Shed Engine // ${schedule.label}`,
          body: `Time for your ${schedule.defaultSessionMinutes}m practice session (Intensity ${schedule.defaultIntensity}/5).`,
          categoryIdentifier: ALARM_CATEGORY_ID,
          sound: true,
          data: {
            alarmId: schedule.id,
            defaultMinutes: schedule.defaultSessionMinutes,
            defaultIntensity: schedule.defaultIntensity,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: schedule.hour,
          minute: schedule.minute,
        },
      });

      return identifier;
    } catch (err) {
      console.warn('[AlarmManager] Failed to schedule alarm:', err);
      return null;
    }
  }

  /**
   * Triggers an immediate test notification with interactive actions.
   */
  public async triggerTestNotification(): Promise<void> {
    await this.initNotifications();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Shed Engine // Studio Call Sheet',
        body: 'Warm Rhodes swell: 45-minute practice block queued. Tap an action below.',
        categoryIdentifier: ALARM_CATEGORY_ID,
        sound: true,
        data: { test: true },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });
  }

  /**
   * Synchronizes all enabled alarms from SQLite to device notification triggers.
   */
  public async syncAllAlarms(): Promise<void> {
    try {
      await this.initNotifications();
      // Cancel all existing scheduled notifications first
      await Notifications.cancelAllScheduledNotificationsAsync();

      const alarms = await getAlarmSchedules();
      for (const alarm of alarms) {
        if (alarm.enabled) {
          await this.scheduleAlarm(alarm);
        }
      }
    } catch (err) {
      console.warn('[AlarmManager] Failed to sync alarms:', err);
    }
  }
}

export const alarmManager = new AlarmManager();
export default alarmManager;
