import AsyncStorage from '@react-native-async-storage/async-storage';

import { Schedule, WorkoutCompletion } from '../types/models';

export const STORAGE_KEY = '@workout_timer/schedules';
export const COMPLETIONS_STORAGE_KEY = '@workout_timer/completions';

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

export async function loadCompletionsFromStorage(): Promise<WorkoutCompletion[] | null> {
  const raw = await AsyncStorage.getItem(COMPLETIONS_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed as WorkoutCompletion[];
  } catch (error) {
    console.warn('Failed to parse completions from storage', error);
    throw error;
  }
}

export async function saveCompletionsToStorage(completions: WorkoutCompletion[]): Promise<void> {
  try {
    await AsyncStorage.setItem(COMPLETIONS_STORAGE_KEY, JSON.stringify(completions));
  } catch (error) {
    console.warn('Failed to save completions', error);
    throw error;
  }
}

