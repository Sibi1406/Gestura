import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { deduplicatingStorage } from './deduplicatingStorage';
import {
  DEFAULT_CALIBRATION,
  IDLE_GESTURE,
  type Calibration,
  type ControlMode,
  type GestureKind,
  type GestureState,
  type TrackingStatus,
} from '../gestures/types';

export type HudSnapshot = {
  kind: GestureKind;
  hands: 0 | 1 | 2;
  fps: number;
};

type GestureStore = {
  gesture: GestureState;
  status: TrackingStatus;
  hud: HudSnapshot;
  controlMode: ControlMode;
  calibration: Calibration;
  predictSampleSize: number;
  /** Writes GestureState without notifying React (scene reads via getState). */
  setGestureTransient: (gesture: GestureState) => void;
  setStatus: (status: TrackingStatus) => void;
  setHud: (hud: HudSnapshot) => void;
  setControlMode: (controlMode: ControlMode) => void;
  setCalibration: (patch: Partial<Calibration>) => void;
  setPredictSampleSize: (size: number) => void;
};

const memoryValues = new Map<string, string>();
export const gestureSettingsStorage: StateStorage = typeof localStorage === 'undefined'
  ? {
      getItem: (name) => memoryValues.get(name) ?? null,
      setItem: (name, value) => { memoryValues.set(name, value); },
      removeItem: (name) => { memoryValues.delete(name); },
    }
  : localStorage;
const persistedSettingsStorage = deduplicatingStorage(gestureSettingsStorage);

export const useGestureStore = create<GestureStore>()(persist((set, get) => ({
  gesture: IDLE_GESTURE,
  status: 'loading',
  hud: { kind: 'none', hands: 0, fps: 0 },
  controlMode: 'gesture',
  calibration: { ...DEFAULT_CALIBRATION },
  predictSampleSize: 8,

  setGestureTransient: (gesture) => {
    get().gesture = gesture;
  },

  setStatus: (status) => set({ status }),
  setHud: (hud) => set({ hud }),
  setControlMode: (controlMode) => set({ controlMode }),
  setPredictSampleSize: (size) => set({ predictSampleSize: Math.max(1, Math.min(15, Math.round(size))) }),

  setCalibration: (patch) =>
    set((state) => {
      const next = { ...state.calibration, ...patch };
      if (patch.pinchOn !== undefined) {
        next.pinchOff = Math.min(0.9, patch.pinchOn + 0.12);
      }
      return { calibration: next };
    }),
}), {
  name: 'gestura-settings',
  storage: createJSONStorage(() => persistedSettingsStorage),
  partialize: (state) => ({
    controlMode: state.controlMode,
    calibration: state.calibration,
    predictSampleSize: state.predictSampleSize,
  }),
  merge: (persistedState, currentState) => {
    const restored = persistedState as Partial<GestureStore>;
    return {
      ...currentState,
      ...restored,
      predictSampleSize: Math.max(1, Math.min(15, restored.predictSampleSize ?? currentState.predictSampleSize)),
      calibration: { ...DEFAULT_CALIBRATION, ...restored.calibration },
    };
  },
}));
