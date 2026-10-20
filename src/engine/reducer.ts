import type { Bar, BarState, Step } from './types';

function resetTransient(state: BarState): BarState {
  return state.map((bar) => ({
    ...bar,
    status: bar.status === 'sorted' ? 'sorted' : 'idle',
  }));
}

function setStatus(state: BarState, index: number, status: Bar['status']): void {
  const bar = state[index];
  if (bar && bar.status !== 'sorted') state[index] = { ...bar, status };
}

export function applyStep(state: BarState, step: Step): BarState {
  const next = resetTransient(state);
  switch (step.type) {
    case 'compare':
      setStatus(next, step.i, 'comparing');
      setStatus(next, step.j, 'comparing');
      return next;
    case 'swap': {
      const left = next[step.i];
      const right = next[step.j];
      if (!left || !right) return next;
      next[step.i] = { ...right, status: 'swapping' };
      next[step.j] = { ...left, status: 'swapping' };
      return next;
    }
    case 'overwrite':
      if (next[step.index]) {
        next[step.index] = { ...next[step.index], value: step.value, status: 'swapping' };
      }
      return next;
    case 'pivot':
      setStatus(next, step.index, 'pivot');
      return next;
    case 'range':
      for (let index = step.lo; index <= step.hi; index += 1) {
        setStatus(next, index, 'inRange');
      }
      return next;
    case 'markSorted':
      if (next[step.index]) next[step.index] = { ...next[step.index], status: 'sorted' };
      return next;
    case 'done':
      return next.map((bar) => ({ ...bar, status: 'sorted' }));
    default: {
      const exhaustive: never = step;
      return exhaustive;
    }
  }
}

export function createInitialBars(values: number[]): BarState {
  return values.map((value, index) => ({ id: `bar-${index}`, value, status: 'idle' }));
}