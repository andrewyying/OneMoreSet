export type TimerItem = {
  durationSec: number;
};

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export type TimerState = {
  status: TimerStatus;
  currentStepIndex: number;
  remainingMs: number;
  stepStartedAt: number | null;
  pausedRemainingMs: number | null;
};

const toMs = (seconds: number) => Math.max(0, Math.round(seconds * 1000));

export const getStepDurationMs = (steps: TimerItem[], index: number) =>
  steps[index] ? toMs(steps[index].durationSec) : 0;

export const createInitialTimerState = (steps: TimerItem[]): TimerState => {
  const firstDuration = getStepDurationMs(steps, 0);

  return {
    status: steps.length ? 'idle' : 'finished',
    currentStepIndex: 0,
    remainingMs: firstDuration,
    stepStartedAt: null,
    pausedRemainingMs: null,
  };
};

export const startTimer = (steps: TimerItem[], now: number): TimerState => {
  const durationMs = getStepDurationMs(steps, 0);

  if (!steps.length) {
    return {
      status: 'finished',
      currentStepIndex: 0,
      remainingMs: 0,
      stepStartedAt: null,
      pausedRemainingMs: null,
    };
  }

  return {
    status: 'running',
    currentStepIndex: 0,
    remainingMs: durationMs,
    stepStartedAt: now,
    pausedRemainingMs: null,
  };
};

export const restartTimer = (steps: TimerItem[], now: number): TimerState => startTimer(steps, now);

export const pauseTimer = (state: TimerState, steps: TimerItem[], now: number): TimerState => {
  if (state.status !== 'running') {
    return state;
  }

  const durationMs = getStepDurationMs(steps, state.currentStepIndex);
  const elapsed = Math.max(0, now - (state.stepStartedAt ?? now));
  const remainingMs = Math.max(0, durationMs - elapsed);

  return {
    ...state,
    status: 'paused',
    pausedRemainingMs: remainingMs,
    remainingMs,
    stepStartedAt: null,
  };
};

export const resumeTimer = (state: TimerState, steps: TimerItem[], now: number): TimerState => {
  if (state.status !== 'paused') {
    return state;
  }

  const durationMs = getStepDurationMs(steps, state.currentStepIndex);
  const remainingMs = Math.min(state.pausedRemainingMs ?? durationMs, durationMs);
  const startedAt = now - (durationMs - remainingMs);

  return {
    ...state,
    status: 'running',
    stepStartedAt: startedAt,
    pausedRemainingMs: null,
    remainingMs,
  };
};

export const tickTimer = (state: TimerState, steps: TimerItem[], now: number): TimerState => {
  if (state.status !== 'running') {
    return state;
  }

  if (!steps.length) {
    return {
      status: 'finished',
      currentStepIndex: 0,
      remainingMs: 0,
      stepStartedAt: null,
      pausedRemainingMs: null,
    };
  }

  const baseStartedAt = state.stepStartedAt ?? now;
  let elapsed = Math.max(0, now - baseStartedAt);
  let index = state.currentStepIndex;

  while (index < steps.length) {
    const durationMs = getStepDurationMs(steps, index);
    if (durationMs <= 0) {
      index += 1;
      continue;
    }

    if (elapsed < durationMs) {
      const remainingMs = durationMs - elapsed;
      const stepStartedAt = now - elapsed;
      return {
        status: 'running',
        currentStepIndex: index,
        remainingMs,
        stepStartedAt,
        pausedRemainingMs: null,
      };
    }

    elapsed -= durationMs;
    index += 1;
  }

  return {
    status: 'finished',
    currentStepIndex: Math.max(steps.length - 1, 0),
    remainingMs: 0,
    stepStartedAt: null,
    pausedRemainingMs: null,
  };
};

export const nextStep = (state: TimerState, steps: TimerItem[], now: number): TimerState => {
  const nextIndex = state.currentStepIndex + 1;

  if (nextIndex >= steps.length) {
    return {
      status: 'finished',
      currentStepIndex: Math.max(steps.length - 1, 0),
      remainingMs: 0,
      stepStartedAt: null,
      pausedRemainingMs: null,
    };
  }

  const nextDuration = getStepDurationMs(steps, nextIndex);

  return {
    status: 'running',
    currentStepIndex: nextIndex,
    remainingMs: nextDuration,
    stepStartedAt: now,
    pausedRemainingMs: null,
  };
};

export const previousStep = (state: TimerState, steps: TimerItem[], now: number): TimerState => {
  if (!steps.length) {
    return {
      status: 'finished',
      currentStepIndex: 0,
      remainingMs: 0,
      stepStartedAt: null,
      pausedRemainingMs: null,
    };
  }

  const prevIndex = state.currentStepIndex > 0 ? state.currentStepIndex - 1 : 0;
  const duration = getStepDurationMs(steps, prevIndex);

  return {
    status: 'running',
    currentStepIndex: prevIndex,
    remainingMs: duration,
    stepStartedAt: now,
    pausedRemainingMs: null,
  };
};

export const getTotalRemainingMs = (steps: TimerItem[], state: TimerState) => {
  const futureMs = steps
    .slice(state.currentStepIndex + 1)
    .reduce((sum, step) => sum + toMs(step.durationSec), 0);

  return state.remainingMs + futureMs;
};

