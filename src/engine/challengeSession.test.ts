import { describe, expect, it } from 'vitest';
import { challengeSessionReducer, createChallengeSession, efficiencyPercent, findChallengeHint } from './challengeSession';
import { inversionCount, isSorted, minSwapsToSort } from './challenge';
import type { AlgorithmId } from './registry';

const algorithms: AlgorithmId[] = ['bubbleSort', 'insertionSort', 'mergeSort', 'quickSort'];

describe('challenge session', () => {
  it('counts moves, supports undo, detects solved state, and computes efficiency', () => {
    let session = createChallengeSession([2, 1, 3], 'bubbleSort', 100);
    session = challengeSessionReducer(session, { type: 'move', i: 0, j: 1, now: 200 })!;
    expect(session).toMatchObject({ moves: 1, good: 1, neutral: 0, bad: 0, solved: true, optimalMoves: 1 });
    expect(efficiencyPercent(session)).toBe(100);
    session = challengeSessionReducer(session, { type: 'undo' })!;
    expect(session).toMatchObject({ array: [2, 1, 3], moves: 0, good: 0, solved: false, resultVisible: false });
  });

  it('rejects non-adjacent moves when adjacent-only rule is selected', () => {
    let session = createChallengeSession([3, 2, 1], 'bubbleSort', 0);
    session = challengeSessionReducer(session, { type: 'rule', rule: 'adjacent' })!;
    session = challengeSessionReducer(session, { type: 'move', i: 0, j: 2, now: 500 })!;
    expect(session.array).toEqual([3, 2, 1]);
    expect(session.moves).toBe(0);
    expect(session.feedback).toMatchObject({ quality: 'rejected' });
    expect(session.rejectedAt).toBe(500);
  });

  it('explains how many inverted pairs a bad move created', () => {
    let session = createChallengeSession([1, 2, 4, 3], 'bubbleSort', 0);
    session = challengeSessionReducer(session, { type: 'move', i: 0, j: 3, now: 50 })!;
    expect(session.feedback).toMatchObject({ quality: 'bad', text: 'This made 3 pairs worse.' });
  });

  it('does not mutate the source array when applying a move', () => {
    const original = [4, 1, 3, 2];
    const session = createChallengeSession(original, 'quickSort', 0);
    const updated = challengeSessionReducer(session, { type: 'move', i: 0, j: 1, now: 1 });
    expect(updated?.array).toEqual([1, 4, 3, 2]);
    expect(original).toEqual([4, 1, 3, 2]);
    expect(session.array).toEqual(original);
  });

  it('reports efficiency for more moves than optimal and for a zero-move solve', () => {
    expect(efficiencyPercent({ moves: 2, optimalMoves: 1 })).toBe(50);
    expect(efficiencyPercent({ moves: 0, optimalMoves: 0 })).toBe(100);
  });

  it('suggests a swap that reduces inversions or optimal moves without mutating input', () => {
    for (const algorithmId of algorithms) {
      for (const original of [[4, 1, 3, 2], [3, 2, 1], [1, 3, 2, 4], [2, 1, 2, 1]]) {
        const array = [...original];
        const beforeInversions = inversionCount(array);
        const beforeOptimal = minSwapsToSort(array);
        const hint = findChallengeHint(algorithmId, array);
        expect(array).toEqual(original);
        expect(hint).not.toBeNull();
        if (hint) {
          const next = [...array];
          [next[hint[0]], next[hint[1]]] = [next[hint[1]], next[hint[0]]];
          expect(
            inversionCount(next) < beforeInversions || minSwapsToSort(next) < beforeOptimal,
          ).toBe(true);
          if (isSorted(array)) expect(hint).toBeNull();
        }
      }
    }
  });

  it('returns no hint for sorted input and preserves input arrays in sessions', () => {
    const original = [1, 2, 3];
    expect(findChallengeHint('quickSort', original)).toBeNull();
    const session = createChallengeSession(original, 'quickSort', 0);
    expect(session.array).toEqual(original);
    expect(session.array).not.toBe(original);
  });

  it('keeps adjacent-only hints within one slot', () => {
    for (const algorithmId of algorithms) {
      const hint = findChallengeHint(algorithmId, [4, 1, 3, 2], 'adjacent');
      expect(hint).not.toBeNull();
      if (hint) expect(Math.abs(hint[0] - hint[1])).toBe(1);
    }
  });
});
