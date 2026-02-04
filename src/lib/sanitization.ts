import { Step } from '../types/models';
import { generateId } from './ids';
import { clampDuration } from './time';

export const sanitizeStep = (step: Partial<Step>, index: number): Step => ({
  id: typeof step.id === 'string' && step.id.trim() ? step.id : generateId('step'),
  label: typeof step.label === 'string' && step.label.trim() ? step.label.trim() : `Step ${index + 1}`,
  durationSec: clampDuration(typeof step.durationSec === 'number' ? step.durationSec : 1),
  repeatCount: Math.max(1, Math.floor(typeof step.repeatCount === 'number' ? step.repeatCount : 1)),
  color: typeof step.color === 'string' && step.color.trim() ? step.color : undefined,
});
