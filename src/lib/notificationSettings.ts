import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReminderWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type NotificationSettings = {
  notificationsEnabled: boolean;
  dailyReminderEnabled: boolean;
  reminderWeekdays: ReminderWeekday[];
  reminderHour: number;
  reminderMinute: number;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  notificationsEnabled: true,
  dailyReminderEnabled: false,
  reminderWeekdays: [2, 3, 4, 5, 6, 7, 1],
  reminderHour: 20,
  reminderMinute: 0,
};

const NOTIFICATION_SETTINGS_STORAGE_KEY = '@workout_timer/notification_settings';

function normalizeWeekdays(value: unknown): ReminderWeekday[] {
  if (!Array.isArray(value)) {
    return DEFAULT_NOTIFICATION_SETTINGS.reminderWeekdays;
  }

  const uniqueDays = new Set<ReminderWeekday>();

  value.forEach((candidate) => {
    if (typeof candidate !== 'number' || !Number.isInteger(candidate)) {
      return;
    }

    if (candidate >= 1 && candidate <= 7) {
      uniqueDays.add(candidate as ReminderWeekday);
    }
  });

  const normalized = Array.from(uniqueDays);
  return normalized.length > 0 ? normalized : DEFAULT_NOTIFICATION_SETTINGS.reminderWeekdays;
}

function normalizeHour(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23) {
    return value;
  }

  return DEFAULT_NOTIFICATION_SETTINGS.reminderHour;
}

function normalizeMinute(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 59) {
    return value;
  }

  return DEFAULT_NOTIFICATION_SETTINGS.reminderMinute;
}

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  const raw = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_STORAGE_KEY);

  if (!raw) {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;

    return {
      notificationsEnabled:
        typeof parsed.notificationsEnabled === 'boolean'
          ? parsed.notificationsEnabled
          : DEFAULT_NOTIFICATION_SETTINGS.notificationsEnabled,
      dailyReminderEnabled:
        typeof parsed.dailyReminderEnabled === 'boolean'
          ? parsed.dailyReminderEnabled
          : DEFAULT_NOTIFICATION_SETTINGS.dailyReminderEnabled,
      reminderWeekdays: normalizeWeekdays(parsed.reminderWeekdays),
      reminderHour: normalizeHour(parsed.reminderHour),
      reminderMinute: normalizeMinute(parsed.reminderMinute),
    };
  } catch (error) {
    console.warn('Failed to parse notification settings', error);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save notification settings', error);
    throw error;
  }
}
