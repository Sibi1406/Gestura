import { create } from 'zustand';
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
  /** Writes GestureState without notifying React (scene reads via getState). */
  setGestureTransient: (gesture: GestureState) => void;
  setStatus: (status: TrackingStatus) => void;
  setHud: (hud: HudSnapshot) => void;
  setControlMode: (controlMode: ControlMode) => void;
  setCalibration: (patch: Partial<Calibration>) => void;
};

export const useGestureStore = create<GestureStore>((set, get) => ({
  gesture: IDLE_GESTURE,
  status: 'loading',
  hud: { kind: 'none', hands: 0, fps: 0 },
  controlMode: 'gesture',
  calibration: { ...DEFAULT_CALIBRATION },

  setGestureTransient: (gesture) => {
    get().gesture = gesture;
  },

  setStatus: (status) => set({ status }),
  setHud: (hud) => set({ hud }),
  setControlMode: (controlMode) => set({ controlMode }),

  setCalibration: (patch) =>
    set((state) => {
      const next = { ...state.calibration, ...patch };
      if (patch.pinchOn !== undefined) {
        next.pinchOff = Math.min(0.9, patch.pinchOn + 0.12);
      }
      return { calibration: next };
    }),
}));
