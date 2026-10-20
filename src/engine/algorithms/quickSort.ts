import type { Step } from '../types';

export function* quickSort(input: number[]): Generator<Step> {
  const values = [...input];

  function* sort(lo: number, hi: number): Generator<Step> {
    if (lo > hi) return;
    if (lo === hi) {
      yield { type: 'markSorted', index: lo, line: 15 };
      return;
    }

    yield { type: 'range', lo, hi, line: 3 };
    const pivotIndex = hi;
    const pivotValue = values[pivotIndex];
    yield { type: 'pivot', index: pivotIndex, line: 4 };
    let boundary = lo;
    for (let i = lo; i < hi; i += 1) {
      yield { type: 'compare', i, j: pivotIndex, line: 7 };
      if (values[i] <= pivotValue) {
        if (boundary !== i) {
          yield { type: 'swap', i: boundary, j: i, line: 9 };
          [values[boundary], values[i]] = [values[i], values[boundary]];
        }
        boundary += 1;
      }
    }
    if (boundary !== pivotIndex) {
      yield { type: 'swap', i: boundary, j: pivotIndex, line: 12 };
      [values[boundary], values[pivotIndex]] = [values[pivotIndex], values[boundary]];
    }
    yield { type: 'markSorted', index: boundary, line: 13 };
    yield* sort(lo, boundary - 1);
    yield* sort(boundary + 1, hi);
  }

  yield* sort(0, values.length - 1);
  yield { type: 'done' };
}