/**
 * One Euro Filter (Casiez et al., CHI 2012).
 *
 * Low-pass filter whose cutoff rises with derivative speed:
 *   fc = minCutoff + beta * |dx/dt|
 * Slow motion is heavily smoothed; fast motion keeps more of the raw signal
 * so the cursor does not lag behind a flick.
 *
 * Time `t` is in seconds. `minCutoff` is Hz; `beta` is unitless.
 */
function smoothingAlpha(dt: number, cutoff: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

function lowpass(sample: number, previous: number, alpha: number): number {
  return alpha * sample + (1 - alpha) * previous;
}

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrev: number | null = null;

  constructor(minCutoff = 1, beta = 0.007, dCutoff = 1) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  setParams(minCutoff: number, beta: number): void {
    this.minCutoff = minCutoff;
    this.beta = beta;
  }

  reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }

  filter(x: number, t: number): number {
    if (this.tPrev === null || this.xPrev === null) {
      this.tPrev = t;
      this.xPrev = x;
      return x;
    }

    const dt = Math.max(t - this.tPrev, 1e-6);
    this.tPrev = t;

    const dx = (x - this.xPrev) / dt;
    const dxHat = lowpass(dx, this.dxPrev, smoothingAlpha(dt, this.dCutoff));
    this.dxPrev = dxHat;

    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const xHat = lowpass(x, this.xPrev, smoothingAlpha(dt, cutoff));
    this.xPrev = xHat;
    return xHat;
  }
}

export class Vec2EuroFilter {
  private readonly fx: OneEuroFilter;
  private readonly fy: OneEuroFilter;

  constructor(minCutoff = 1, beta = 0.007) {
    this.fx = new OneEuroFilter(minCutoff, beta);
    this.fy = new OneEuroFilter(minCutoff, beta);
  }

  setParams(minCutoff: number, beta: number): void {
    this.fx.setParams(minCutoff, beta);
    this.fy.setParams(minCutoff, beta);
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
  }

  filter(x: number, y: number, t: number): { x: number; y: number } {
    return { x: this.fx.filter(x, t), y: this.fy.filter(y, t) };
  }
}
