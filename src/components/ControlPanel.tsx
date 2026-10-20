import { useEffect, useMemo, useState } from 'react';
import { evaluateSwap, nextHint } from '../engine/challenge';
import { buildQuestions } from '../engine/questions';
import { ALGORITHMS, ALGORITHM_LIST, type AlgorithmId } from '../engine/registry';
import { useModeStore, type AppMode } from '../store/useModeStore';
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
  const mode = useModeStore((state) => state.mode);
  const setMode = useModeStore((state) => state.setMode);
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
  const array = usePlaybackStore((state) => state.array);
  const swapIndices = usePlaybackStore((state) => state.swapIndices);
  const play = usePlaybackStore((state) => state.play);
  const pause = usePlaybackStore((state) => state.pause);
  const next = usePlaybackStore((state) => state.next);
  const prev = usePlaybackStore((state) => state.prev);
  const reset = usePlaybackStore((state) => state.reset);
  const seek = usePlaybackStore((state) => state.seek);
  const setSpeed = usePlaybackStore((state) => state.setSpeed);
  const metadata = ALGORITHMS[algoId];
  const comparisonCount = counters.comparisons.reduce((sum, count) => sum + count, 0) / 2;
  const [challengeA, setChallengeA] = useState(0);
  const [challengeB, setChallengeB] = useState(1);
  const [challengeStatus, setChallengeStatus] = useState('');
  const [predictIndex, setPredictIndex] = useState(0);
  const [predictResult, setPredictResult] = useState('');
  const questionMap = useMemo(() => buildQuestions(steps, array), [steps, array]);
  const predictEntries = Array.from(questionMap.entries());
  const predictQuestion = predictEntries[predictIndex] ?? null;

  const modeTabs: AppMode[] = ['watch', 'challenge', 'predict'];

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

      <div className="mode-tabs" aria-label="Mode switcher">
        {modeTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={mode === tab ? 'selected' : ''}
            onClick={() => setMode(tab)}
          >
            {tab === 'watch' ? 'Watch' : tab === 'challenge' ? 'Challenge' : 'Predict'}
          </button>
        ))}
      </div>

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

      {mode === 'challenge' && (
        <div className="mode-panel challenge-panel">
          <div className="mini-grid">
            <label>
              A
              <input type="number" min={0} max={Math.max(0, size - 1)} value={challengeA} onChange={(event) => setChallengeA(Number(event.target.value))} />
            </label>
            <label>
              B
              <input type="number" min={0} max={Math.max(0, size - 1)} value={challengeB} onChange={(event) => setChallengeB(Number(event.target.value))} />
            </label>
          </div>
          <div className="mode-actions">
            <button onClick={() => {
              const current = array;
              const label = evaluateSwap(current, challengeA, challengeB);
              setChallengeStatus(label === 'good' ? 'Good move' : label === 'neutral' ? 'Neutral move' : 'Bad move');
              swapIndices(challengeA, challengeB);
            }}>Apply swap</button>
            <button onClick={() => {
              const hint = nextHint(algoId, array);
              if (!hint) {
                setChallengeStatus('Sorted already');
                return;
              }
              setChallengeA(hint.i);
              setChallengeB(hint.j);
              setChallengeStatus(`Hint: swap ${hint.i} and ${hint.j}`);
            }}>Hint</button>
            <button onClick={() => {
              const restored = [...array].sort((a, b) => a - b);
              usePlaybackStore.getState().setArray(restored);
              setChallengeStatus('Reset to sorted state');
            }}>Reset</button>
          </div>
          <strong className="mode-status">{challengeStatus || 'Choose a swap to improve the array.'}</strong>
        </div>
      )}

      {mode === 'predict' && (
        <div className="mode-panel predict-panel">
          {predictQuestion ? (
            <>
              <strong>{predictQuestion[1].prompt}</strong>
              <div className="mode-actions">
                {predictQuestion[1].options.map((option, index) => (
                  <button key={option} onClick={() => {
                    const correct = predictQuestion[1].correctIndex === index;
                    setPredictResult(correct ? 'Correct — ' + predictQuestion[1].explanation : 'Wrong — ' + predictQuestion[1].explanation);
                    setPredictIndex((previous) => Math.min(previous + 1, Math.max(0, predictEntries.length - 1)));
                  }}>{option}</button>
                ))}
              </div>
              <small>{predictResult || 'Choose the best answer.'}</small>
            </>
          ) : <strong>No decision questions available for this run.</strong>}
        </div>
      )}

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
      <p className="gesture-hints">
        {mode === 'watch' && 'Fist = play / pause | Swipe = step | Pinch-drag = rotate | Two hands = zoom'}
        {mode === 'challenge' && 'Pinch a bar to grab, drop on another bar to swap'}
        {mode === 'predict' && 'Answer Yes/No or Left/Right with pinch targets at the bottom'}
      </p>
      <p className="shortcut-hints">Space play/pause <span>Left/Right step</span> <span>Up/Down speed</span> <span>R reset</span></p>
    </aside>
  );
}