import { describe, expect, it } from 'vitest';
import {
  evaluateSwap,
  inversionCount,
  isAdjacentMove,
  isSorted,
  minSwapsToSort,
  nextHint,
} from './challenge';

function bruteForceMinimalSwaps(arr: number[]): number {
  const copy = [...arr];
  const sorted = [...copy].sort((a, b) => a - b);
  const indexOfValue = new Map<number, number[]>();
  for (let i = 0; i < sorted.length; i += 1) {
    const value = sorted[i];
    const list = indexOfValue.get(value) ?? [];
    list.push(i);
    indexOfValue.set(value, list);
  }
  // Simpler exact brute-force for n <= 7
  const seen = new Set<string>();
  const queue: Array<{ values: number[]; cost: number }> = [{ values: copy, cost: 0 }];
  const startKey = copy.join(',');
  seen.add(startKey);
  let best = Number.POSITIVE_INFINITY;
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (current.cost >= best) continue;
    if (current.values.every((value, index) => index === 0 || current.values[index - 1] <= value)) {
      best = current.cost;
      continue;
    }
    for (let i = 0; i < current.values.length; i += 1) {
      for (let j = i + 1; j < current.values.length; j += 1) {
        const nextValues = [...current.values];
        [nextValues[i], nextValues[j]] = [nextValues[j], nextValues[i]];
        const key = nextValues.join(',');
        if (!seen.has(key)) {
          seen.add(key);
          queue.push({ values: nextValues, cost: current.cost + 1 });
        }
      }
    }
  }
  return best === Number.POSITIVE_INFINITY ? 0 : best;
}

describe('challenge engine', () => {
  it('counts inversions and minimal swaps for known arrays', () => {
    expect(inversionCount([])).toBe(0);
    expect(inversionCount([1, 2, 3])).toBe(0);
    expect(inversionCount([3, 2, 1])).toBe(3);
    expect(inversionCount([2, 1, 2, 1])).toBe(3);
    expect(minSwapsToSort([1, 2, 3, 4])).toBe(0);
    expect(minSwapsToSort([4, 3, 2, 1])).toBe(2);
    expect(minSwapsToSort([2, 1, 3])).toBe(1);
    expect(minSwapsToSort([1, 3, 2, 4, 5])).toBe(1);
    expect(minSwapsToSort([1, 1, 1])).toBe(0);
  });

  it('matches brute-force minimal swaps for small permutations', () => {
    const values = [1, 2, 3, 4, 5, 6, 7];
    const permutations: number[][] = [];
    const permute = (items: number[], current: number[] = []): void => {
      if (items.length === 0) {
        permutations.push([...current]);
        return;
      }
      for (let index = 0; index < items.length; index += 1) {
        const next = [...items];
        const chosen = next.splice(index, 1)[0];
        current.push(chosen);
        permute(next, current);
        current.pop();
      }
    };
    permute(values.slice(0, 5));
    for (const perm of permutations.slice(0, 80)) {
      const actual = minSwapsToSort(perm);
      const expected = bruteForceMinimalSwaps(perm);
      expect(actual).toBe(expected);
    }
  });

  it('classifies swap quality and adjacency correctly', () => {
    expect(evaluateSwap([3, 2, 1], 0, 2)).toBe('good');
    expect(evaluateSwap([2, 1, 3], 0, 1)).toBe('good');
    expect(evaluateSwap([1, 2, 3], 0, 2)).toBe('bad');
    expect(evaluateSwap([1, 3, 2], 1, 2)).toBe('good');
    expect(evaluateSwap([3, 1, 2], 0, 1)).toBe('good');
    expect(isAdjacentMove(2, 3)).toBe(true);
    expect(isAdjacentMove(2, 4)).toBe(false);
  });

  it('returns a hint that eventually sorts the array', () => {
    let arr = [3, 1, 2];
    for (let step = 0; step < 10; step += 1) {
      const hint = nextHint('bubbleSort', arr);
      expect(hint).not.toBeNull();
      const { i, j } = hint!;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      if (isSorted(arr)) break;
    }
    expect(isSorted(arr)).toBe(true);
  });

  it('detects sorted arrays', () => {
    expect(isSorted([])).toBe(true);
    expect(isSorted([1, 2, 2, 3])).toBe(true);
    expect(isSorted([1, 3, 2])).toBe(false);
  });
});
