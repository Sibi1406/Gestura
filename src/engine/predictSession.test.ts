import { describe, expect, it } from 'vitest';
import { buildSteps } from './player';
import { createPredictSession, predictAccuracy, predictSessionReducer } from './predictSession';

describe('predict question flow', () => {
  const array = [3, 1, 2];
  const steps = buildSteps('bubbleSort', array);

  it('pauses at a decision, scores an answer, and completes after continuing', () => {
    let session = createPredictSession(steps, array, 1);
    const index = session.questionIndices[0];
    session = predictSessionReducer(session, { type: 'pause', stepIndex: index })!;
    expect(session.activeIndex).toBe(index);
    const correctChoice = session.questions.get(index)!.correctIndex;
    session = predictSessionReducer(session, {
      type: 'answer', choice: correctChoice, now: 1000, pressSequence: 4,
    })!;
    expect(session.answered).toBe(true);
    expect(session.correct).toBe(1);
    expect(session.bestStreak).toBe(1);
    session = predictSessionReducer(session, { type: 'continue' })!;
    expect(session.completedIndices).toContain(index);
    expect(session.activeIndex).toBeNull();
    expect(predictAccuracy(session)).toBe(100);
    session = predictSessionReducer(session, { type: 'finish' })!;
    expect(session.scoreVisible).toBe(true);
  });

  it('records missed questions and caps a run at fifteen questions', () => {
    const longArray = Array.from({ length: 10 }, (_, index) => 10 - index);
    const longSteps = buildSteps('bubbleSort', longArray);
    let session = createPredictSession(longSteps, longArray, 100);
    expect(session.questionIndices).toHaveLength(15);
    const index = session.questionIndices[0];
    session = predictSessionReducer(session, { type: 'pause', stepIndex: index })!;
    session = predictSessionReducer(session, {
      type: 'answer',
      choice: 1 - session.questions.get(index)!.correctIndex,
      now: 500,
      pressSequence: 2,
    })!;
    expect(session.missedIndices).toEqual([index]);
    expect(session.correct).toBe(0);
    expect(session.streak).toBe(0);
  });
});
