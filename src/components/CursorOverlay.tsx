import { useEffect, useRef } from 'react';
import { pointerController } from '../input/pointer';

export function CursorOverlay() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const tick = (): void => {
      const cursor = cursorRef.current;
      if (cursor) {
        const pointer = pointerController.get();
        cursor.style.left = `${pointer.x}px`;
        cursor.style.top = `${pointer.y}px`;
        cursor.className = [
          'gesture-cursor',
          pointer.down ? 'down' : '',
          pointer.source === 'hand' ? 'hand' : '',
          pointer.hoverTargetId ? 'hover' : '',
          pointer.grab.kind === 'object' ? 'object' : '',
        ].filter(Boolean).join(' ');
      }
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
      document.querySelectorAll('.gesture-hover').forEach((element) => element.classList.remove('gesture-hover'));
    };
  }, []);

  return <div ref={cursorRef} className="gesture-cursor" aria-hidden="true" />;
}
