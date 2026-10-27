import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CALIBRATION } from '../gestures/types';
import { gestureSettingsStorage, useGestureStore } from './useGestureStore';
import { usePlaybackStore } from './usePlaybackStore';

describe('gesture settings persistence', () => {
  afterEach(() => {
    useGestureStore.setState({ controlMode: 'gesture', calibration: { ...DEFAULT_CALIBRATION }, predictSampleSize: 8 });
    usePlaybackStore.getState().setSize(16);
    usePlaybackStore.getState().setPreset('random');
    usePlaybackStore.getState().setAlgorithm('bubbleSort');
    usePlaybackStore.getState().generateArray('random');
    usePlaybackStore.getState().setSpeed(1);
    void gestureSettingsStorage.removeItem('gestura-settings');
    void gestureSettingsStorage.removeItem('gestura-playback-settings');
  });

  it('restores tracking mode and calibration values from persistent storage', async () => {
    useGestureStore.getState().setControlMode('mouse');
    useGestureStore.getState().setCalibration({ pinchOn: 0.4, cursorBeta: 0.02, dwellClick: true });
    const serialized = await gestureSettingsStorage.getItem('gestura-settings');
    expect(serialized).not.toBeNull();
    useGestureStore.setState({ controlMode: 'gesture', calibration: { ...DEFAULT_CALIBRATION } });
    await gestureSettingsStorage.setItem('gestura-settings', serialized ?? '');

    await useGestureStore.persist.rehydrate();

    expect(useGestureStore.getState().controlMode).toBe('mouse');
    expect(useGestureStore.getState().calibration).toMatchObject({
      pinchOn: 0.4,
      pinchOff: 0.52,
      cursorBeta: 0.02,
      dwellClick: true,
    });

  });

  it('persists and caps the Predict question sample size', async () => {
    useGestureStore.getState().setPredictSampleSize(18);
    expect(useGestureStore.getState().predictSampleSize).toBe(15);
    const serialized = await gestureSettingsStorage.getItem('gestura-settings');
    useGestureStore.setState({ predictSampleSize: 8 });
    await gestureSettingsStorage.setItem('gestura-settings', serialized ?? '');
    await useGestureStore.persist.rehydrate();
    expect(useGestureStore.getState().predictSampleSize).toBe(15);
  });

  it('restores playback settings and rebuilds the timeline', async () => {
    usePlaybackStore.getState().setAlgorithm('insertionSort');
    usePlaybackStore.getState().setSize(24);
    usePlaybackStore.getState().setPreset('reversed');
    usePlaybackStore.getState().generateArray('reversed');
    usePlaybackStore.getState().setSpeed(2.25);
    const serialized = await gestureSettingsStorage.getItem('gestura-playback-settings');
    expect(serialized).not.toBeNull();

    usePlaybackStore.setState({
      algoId: 'bubbleSort',
      array: [20, 10],
      size: 16,
      preset: 'random',
      speed: 1,
    });
    await gestureSettingsStorage.setItem('gestura-playback-settings', serialized ?? '');
    await usePlaybackStore.persist.rehydrate();

    const restored = usePlaybackStore.getState();
    expect(restored).toMatchObject({
      algoId: 'insertionSort',
      array: [...restored.array].sort((a, b) => b - a),
      size: 24,
      preset: 'reversed',
      speed: 2.25,
    });
    expect(restored.steps.length).toBeGreaterThan(0);
    expect(restored.barState.map((bar) => bar.value)).toEqual(restored.array);
  });
});
