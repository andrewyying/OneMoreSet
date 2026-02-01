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
import { Step, WorkoutCompletion } from '../types/models';
import { loadCompletionsFromStorage, saveCompletionsToStorage } from './storage';

type CompletionsStatus = 'loading' | 'ready' | 'error';

type State = {
  completions: WorkoutCompletion[];
  status: CompletionsStatus;
  error?: string;
};

type Action =
  | { type: 'loaded'; payload: WorkoutCompletion[] }
  | { type: 'update'; updater: (current: WorkoutCompletion[]) => WorkoutCompletion[] }
  | { type: 'error'; error: string };

const initialState: State = {
  completions: [],
  status: 'loading',
};

const SAVE_DEBOUNCE_MS = 300;

function completionsReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded':
      return { completions: action.payload, status: 'ready' };
    case 'update':
      if (state.status !== 'ready') {
        return state;
      }

      return { ...state, completions: action.updater(state.completions) };
    case 'error':
      return { ...state, status: 'error', error: action.error };
    default:
      return state;
  }
}

const sanitizeStep = (step: Partial<Step>, index: number): Step => ({
  id: typeof step.id === 'string' && step.id.trim() ? step.id : generateId('step'),
  label: typeof step.label === 'string' && step.label.trim() ? step.label.trim() : `Step ${index + 1}`,
  durationSec: clampDuration(typeof step.durationSec === 'number' ? step.durationSec : 1),
  repeatCount: Math.max(1, Math.floor(typeof step.repeatCount === 'number' ? step.repeatCount : 1)),
  color: typeof step.color === 'string' && step.color.trim() ? step.color : undefined,
});

const sanitizeCompletion = (
  completion: Partial<WorkoutCompletion>,
  fallbackIndex = 0,
): WorkoutCompletion | null => {
  const rawSteps = Array.isArray(completion.steps) ? completion.steps : [];
  const steps = rawSteps
    .map((step, index) => sanitizeStep(step as Step, index))
    .filter((step) => step.durationSec >= 1);

  if (!steps.length) {
    return null;
  }

  return {
    id:
      typeof completion.id === 'string' && completion.id.trim()
        ? completion.id
        : generateId('completion'),
    scheduleId:
      typeof completion.scheduleId === 'string' && completion.scheduleId.trim()
        ? completion.scheduleId
        : generateId('schedule'),
    scheduleName:
      typeof completion.scheduleName === 'string' && completion.scheduleName.trim()
        ? completion.scheduleName.trim()
        : `Workout ${fallbackIndex + 1}`,
    steps,
    restBetweenSec: clampDuration(typeof completion.restBetweenSec === 'number' ? completion.restBetweenSec : 0, 0),
    completedAt:
      typeof completion.completedAt === 'number' && Number.isFinite(completion.completedAt)
        ? completion.completedAt
        : Date.now(),
  };
};

const sanitizeCompletionList = (data: unknown): WorkoutCompletion[] => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item, index) => sanitizeCompletion(item as WorkoutCompletion, index))
    .filter((item): item is WorkoutCompletion => Boolean(item))
    .sort((a, b) => b.completedAt - a.completedAt);
};

type ContextValue = {
  completions: WorkoutCompletion[];
  status: CompletionsStatus;
  error?: string;
  recordCompletion: (completion: Omit<WorkoutCompletion, 'id'>) => string | null;
  deleteCompletion: (id: string) => void;
  reload: () => Promise<void>;
};

const CompletionContext = createContext<ContextValue | undefined>(undefined);

export const CompletionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(completionsReducer, initialState);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFromStorage = useCallback(async () => {
    const stored = await loadCompletionsFromStorage();
    return sanitizeCompletionList(stored ?? []);
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
          dispatch({ type: 'error', error: 'Unable to load completions' });
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
      saveCompletionsToStorage(state.completions).catch((error) => {
        console.warn('Failed to persist completions', error);
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.completions, state.status]);

  const recordCompletion = useCallback(
    (completion: Omit<WorkoutCompletion, 'id'>) => {
      if (state.status !== 'ready') {
        return null;
      }

      const prepared = sanitizeCompletion({ ...completion, id: generateId('completion') });

      if (!prepared) {
        return null;
      }

      dispatch({
        type: 'update',
        updater: (current) => [prepared, ...current],
      });

      return prepared.id;
    },
    [state.status],
  );

  const deleteCompletion = useCallback(
    (id: string) => {
      if (state.status !== 'ready') {
        return;
      }

      dispatch({
        type: 'update',
        updater: (current) => current.filter((completion) => completion.id !== id),
      });
    },
    [state.status],
  );

  const reload = useCallback(async () => {
    try {
      const next = await loadFromStorage();
      dispatch({ type: 'loaded', payload: next });
    } catch (error) {
      dispatch({ type: 'error', error: 'Unable to load completions' });
      throw error;
    }
  }, [loadFromStorage]);

  const value = useMemo(
    () => ({
      completions: state.completions,
      status: state.status,
      error: state.error,
      recordCompletion,
      deleteCompletion,
      reload,
    }),
    [deleteCompletion, recordCompletion, reload, state.completions, state.error, state.status],
  );

  return <CompletionContext.Provider value={value}>{children}</CompletionContext.Provider>;
};

export const useCompletions = (): ContextValue => {
  const ctx = useContext(CompletionContext);

  if (!ctx) {
    throw new Error('useCompletions must be used within a CompletionProvider');
  }

  return ctx;
};
