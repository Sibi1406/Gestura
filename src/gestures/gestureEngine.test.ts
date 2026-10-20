import { describe, expect, it } from 'vitest';
import { GestureEngine } from './gestureEngine';
import { DEFAULT_CALIBRATION, type Landmark } from './types';

function hand(kind: 'open' | 'fist' | 'pinch', offset = 0): Landmark[] {
  const landmarks = Array.from({ length: 21 }, () => ({ x: 0.5 + offset, y: 0.5, z: 0 }));
  landmarks[0] = { x: 0.5 + offset, y: 0.8, z: 0 };
  landmarks[5] = { x: 0.38 + offset, y: 0.5, z: 0 };
  landmarks[9] = { x: 0.46 + offset, y: 0.5, z: 0 };
  landmarks[13] = { x: 0.56 + offset, y: 0.5, z: 0 };
  landmarks[17] = { x: 0.66 + offset, y: 0.5, z: 0 };
  if (kind === 'open') {
    landmarks[8] = { x: 0.42 + offset, y: 0.12, z: 0 };
    landmarks[12] = { x: 0.53 + offset, y: 0.1, z: 0 };
    landmarks[16] = { x: 0.64 + offset, y: 0.13, z: 0 };
    landmarks[20] = { x: 0.75 + offset, y: 0.21, z: 0 };
    landmarks[4] = { x: 0.25 + offset, y: 0.46, z: 0 };
  } else if (kind === 'pinch') {
    landmarks[4] = { x: 0.56 + offset, y: 0.3, z: 0 };
    landmarks[8] = { x: 0.55 + offset, y: 0.3, z: 0 };
  } else {
    landmarks[4] = { x: 0.51 + offset, y: 0.54, z: 0 };
    for (const index of [8, 12, 16, 20]) {
      landmarks[index] = { x: 0.51 + offset, y: 0.54, z: 0 };
    }
  }
  return landmarks;
}

describe('gesture playback events', () => {
  it('maps a fast right-to-left open-palm swipe to prev', () => {
    const engine = new GestureEngine();
    expect(engine.update([hand('open', 0)], 0, DEFAULT_CALIBRATION).events).toEqual([]);
    expect(engine.update([hand('open', 0.15)], 75, DEFAULT_CALIBRATION).events).toEqual([]);
    expect(engine.update([hand('open', 0.3)], 150, DEFAULT_CALIBRATION).events).toEqual(['prev']);
  });

  it('ignores slow drift and blocks a second swipe during cooldown', () => {
    const engine = new GestureEngine();
    engine.update([hand('open', 0)], 0, DEFAULT_CALIBRATION);
    engine.update([hand('open', 0.04)], 75, DEFAULT_CALIBRATION);
    expect(engine.update([hand('open', 0.08)], 150, DEFAULT_CALIBRATION).events).toEqual([]);
    const cooldownEngine = new GestureEngine();
    cooldownEngine.update([hand('open', 0.35)], 200, DEFAULT_CALIBRATION);
    cooldownEngine.update([hand('open', 0.2)], 275, DEFAULT_CALIBRATION);
    expect(cooldownEngine.update([hand('open', 0.05)], 350, DEFAULT_CALIBRATION).events).toEqual(['next']);
    cooldownEngine.update([hand('open', 0.05)], 400, DEFAULT_CALIBRATION);
    cooldownEngine.update([hand('open', 0.2)], 475, DEFAULT_CALIBRATION);
    expect(cooldownEngine.update([hand('open', 0.35)], 550, DEFAULT_CALIBRATION).events).toEqual([]);
  });

  it('emits fist toggle only on rising edges and respects cooldown', () => {
    const engine = new GestureEngine();
    expect(engine.update([hand('fist')], 0, DEFAULT_CALIBRATION).events).toEqual(['toggle']);
    expect(engine.update([hand('fist')], 80, DEFAULT_CALIBRATION).events).toEqual([]);
    engine.update([hand('open')], 100, DEFAULT_CALIBRATION);
    expect(engine.update([hand('fist')], 200, DEFAULT_CALIBRATION).events).toEqual([]);
    engine.update([hand('open')], 650, DEFAULT_CALIBRATION);
    expect(engine.update([hand('fist')], 700, DEFAULT_CALIBRATION).events).toEqual(['toggle']);
  });

  it('does not let a pinch pose trigger fist toggle', () => {
    const engine = new GestureEngine();
    expect(engine.update([hand('pinch')], 0, DEFAULT_CALIBRATION).events).toEqual([]);
    expect(engine.update([hand('pinch')], 80, DEFAULT_CALIBRATION).events).toEqual([]);
    expect(engine.update([hand('pinch')], 100, DEFAULT_CALIBRATION).kind).toBe('pinch');
  });

  it('ignores open-palm swipes while either hand is pinching', () => {
    const engine = new GestureEngine();
    const pinch = hand('pinch', 0.7);
    engine.update([hand('open', 0), pinch], 0, DEFAULT_CALIBRATION);
    engine.update([hand('open', 0.15), pinch], 75, DEFAULT_CALIBRATION);
    expect(engine.update([hand('open', 0.3), pinch], 150, DEFAULT_CALIBRATION).events).toEqual([]);
  });
});