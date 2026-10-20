import { OneEuroFilter, Vec2EuroFilter } from './oneEuroFilter';
import { isFist, isOpenPalm, isPinchPose, palmCenter, pinchRatio } from './gestureMath';
import {
  IDLE_GESTURE,
  PINCH_DEBOUNCE_MS,
  type Calibration,
  type GestureEvent,
  type GestureKind,
  type GestureState,
  type Landmark,
} from './types';

function clampHands(n: number): 0 | 1 | 2 {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  return 2;
}

/**
 * Pure (React-free) tracker: landmarks in → GestureState out.
 * Uses hysteresis + debounce on pinch, and One Euro on motion outputs.
 */
export class GestureEngine {
  private pinching = false;
  private pinchSince: number | null = null;
  private readonly posFilter = new Vec2EuroFilter();
  private readonly zoomFilter = new OneEuroFilter();
  private lastPos: { x: number; y: number } | null = null;
  private lastZoom: number | null = null;
  private fistActive = false;
  private lastFistEvent = Number.NEGATIVE_INFINITY;
  private lastSwipeEvent = Number.NEGATIVE_INFINITY;
  private swipeSamples: Array<{ x: number; time: number }> = [];

  reset(): void {
    this.pinching = false;
    this.pinchSince = null;
    this.posFilter.reset();
    this.zoomFilter.reset();
    this.lastPos = null;
    this.lastZoom = null;
    this.fistActive = false;
    this.swipeSamples = [];
  }

  update(hands: Landmark[][], nowMs: number, cal: Calibration): GestureState {
    this.posFilter.setParams(cal.minCutoff, cal.beta);
    this.zoomFilter.setParams(cal.minCutoff, cal.beta);

    const live = hands.filter((h) => h.length >= 21);
    const count = clampHands(live.length);
    if (count === 0) {
      this.reset();
      return { ...IDLE_GESTURE };
    }

    const t = nowMs / 1000;
    const primary = live[0];
    this.updatePinch(primary, nowMs, cal);

    const fist = live.some((hand) => isFist(hand) && !isPinchPose(hand, cal));
    const fistRising = fist && !this.fistActive;
    this.fistActive = fist;
    const events: GestureEvent[] = [];
    if (fistRising && nowMs - this.lastFistEvent >= cal.fistCooldownMs) {
      events.push('toggle');
      this.lastFistEvent = nowMs;
    }

    const pinchPose = this.pinching || live.some((hand) => isPinchPose(hand, cal));
    const openHand = live.find(isOpenPalm);
    if (pinchPose) {
      this.swipeSamples = [];
    } else if (openHand) {
      const swipe = this.updateSwipe(openHand, nowMs, cal);
      if (swipe) events.push(swipe);
    } else {
      this.swipeSamples = [];
    }

    const kind = this.classify(live, fist);

    const rotateDelta =
      this.pinching && count === 1 && !fist
        ? this.rotationFromPinch(primary, t)
        : this.clearRotation();

    const zoomDelta =
      count === 2 && !fist
        ? this.zoomFromIndexPair(live[0], live[1], t)
        : this.clearZoom();

    return { kind, hands: count, rotateDelta, zoomDelta, events };
  }

  private classify(live: Landmark[][], fist: boolean): GestureKind {
    if (this.pinching) return 'pinch';
    if (fist) return 'fist';
    if (live.some(isOpenPalm)) return 'open';
    return 'none';
  }

  private updateSwipe(
    lm: Landmark[],
    nowMs: number,
    cal: Calibration,
  ): GestureEvent | null {
    const palm = palmCenter(lm);
    this.swipeSamples.push({ x: 1 - palm.x, time: nowMs });
    const oldestAllowed = nowMs - 150;
    this.swipeSamples = this.swipeSamples.filter((sample) => sample.time >= oldestAllowed);
    const first = this.swipeSamples[0];
    const last = this.swipeSamples[this.swipeSamples.length - 1];
    if (!first || !last || last.time - first.time < 100) return null;

    const velocity = (last.x - first.x) / ((last.time - first.time) / 1000);
    if (
      Math.abs(velocity) < cal.swipeVelocity ||
      nowMs - this.lastSwipeEvent < cal.swipeCooldownMs
    ) return null;

    this.lastSwipeEvent = nowMs;
    this.swipeSamples = [];
    return velocity > 0 ? 'next' : 'prev';
  }

  /**
   * Two thresholds so noise around a single value cannot flicker pinch on/off.
   * Debounce (~80 ms) ignores brief accidental thumb–index brushes.
   */
  private updatePinch(lm: Landmark[], nowMs: number, cal: Calibration): void {
    const ratio = pinchRatio(lm);
    if (!this.pinching) {
      if (ratio < cal.pinchOn) {
        if (this.pinchSince === null) this.pinchSince = nowMs;
        else if (nowMs - this.pinchSince >= PINCH_DEBOUNCE_MS) {
          this.pinching = true;
        }
      } else {
        this.pinchSince = null;
      }
      return;
    }
    if (ratio > cal.pinchOff) {
      this.pinching = false;
      this.pinchSince = null;
      this.clearRotation();
    }
  }

  /**
   * Selfie camera + CSS-mirrored preview: flip X so moving the hand to the
   * user's right increases x and rotates the cube to the right.
   */
  private rotationFromPinch(
    lm: Landmark[],
    t: number,
  ): { x: number; y: number } {
    const mirrored = { x: 1 - lm[0].x, y: lm[0].y };
    const filtered = this.posFilter.filter(mirrored.x, mirrored.y, t);
    if (!this.lastPos) {
      this.lastPos = filtered;
      return { x: 0, y: 0 };
    }
    const dx = filtered.x - this.lastPos.x;
    const dy = filtered.y - this.lastPos.y;
    this.lastPos = filtered;
    return { x: dx, y: dy };
  }

  private zoomFromIndexPair(a: Landmark[], b: Landmark[], t: number): number {
    const gap = Math.hypot(a[8].x - b[8].x, a[8].y - b[8].y);
    const filtered = this.zoomFilter.filter(gap, t);
    if (this.lastZoom === null) {
      this.lastZoom = filtered;
      return 0;
    }
    const delta = filtered - this.lastZoom;
    this.lastZoom = filtered;
    return delta;
  }

  private clearRotation(): { x: number; y: number } {
    this.posFilter.reset();
    this.lastPos = null;
    return { x: 0, y: 0 };
  }

  private clearZoom(): number {
    this.zoomFilter.reset();
    this.lastZoom = null;
    return 0;
  }
}
