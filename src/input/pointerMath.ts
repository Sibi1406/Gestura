export type PointerPosition = { x: number; y: number };
export type PointerGrab = { kind: 'ui' | 'object' | 'rotate' | null; targetId?: string };
export type HandDominant = 'auto' | 'left' | 'right';

export function clampPointer(point: PointerPosition, width: number, height: number): PointerPosition {
  return { x: Math.min(Math.max(point.x, 0), width), y: Math.min(Math.max(point.y, 0), height) };
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
  const xRange = viewport.width * region;
  const yRange = viewport.height * region;
  return clampPointer({
    x: Math.round((viewport.width - xRange) / 2 + displayX * xRange),
    y: Math.round((viewport.height - yRange) / 2 + yNorm * yRange),
  }, viewport.width, viewport.height);
}

export function magnetSnap(point: PointerPosition, targets: PointerPosition[], radius: number): PointerPosition {
  let best = point;
  let nearest = Number.POSITIVE_INFINITY;
  for (const target of targets) {
    const distance = Math.hypot(target.x - point.x, target.y - point.y);
    if (distance <= radius && distance < nearest) {
      nearest = distance;
      best = target;
    }
  }
  return best;
}

export function resolveGrab(uiTargetId: string | null, objectId: string | null): PointerGrab {
  if (uiTargetId) return { kind: 'ui', targetId: uiTargetId };
  if (objectId) return { kind: 'object', targetId: objectId };
  return { kind: 'rotate' };
}

export function mapSliderValue(clientX: number, bounds: Pick<DOMRect, 'left' | 'width'>, min: number, max: number, step: number): number {
  const fraction = Math.min(1, Math.max(0, (clientX - bounds.left) / Math.max(1, bounds.width)));
  const rawValue = min + fraction * (max - min);
  return Math.min(max, Math.max(min, min + Math.round((rawValue - min) / step) * step));
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(Math.max(value, min), max);
}
