import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import { generateId } from '../lib/ids';
import { clampDuration } from '../lib/time';
import { sanitizeStep } from '../lib/sanitization';
import { Schedule, ScheduleDraft, ScheduleUpdate, Step } from '../types/models';
import { loadSchedulesFromStorage, saveSchedulesToStorage } from './storage';

type SchedulesStatus = 'loading' | 'ready' | 'error';

type State = {
  schedules: Schedule[];
  status: SchedulesStatus;
  error?: string;
};

type Action =
  | { type: 'loaded'; payload: Schedule[] }
  | { type: 'update'; updater: (current: Schedule[]) => Schedule[] }
  | { type: 'error'; error: string };

const initialState: State = {
  schedules: [],
  status: 'loading',
};

const SAVE_DEBOUNCE_MS = 300;

function schedulesReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded':
      return { schedules: action.payload, status: 'ready' };
    case 'update':
      if (state.status !== 'ready') {
        return state;
      }

      return { ...state, schedules: action.updater(state.schedules) };
    case 'error':
      return { ...state, status: 'error', error: action.error };
    default:
      return state;
  }
}

const sanitizeSchedule = (
  schedule: Partial<ScheduleDraft & Schedule>,
  fallbackIndex = 0,
): Schedule | null => {
  const rawSteps = Array.isArray(schedule.steps) ? schedule.steps : [];
  const steps = rawSteps
    .map((step, index) => sanitizeStep(step as Step, index))
    .filter((step) => step.durationSec >= 1);

  if (!steps.length) {
    return null;
  }

  const now = Date.now();

  return {
    id: typeof schedule.id === 'string' && schedule.id.trim() ? schedule.id : generateId('schedule'),
    name:
      typeof schedule.name === 'string' && schedule.name.trim()
        ? schedule.name.trim()
        : `Schedule ${fallbackIndex + 1}`,
    steps,
    restBetweenSec: clampDuration(typeof schedule.restBetweenSec === 'number' ? schedule.restBetweenSec : 0, 0),
    createdAt: typeof schedule.createdAt === 'number' ? schedule.createdAt : now,
    updatedAt: typeof schedule.updatedAt === 'number' ? schedule.updatedAt : now,
  };
};

const sanitizeScheduleList = (data: unknown): Schedule[] => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item, index) => sanitizeSchedule(item as Schedule, index))
    .filter((item): item is Schedule => Boolean(item));
};

const createSampleSchedule = (): Schedule => {
  const now = Date.now();
  const steps: Step[] = [];

  for (let round = 1; round <= 8; round += 1) {
    steps.push(sanitizeStep({ label: `Round ${round}`, durationSec: 30, repeatCount: 1 }, steps.length));
  }

  return {
    id: generateId('schedule'),
    name: 'Demo: 30s on / 10s rest x8',
    steps,
    restBetweenSec: 10,
    createdAt: now,
    updatedAt: now,
  };
};

type ContextValue = {
  schedules: Schedule[];
  status: SchedulesStatus;
  error?: string;
  createSchedule: (draft: ScheduleDraft) => string | null;
  updateSchedule: (id: string, updates: ScheduleUpdate) => void;
  deleteSchedule: (id: string) => void;
  duplicateSchedule: (id: string) => string | null;
  reload: () => Promise<void>;
};

const ScheduleContext = createContext<ContextValue | undefined>(undefined);

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(schedulesReducer, initialState);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFromStorage = useCallback(async () => {
    const stored = await loadSchedulesFromStorage();
    const sanitized = sanitizeScheduleList(stored ?? []);
    return sanitized.length ? sanitized : [createSampleSchedule()];
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadFromStorage()
      .then((next) => {
        if (!cancelled) {
          dispatch({ type: 'loaded', payload: next });
        }
      })
      .catch(() => {
        if (!cancelled) {
          dispatch({ type: 'error', error: 'Unable to load schedules' });
        }
      });

    return () => {
      cancelled = true;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [loadFromStorage]);

  useEffect(() => {
    if (state.status !== 'ready') {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveSchedulesToStorage(state.schedules).catch((error) => {
        console.warn('Failed to persist schedules', error);
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.schedules, state.status]);

  const createSchedule = useCallback((draft: ScheduleDraft) => {
    if (state.status !== 'ready') {
      return null;
    }

    const prepared = sanitizeSchedule(
      { ...draft, createdAt: Date.now(), updatedAt: Date.now(), id: generateId('schedule') },
      0,
    );

    if (!prepared) {
      return null;
    }

    dispatch({
      type: 'update',
      updater: (current) => [...current, prepared],
    });

    return prepared.id;
  }, [state.status]);

  const updateSchedule = useCallback((id: string, updates: ScheduleUpdate) => {
    if (state.status !== 'ready') {
      return;
    }

    dispatch({
      type: 'update',
      updater: (current) =>
        current.map((schedule, index) => {
          if (schedule.id !== id) {
            return schedule;
          }

          const merged = {
            ...schedule,
            ...updates,
            steps: updates.steps ?? schedule.steps,
            updatedAt: Date.now(),
          };

          return sanitizeSchedule(merged, index) ?? schedule;
        }),
    });
  }, [state.status]);

  const deleteSchedule = useCallback((id: string) => {
    if (state.status !== 'ready') {
      return;
    }

    dispatch({
      type: 'update',
      updater: (current) => current.filter((schedule) => schedule.id !== id),
    });
  }, [state.status]);

  const duplicateSchedule = useCallback((id: string) => {
    if (state.status !== 'ready') {
      return null;
    }

    let createdId: string | null = null;
    const now = Date.now();

    dispatch({
      type: 'update',
      updater: (current) => {
        const source = current.find((schedule) => schedule.id === id);

        if (!source) {
          return current;
        }

        createdId = generateId('schedule');
        const duplicatedSteps = source.steps.map((step, index) =>
          sanitizeStep(
            {
              ...step,
              id: undefined,
            },
            index,
          ),
        );

        const duplicate = {
          ...source,
          id: createdId,
          name: `${source.name} copy`,
          steps: duplicatedSteps,
          createdAt: now,
          updatedAt: now,
        };

        return [...current, duplicate];
      },
    });

    return createdId;
  }, [state.status]);

  const reload = useCallback(async () => {
    try {
      const next = await loadFromStorage();
      dispatch({ type: 'loaded', payload: next });
    } catch (error) {
      dispatch({ type: 'error', error: 'Unable to load schedules' });
      throw error;
    }
  }, [loadFromStorage]);

  const value = useMemo(
    () => ({
      schedules: state.schedules,
      status: state.status,
      error: state.error,
      createSchedule,
      updateSchedule,
      deleteSchedule,
      duplicateSchedule,
      reload,
    }),
    [
      createSchedule,
      deleteSchedule,
      duplicateSchedule,
      reload,
      state.error,
      state.schedules,
      state.status,
      updateSchedule,
    ],
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
};

export const useSchedules = (): ContextValue => {
  const ctx = useContext(ScheduleContext);

  if (!ctx) {
    throw new Error('useSchedules must be used within a ScheduleProvider');
  }

  return ctx;
};

