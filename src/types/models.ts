export type Step = {
  id: string;
  label: string;
  durationSec: number;
  repeatCount: number;
  color?: string;
};

export type Schedule = {
  id: string;
  name: string;
  steps: Step[];
  restBetweenSec: number;
  createdAt: number;
  updatedAt: number;
};

export type ScheduleDraft = {
  name: string;
  steps: Step[];
  restBetweenSec?: number;
};

export type ScheduleUpdate = Partial<ScheduleDraft>;

