import { applyStep } from '../engine/reducer';
import { countStep, describeStep } from '../engine/player';
import type { PlaybackStore } from './usePlaybackStore';

type TickState = Pick<PlaybackStore, 'status' | 'speed' | 'steps' | 'barState' | 'counters' | 'stepIndex'>;
type TickUpdate = Pick<PlaybackStore, 'stepIndex' | 'barState' | 'counters' | 'narration' | 'status'>;

export function tickPlayback(
  state: TickState,
  elapsed: number,
  deltaSeconds: number,
  stopAtIndex?: number,
): { elapsed: number; update: TickUpdate | null } {
  if (state.status !== 'playing') return { elapsed, update: null };
  const interval = 1 / (8 * state.speed);
  let due = Math.floor((elapsed + Math.max(0, deltaSeconds)) / interval);
  if (due === 0) return { elapsed: elapsed + Math.max(0, deltaSeconds), update: null };
  let remainder = elapsed + Math.max(0, deltaSeconds) - due * interval;
  let barState = state.barState;
  let counters = state.counters;
  let stepIndex = state.stepIndex;
  let previousState = barState;
  while (due > 0 && stepIndex < state.steps.length) {
    if (stepIndex === stopAtIndex) break;
    previousState = barState;
    const step = state.steps[stepIndex];
    barState = applyStep(barState, step);
    counters = countStep(counters, step);
    stepIndex += 1;
    due -= 1;
  }
  if (stepIndex === stopAtIndex) remainder += due * interval;
  const currentStep = state.steps[stepIndex - 1];
  return {
    elapsed: remainder,
    update: {
      stepIndex,
      barState,
      counters,
      narration: describeStep(currentStep, previousState),
      status: stepIndex >= state.steps.length ? 'finished' : stepIndex === stopAtIndex ? 'paused' : 'playing',
    },
  };
}
