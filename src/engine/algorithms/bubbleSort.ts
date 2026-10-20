import type { Step } from '../types';

export function* bubbleSort(input: number[]): Generator<Step> {
  const values = [...input];
  for (let end = values.length - 1; end > 0; end -= 1) {
    let swapped = false;
    for (let i = 0; i < end; i += 1) {
      const j = i + 1;
      yield { type: 'compare', i, j, line: 5 };
      if (values[i] > values[j]) {
        yield { type: 'swap', i, j, line: 6 };
        [values[i], values[j]] = [values[j], values[i]];
        swapped = true;
      }
    }
    yield { type: 'markSorted', index: end, line: 10 };
    if (!swapped) {
      for (let index = 0; index < end; index += 1) {
        yield { type: 'markSorted', index, line: 13 };
      }
      break;
    }
  }
  if (values.length > 0) yield { type: 'markSorted', index: 0, line: 15 };
  yield { type: 'done' };
}