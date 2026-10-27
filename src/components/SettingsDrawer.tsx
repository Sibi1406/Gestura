import { useEffect } from 'react';
import { ALGORITHMS } from '../engine/registry';
import { useGestureStore } from '../store/useGestureStore';
import { ALGORITHM_LIST, type AlgorithmId } from '../engine/registry';
import { usePlaybackStore, type ArrayPreset } from '../store/usePlaybackStore';
import { useModeStore } from '../store/useModeStore';
import { usePredictStore } from '../store/usePredictStore';
import './SettingsDrawer.css';

type Props = { open: boolean; onClose: () => void };

const PRESETS: Array<{ id: ArrayPreset; label: string }> = [
  { id: 'random', label: 'Random' },
  { id: 'reversed', label: 'Reverse' },
  { id: 'nearly-sorted', label: 'Nearly sorted' },
  { id: 'few-unique', label: 'Few values' },
];

function RangeSetting({ label, min, max, step, value, onChange, display, disabled }: {
  label: string; min: number; max: number; step: number; value: number;
  onChange: (value: number) => void; display?: string; disabled?: boolean;
}) {
  return (
    <label className="setting-range">
      <span>{label}<output>{display ?? value}</output></span>
      <input data-gesture={`setting-${label.toLowerCase().replaceAll(' ', '-')}`} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="setting-toggle">
      <span>{label}</span>
      <input data-gesture={`setting-${label.toLowerCase().replaceAll(' ', '-')}`} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export function SettingsDrawer({ open, onClose }: Props) {
  const status = useGestureStore((state) => state.status);
  const hud = useGestureStore((state) => state.hud);
  const controlMode = useGestureStore((state) => state.controlMode);
  const calibration = useGestureStore((state) => state.calibration);
  const predictSampleSize = useGestureStore((state) => state.predictSampleSize);
  const setPredictSampleSize = useGestureStore((state) => state.setPredictSampleSize);
  const setControlMode = useGestureStore((state) => state.setControlMode);
  const setCalibration = useGestureStore((state) => state.setCalibration);
  const algoId = usePlaybackStore((state) => state.algoId);
  const setAlgorithm = usePlaybackStore((state) => state.setAlgorithm);
  const size = usePlaybackStore((state) => state.size);
  const setSize = usePlaybackStore((state) => state.setSize);
  const preset = usePlaybackStore((state) => state.preset);
  const setPreset = usePlaybackStore((state) => state.setPreset);
  const generateArray = usePlaybackStore((state) => state.generateArray);
  const speed = usePlaybackStore((state) => state.speed);
  const setSpeed = usePlaybackStore((state) => state.setSpeed);
  const stepIndex = usePlaybackStore((state) => state.stepIndex);
  const steps = usePlaybackStore((state) => state.steps);
  const counters = usePlaybackStore((state) => state.counters);
  const seek = usePlaybackStore((state) => state.seek);
  const reset = usePlaybackStore((state) => state.reset);
  const algorithm = ALGORITHMS[algoId];
  const comparisonCount = counters.comparisons.reduce((sum, count) => sum + count, 0) / 2;
  const mode = useModeStore((state) => state.mode);

  const restartPrediction = (): void => {
    const playback = usePlaybackStore.getState();
    playback.reset();
    usePredictStore.getState().start(playback.steps, playback.array, useGestureStore.getState().predictSampleSize);
    playback.play();
  };
  const generate = (): void => {
    generateArray(preset);
    if (mode === 'predict') restartPrediction();
  };
  const chooseAlgorithm = (id: AlgorithmId): void => {
    setAlgorithm(id);
    if (mode === 'predict') restartPrediction();
  };
  const resetPlayback = (): void => {
    if (mode === 'predict') restartPrediction();
    else reset();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="drawer-backdrop" data-gesture="settings-backdrop" onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <aside className="settings-drawer" aria-label="Settings" aria-modal="true" role="dialog">
        <header className="drawer-header">
          <div><span className="section-eyebrow">GESTURA</span><h2>Settings</h2></div>
          <button className="drawer-close" type="button" data-gesture="settings-close" aria-label="Close settings" onClick={onClose}>×</button>
        </header>
        <details open>
          <summary data-gesture="section-data">Data</summary>
          <RangeSetting label="Array size" min={5} max={50} step={1} value={size} onChange={setSize} />
          <div className="preset-grid">
            {PRESETS.map((option) => <button key={option.id} data-gesture={`preset-${option.id}`} className={preset === option.id ? 'active' : ''} aria-pressed={preset === option.id} onClick={() => setPreset(option.id)}>{option.label}</button>)}
          </div>
          <button className="drawer-action" data-gesture="generate-array" onClick={generate}>Generate array</button>
        </details>
        <details>
          <summary data-gesture="section-playback">Playback</summary>
          <RangeSetting label="Speed" min={0.25} max={4} step={0.25} value={speed} display={`${speed.toFixed(2)}×`} onChange={setSpeed} />
          <RangeSetting label="Predict questions per run" min={1} max={15} step={1} value={predictSampleSize} onChange={setPredictSampleSize} />
          <RangeSetting label="Step" min={0} max={Math.max(1, steps.length)} step={1} value={stepIndex} display={`${stepIndex} / ${steps.length}`} onChange={seek} disabled={mode === 'predict'} />
          <button className="drawer-action secondary" data-gesture="reset-playback" onClick={resetPlayback}>Reset playback</button>
          <div className="playback-counters">
            <span><strong>{comparisonCount}</strong> comparisons</span>
            <span><strong>{counters.swaps} / {counters.totalWrites}</strong> swaps / writes</span>
          </div>
        </details>
        <details>
          <summary data-gesture="section-algorithm">Algorithm info</summary>
          <div className="selection-options" aria-label="Algorithm">
            {ALGORITHM_LIST.map((item) => (
              <button key={item.id} data-gesture={`setting-algorithm-${item.id}`} className={algoId === item.id ? 'active' : ''} aria-pressed={algoId === item.id} onClick={() => chooseAlgorithm(item.id as AlgorithmId)}>{item.name}</button>
            ))}
          </div>
          <p className="algorithm-description">{algorithm.description}</p>
          <dl className="complexity-card">
            <div><dt>Best</dt><dd>{algorithm.best}</dd></div>
            <div><dt>Average</dt><dd>{algorithm.average}</dd></div>
            <div><dt>Worst</dt><dd>{algorithm.worst}</dd></div>
            <div><dt>Space</dt><dd>{algorithm.space}</dd></div>
          </dl>
        </details>
        <details>
          <summary data-gesture="section-tracking">Tracking</summary>
          <div className="tracking-readout"><span>Status</span><strong>{status.replaceAll('_', ' ')}</strong></div>
          <div className="tracking-readout"><span>FPS</span><strong>{hud.fps}</strong></div>
          <div className="tracking-readout"><span>Hands</span><strong>{hud.hands}</strong></div>
          <div className="mode-switch">
            {(['gesture', 'mouse'] as const).map((mode) => <button key={mode} data-gesture={`control-${mode}`} className={controlMode === mode ? 'active' : ''} aria-pressed={controlMode === mode} onClick={() => setControlMode(mode)}>{mode === 'gesture' ? 'Gesture' : 'Mouse'}</button>)}
          </div>
          <div className="selection-options dominant-options" aria-label="Dominant hand">
            {(['auto', 'left', 'right'] as const).map((hand) => (
              <button key={hand} data-gesture={`dominant-hand-${hand}`} className={calibration.dominantHand === hand ? 'active' : ''} aria-pressed={calibration.dominantHand === hand} onClick={() => setCalibration({ dominantHand: hand })}>{hand === 'auto' ? 'Auto' : hand[0].toUpperCase() + hand.slice(1)}</button>
            ))}
          </div>
        </details>
        <details>
          <summary data-gesture="section-calibration">Calibration</summary>
          <RangeSetting label="Pinch threshold" min={0.18} max={0.55} step={0.01} value={calibration.pinchOn} display={calibration.pinchOn.toFixed(2)} onChange={(pinchOn) => setCalibration({ pinchOn })} />
          <RangeSetting label="Smoothing minCutoff" min={0.15} max={3} step={0.05} value={calibration.minCutoff} display={calibration.minCutoff.toFixed(2)} onChange={(minCutoff) => setCalibration({ minCutoff })} />
          <RangeSetting label="Smoothing beta" min={0} max={0.05} step={0.001} value={calibration.beta} display={calibration.beta.toFixed(3)} onChange={(beta) => setCalibration({ beta })} />
          <RangeSetting label="Cursor minCutoff" min={0.15} max={3} step={0.05} value={calibration.cursorMinCutoff} display={calibration.cursorMinCutoff.toFixed(2)} onChange={(cursorMinCutoff) => setCalibration({ cursorMinCutoff })} />
          <RangeSetting label="Cursor beta" min={0} max={0.05} step={0.001} value={calibration.cursorBeta} display={calibration.cursorBeta.toFixed(3)} onChange={(cursorBeta) => setCalibration({ cursorBeta })} />
          <RangeSetting label="Swipe speed" min={0.5} max={4} step={0.1} value={calibration.swipeVelocity} onChange={(swipeVelocity) => setCalibration({ swipeVelocity })} />
          <RangeSetting label="Fist cooldown" min={400} max={1200} step={50} value={calibration.fistCooldownMs} display={`${calibration.fistCooldownMs} ms`} onChange={(fistCooldownMs) => setCalibration({ fistCooldownMs })} />
          <RangeSetting label="Swipe cooldown" min={250} max={1000} step={50} value={calibration.swipeCooldownMs} display={`${calibration.swipeCooldownMs} ms`} onChange={(swipeCooldownMs) => setCalibration({ swipeCooldownMs })} />
          <Toggle label="Dwell click" checked={calibration.dwellClick} onChange={(dwellClick) => setCalibration({ dwellClick })} />
          <RangeSetting label="Dwell time" min={400} max={2000} step={100} value={calibration.dwellMs} display={`${calibration.dwellMs} ms`} onChange={(dwellMs) => setCalibration({ dwellMs })} />
          <RangeSetting label="Active-region size" min={0.4} max={1} step={0.05} value={calibration.activeRegion} display={`${Math.round(calibration.activeRegion * 100)}%`} onChange={(activeRegion) => setCalibration({ activeRegion })} />
        </details>
        <details>
          <summary data-gesture="section-shortcuts">Shortcuts</summary>
          <ul className="shortcut-list"><li>Space — Play / pause</li><li>← / → — Previous / next</li><li>↑ / ↓ — Playback speed</li><li>R — Reset array</li><li>Esc — Close settings</li></ul>
        </details>
      </aside>
    </div>
  );
}
