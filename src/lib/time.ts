import { Schedule, Step } from '../types/models';

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

export type Phase = {
  label: string;
  durationSec: number;
  type: 'exercise' | 'rest';
};

export const buildPhases = (schedule: Pick<Schedule, 'steps' | 'restBetweenSec'>): Phase[] => {
  const phases: Phase[] = [];
  const rest = clampDuration(schedule.restBetweenSec ?? 0, 0, 3600);

  schedule.steps.forEach((step) => {
    const repeats = Math.max(1, Math.floor(step.repeatCount ?? 1));
    for (let rep = 0; rep < repeats; rep += 1) {
      const repLabel = repeats > 1 ? `${step.label} (x${rep + 1})` : step.label;
      phases.push({ label: repLabel, durationSec: clampDuration(step.durationSec), type: 'exercise' });

      const isLastOverall =
        rep === repeats - 1 && schedule.steps[schedule.steps.length - 1]?.id === step.id;

      if (rest > 0 && !isLastOverall) {
        phases.push({ label: 'Rest', durationSec: rest, type: 'rest' });
      }
    }
  });

  return phases;
};

export const getTotalDuration = (schedule: Pick<Schedule, 'steps' | 'restBetweenSec'>) =>
  buildPhases(schedule).reduce((sum, phase) => sum + clampDuration(phase.durationSec), 0);

export const getExerciseCount = (steps: Step[]): number =>
  steps.reduce((sum, step) => sum + Math.max(1, step.repeatCount), 0);

