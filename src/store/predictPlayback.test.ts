import { describe, expect, it } from 'vitest';
import { usePlaybackStore } from './usePlaybackStore';

describe('Predict playback boundaries', () => {
  it('pauses before a selected comparison even when several steps are due', () => {
    const playback = usePlaybackStore.getState();
    playback.setArray([3, 2, 1]);
    usePlaybackStore.getState().setAlgorithm('bubbleSort');
    usePlaybackStore.getState().play();
    usePlaybackStore.getState().tick(0.5, 0);
    expect(usePlaybackStore.getState()).toMatchObject({ stepIndex: 0, status: 'paused' });

    usePlaybackStore.getState().play();
    usePlaybackStore.getState().tick(0.5, 1);
    expect(usePlaybackStore.getState()).toMatchObject({ stepIndex: 1, status: 'paused' });
    expect(usePlaybackStore.getState().barState.map((bar) => bar.value)).toEqual([3, 2, 1]);
  });

  it('rebuilds edited data and restores the original array', () => {
    const playback = usePlaybackStore.getState();
    playback.setArray([2, 1, 3, 4]);
    usePlaybackStore.getState().setAlgorithm('bubbleSort');
    const originalStepCount = usePlaybackStore.getState().steps.length;
    usePlaybackStore.getState().editValue(0, 1);
    expect(usePlaybackStore.getState().array).toEqual([1, 1, 3, 4]);
    expect(usePlaybackStore.getState().hasEditedData).toBe(true);
    expect(usePlaybackStore.getState().steps.length).not.toBe(originalStepCount);

    usePlaybackStore.getState().resetData();
    expect(usePlaybackStore.getState().array).toEqual([2, 1, 3, 4]);
    expect(usePlaybackStore.getState().hasEditedData).toBe(false);
  });
});
