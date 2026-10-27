import { countersAt, describeStep, stateAt } from '../engine/player';
import type { BarState, Step } from '../engine/types';

export function positioned(initial: BarState, steps: Step[], index: number) {
  const clamped = Math.max(0, Math.min(steps.length, Math.floor(index)));
  const before = clamped > 0 ? stateAt(initial, steps, clamped - 1) : initial;
  const step = clamped > 0 ? steps[clamped - 1] : undefined;
  return {
    stepIndex: clamped,
    barState: stateAt(initial, steps, clamped),
    counters: countersAt(initial.length, steps, clamped),
    narration: describeStep(step, before),
  };
}
