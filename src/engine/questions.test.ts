import { describe, expect, it } from 'vitest';
import { buildQuestions } from './questions';
import { buildSteps } from './player';

describe('question builder', () => {
  it('builds valid questions for each algorithm on representative inputs', () => {
    const inputs = [
      [3, 1, 2],
      [5, 4, 3, 2, 1],
      [1, 2, 3, 4, 5],
      [2, 2, 1, 2],
    ];
    for (const algorithm of ['bubbleSort', 'insertionSort', 'mergeSort', 'quickSort'] as const) {
      for (const input of inputs) {
        const steps = buildSteps(algorithm, input);
        const questions = buildQuestions(steps, input);
        for (const [index, question] of questions.entries()) {
          expect(index).toBeGreaterThanOrEqual(0);
          expect(question.options.length).toBeGreaterThan(1);
          expect(question.correctIndex).toBeGreaterThanOrEqual(0);
          expect(question.correctIndex).toBeLessThan(question.options.length);
          expect(question.explanation.length).toBeGreaterThan(0);
          expect(index).toBeLessThan(steps.length);
        }
      }
    }
  });

  it('never references an out-of-range step index', () => {
    for (const algorithm of ['bubbleSort', 'insertionSort', 'mergeSort', 'quickSort'] as const) {
      for (const input of [[2, 1, 4, 3], [9, 7, 5, 3, 1], [1, 2, 3, 4], [1, 1, 1, 1]]) {
        const steps = buildSteps(algorithm, input);
        const questions = buildQuestions(steps, input);
        for (const [index, question] of questions.entries()) {
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThan(steps.length);
          expect(question.correctIndex).toBeGreaterThanOrEqual(0);
          expect(question.correctIndex).toBeLessThan(question.options.length);
        }
      }
    }
  });
});
