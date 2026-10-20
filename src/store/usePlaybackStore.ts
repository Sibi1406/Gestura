import { create } from 'zustand';
import { ALGORITHMS, type AlgorithmId } from '../engine/registry';
import { applyStep, createInitialBars } from '../engine/reducer';
import { buildSteps, countStep, countersAt, describeStep, stateAt } from '../engine/player';
import type { BarState, IndexCounters, Step } from '../engine/types';

export type ArrayPreset = 'random' | 'reversed' | 'nearly-sorted' | 'few-unique';
export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'finished';

type PlaybackStore = {
  algoId: AlgorithmId;
  array: number[];
  steps: Step[];
  stepIndex: number;
  status: PlaybackStatus;
  speed: number;
  size: number;
  preset: ArrayPreset;
  barIds: string[];
  initialBars: BarState;
  barState: BarState;
  counters: IndexCounters;
  narration: string;
  setAlgorithm: (algoId: AlgorithmId) => void;
  setPreset: (preset: ArrayPreset) => void;
  setSize: (size: number) => void;
  generateArray: (preset: ArrayPreset) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
  seek: (index: number) => void;
  setSpeed: (speed: number) => void;
  tick: (deltaSeconds: number) => void;
};

const BASE_RATE = 8;

function valuesFor(size: number, preset: ArrayPreset): number[] {
  const values = Array.from({ length: size }, (_, index) => index * 2 + 10);
  if (preset === 'random') {
    return values.map(() => Math.floor(Math.random() * 90) + 10);
  }
  if (preset === 'reversed') return values.reverse();
  if (preset === 'nearly-sorted') {
    const middle = Math.floor(size / 2);
    if (size > 2) [values[middle - 1], values[middle]] = [values[middle], values[middle - 1]];
    return values;
  }
  return values.map((_, index) => [18, 52, 86][index % 3]);
}

function positioned(initial: BarState, steps: Step[], index: number) {
  const clamped = Math.max(0, Math.min(steps.length, Math.floor(index)));
  const before = clamped > 0 ? stateAt(initial, steps, clamped - 1) : initial;
  const step = clamped > 0 ? steps[clamped - 1] : undefined;
  return {
    stepIndex: clamped,
    barState: stateAt(initial, steps, clamped),
    counters: countersAt(initial.length, steps, clamped),
    narration: describeStep(step, before),
  };
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => {
  let accumulatedSeconds = 0;
  const initialArray = valuesFor(16, 'random');
  const initialBars = createInitialBars(initialArray);
  const initialSteps = buildSteps('bubbleSort', initialArray);

  const advanceManually = (index: number): void => {
    const state = get();
    const position = positioned(state.initialBars, state.steps, index);
    set({ ...position, status: position.stepIndex >= state.steps.length ? 'finished' : 'paused' });
    accumulatedSeconds = 0;
  };

  return {
    algoId: 'bubbleSort',
    array: initialArray,
    steps: initialSteps,
    stepIndex: 0,
    status: 'idle',
    speed: 1,
    size: 16,
    preset: 'random',
    barIds: initialBars.map((bar) => bar.id),
    initialBars,
    barState: initialBars,
    counters: countersAt(initialBars.length, initialSteps, 0),
    narration: 'Ready to sort.',

    setAlgorithm: (algoId) => {
      const state = get();
      const steps = buildSteps(algoId, state.array);
      const bars = createInitialBars(state.array);
      accumulatedSeconds = 0;
      set({ algoId, steps, initialBars: bars, barIds: bars.map((bar) => bar.id), ...positioned(bars, steps, 0), status: 'idle' });
    },
    setPreset: (preset) => set({ preset }),
    setSize: (size) => set({ size: Math.max(5, Math.min(50, Math.round(size))) }),
    generateArray: (preset) => {
      const state = get();
      const array = valuesFor(state.size, preset);
      const bars = createInitialBars(array);
      const steps = buildSteps(state.algoId, array);
      accumulatedSeconds = 0;
      set({ array, preset, steps, initialBars: bars, barIds: bars.map((bar) => bar.id), ...positioned(bars, steps, 0), status: 'idle' });
    },
    play: () => {
      const state = get();
      if (state.stepIndex >= state.steps.length) {
        const position = positioned(state.initialBars, state.steps, 0);
        set({ ...position, status: 'playing' });
      } else {
        set({ status: 'playing' });
      }
      accumulatedSeconds = 0;
    },
    pause: () => {
      if (get().status === 'playing') set({ status: 'paused' });
      accumulatedSeconds = 0;
    },
    toggle: () => (get().status === 'playing' ? get().pause() : get().play()),
    next: () => advanceManually(get().stepIndex + 1),
    prev: () => advanceManually(get().stepIndex - 1),
    reset: () => {
      const state = get();
      accumulatedSeconds = 0;
      set({ ...positioned(state.initialBars, state.steps, 0), status: 'idle' });
    },
    seek: (index) => advanceManually(index),
    setSpeed: (speed) => set({ speed: Math.max(0.25, Math.min(4, speed)) }),
    tick: (deltaSeconds) => {
      const state = get();
      if (state.status !== 'playing') return;
      accumulatedSeconds += Math.max(0, deltaSeconds);
      const interval = 1 / (BASE_RATE * state.speed);
      let due = Math.floor(accumulatedSeconds / interval);
      if (due === 0) return;
      accumulatedSeconds -= due * interval;

      let barState = state.barState;
      let counters = state.counters;
      let stepIndex = state.stepIndex;
      let previousState = barState;
      while (due > 0 && stepIndex < state.steps.length) {
        previousState = barState;
        const step = state.steps[stepIndex];
        barState = applyStep(barState, step);
        counters = countStep(counters, step);
        stepIndex += 1;
        due -= 1;
      }
      const currentStep = state.steps[stepIndex - 1];
      set({
        stepIndex,
        barState,
        counters,
        narration: describeStep(currentStep, previousState),
        status: stepIndex >= state.steps.length ? 'finished' : 'playing',
      });
    },
  };
});

export { ALGORITHMS };