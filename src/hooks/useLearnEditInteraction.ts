import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { Group } from 'three';
import { pointerController } from '../input/pointer';
import { useModeStore } from '../store/useModeStore';
import { usePlaybackStore } from '../store/usePlaybackStore';

export type LearnEditDrag = {
  barId: string;
  index: number;
  x: number;
  y: number;
  z: number;
  startY: number;
  startValue: number;
  previewValue: number;
  offsetX: number;
  offsetY: number;
};

let activeDrag: LearnEditDrag | null = null;
export const getLearnEditDrag = (): LearnEditDrag | null => activeDrag;

export function useLearnEditInteraction(group: React.RefObject<Group | null>): void {
  const { camera } = useThree();
  const raycaster = useRef(new Raycaster());
  const ndc = useRef(new Vector2());
  const plane = useRef(new Plane(new Vector3(0, 0, 1), 0));
  const world = useRef(new Vector3());
  const pressSequence = useRef(0);
  const releaseSequence = useRef(0);

  useFrame(() => {
    const pointer = pointerController.get();
    const playback = usePlaybackStore.getState();
    const eligible = useModeStore.getState().mode === 'watch' &&
      playback.status !== 'playing' && playback.stepIndex === 0;
    if (!eligible) {
      activeDrag = null;
      return;
    }
    const newPress = pointer.pressSequence !== pressSequence.current;
    const newRelease = pointer.releaseSequence !== releaseSequence.current;
    if (newPress) pressSequence.current = pointer.pressSequence;
    if (newRelease) releaseSequence.current = pointer.releaseSequence;
    if (newPress && pointer.grab.kind === 'object' && pointer.grab.targetId) {
      const index = playback.barIds.indexOf(pointer.grab.targetId);
      const bar = group.current?.children.find((child) => child.userData.barId === pointer.grab.targetId);
      if (index >= 0 && bar) {
        const point = pointerToLocal(pointer.x, pointer.y, camera, group.current, raycaster.current, ndc.current, plane.current, world.current);
        group.current?.updateMatrixWorld(true);
        const barPosition = bar.position;
        activeDrag = {
          barId: pointer.grab.targetId, index, x: barPosition.x, y: barPosition.y, z: 0.78,
          startY: pointer.y, startValue: playback.array[index], previewValue: playback.array[index],
          offsetX: point.x - barPosition.x, offsetY: point.y - barPosition.y,
        };
      }
    }
    if (!activeDrag) return;
    if (pointer.down) {
      const point = pointerToLocal(pointer.x, pointer.y, camera, group.current, raycaster.current, ndc.current, plane.current, world.current);
      activeDrag = {
        ...activeDrag,
        x: point.x - activeDrag.offsetX,
        y: point.y - activeDrag.offsetY,
        previewValue: Math.max(1, Math.min(100, Math.round(activeDrag.startValue + (activeDrag.startY - pointer.y) * 0.25))),
      };
    }
    if (newRelease) {
      const drag = activeDrag;
      activeDrag = null;
      if (pointer.releasedGrab.kind === 'object' && pointer.releasedGrab.targetId === drag.barId) {
        usePlaybackStore.getState().editValue(drag.index, drag.previewValue);
      }
    }
  });
}

function pointerToLocal(
  x: number, y: number, camera: import('three').Camera, group: Group | null,
  raycaster: Raycaster, ndc: Vector2, plane: Plane, world: Vector3,
): Vector3 {
  ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  raycaster.ray.intersectPlane(plane, world);
  if (group) group.worldToLocal(world);
  return world;
}
