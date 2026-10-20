import { useEffect } from 'react';
import { ALGORITHMS, ALGORITHM_LIST, type AlgorithmId } from '../engine/registry';
import type { ArrayPreset } from '../store/usePlaybackStore';
import { usePlaybackStore } from '../store/usePlaybackStore';
import './ControlPanel.css';

const PRESETS: Array<{ id: ArrayPreset; label: string }> = [
  { id: 'random', label: 'Random' },
  { id: 'reversed', label: 'Reverse' },
  { id: 'nearly-sorted', label: 'Nearly' },
  { id: 'few-unique', label: 'Few values' },
];

export function ControlPanel() {
  const algoId = usePlaybackStore((state) => state.algoId);
  const steps = usePlaybackStore((state) => state.steps);
  const stepIndex = usePlaybackStore((state) => state.stepIndex);
  const status = usePlaybackStore((state) => state.status);
  const speed = usePlaybackStore((state) => state.speed);
  const size = usePlaybackStore((state) => state.size);
  const preset = usePlaybackStore((state) => state.preset);
  const counters = usePlaybackStore((state) => state.counters);
  const narration = usePlaybackStore((state) => state.narration);
  const setAlgorithm = usePlaybackStore((state) => state.setAlgorithm);
  const setPreset = usePlaybackStore((state) => state.setPreset);
  const setSize = usePlaybackStore((state) => state.setSize);
  const generateArray = usePlaybackStore((state) => state.generateArray);
  const play = usePlaybackStore((state) => state.play);
  const pause = usePlaybackStore((state) => state.pause);
  const next = usePlaybackStore((state) => state.next);
  const prev = usePlaybackStore((state) => state.prev);
  const reset = usePlaybackStore((state) => state.reset);
  const seek = usePlaybackStore((state) => state.seek);
  const setSpeed = usePlaybackStore((state) => state.setSpeed);
  const metadata = ALGORITHMS[algoId];
  const comparisonCount = counters.comparisons.reduce((sum, count) => sum + count, 0) / 2;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName))) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (usePlaybackStore.getState().status === 'playing') pause();
        else play();
      } else if (event.code === 'ArrowLeft') {
        event.preventDefault();
        prev();
      } else if (event.code === 'ArrowRight') {
        event.preventDefault();
        next();
      } else if (event.code === 'ArrowUp') {
        event.preventDefault();
        setSpeed(speed + 0.25);
      } else if (event.code === 'ArrowDown') {
        event.preventDefault();
        setSpeed(speed - 0.25);
      } else if (event.code === 'KeyR') {
        reset();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [next, pause, play, prev, reset, setSpeed, speed]);

  return (
    <aside className="sorting-controls" aria-label="Sorting controls">
      <header className="controls-heading">
        <div><span className="eyebrow">GESTURA / SORT LAB</span><h1>Sorting studio</h1></div>
        <span className={`playback-state ${status}`}>{status}</span>
      </header>

      <label className="control-field">Algorithm
        <select value={algoId} onChange={(event) => setAlgorithm(event.target.value as AlgorithmId)}>
          {ALGORITHM_LIST.map((algorithm) => <option key={algorithm.id} value={algorithm.id}>{algorithm.name}</option>)}
        </select>
      </label>

      <div className="control-field">
        <div className="field-heading"><label htmlFor="array-size">Array size</label><output>{size}</output></div>
        <input id="array-size" type="range" min={5} max={50} value={size} onChange={(event) => setSize(Number(event.target.value))} />
      </div>

      <div className="preset-picker" aria-label="Array preset">
        {PRESETS.map((option) => <button key={option.id} className={preset === option.id ? 'selected' : ''} aria-pressed={preset === option.id} onClick={() => setPreset(option.id)}>{option.label}</button>)}
      </div>
      <button className="generate-button" onClick={() => generateArray(preset)}>Generate array</button>

      <div className="transport" aria-label="Playback">
        <button aria-label="Previous step" title="Previous step" onClick={prev}>Prev</button>
        <button className="play-button" onClick={() => status === 'playing' ? pause() : play()}>{status === 'playing' ? 'Pause' : 'Play'}</button>
        <button aria-label="Next step" title="Next step" onClick={next}>Next</button>
        <button aria-label="Reset" title="Reset" onClick={reset}>Reset</button>
      </div>

      <div className="control-field speed-field">
        <div className="field-heading"><label htmlFor="playback-speed">Speed</label><output>{speed.toFixed(2)}x</output></div>
        <input id="playback-speed" type="range" min={0.25} max={4} step={0.25} value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
      </div>

      <div className="control-field timeline-field">
        <div className="field-heading"><label htmlFor="timeline">Step</label><output>{stepIndex} / {steps.length}</output></div>
        <input id="timeline" type="range" min={0} max={steps.length} value={stepIndex} onChange={(event) => seek(Number(event.target.value))} />
      </div>

      <div className="live-counters">
        <div><strong>{comparisonCount}</strong><span>Comparisons</span></div>
        <div><strong>{counters.swaps} / {counters.totalWrites}</strong><span>Swaps / writes</span></div>
      </div>

      <section className="complexity" aria-label="Algorithm complexity">
        <h2>{metadata.name}</h2><p>{metadata.description}</p>
        <dl>
          <div><dt>Best</dt><dd>{metadata.best}</dd></div><div><dt>Average</dt><dd>{metadata.average}</dd></div>
          <div><dt>Worst</dt><dd>{metadata.worst}</dd></div><div><dt>Space</dt><dd>{metadata.space}</dd></div>
          <div><dt>Stable</dt><dd>{metadata.stable ? 'Yes' : 'No'}</dd></div>
        </dl>
      </section>

      <p className="narration" aria-live="polite">{narration}</p>
      <p className="gesture-hints">Fist = play / pause <span>|</span> Swipe = step <span>|</span> Pinch-drag = rotate <span>|</span> Two hands = zoom</p>
      <p className="shortcut-hints">Space play/pause <span>Left/Right step</span> <span>Up/Down speed</span> <span>R reset</span></p>
    </aside>
  );
}