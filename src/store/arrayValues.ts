import type { ArrayPreset } from './usePlaybackStore';

export function valuesFor(size: number, preset: ArrayPreset): number[] {
  const values = Array.from({ length: size }, (_, index) => index * 2 + 10);
  if (preset === 'random') return values.map(() => Math.floor(Math.random() * 90) + 10);
  if (preset === 'reversed') return values.reverse();
  if (preset === 'nearly-sorted') {
    const middle = Math.floor(size / 2);
    if (size > 2) [values[middle - 1], values[middle]] = [values[middle], values[middle - 1]];
    return values;
  }
  return values.map((_, index) => [18, 52, 86][index % 3]);
}
