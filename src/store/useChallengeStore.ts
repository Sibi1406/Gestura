import { create } from 'zustand';
import {
  challengeSessionReducer,
  type ChallengeAction,
  type ChallengeSession,
  type SwapRule,
} from '../engine/challengeSession';
import type { PointerPosition } from '../input/pointer';

export type ChallengeDrag = {
  barId: string;
  startIndex: number;
  position: PointerPosition & { z: number };
  dropIndex: number | null;
};

type ChallengeStore = {
  session: ChallengeSession | null;
  drag: ChallengeDrag | null;
  start: (array: number[], algorithmId: ChallengeSession['algorithmId']) => void;
  move: (i: number, j: number) => void;
  undo: () => void;
  setRule: (rule: SwapRule) => void;
  setHint: (pair: [number, number] | null) => void;
  showResult: () => void;
  beginDrag: (barId: string, startIndex: number, position: PointerPosition & { z: number }) => void;
  updateDrag: (position: PointerPosition & { z: number }, dropIndex: number | null) => void;
  clearDrag: () => void;
};

export const useChallengeStore = create<ChallengeStore>((set, get) => {
  const dispatch = (action: ChallengeAction): void => {
    set((state) => ({ session: challengeSessionReducer(state.session, action) }));
  };
  return {
    session: null,
    drag: null,
    start: (array, algorithmId) => {
      get().drag = null;
      dispatch({ type: 'start', array: [...array], algorithmId, now: Date.now() });
    },
    move: (i, j) => dispatch({ type: 'move', i, j, now: Date.now() }),
    undo: () => dispatch({ type: 'undo' }),
    setRule: (rule) => dispatch({ type: 'rule', rule }),
    setHint: (pair) => dispatch({ type: 'hint', pair, now: Date.now() }),
    showResult: () => dispatch({ type: 'show-result' }),
    beginDrag: (barId, startIndex, position) => {
      get().drag = { barId, startIndex, position: { ...position }, dropIndex: null };
    },
    updateDrag: (position, dropIndex) => {
      const drag = get().drag;
      if (drag) {
        drag.position.x = position.x;
        drag.position.y = position.y;
        drag.position.z = position.z;
        drag.dropIndex = dropIndex;
      }
    },
    clearDrag: () => { get().drag = null; },
  };
});
