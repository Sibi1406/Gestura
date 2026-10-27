import { buildQuestions, type Question } from './questions';
import type { Step } from './types';

export type PredictSession = {
  questions: Map<number, Question>;
  questionIndices: number[];
  completedIndices: number[];
  activeIndex: number | null;
  answered: boolean;
  answerAt: number;
  answerPressSequence: number;
  correct: number;
  total: number;
  streak: number;
  bestStreak: number;
  missedIndices: number[];
  feedback: string | null;
  scoreVisible: boolean;
};

export function createPredictSession(
  steps: Step[],
  array: number[],
  sampleSize: number,
  onlyIndices?: number[],
): PredictSession {
  const questions = buildQuestions(steps, array);
  const available = onlyIndices
    ? onlyIndices.filter((index) => questions.has(index))
    : [...questions.keys()];
  const limit = Math.max(1, Math.min(15, Math.round(sampleSize)));
  const questionIndices = available.length <= limit
    ? available
    : Array.from({ length: limit }, (_, index) => available[Math.floor(index * available.length / limit)]);
  return {
    questions,
    questionIndices,
    completedIndices: [],
    activeIndex: null,
    answered: false,
    answerAt: 0,
    answerPressSequence: 0,
    correct: 0,
    total: 0,
    streak: 0,
    bestStreak: 0,
    missedIndices: [],
    feedback: null,
    scoreVisible: false,
  };
}

export function predictSessionReducer(
  state: PredictSession | null,
  action:
    | { type: 'start'; steps: Step[]; array: number[]; sampleSize: number; onlyIndices?: number[] }
    | { type: 'pause'; stepIndex: number }
    | { type: 'answer'; choice: number; now: number; pressSequence: number }
    | { type: 'continue' }
    | { type: 'finish' },
): PredictSession | null {
  if (action.type === 'start') {
    return createPredictSession(action.steps, action.array, action.sampleSize, action.onlyIndices);
  }
  if (!state) return state;
  if (action.type === 'pause') {
    if (!state.questionIndices.includes(action.stepIndex) || state.completedIndices.includes(action.stepIndex)) return state;
    return { ...state, activeIndex: action.stepIndex, answered: false, feedback: null };
  }
  if (action.type === 'answer') return answerQuestion(state, action.choice, action.now, action.pressSequence);
  if (action.type === 'continue') {
    if (state.activeIndex === null || !state.answered) return state;
    return {
      ...state,
      completedIndices: [...state.completedIndices, state.activeIndex],
      activeIndex: null,
      answered: false,
      feedback: null,
    };
  }
  return state.completedIndices.length >= state.questionIndices.length
    ? { ...state, scoreVisible: true }
    : state;
}

function answerQuestion(state: PredictSession, choice: number, now: number, pressSequence: number): PredictSession {
  const question = state.activeIndex === null ? undefined : state.questions.get(state.activeIndex);
  if (!question || state.answered) return state;
  const isCorrect = choice === question.correctIndex;
  const streak = isCorrect ? state.streak + 1 : 0;
  return {
    ...state,
    answered: true,
    answerAt: now,
    answerPressSequence: pressSequence,
    correct: state.correct + Number(isCorrect),
    total: state.total + 1,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    missedIndices: isCorrect ? state.missedIndices : [...state.missedIndices, state.activeIndex!],
    feedback: `${isCorrect ? 'Correct.' : 'Not quite.'} ${question.explanation}`,
  };
}

export function predictAccuracy(session: Pick<PredictSession, 'correct' | 'total'>): number {
  return session.total === 0 ? 0 : Math.round((session.correct / session.total) * 100);
}
