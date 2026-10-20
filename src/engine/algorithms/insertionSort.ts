import type { Step } from '../types';

export function* insertionSort(input: number[]): Generator<Step> {
  const values = [...input];
  for (let i = 1; i < values.length; i += 1) {
    let current = i;
    while (current > 0) {
      const previous = current - 1;
      yield { type: 'compare', i: previous, j: current, line: 4 };
      if (values[previous] <= values[current]) break;
      yield { type: 'swap', i: previous, j: current, line: 6 };
      [values[previous], values[current]] = [values[current], values[previous]];
      current = previous;
    }
  }
  for (let index = 0; index < values.length; index += 1) {
    yield { type: 'markSorted', index, line: 9 };
  }
  yield { type: 'done' };
}