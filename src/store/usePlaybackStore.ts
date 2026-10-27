import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ALGORITHMS, type AlgorithmId } from '../engine/registry';
import { createInitialBars } from '../engine/reducer';
import { buildSteps, countersAt } from '../engine/player';
import type { BarState, IndexCounters, Step } from '../engine/types';
import { gestureSettingsStorage } from './useGestureStore';
import { valuesFor } from './arrayValues';
import { deduplicatingStorage } from './deduplicatingStorage';
import { rebuildEditedData } from '../engine/dataEdit';
import { positioned } from './playbackHelpers';
import { createPlaybackPersistenceOptions } from './playbackPersistence';
import { tickPlayback } from './playbackTick';

const playbackSettingsStorage = deduplicatingStorage(gestureSettingsStorage);

export type ArrayPreset = 'random' | 'reversed' | 'nearly-sorted' | 'few-unique';
export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'finished';

export type PlaybackStore = {
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
  editFeedback: string | null;
  hasEditedData: boolean;
  setAlgorithm: (algoId: AlgorithmId) => void;
  setPreset: (preset: ArrayPreset) => void;
  setSize: (size: number) => void;
  generateArray: (preset: ArrayPreset) => void;
  setArray: (values: number[]) => void;
  editValue: (index: number, value: number) => void;
  resetData: () => void;
  swapIndices: (i: number, j: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
  seek: (index: number) => void;
  setSpeed: (speed: number) => void;
  tick: (deltaSeconds: number, stopAtIndex?: number) => void;
};

export const usePlaybackStore = create<PlaybackStore>()(persist((set, get) => {
  let accumulatedSeconds = 0;
  let editBaseline: number[] | null = null;
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
    editFeedback: null,
    hasEditedData: false,

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
      editBaseline = null;
      set({ array, preset, steps, initialBars: bars, barIds: bars.map((bar) => bar.id), ...positioned(bars, steps, 0), status: 'idle', editFeedback: null, hasEditedData: false });
    },
    setArray: (values) => {
      const state = get();
      const bars = createInitialBars(values);
      const steps = buildSteps(state.algoId, values);
      accumulatedSeconds = 0;
      editBaseline = null;
      set({ array: values, steps, initialBars: bars, barIds: bars.map((bar) => bar.id), ...positioned(bars, steps, 0), status: 'idle', editFeedback: null, hasEditedData: false });
    },
    editValue: (index, value) => {
      const state = get();
      if (state.status === 'playing' || state.stepIndex !== 0 || !state.array[index]) return;
      if (Math.max(1, Math.min(100, Math.round(value))) === state.array[index]) return;
      editBaseline ??= [...state.array];
      const rebuilt = rebuildEditedData(state.algoId, state.array, state.steps, index, value);
      accumulatedSeconds = 0;
      set({
        array: rebuilt.array, steps: rebuilt.steps, initialBars: rebuilt.initialBars,
        barIds: rebuilt.initialBars.map((bar) => bar.id),
        ...positioned(rebuilt.initialBars, rebuilt.steps, 0), status: 'idle',
        hasEditedData: true,
        editFeedback: rebuilt.editFeedback,
      });
    },
    resetData: () => {
      if (!editBaseline) return;
      const values = [...editBaseline];
      editBaseline = null;
      const state = get();
      const bars = createInitialBars(values);
      const steps = buildSteps(state.algoId, values);
      accumulatedSeconds = 0;
      set({
        array: values, steps, initialBars: bars, barIds: bars.map((bar) => bar.id),
        ...positioned(bars, steps, 0), status: 'idle', editFeedback: 'Data reset to the original array.', hasEditedData: false,
      });
    },
    swapIndices: (i, j) => {
      const state = get();
      if (!state.array[i] || !state.array[j]) return;
      const next = [...state.array];
      [next[i], next[j]] = [next[j], next[i]];
      get().setArray(next);
    },
    play: () => {
      const state = get();
      if (state.stepIndex >= state.steps.length) {
        const position = positioned(state.initialBars, state.steps, 0);
        set({ ...position, status: 'playing', editFeedback: null });
      } else {
        set({ status: 'playing', editFeedback: null });
      }
      accumulatedSeconds = 0;
    },
    pause: () => {
      if (get().status === 'playing') set({ status: 'paused' });
      accumulatedSeconds = 0;
    },
    toggle: () => (get().status === 'playing' ? get().pause() : get().play()),
    next: () => { set({ editFeedback: null }); advanceManually(get().stepIndex + 1); },
    prev: () => { set({ editFeedback: null }); advanceManually(get().stepIndex - 1); },
    reset: () => {
      const state = get();
      accumulatedSeconds = 0;
      set({ ...positioned(state.initialBars, state.steps, 0), status: 'idle' });
    },
    seek: (index) => advanceManually(index),
    setSpeed: (speed) => set({ speed: Math.max(0.25, Math.min(4, speed)) }),
    tick: (deltaSeconds, stopAtIndex) => {
      const result = tickPlayback(get(), accumulatedSeconds, deltaSeconds, stopAtIndex);
      accumulatedSeconds = result.elapsed;
      if (result.update) set(result.update);
    },
  };
}, createPlaybackPersistenceOptions(playbackSettingsStorage)));

export { ALGORITHMS };