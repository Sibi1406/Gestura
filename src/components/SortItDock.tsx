import { efficiencyPercent, findChallengeHint } from '../engine/challengeSession';
import { useChallengeStore } from '../store/useChallengeStore';
import { useModeStore } from '../store/useModeStore';
import { usePlaybackStore } from '../store/usePlaybackStore';
import './SortItDock.css';

function elapsedLabel(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function SortItDock() {
  const session = useChallengeStore((state) => state.session);
  const setRule = useChallengeStore((state) => state.setRule);
  const setHint = useChallengeStore((state) => state.setHint);
  const undo = (): void => {
    useChallengeStore.getState().undo();
    const updated = useChallengeStore.getState().session;
    if (updated) usePlaybackStore.getState().setArray(updated.array);
  };
  const mode = useModeStore((state) => state.mode);
  if (!session) return null;

  const newArray = (): void => {
    const playback = usePlaybackStore.getState();
    playback.generateArray(playback.preset);
    useChallengeStore.getState().start(playback.array, playback.algoId);
  };
  const hint = (): void => {
    setHint(findChallengeHint(session.algorithmId, session.array, session.rule));
  };
  const tryAgain = (): void => {
    usePlaybackStore.getState().setArray(session.startingArray);
    useChallengeStore.getState().start(session.startingArray, session.algorithmId);
  };
  const watchAlgorithm = (): void => {
    const playback = usePlaybackStore.getState();
    playback.pause();
    playback.setAlgorithm(session.algorithmId);
    playback.setArray(session.startingArray);
    useModeStore.getState().setMode('watch');
    usePlaybackStore.getState().play();
  };
  const efficiency = efficiencyPercent(session);
  const elapsed = session.solvedAt ?? Date.now();

  return (
    <>
      <div className="sort-it-dock">
        <div className="rule-toggle" aria-label="Swap rules">
          <button data-gesture="rule-any" className={session.rule === 'any' ? 'active' : ''} aria-pressed={session.rule === 'any'} onClick={() => setRule('any')}>Any swap</button>
          <button data-gesture="rule-adjacent" className={session.rule === 'adjacent' ? 'active' : ''} aria-pressed={session.rule === 'adjacent'} onClick={() => setRule('adjacent')}>Adjacent only</button>
        </div>
        <div className="challenge-stats" aria-live="polite">
          <span>{session.moves} moves</span>
          <span className="good-count">{session.good} good</span>
          <span className="neutral-count">{session.neutral} neutral</span>
          <span className="bad-count">{session.bad} bad</span>
        </div>
        <div className="challenge-actions">
          <button data-gesture="challenge-hint" onClick={hint}>Hint</button>
          <button data-gesture="challenge-undo" disabled={session.history.length === 0} onClick={undo}>Undo</button>
          <button data-gesture="challenge-new-array" onClick={newArray}>New array</button>
        </div>
      </div>
      {session.solved && session.resultVisible && mode === 'challenge' && (
        <section className="result-backdrop" aria-label="Solved result">
          <div className="result-card" role="dialog" aria-modal="true" aria-labelledby="result-title">
            <p className="result-kicker">SORT COMPLETE</p>
            <h2 id="result-title">You did it!</h2>
            <dl>
              <div><dt>Your moves</dt><dd>{session.moves}</dd></div>
              <div><dt>Minimum possible</dt><dd>{session.optimalMoves}</dd></div>
              <div><dt>{session.algorithmId.replace('Sort', ' sort')} moves</dt><dd>{session.algorithmMoves}</dd></div>
              <div><dt>Efficiency</dt><dd>{efficiency}%</dd></div>
              <div><dt>Time</dt><dd>{elapsedLabel(elapsed - session.startedAt)}</dd></div>
            </dl>
            <div className="result-actions">
              <button data-gesture="challenge-try-again" onClick={tryAgain}>Try again</button>
              <button className="primary" data-gesture="challenge-watch-algorithm" onClick={watchAlgorithm}>Watch the algorithm do it</button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
