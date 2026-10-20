import { ALGORITHMS, type AlgorithmId } from './registry';
import { applyStep, createInitialBars } from './reducer';
import type { BarState, IndexCounters, Step } from './types';

export function buildSteps(algoId: AlgorithmId, array: number[]): Step[] {
  return [...ALGORITHMS[algoId].run([...array])];
}

export function stateAt(initial: BarState, steps: Step[], index: number): BarState {
  const limit = Math.max(0, Math.min(steps.length, Math.floor(index)));
  let state = initial.map((bar) => ({ ...bar }));
  for (let step = 0; step < limit; step += 1) state = applyStep(state, steps[step]);
  return state;
}

export function emptyCounters(size: number): IndexCounters {
  return { comparisons: Array(size).fill(0), writes: Array(size).fill(0), swaps: 0, totalWrites: 0 };
}

export function countStep(counters: IndexCounters, step: Step): IndexCounters {
  const next = {
    comparisons: [...counters.comparisons],
    writes: [...counters.writes],
    swaps: counters.swaps,
    totalWrites: counters.totalWrites,
  };
  const write = (index: number): void => {
    if (index >= 0 && index < next.writes.length) next.writes[index] += 1;
    next.totalWrites += 1;
  };
  if (step.type === 'compare') {
    if (next.comparisons[step.i] !== undefined) next.comparisons[step.i] += 1;
    if (next.comparisons[step.j] !== undefined) next.comparisons[step.j] += 1;
  } else if (step.type === 'swap') {
    next.swaps += 1;
    write(step.i);
    write(step.j);
  } else if (step.type === 'overwrite') {
    write(step.index);
  }
  return next;
}

export function countersAt(size: number, steps: Step[], index: number): IndexCounters {
  const limit = Math.max(0, Math.min(steps.length, Math.floor(index)));
  let counters = emptyCounters(size);
  for (let step = 0; step < limit; step += 1) counters = countStep(counters, steps[step]);
  return counters;
}

export function describeStep(step: Step | undefined, before: BarState): string {
  if (!step) return 'Ready to sort.';
  switch (step.type) {
    case 'compare': {
      const left = before[step.i]?.value;
      const right = before[step.j]?.value;
      return left === undefined || right === undefined
        ? 'Comparing values.'
        : left > right
          ? `Comparing ${left} and ${right}: out of order.`
          : `Comparing ${left} and ${right}.`;
    }
    case 'swap':
      return `Swapping ${before[step.i]?.value ?? 'a value'} and ${before[step.j]?.value ?? 'a value'}.`;
    case 'overwrite':
      return `Writing ${step.value} to position ${step.index + 1}.`;
    case 'pivot':
      return `Choosing ${before[step.index]?.value ?? 'a value'} as the pivot.`;
    case 'range':
      return `Working in positions ${step.lo + 1} through ${step.hi + 1}.`;
    case 'markSorted':
      return `Position ${step.index + 1} is sorted.`;
    case 'done':
      return 'Sorting complete.';
    default: {
      const exhaustive: never = step;
      return exhaustive;
    }
  }
}

export { createInitialBars };