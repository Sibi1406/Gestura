import { describe, expect, it } from 'vitest';
import { ALGORITHM_LIST, type AlgorithmId } from './registry';
import { applyStep, createInitialBars } from './reducer';
import { buildSteps, stateAt } from './player';

const inputs = [
  [], [1], [2, 1], [1, 2], [4, 4, 4, 1], [9, 8, 7, 6, 5], [3, 1, 4, 1, 5, 2],
  Array.from({ length: 50 }, (_, index) => index),
  Array.from({ length: 50 }, (_, index) => 50 - index),
];

describe.each(ALGORITHM_LIST)('$name', (algorithm) => {
  it.each(inputs.map((input) => ({ input })))('sorts $input without mutating input', ({ input }) => {
    const original = [...input];
    const steps = buildSteps(algorithm.id as AlgorithmId, input);
    let state = createInitialBars(input);
    for (const step of steps) state = applyStep(state, step);
    expect(steps.at(-1)).toEqual({ type: 'done' });
    expect(state.map((bar) => bar.value)).toEqual([...input].sort((a, b) => a - b));
    expect(input).toEqual(original);
  });
});

describe('step replay', () => {
  it('is deterministic and stateAt matches sequential application', () => {
    const initial = createInitialBars([5, 2, 4, 1, 3]);
    const steps = buildSteps('mergeSort', [5, 2, 4, 1, 3]);
    expect(buildSteps('mergeSort', [5, 2, 4, 1, 3])).toEqual(steps);
    let sequential = initial;
    steps.forEach((step, index) => {
      sequential = applyStep(sequential, step);
      expect(stateAt(initial, steps, index + 1)).toEqual(sequential);
    });
  });
});