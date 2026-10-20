import { useEffect, useState } from 'react';
import { pointerController } from '../input/pointer';

export function CursorOverlay() {
  const [pointer, setPointer] = useState(pointerController.get());

  useEffect(() => {
    let frame = 0;
    const tick = (): void => {
      const next = pointerController.get();
      setPointer((previous) =>
        previous.x === next.x && previous.y === next.y &&
        previous.down === next.down && previous.source === next.source
          ? previous
          : next,
      );
      frame = requestAnimationFrame(tick);
    };
    const onMove = (event: PointerEvent): void => {
      pointerController.setMouse({ x: event.clientX, y: event.clientY }, event.buttons > 0);
    };
    const onDown = (event: PointerEvent): void => {
      pointerController.setMouse({ x: event.clientX, y: event.clientY }, true);
    };
    const onUp = (event: PointerEvent): void => {
      pointerController.setMouse({ x: event.clientX, y: event.clientY }, false);
    };

    frame = requestAnimationFrame(tick);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointerleave', onUp);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointerleave', onUp);
    };
  }, []);

  return (
    <div
      className={`gesture-cursor ${pointer.down ? 'down' : ''} ${pointer.source === 'hand' ? 'hand' : ''}`}
      style={{ left: `${pointer.x}px`, top: `${pointer.y}px` }}
      aria-hidden="true"
    />
  );
}
