import AsyncStorage from '@react-native-async-storage/async-storage';

import { Schedule } from '../types/models';

export const STORAGE_KEY = '@workout_timer/schedules';

export async function loadSchedulesFromStorage(): Promise<Schedule[] | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed as Schedule[];
  } catch (error) {
    console.warn('Failed to parse schedules from storage', error);
    throw error;
  }
}

export async function saveSchedulesToStorage(schedules: Schedule[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  } catch (error) {
    console.warn('Failed to save schedules', error);
    throw error;
  }
}

