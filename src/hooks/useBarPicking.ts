import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Raycaster, Vector2, Vector3 } from 'three';
import type { RefObject } from 'react';
import { pointerController, type PointerPosition } from '../input/pointer';

let hoveredBarId: string | null = null;

export function getHoveredBarId(): string | null {
  return hoveredBarId;
}

export function useBarPicking(): RefObject<string | null> {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new Raycaster(), []);
  const ndc = useMemo(() => new Vector2(), []);
  const screenPoint = useMemo(() => new Vector3(), []);
  const worldPoint = useMemo(() => new Vector3(), []);
  const hovered = useRef<string | null>(null);

  const hitTest = useCallback((point: PointerPosition, includeGrabbed = false): string | null => {
    ndc.set((point.x / window.innerWidth) * 2 - 1, -(point.y / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const intersections = raycaster.intersectObjects(scene.children, true);
    for (const intersection of intersections) {
      let object = intersection.object;
      while (object) {
        const id = object.userData.barId;
        if (typeof id === 'string') {
          const grab = pointerController.get().grab;
          if (!includeGrabbed && pointerController.get().down && grab.kind === 'object' && grab.targetId === id) break;
          return id;
        }
        if (!object.parent) break;
        object = object.parent;
      }
    }
    let nearest: string | null = null;
    let nearestDistance = 48;
    scene.traverse((object) => {
      const id = object.userData.barId;
      if (typeof id !== 'string') return;
      const pointer = pointerController.get();
      if (!includeGrabbed && pointer.down && pointer.grab.kind === 'object' && pointer.grab.targetId === id) return;
      object.getWorldPosition(worldPoint);
      screenPoint.copy(worldPoint).project(camera);
      const x = (screenPoint.x + 1) * window.innerWidth / 2;
      const y = (1 - screenPoint.y) * window.innerHeight / 2;
      const distance = Math.hypot(x - point.x, y - point.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = id;
      }
    });
    if (nearest) return nearest;
    return null;
  }, [camera, ndc, raycaster, scene, screenPoint, worldPoint]);

  useEffect(() => {
    pointerController.setObjectHitTest(hitTest);
    return () => pointerController.setObjectHitTest(() => null);
  }, [hitTest]);

  useFrame(() => {
    const pointer = pointerController.get();
    const id = hitTest(pointer);
    hovered.current = id;
    hoveredBarId = id;
  });
  return hovered;
}
