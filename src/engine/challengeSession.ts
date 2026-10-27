import { buildSteps } from './player';
import type { AlgorithmId } from './registry';
import { evaluateSwap, inversionCount, isAdjacentMove, isSorted, minSwapsToSort, nextHint } from './challenge';
import type { SwapQuality } from './challenge';

export type SwapRule = 'any' | 'adjacent';
export type ChallengeFeedback = {
  quality: SwapQuality | 'rejected' | 'info';
  text: string;
};
export type ChallengeHistory = { array: number[]; barIds: string[]; quality: SwapQuality };

export type ChallengeSession = {
  array: number[];
  startingArray: number[];
  barIds: string[];
  startingBarIds: string[];
  algorithmId: AlgorithmId;
  rule: SwapRule;
  moves: number;
  good: number;
  neutral: number;
  bad: number;
  history: ChallengeHistory[];
  startedAt: number;
  solved: boolean;
  solvedAt: number | null;
  resultVisible: boolean;
  feedback: ChallengeFeedback;
  hintPair: [number, number] | null;
  hintAt: number;
  lastSwap: [string, string] | null;
  lastSwapAt: number;
  rejectedAt: number;
  feedbackAt: number;
  optimalMoves: number;
  algorithmMoves: number;
};

export type ChallengeAction =
  | { type: 'start'; array: number[]; algorithmId: AlgorithmId; now: number }
  | { type: 'move'; i: number; j: number; now: number }
  | { type: 'undo' }
  | { type: 'rule'; rule: SwapRule }
  | { type: 'hint'; pair: [number, number] | null; now: number }
  | { type: 'show-result' };

export function createChallengeSession(array: number[], algorithmId: AlgorithmId, now: number): ChallengeSession {
  const startingArray = [...array];
  const startingBarIds = startingArray.map((_, index) => `bar-${index}`);
  return {
    array: [...startingArray],
    startingArray,
    barIds: [...startingBarIds],
    startingBarIds,
    algorithmId,
    rule: 'any',
    moves: 0,
    good: 0,
    neutral: 0,
    bad: 0,
    history: [],
    startedAt: now,
    solved: isSorted(startingArray),
    solvedAt: isSorted(startingArray) ? now : null,
    resultVisible: false,
    feedback: { quality: 'info', text: 'Pinch a bar, then drop it on another bar.' },
    hintPair: null,
    hintAt: 0,
    lastSwap: null,
    lastSwapAt: 0,
    rejectedAt: 0,
    feedbackAt: now,
    optimalMoves: minSwapsToSort(startingArray),
    algorithmMoves: buildSteps(algorithmId, startingArray).filter(
      (step) => step.type === 'swap' || step.type === 'overwrite',
    ).length,
  };
}

export function efficiencyPercent(session: Pick<ChallengeSession, 'moves' | 'optimalMoves'>): number {
  if (session.moves === 0) return 100;
  return Math.min(100, Math.round((session.optimalMoves / session.moves) * 100));
}

export function challengeSessionReducer(state: ChallengeSession | null, action: ChallengeAction): ChallengeSession | null {
  if (action.type === 'start') return createChallengeSession(action.array, action.algorithmId, action.now);
  if (!state) return state;

  if (action.type === 'rule') return { ...state, rule: action.rule };
  if (action.type === 'hint') return { ...state, hintPair: action.pair, hintAt: action.now };
  if (action.type === 'show-result') return state.solved ? { ...state, resultVisible: true } : state;
  if (action.type === 'undo') return undoMove(state);
  return applyMove(state, action.i, action.j, action.now);
}

function undoMove(state: ChallengeSession): ChallengeSession {
  const last = state.history.at(-1);
  if (!last) return { ...state, feedback: { quality: 'info', text: 'There is no move to undo.' } };
  const counts = { good: state.good, neutral: state.neutral, bad: state.bad };
  counts[last.quality] -= 1;
  const array = [...last.array];
  return {
    ...state,
    array,
    barIds: [...last.barIds],
    moves: state.moves - 1,
    ...counts,
    history: state.history.slice(0, -1),
    solved: isSorted(array),
    solvedAt: isSorted(array) ? state.solvedAt : null,
    resultVisible: false,
    feedback: { quality: 'info', text: 'Move undone.' },
    lastSwap: null,
    hintPair: null,
  };
}

function applyMove(state: ChallengeSession, i: number, j: number, now: number): ChallengeSession {
  if (state.solved) return state;
  if (i < 0 || j < 0 || i >= state.array.length || j >= state.array.length || i === j) return state;
  if (state.rule === 'adjacent' && !isAdjacentMove(i, j)) {
    return {
      ...state,
      rejectedAt: now,
      feedbackAt: now,
      feedback: { quality: 'rejected', text: 'Adjacent-only rules allow swapping neighboring bars.' },
      lastSwap: [state.barIds[i], state.barIds[j]],
    };
  }

  const array = [...state.array];
  [array[i], array[j]] = [array[j], array[i]];
  const barIds = [...state.barIds];
  [barIds[i], barIds[j]] = [barIds[j], barIds[i]];
  const quality = evaluateSwap(state.array, i, j);
  const inversionsChanged = inversionCount(array) - inversionCount(state.array);
  const text = quality === 'good'
    ? '+1 closer — this swap removed pairs that were out of order.'
    : quality === 'neutral'
      ? 'Neutral — this swap left the out-of-order pairs unchanged.'
      : `This made ${inversionsChanged} pairs worse.`;
  const counts = { good: state.good, neutral: state.neutral, bad: state.bad };
  counts[quality] += 1;
  return {
    ...state,
    array,
    barIds,
    moves: state.moves + 1,
    ...counts,
    history: [...state.history, { array: [...state.array], barIds: [...state.barIds], quality }],
    solved: isSorted(array),
    solvedAt: isSorted(array) ? now : null,
    resultVisible: false,
    feedback: { quality, text },
    hintPair: null,
    lastSwap: [state.barIds[i], state.barIds[j]],
    lastSwapAt: now,
    feedbackAt: now,
  };
}

export function findChallengeHint(
  algorithmId: AlgorithmId,
  array: number[],
  rule: SwapRule = 'any',
): [number, number] | null {
  const suggestion = nextHint(algorithmId, [...array]);
  if (
    suggestion &&
    (rule === 'any' || isAdjacentMove(suggestion.i, suggestion.j)) &&
    reducesInversions(array, suggestion.i, suggestion.j)
  ) return [suggestion.i, suggestion.j];
  const currentOptimal = minSwapsToSort(array);
  for (let i = 0; i < array.length; i += 1) {
    for (let j = i + 1; j < array.length; j += 1) {
      if (rule === 'adjacent' && !isAdjacentMove(i, j)) continue;
      const next = [...array];
      [next[i], next[j]] = [next[j], next[i]];
      if (inversionCount(next) < inversionCount(array) || minSwapsToSort(next) < currentOptimal) return [i, j];
    }
  }
  return null;
}

function reducesInversions(array: number[], i: number, j: number): boolean {
  return evaluateSwap(array, i, j) === 'good';
}
