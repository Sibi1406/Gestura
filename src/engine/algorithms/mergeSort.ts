import type { Step } from '../types';

export function* mergeSort(input: number[]): Generator<Step> {
  const values = [...input];
  const auxiliary = [...values];

  function* sort(lo: number, hi: number): Generator<Step> {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    yield* sort(lo, mid);
    yield* sort(mid + 1, hi);
    yield { type: 'range', lo, hi, line: 4 };

    let left = lo;
    let right = mid + 1;
    for (let index = lo; index <= hi; index += 1) {
      if (left > mid) {
        auxiliary[index] = values[right];
        right += 1;
      } else if (right > hi) {
        auxiliary[index] = values[left];
        left += 1;
      } else {
        yield { type: 'compare', i: left, j: right, line: 8 };
        if (values[left] <= values[right]) {
          auxiliary[index] = values[left];
          left += 1;
        } else {
          auxiliary[index] = values[right];
          right += 1;
        }
      }
    }

    for (let index = lo; index <= hi; index += 1) {
      values[index] = auxiliary[index];
      yield { type: 'overwrite', index, value: values[index], line: 17 };
    }
  }

  yield* sort(0, values.length - 1);
  for (let index = 0; index < values.length; index += 1) {
    yield { type: 'markSorted', index, line: 22 };
  }
  yield { type: 'done' };
}