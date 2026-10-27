import { describe, expect, it } from 'vitest';
import { buildQuestions } from './questions';
import { buildSteps, stateAt } from './player';

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

  it('uses the values at each evolving comparison to choose the right answer', () => {
    const input = [4, 1, 3, 2];
    for (const algorithm of ['bubbleSort', 'insertionSort', 'mergeSort', 'quickSort'] as const) {
      const steps = buildSteps(algorithm, input);
      const questions = buildQuestions(steps, input);
      for (const [index, question] of questions) {
        const step = steps[index];
        if (step.type !== 'compare') throw new Error('Question must attach to a comparison.');
        const before = stateAt(
          input.map((value, barIndex) => ({ id: `bar-${barIndex}`, value, status: 'idle' as const })),
          steps,
          index,
        );
        const left = before[step.i].value;
        const right = before[step.j].value;
        const expected = step.line === 8
          ? Number(left > right)
          : step.line === 7
            ? Number(left > right)
            : Number(left <= right);
        expect(question.correctIndex).toBe(expected);
        expect(question.barIndices).toEqual([step.i, step.j]);
      }
    }
  });
});
