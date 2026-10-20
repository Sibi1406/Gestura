export type PointerSource = 'mouse' | 'hand';

export type PointerPosition = {
  x: number;
  y: number;
};

export type Pointer = PointerPosition & {
  down: boolean;
  justPressed: boolean;
  justReleased: boolean;
  source: PointerSource;
};

export type HandDominant = 'auto' | 'left' | 'right';

export function clampPointer(
  point: PointerPosition,
  width: number,
  height: number,
): PointerPosition {
  return {
    x: Math.min(Math.max(point.x, 0), width),
    y: Math.min(Math.max(point.y, 0), height),
  };
}

export function mapHandToScreen(
  hand: PointerPosition,
  viewport: { width: number; height: number },
  activeRegion = 0.7,
  dominant: HandDominant = 'auto',
): PointerPosition {
  const region = Math.min(Math.max(activeRegion, 0.1), 1);
  const xNorm = clamp(hand.x, 0, 1);
  const yNorm = clamp(hand.y, 0, 1);
  const displayX = dominant === 'right' ? 1 - xNorm : xNorm;
  const displayY = yNorm;
  const xRange = viewport.width * region;
  const yRange = viewport.height * region;
  const xOffset = (viewport.width - xRange) / 2;
  const yOffset = (viewport.height - yRange) / 2;
  return clampPointer(
    {
      x: Math.round(xOffset + displayX * xRange),
      y: Math.round(yOffset + displayY * yRange),
    },
    viewport.width,
    viewport.height,
  );
}

export function magnetSnap(
  pointer: PointerPosition,
  targets: PointerPosition[],
  radius: number,
): PointerPosition {
  let best = pointer;
  let nearest = Number.POSITIVE_INFINITY;
  for (const target of targets) {
    const dx = target.x - pointer.x;
    const dy = target.y - pointer.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= radius && distance < nearest) {
      nearest = distance;
      best = target;
    }
  }
  return best;
}

export class PointerController {
  private state: Pointer = {
    x: 0,
    y: 0,
    down: false,
    justPressed: false,
    justReleased: false,
    source: 'mouse',
  };

  get(): Pointer {
    return { ...this.state };
  }

  setMouse(position: PointerPosition | { x: number; y: number; down: boolean }, down?: boolean): void {
    const next = normalizePointerInput(position, down);
    this.set(next.position, next.down, 'mouse');
  }

  setHand(position: PointerPosition | { x: number; y: number; down: boolean }, down?: boolean): void {
    const next = normalizePointerInput(position, down);
    this.set(next.position, next.down, 'hand');
  }

  private set(position: PointerPosition, down: boolean, source: PointerSource): void {
    const previous = this.state;
    const next: Pointer = {
      x: position.x,
      y: position.y,
      down,
      source,
      justPressed: !previous.down && down,
      justReleased: previous.down && !down,
    };
    this.state = next;
  }
}

export const pointerController = new PointerController();

function normalizePointerInput(
  position: PointerPosition | { x: number; y: number; down: boolean },
  down?: boolean,
): { position: PointerPosition; down: boolean } {
  if (typeof down === 'boolean') {
    return { position: { x: position.x, y: position.y }, down };
  }
  const candidate = position as { x: number; y: number; down?: boolean };
  return { position: { x: candidate.x, y: candidate.y }, down: Boolean(candidate.down) };
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(Math.max(value, min), max);
}
