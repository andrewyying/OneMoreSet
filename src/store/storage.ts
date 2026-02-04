import AsyncStorage from '@react-native-async-storage/async-storage';

import { Schedule, WorkoutCompletion } from '../types/models';

export const STORAGE_KEY = '@workout_timer/schedules';
export const COMPLETIONS_STORAGE_KEY = '@workout_timer/completions';

export async function loadFromStorage<T>(key: string): Promise<T[] | null> {
  const raw = await AsyncStorage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed as T[];
  } catch (error) {
    console.warn('Failed to parse storage data', error);
    throw error;
  }
}

export async function saveToStorage<T>(key: string, value: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save storage data', error);
    throw error;
  }
}

export async function loadSchedulesFromStorage(): Promise<Schedule[] | null> {
  return loadFromStorage<Schedule>(STORAGE_KEY);
}

export async function saveSchedulesToStorage(schedules: Schedule[]): Promise<void> {
  return saveToStorage(STORAGE_KEY, schedules);
}

export async function loadCompletionsFromStorage(): Promise<WorkoutCompletion[] | null> {
  return loadFromStorage<WorkoutCompletion>(COMPLETIONS_STORAGE_KEY);
}

export async function saveCompletionsToStorage(completions: WorkoutCompletion[]): Promise<void> {
  return saveToStorage(COMPLETIONS_STORAGE_KEY, completions);
}

