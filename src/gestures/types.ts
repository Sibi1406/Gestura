export type TrackingStatus =
  | 'loading'
  | 'permission_denied'
  | 'no_camera'
  | 'model_error'
  | 'tracking';

export type ControlMode = 'gesture' | 'mouse';

export type GestureKind = 'pinch' | 'fist' | 'open' | 'none';

export type Landmark = {
  x: number;
  y: number;
  z: number;
};

export type Calibration = {
  /** Pinch engages below this normalized thumb–index distance. */
  pinchOn: number;
  /** Pinch releases above this distance (must be > pinchOn). */
  pinchOff: number;
  /** One Euro minimum cutoff (Hz). Lower = smoother, more lag. */
  minCutoff: number;
  /** One Euro speed coefficient. Higher = less lag on fast motion. */
  beta: number;
  swipeVelocity: number;
  swipeCooldownMs: number;
  fistCooldownMs: number;
  cursorMinCutoff: number;
  cursorBeta: number;
  dwellClick: boolean;
  dwellMs: number;
  activeRegion: number;
  dominantHand: 'auto' | 'left' | 'right';
};

export type GestureEvent = 'toggle' | 'next' | 'prev';

export type GestureState = {
  kind: GestureKind;
  hands: 0 | 1 | 2;
  rotateDelta: { x: number; y: number };
  zoomDelta: number;
  events: GestureEvent[];
};

export const IDLE_GESTURE: GestureState = {
  kind: 'none',
  hands: 0,
  rotateDelta: { x: 0, y: 0 },
  zoomDelta: 0,
  events: [],
};

export const DEFAULT_CALIBRATION: Calibration = {
  pinchOn: 0.32,
  pinchOff: 0.44,
  minCutoff: 1.0,
  beta: 0.007,
  swipeVelocity: 1.5,
  swipeCooldownMs: 500,
  fistCooldownMs: 600,
  cursorMinCutoff: 1.0,
  cursorBeta: 0.007,
  dwellClick: false,
  dwellMs: 900,
  activeRegion: 0.8,
  dominantHand: 'auto',
};

export const PINCH_DEBOUNCE_MS = 80;
