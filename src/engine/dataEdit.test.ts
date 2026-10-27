import { describe, expect, it } from 'vitest';
import { rebuildEditedData } from './dataEdit';
import { buildSteps } from './player';

describe('editing Learn data', () => {
  it('rebuilds the selected algorithm steps without mutating the source array', () => {
    const original = [2, 1, 3, 4];
    const steps = buildSteps('bubbleSort', original);
    const rebuilt = rebuildEditedData('bubbleSort', original, steps, 0, 1);
    expect(original).toEqual([2, 1, 3, 4]);
    expect(rebuilt.array).toEqual([1, 1, 3, 4]);
    expect(rebuilt.steps).not.toEqual(steps);
    expect(rebuilt.steps.filter((step) => step.type === 'compare').length)
      .not.toBe(steps.filter((step) => step.type === 'compare').length);
    expect(rebuilt.editFeedback).toMatch(/comparisons/);
  });

  it('clamps edited values to the supported data range', () => {
    const original = [4, 3, 2, 1];
    const rebuilt = rebuildEditedData('insertionSort', original, buildSteps('insertionSort', original), 1, 1000);
    expect(rebuilt.array[1]).toBe(100);
  });
});
