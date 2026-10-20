import { useGestureStore } from '../store/useGestureStore';
import type { ControlMode, TrackingStatus } from '../gestures/types';

const STATUS_LABEL: Record<TrackingStatus, string> = {
  loading: 'Loading model…',
  permission_denied: 'Camera permission denied',
  no_camera: 'No camera found',
  model_error: 'Hand tracking model failed to load',
  tracking: 'Tracking active',
};

const GESTURE_LABEL = {
  pinch: 'Pinch',
  fist: 'Fist',
  open: 'Open',
  none: 'None',
} as const;

function ModeToggle({ mode }: { mode: ControlMode }) {
  const setMode = useGestureStore((s) => s.setControlMode);
  return (
    <div className="mode-toggle">
      {(['gesture', 'mouse'] as const).map((value) => (
        <button
          key={value}
          type="button"
          className={mode === value ? 'active' : ''}
          aria-pressed={mode === value}
          onClick={() => setMode(value)}
        >
          {value === 'gesture' ? 'Gesture' : 'Mouse'}
        </button>
      ))}
    </div>
  );
}

export function HUD() {
  const status = useGestureStore((s) => s.status);
  const hud = useGestureStore((s) => s.hud);
  const mode = useGestureStore((s) => s.controlMode);
  const cal = useGestureStore((s) => s.calibration);
  const setCalibration = useGestureStore((s) => s.setCalibration);

  return (
    <div className="hud">
      <section className="hud-panel">
        <h1>Gestura</h1>
        <p>
          Status: <strong>{STATUS_LABEL[status]}</strong>
        </p>
        <p>
          FPS: <strong>{hud.fps}</strong>
        </p>
        <p>
          Gesture: <strong>{GESTURE_LABEL[hud.kind]}</strong>
        </p>
        <p>
          Hands: <strong>{hud.hands}</strong>
        </p>
        <ModeToggle mode={mode} />
      </section>

      <section className="hud-panel">
        <h2>Calibration</h2>
        <label>
          Pinch threshold
          <input
            type="range"
            min={0.18}
            max={0.55}
            step={0.01}
            value={cal.pinchOn}
            onChange={(e) =>
              setCalibration({ pinchOn: Number(e.target.value) })
            }
          />
          <span>{cal.pinchOn.toFixed(2)}</span>
        </label>
        <label>
          Smoothing minCutoff
          <input
            type="range"
            min={0.15}
            max={3}
            step={0.05}
            value={cal.minCutoff}
            onChange={(e) =>
              setCalibration({ minCutoff: Number(e.target.value) })
            }
          />
          <span>{cal.minCutoff.toFixed(2)}</span>
        </label>
        <label>
          Smoothing beta
          <input
            type="range"
            min={0}
            max={0.05}
            step={0.001}
            value={cal.beta}
            onChange={(e) => setCalibration({ beta: Number(e.target.value) })}
          />
          <span>{cal.beta.toFixed(3)}</span>
        </label>
        <label>
          Swipe speed threshold
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.1}
            value={cal.swipeVelocity}
            onChange={(e) => setCalibration({ swipeVelocity: Number(e.target.value) })}
          />
          <span>{cal.swipeVelocity.toFixed(1)}</span>
        </label>
        <label>
          Fist cooldown (ms)
          <input
            type="range"
            min={400}
            max={1200}
            step={50}
            value={cal.fistCooldownMs}
            onChange={(e) => setCalibration({ fistCooldownMs: Number(e.target.value) })}
          />
          <span>{cal.fistCooldownMs}</span>
        </label>
        <label>
          Swipe cooldown (ms)
          <input
            type="range"
            min={250}
            max={1000}
            step={50}
            value={cal.swipeCooldownMs}
            onChange={(e) => setCalibration({ swipeCooldownMs: Number(e.target.value) })}
          />
          <span>{cal.swipeCooldownMs}</span>
        </label>
      </section>
    </div>
  );
}
