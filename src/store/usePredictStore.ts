import { create } from 'zustand';
import {
  predictSessionReducer,
  type PredictSession,
} from '../engine/predictSession';
import type { Step } from '../engine/types';

type PredictStore = {
  session: PredictSession | null;
  start: (steps: Step[], array: number[], sampleSize: number, onlyIndices?: number[]) => void;
  pauseAt: (stepIndex: number) => void;
  answer: (choice: number, pressSequence: number) => void;
  continue: () => void;
  finish: () => void;
};

export const usePredictStore = create<PredictStore>((set) => {
  const dispatch = (action: Parameters<typeof predictSessionReducer>[1]): void => {
    set((state) => ({ session: predictSessionReducer(state.session, action) }));
  };
  return {
    session: null,
    start: (steps, array, sampleSize, onlyIndices) => dispatch({
      type: 'start', steps, array: [...array], sampleSize, onlyIndices,
    }),
    pauseAt: (stepIndex) => dispatch({ type: 'pause', stepIndex }),
    answer: (choice, pressSequence) => dispatch({
      type: 'answer', choice, now: Date.now(), pressSequence,
    }),
    continue: () => dispatch({ type: 'continue' }),
    finish: () => dispatch({ type: 'finish' }),
  };
});
