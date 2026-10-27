import type { Step } from './types';
import { applyStep, createInitialBars } from './reducer';

export type Question = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  barIndices: [number, number];
};

export function buildQuestions(steps: Step[], initial: number[]): Map<number, Question> {
  const result = new Map<number, Question>();
  let state = createInitialBars(initial);

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (step.type === 'compare') {
      const left = state[step.i]?.value ?? 0;
      const right = state[step.j]?.value ?? 0;
      if (step.line === 8) {
        const correctIndex = left <= right ? 0 : 1;
        result.set(index, {
          prompt: `Which value comes first: ${left} or ${right}?`,
          options: ['Left', 'Right'],
          correctIndex,
          explanation: `The ${correctIndex === 0 ? 'left' : 'right'} value (${correctIndex === 0 ? left : right}) comes first.`,
          barIndices: [step.i, step.j],
        });
      } else {
        const quickSortDecision = step.line === 7;
        const correctIndex = quickSortDecision ? (left <= right ? 0 : 1) : (left > right ? 0 : 1);
        result.set(index, {
          prompt: quickSortDecision
            ? `Is ${left} less than or equal to pivot ${right}?`
            : `Will ${left} and ${right} be swapped?`,
          options: ['Yes', 'No'],
          correctIndex,
          explanation: quickSortDecision
            ? `${left} ${left <= right ? 'is' : 'is not'} less than or equal to pivot ${right}.`
            : correctIndex === 0
              ? `${left} is greater than ${right}, so they swap.`
              : `${left} is not greater than ${right}, so they stay in place.`,
          barIndices: [step.i, step.j],
        });
      }
    }
    state = applyStep(state, step);
  }

  return result;
}
