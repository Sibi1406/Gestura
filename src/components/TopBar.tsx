import { useRef, useState } from 'react';
import { useHandTracking } from '../hooks/useHandTracking';
import { useGestureStore } from '../store/useGestureStore';
import { useModeStore, type AppMode } from '../store/useModeStore';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { useChallengeStore } from '../store/useChallengeStore';
import { usePredictStore } from '../store/usePredictStore';
import { WebcamPreview } from './WebcamPreview';

export const MODE_LABELS: Record<AppMode, string> = {
  watch: 'Learn',
  challenge: 'Sort it',
  predict: 'Predict',
};

function TrackingDot() {
  const status = useGestureStore((state) => state.status);
  const statusLabel: Record<typeof status, string> = {
    loading: 'Camera and hand tracking are loading',
    tracking: 'Hand tracking is active',
    permission_denied: 'Camera permission denied',
    no_camera: 'No camera available',
    model_error: 'Hand tracking model failed to load',
  };
  const color = status === 'tracking' ? 'good' : status === 'loading' ? 'loading' : 'problem';
  return <span className={`tracking-dot ${color}`} title={statusLabel[status]} aria-label={statusLabel[status]} />;
}

export function TopBar({ onSettings }: { onSettings: () => void }) {
  const mode = useModeStore((state) => state.mode);
  const setMode = useModeStore((state) => state.setMode);
  const [cameraVisible, setCameraVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useHandTracking(videoRef, canvasRef);

  return (
    <>
      <header className="top-bar">
        <div className="brand-and-modes">
          <strong className="wordmark">Gestura</strong>
          <nav className="mode-pills" aria-label="Mode">
            {(['watch', 'challenge', 'predict'] as const).map((value) => (
              <button
                key={value}
                type="button"
                data-gesture={`mode-${value}`}
                className={mode === value ? 'selected' : ''}
                aria-pressed={mode === value}
                onClick={() => {
                  if (mode === 'predict' && value !== 'predict') usePlaybackStore.getState().pause();
                  if (value === 'challenge' && mode !== 'challenge') {
                    const playback = usePlaybackStore.getState();
                    playback.pause();
                    useChallengeStore.getState().start(playback.array, playback.algoId);
                  }
                  if (value === 'predict' && mode !== 'predict') {
                    const playback = usePlaybackStore.getState();
                    playback.pause();
                    playback.reset();
                    usePredictStore.getState().start(
                      playback.steps,
                      playback.array,
                      useGestureStore.getState().predictSampleSize,
                    );
                    playback.play();
                  }
                  setMode(value);
                }}
              >
                {MODE_LABELS[value]}
              </button>
            ))}
          </nav>
        </div>
        <div className="top-actions">
          <TrackingDot />
          <button className="icon-button" type="button" data-gesture="settings-open" aria-label="Open settings" title="Settings" onClick={onSettings}>
            ⚙
          </button>
          <button className="camera-toggle" type="button" data-gesture="camera-toggle" onClick={() => setCameraVisible((visible) => !visible)}>
            {cameraVisible ? 'Hide camera' : 'Show camera'}
          </button>
        </div>
      </header>
      <WebcamPreview videoRef={videoRef} canvasRef={canvasRef} hidden={!cameraVisible} />
    </>
  );
}
