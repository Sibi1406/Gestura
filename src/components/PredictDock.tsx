import { predictAccuracy } from '../engine/predictSession';
import { pointerController } from '../input/pointer';
import { useGestureStore } from '../store/useGestureStore';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { usePredictStore } from '../store/usePredictStore';
import './PredictDock.css';

function continueRun(): void {
  usePredictStore.getState().continue();
  usePlaybackStore.getState().play();
}

function retryMissed(): void {
  const current = usePlaybackStore.getState();
  const predict = usePredictStore.getState();
  const missed = predict.session?.missedIndices ?? [];
  current.reset();
  const sampleSize = missed.length || useGestureStore.getState().predictSampleSize;
  predict.start(current.steps, current.array, sampleSize, missed.length ? missed : undefined);
  usePlaybackStore.getState().play();
}

export function PredictDock() {
  const session = usePredictStore((state) => state.session);
  if (!session) return null;
  const question = session.activeIndex === null ? undefined : session.questions.get(session.activeIndex);

  if (session.scoreVisible) {
    const questionsMissed = session.missedIndices.map((index) => {
      const missed = session.questions.get(index);
      return missed ? `${missed.prompt} Answer: ${missed.options[missed.correctIndex]}.` : '';
    }).filter(Boolean);
    return (
      <section className="predict-result" aria-label="Prediction score">
        <p className="result-kicker">PREDICTION COMPLETE</p>
        <h2>Your score</h2>
        <div className="predict-score-values">
          <strong>{predictAccuracy(session)}% <span>accuracy</span></strong>
          <strong>{session.bestStreak} <span>best streak</span></strong>
        </div>
        <ul>{questionsMissed.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
        <button data-gesture="predict-retry-missed" onClick={retryMissed}>
          {session.missedIndices.length ? 'Retry missed' : 'Run again'}
        </button>
      </section>
    );
  }

  const choose = (index: number): void => {
    if (session.answered) {
      continueRun();
      return;
    }
    usePredictStore.getState().answer(index, pointerController.get().pressSequence);
  };
  const choices = question?.options ?? ['YES', 'NO'];

  return (
    <div className="predict-dock" aria-label="Prediction answer controls">
      {question && <p>{question.prompt}</p>}
      <div>
        {choices.map((choice, index) => (
          <button
            key={choice}
            className={index === 0 ? 'primary' : ''}
            data-gesture={`predict-answer-${index}`}
            onClick={() => choose(index)}
          >
            {session.answered ? 'Continue' : choice.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
