import { createJSONStorage, type StateStorage } from 'zustand/middleware';
import { buildSteps, createInitialBars } from '../engine/player';
import type { PlaybackStore } from './usePlaybackStore';
import { positioned } from './playbackHelpers';

export function createPlaybackPersistenceOptions(storage: StateStorage) {
  return {
    name: 'gestura-playback-settings',
    storage: createJSONStorage(() => storage),
    partialize: (state: PlaybackStore) => ({
      algoId: state.algoId,
      array: state.array,
      speed: state.speed,
      size: state.size,
      preset: state.preset,
    }),
    merge: (persistedState: unknown, currentState: PlaybackStore): PlaybackStore => {
      const restored = persistedState as Partial<PlaybackStore>;
      const algoId = restored.algoId ?? currentState.algoId;
      const array = Array.isArray(restored.array) ? restored.array : currentState.array;
      const steps = buildSteps(algoId, array);
      const initialBars = createInitialBars(array);
      return {
        ...currentState,
        ...restored,
        algoId,
        array,
        steps,
        initialBars,
        barIds: initialBars.map((bar) => bar.id),
        ...positioned(initialBars, steps, 0),
        status: 'idle',
      };
    },
  };
}
