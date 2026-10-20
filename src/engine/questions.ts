import type { Step } from './types';

export type Question = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export function buildQuestions(steps: Step[], initial: number[]): Map<number, Question> {
  const result = new Map<number, Question>();

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (step.type !== 'compare') continue;

    const next = steps[index + 1];
    if (!next) continue;

    const left = initial[step.i] ?? 0;
    const right = initial[step.j] ?? 0;

    if (next.type === 'swap') {
      result.set(index, {
        prompt: `Will ${left} and ${right} be swapped?`,
        options: ['Yes', 'No'],
        correctIndex: 0,
        explanation: `The next action swaps ${left} and ${right}.`,
      });
      continue;
    }

    if (next.type === 'overwrite') {
      const correctIndex = left <= right ? 0 : 1;
      result.set(index, {
        prompt: 'Which value is written next?',
        options: ['Left', 'Right'],
        correctIndex,
        explanation: `The overwrite picks ${correctIndex === 0 ? 'the left value' : 'the right value'} next.`,
      });
    }
  }

  return result;
}
