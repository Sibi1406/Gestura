import { type AlgorithmId } from './registry';
import { buildSteps } from './player';

export type SwapQuality = 'good' | 'neutral' | 'bad';

export function inversionCount(arr: number[]): number {
  let inversions = 0;
  for (let i = 0; i < arr.length; i += 1) {
    for (let j = i + 1; j < arr.length; j += 1) {
      if (arr[i] > arr[j]) inversions += 1;
    }
  }
  return inversions;
}

export function isSorted(arr: number[]): boolean {
  return arr.every((value, index) => index === 0 || arr[index - 1] <= value);
}

export function minSwapsToSort(arr: number[]): number {
  if (arr.length <= 1) return 0;

  const sortedPairs = arr
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value || a.index - b.index);

  const targetByOriginalIndex = new Array(arr.length);
  for (let index = 0; index < sortedPairs.length; index += 1) {
    targetByOriginalIndex[sortedPairs[index].index] = index;
  }

  const visited = new Array(arr.length).fill(false);
  let cycles = 0;
  for (let index = 0; index < targetByOriginalIndex.length; index += 1) {
    if (visited[index]) continue;
    cycles += 1;
    let current = index;
    while (!visited[current]) {
      visited[current] = true;
      current = targetByOriginalIndex[current];
    }
  }

  return arr.length - cycles;
}

export function evaluateSwap(arr: number[], i: number, j: number): SwapQuality {
  if (i === j) return 'neutral';
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  const before = inversionCount(arr);
  const after = inversionCount(next);
  if (after < before) return 'good';
  if (after === before) return 'neutral';
  return 'bad';
}

export function isAdjacentMove(i: number, j: number): boolean {
  return Math.abs(i - j) === 1;
}

export function nextHint(algoId: AlgorithmId, arr: number[]): { i: number; j: number } | null {
  if (isSorted(arr)) return null;
  const steps = buildSteps(algoId, arr);
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (step.type === 'compare') {
      if (arr[step.i] > arr[step.j]) return { i: step.i, j: step.j };
      continue;
    }
    if (step.type === 'swap') return { i: step.i, j: step.j };
  }
  return null;
}
