import { useState } from 'react';
import { CursorOverlay } from './components/CursorOverlay';
import { SettingsDrawer } from './components/SettingsDrawer';
import { SortingScene } from './components/SortingScene';
import { useModeStore } from './store/useModeStore';
import { ALGORITHM_LIST, type AlgorithmId } from './engine/registry';
import { usePlaybackStore } from './store/usePlaybackStore';
import { usePlaybackShortcuts } from './hooks/usePlaybackShortcuts';
import { useChallengeStore } from './store/useChallengeStore';
import { SortItDock } from './components/SortItDock';
import { PredictDock } from './components/PredictDock';
import { usePredictStore } from './store/usePredictStore';
import { MODE_LABELS, TopBar } from './components/TopBar';
import './app-shell.css';

function LearnDock() {
  const status = usePlaybackStore((state) => state.status);
  const prev = usePlaybackStore((state) => state.prev);
  const next = usePlaybackStore((state) => state.next);
  const play = usePlaybackStore((state) => state.play);
  const pause = usePlaybackStore((state) => state.pause);
  const algoId = usePlaybackStore((state) => state.algoId);
  const setAlgorithm = usePlaybackStore((state) => state.setAlgorithm);
  const resetData = usePlaybackStore((state) => state.resetData);
  const hasEditedData = usePlaybackStore((state) => state.hasEditedData);
  const [algorithmsOpen, setAlgorithmsOpen] = useState(false);
  const current = ALGORITHM_LIST.find((algorithm) => algorithm.id === algoId);

  return (
    <div className="learn-dock">
      <div className="transport-dock" aria-label="Playback">
        <button data-gesture="previous-step" onClick={prev}>Prev</button>
        <button
          className="primary"
          data-gesture="play-pause"
          onClick={() => status === 'playing' ? pause() : play()}
        >
          {status === 'playing' ? 'Pause' : 'Play'}
        </button>
        <button data-gesture="next-step" onClick={next}>Next</button>
        <button data-gesture="new-array" onClick={() => usePlaybackStore.getState().generateArray(usePlaybackStore.getState().preset)}>
          New array
        </button>
        <button data-gesture="reset-data" disabled={!hasEditedData} onClick={resetData}>Reset data</button>
      </div>
      <div className="algorithm-picker">
        <button
          className="algorithm-chip"
          data-gesture="algorithm-list"
          aria-expanded={algorithmsOpen}
          onClick={() => setAlgorithmsOpen((open) => !open)}
        >
          {current?.name ?? 'Choose algorithm'} <span aria-hidden="true">▾</span>
        </button>
        {algorithmsOpen && (
          <div className="algorithm-menu">
            {ALGORITHM_LIST.map((algorithm) => (
              <button
                key={algorithm.id}
                data-gesture={`algorithm-${algorithm.id}`}
                onClick={() => {
                  setAlgorithm(algorithm.id as AlgorithmId);
                  setAlgorithmsOpen(false);
                }}
              >
                {algorithm.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ModeDock() {
  const mode = useModeStore((state) => state.mode);
  if (mode === 'watch') return <LearnDock />;
  if (mode === 'challenge') return <SortItDock />;
  return <PredictDock />;
}

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mode = useModeStore((state) => state.mode);
  const challengeFeedback = useChallengeStore((state) => state.session?.feedback.text);
  const narration = usePlaybackStore((state) => state.editFeedback ?? state.narration);
  const predictFeedback = usePredictStore((state) => state.session?.feedback);
  const predictPrompt = usePredictStore((state) => {
    const session = state.session;
    if (!session || session.activeIndex === null || session.answered) return null;
    return session.questions.get(session.activeIndex)?.prompt ?? null;
  });
  usePlaybackShortcuts();

  return (
    <main className="app-shell">
      <SortingScene />
      <TopBar onSettings={() => setSettingsOpen(true)} />
      <aside className="coach-card" aria-live="polite">
        {mode === 'challenge'
          ? challengeFeedback ?? 'Pinch a bar, then drop it on another bar.'
          : mode === 'predict'
            ? predictFeedback ?? predictPrompt ?? narration
            : narration}
      </aside>
      <ModeDock />
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <span className="sr-only">{MODE_LABELS[mode]}</span>
      <CursorOverlay />
    </main>
  );
}
