import { describe, expect, it } from 'vitest';
import { Vec2EuroFilter } from '../gestures/oneEuroFilter';
import { clampPointer, mapHandToScreen, magnetSnap, mapSliderValue, PointerController, resolveGrab } from './pointer';

describe('pointer input', () => {
  it('maps and clamps hand input within the active region', () => {
    expect(mapHandToScreen({ x: 0.5, y: 0.5 }, { width: 1280, height: 720 }, 0.7, 'left')).toEqual({ x: 640, y: 360 });
    expect(mapHandToScreen({ x: 0, y: 0 }, { width: 1280, height: 720 }, 0.7, 'left')).toEqual({ x: 192, y: 108 });
    expect(mapHandToScreen({ x: 1, y: 1 }, { width: 1280, height: 720 }, 0.7, 'left')).toEqual({ x: 1088, y: 612 });
  });

  it('magnet snap picks nearest target within the radius', () => {
    expect(magnetSnap({ x: 100, y: 100 }, [{ x: 50, y: 50 }, { x: 200, y: 200 }], 200)).toEqual({ x: 50, y: 50 });
    expect(magnetSnap({ x: 100, y: 100 }, [{ x: 150, y: 150 }], 20)).toEqual({ x: 100, y: 100 });
  });

  it('locks a press on a UI target away from scene rotation and rotates only on empty space', () => {
    expect(resolveGrab('play-pause', null)).toEqual({ kind: 'ui', targetId: 'play-pause' });
    expect(resolveGrab(null, null)).toEqual({ kind: 'rotate' });
    const pointer = new PointerController();
    pointer.setHand({ x: 320, y: 240, down: true });
    expect(pointer.get().grab.kind).toBe('rotate');
    pointer.setHand({ x: 500, y: 260, down: true });
    expect(pointer.get().grab.kind).toBe('rotate');
    pointer.setHand({ x: 500, y: 260, down: false });
    expect(pointer.get().grab.kind).toBeNull();
  });

  it('filters cursor jitter on a noisy stationary path', () => {
    const filter = new Vec2EuroFilter(0.5, 0);
    const noisy = Array.from({ length: 40 }, (_, index) => index % 2 === 0 ? 0.48 : 0.52);
    const filtered = noisy.map((value, index) => filter.filter(value, 0.5, index / 60).x);
    const rawVariance = variance(noisy);
    const filteredVariance = variance(filtered);
    expect(filteredVariance).toBeLessThan(rawVariance);
  });

  it('maps slider drags proportionally across the input track', () => {
    const bounds = { left: 100, width: 200 };
    expect(mapSliderValue(100, bounds, 5, 50, 1)).toBe(5);
    expect(mapSliderValue(200, bounds, 5, 50, 1)).toBe(28);
    expect(mapSliderValue(300, bounds, 5, 50, 1)).toBe(50);
  });

  it('locks pinch-start interaction to the target and tracks pointer down/up flow', () => {
    const pointer = new PointerController();
    pointer.setMouse({ x: 100, y: 120, down: false });
    pointer.setMouse({ x: 100, y: 120, down: true });
    expect(pointer.get().down).toBe(true);
    expect(pointer.get().justPressed).toBe(true);
    pointer.setMouse({ x: 100, y: 120, down: true });
    expect(pointer.get().justPressed).toBe(false);
    pointer.setMouse({ x: 100, y: 120, down: false });
    expect(pointer.get().justReleased).toBe(true);
    expect(pointer.get().down).toBe(false);
  });

  it('tracks hand pinch as a single press and releases when pinch ends', () => {
    const pointer = new PointerController();
    pointer.setHand({ x: 320, y: 240, down: true });
    expect(pointer.get()).toMatchObject({ source: 'hand', down: true, justPressed: true });
    pointer.setHand({ x: 330, y: 245, down: true });
    expect(pointer.get().justPressed).toBe(false);
    pointer.setHand({ x: 330, y: 245, down: false });
    expect(pointer.get()).toMatchObject({ source: 'hand', down: false, justReleased: true });
  });

  it('clamps pointer coordinates to the screen', () => {
    expect(clampPointer({ x: -20, y: 100 }, 1280, 720)).toEqual({ x: 0, y: 100 });
    expect(clampPointer({ x: 2000, y: -10 }, 1280, 720)).toEqual({ x: 1280, y: 0 });
  });
});

function variance(values: number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
}
