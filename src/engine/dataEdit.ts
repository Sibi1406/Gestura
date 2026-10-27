import { buildSteps, createInitialBars } from './player';
import type { AlgorithmId } from './registry';
import type { Step } from './types';

export function rebuildEditedData(
  algorithmId: AlgorithmId,
  values: number[],
  previousSteps: Step[],
  index: number,
  value: number,
) {
  if (!Number.isInteger(index) || index < 0 || index >= values.length) {
    throw new RangeError(`Cannot edit array index ${index}.`);
  }
  const array = [...values];
  array[index] = Math.max(1, Math.min(100, Math.round(value)));
  const steps = buildSteps(algorithmId, array);
  const before = previousSteps.filter((step) => step.type === 'compare').length;
  const after = steps.filter((step) => step.type === 'compare').length;
  const difference = after - before;
  return {
    array,
    steps,
    initialBars: createInitialBars(array),
    editFeedback: difference === 0
      ? 'Data updated; the comparison count is unchanged.'
      : `${difference > 0 ? '+' : ''}${difference} comparisons.`,
  };
}
