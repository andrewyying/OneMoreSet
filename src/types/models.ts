export type StepType = 'exercise' | 'rest' | 'other';

export type Step = {
  id: string;
  label: string;
  type: StepType;
  durationSec: number;
  color?: string;
};

export type Schedule = {
  id: string;
  name: string;
  steps: Step[];
  createdAt: number;
  updatedAt: number;
};

export type ScheduleDraft = {
  name: string;
  steps: Step[];
};

export type ScheduleUpdate = Partial<ScheduleDraft>;

