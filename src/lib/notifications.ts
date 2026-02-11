import * as Notifications from 'expo-notifications';
import { ReminderWeekday } from './notificationSettings';
import { loadCompletionsFromStorage } from '../store/storage';
import { startOfDay, toDateKey } from './date';

const DAILY_REMINDER_KIND = 'daily-reminder';

function isPermissionGranted(status: Notifications.NotificationPermissionsStatus): boolean {
  return status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const currentPermissions = await Notifications.getPermissionsAsync();

  if (isPermissionGranted(currentPermissions)) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();
  return isPermissionGranted(requestedPermissions);
}

export async function cancelDailyReminderNotifications(): Promise<void> {
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  const reminderRequests = requests.filter((request) => request.content.data?.kind === DAILY_REMINDER_KIND);

  await Promise.all(
    reminderRequests.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
}

type ReminderScheduleInput = {
  weekdays: ReminderWeekday[];
  hour: number;
  minute: number;
};

function getReminderBodyForStreak(streakDays: number): string {
  if (streakDays >= 2) {
    return `Ready for your workout? Don't lose your ${streakDays} day streak`;
  }

  return 'Ready for your workout?';
}

async function getCurrentStreakDays(): Promise<number> {
  try {
    const completions = await loadCompletionsFromStorage();

    if (!completions || completions.length === 0) {
      return 0;
    }

    const completedDayKeys = new Set<string>();

    completions.forEach((item) => {
      if (!item || typeof item.completedAt !== 'number' || !Number.isFinite(item.completedAt)) {
        return;
      }

      completedDayKeys.add(toDateKey(new Date(item.completedAt)));
    });

    let streakDays = 0;
    const cursor = startOfDay(new Date());

    while (completedDayKeys.has(toDateKey(cursor))) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streakDays;
  } catch (error) {
    console.warn('Failed to load completions for reminder copy', error);
    return 0;
  }
}

export async function scheduleDailyReminderNotification({
  weekdays,
  hour,
  minute,
}: ReminderScheduleInput): Promise<void> {
  await cancelDailyReminderNotifications();
  const streakDays = await getCurrentStreakDays();
  const reminderBody = getReminderBodyForStreak(streakDays);

  const uniqueWeekdays = Array.from(new Set(weekdays));
  if (!uniqueWeekdays.length) {
    return;
  }

  await Promise.all(
    uniqueWeekdays.map((weekday) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Workout Time',
          body: reminderBody,
          sound: 'default',
          data: { kind: DAILY_REMINDER_KIND, streakDays },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
        },
      }),
    ),
  );
}
