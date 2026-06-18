import AsyncStorage from '@react-native-async-storage/async-storage';

export type StartCountdownSeconds = 0 | 3 | 5;

export type Preferences = {
  startCountdownSeconds: StartCountdownSeconds;
};

export const DEFAULT_PREFERENCES: Preferences = {
  startCountdownSeconds: 3,
};

const PREFERENCES_STORAGE_KEY = '@workout_timer/preferences';

function normalizeStartCountdownSeconds(
  value: unknown,
  legacyStartWithCountdown: unknown,
): StartCountdownSeconds {
  if (value === 0 || value === 3 || value === 5) {
    return value;
  }

  if (typeof legacyStartWithCountdown === 'boolean') {
    return legacyStartWithCountdown ? 3 : 0;
  }

  return DEFAULT_PREFERENCES.startCountdownSeconds;
}

export async function loadPreferences(): Promise<Preferences> {
  const raw = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);

  if (!raw) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Preferences> & { startWithCountdown?: boolean };

    return {
      startCountdownSeconds: normalizeStartCountdownSeconds(
        parsed.startCountdownSeconds,
        parsed.startWithCountdown,
      ),
    };
  } catch (error) {
    console.warn('Failed to parse preferences', error);
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(settings: Preferences): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save preferences', error);
    throw error;
  }
}
