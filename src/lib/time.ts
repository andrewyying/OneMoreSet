import { Step } from '../types/models';

export const clampDuration = (value: number, min = 1, max = 3600) => {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
};

export const formatSeconds = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const getTotalDuration = (steps: Step[]) =>
  steps.reduce((sum, step) => sum + clampDuration(step.durationSec), 0);

