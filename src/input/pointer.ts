import { mapSliderValue, resolveGrab } from './pointerMath';
import type { PointerGrab, PointerPosition } from './pointerMath';
export { clampPointer, mapHandToScreen, magnetSnap, mapSliderValue, resolveGrab } from './pointerMath';
export type { HandDominant, PointerGrab, PointerPosition } from './pointerMath';

export type PointerSource = 'mouse' | 'hand';
export type Pointer = PointerPosition & {
  down: boolean;
  justPressed: boolean;
  justReleased: boolean;
  source: PointerSource;
  grab: PointerGrab;
  releasedGrab: PointerGrab;
  pressSequence: number;
  releaseSequence: number;
  hoverTargetId: string | null;
  hoveredObjectId: string | null;
};
type UiTarget = { id: string; element: HTMLElement; center: PointerPosition };
type ObjectHitTest = (point: PointerPosition, includeGrabbed?: boolean) => string | null;

function usableTarget(element: HTMLElement | null): HTMLElement | null {
  if (!element || element.matches(':disabled')) return null;
  return element.closest<HTMLElement>('[data-gesture]');
}

function uiTargetAt(point: PointerPosition): UiTarget | null {
  const direct = usableTarget(document.elementFromPoint(point.x, point.y) as HTMLElement | null);
  if (direct) return targetInfo(direct);
  let nearest: UiTarget | null = null;
  let nearestDistance = 48;
  for (const element of document.querySelectorAll<HTMLElement>('[data-gesture]')) {
    if (element.matches('input[type="range"], :disabled')) continue;
    const bounds = element.getBoundingClientRect();
    const center = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    const distance = Math.hypot(center.x - point.x, center.y - point.y);
    if (distance <= nearestDistance) {
      nearestDistance = distance;
      nearest = { id: element.dataset.gesture ?? '', element, center };
    }
  }
  return nearest;
}

function targetInfo(element: HTMLElement): UiTarget {
  const bounds = element.getBoundingClientRect();
  return {
    id: element.dataset.gesture ?? '',
    element,
    center: { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 },
  };
}

function sliderInput(element: HTMLElement | null): HTMLInputElement | null {
  if (element instanceof HTMLInputElement && element.type === 'range') return element;
  return element?.querySelector<HTMLInputElement>('input[type="range"]') ?? null;
}

function setSlider(input: HTMLInputElement, clientX: number): void {
  const value = mapSliderValue(clientX, input.getBoundingClientRect(), Number(input.min || 0), Number(input.max || 100), Number(input.step || 1));
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, String(value));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export class PointerController {
  private state: Pointer = {
    x: 0, y: 0, down: false, justPressed: false, justReleased: false, source: 'mouse',
    grab: { kind: null }, releasedGrab: { kind: null }, pressSequence: 0, releaseSequence: 0,
    hoverTargetId: null, hoveredObjectId: null,
  };
  private objectHitTest: ObjectHitTest = () => null;
  private pressedTarget: HTMLElement | null = null;
  private hoveredElement: HTMLElement | null = null;
  private dwellClick = false;
  private dwellMs = 900;
  private dwellTargetId: string | null = null;
  private dwellStartedAt = 0;
  private dwellTriggered = false;

  get(): Pointer { return { ...this.state, grab: { ...this.state.grab } }; }

  setObjectHitTest(hitTest: ObjectHitTest): void { this.objectHitTest = hitTest; }
  setDwellSettings(enabled: boolean, dwellMs: number): void {
    this.dwellClick = enabled;
    this.dwellMs = dwellMs;
  }

  setMouse(position: PointerPosition | { x: number; y: number; down: boolean }, down?: boolean): void {
    const next = normalizePointerInput(position, down);
    this.set(next.position, next.down, 'mouse');
  }

  setHand(position: PointerPosition | { x: number; y: number; down: boolean }, down?: boolean): void {
    const next = normalizePointerInput(position, down);
    this.set(next.position, next.down, 'hand');
  }

  private set(rawPosition: PointerPosition, down: boolean, source: PointerSource): void {
    const previous = this.state;
    const target = typeof document === 'undefined' ? null : uiTargetAt(rawPosition);
    const position = source === 'hand' && !down && target ? target.center : rawPosition;
    const justPressed = !previous.down && down;
    const justReleased = previous.down && !down;
    let grab = previous.grab;
    const releasedGrab = justReleased ? { ...grab } : previous.releasedGrab;
    const pressSequence = previous.pressSequence + Number(justPressed);
    const releaseSequence = previous.releaseSequence + Number(justReleased);

    if (justPressed) {
      const objectId = typeof document === 'undefined' ? null : this.objectHitTest(position, false);
      grab = resolveGrab(target?.id || null, objectId);
      this.pressedTarget = target?.element ?? null;
    }

    if (down && source === 'hand' && grab.kind === 'ui') {
      const input = sliderInput(this.pressedTarget);
      if (input) setSlider(input, position.x);
    }
    if (justReleased) {
      if (source === 'hand' && grab.kind === 'ui' && this.pressedTarget && target?.id === grab.targetId) {
        if (!sliderInput(this.pressedTarget)) this.pressedTarget.click();
      }
      grab = { kind: null };
      this.pressedTarget = null;
    }

    const hoverTarget = typeof document === 'undefined' ? null : uiTargetAt(position);
    if (this.hoveredElement !== hoverTarget?.element) {
      this.hoveredElement?.classList.remove('gesture-hover');
      this.hoveredElement = hoverTarget?.element ?? null;
      this.hoveredElement?.classList.add('gesture-hover');
    }
    this.updateDwell(hoverTarget, source, down);
    this.state = {
      ...position,
      down,
      source,
      justPressed,
      justReleased,
      grab,
      releasedGrab,
      pressSequence,
      releaseSequence,
      hoverTargetId: hoverTarget?.id ?? null,
      hoveredObjectId: typeof document === 'undefined' ? null : this.objectHitTest(position, justReleased),
    };
  }

  private updateDwell(target: UiTarget | null, source: PointerSource, down: boolean): void {
    const id = source === 'hand' && !down && this.dwellClick ? target?.id ?? null : null;
    if (id !== this.dwellTargetId) {
      this.dwellTargetId = id;
      this.dwellStartedAt = performance.now();
      this.dwellTriggered = false;
    }
    if (!id || this.dwellTriggered || !target) return;
    if (!target.element.matches('button, a, input[type="checkbox"], select, [role="button"]')) return;
    if (performance.now() - this.dwellStartedAt < this.dwellMs) return;
    target.element.click();
    this.dwellTriggered = true;
  }
}

export const pointerController = new PointerController();

function normalizePointerInput(
  position: PointerPosition | { x: number; y: number; down: boolean },
  down?: boolean,
): { position: PointerPosition; down: boolean } {
  return {
    position: { x: position.x, y: position.y },
    down: typeof down === 'boolean' ? down : Boolean('down' in position && position.down),
  };
}
