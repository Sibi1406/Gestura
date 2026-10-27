import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { Camera } from 'three';
import type { RefObject } from 'react';
import type { Group } from 'three';
import { useModeStore } from '../store/useModeStore';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { useChallengeStore } from '../store/useChallengeStore';
import { pointerController } from '../input/pointer';

const DRAG_HEIGHT = 0.72;

export function useSortItInteraction(group: RefObject<Group | null>): void {
  const { camera } = useThree();
  const solved = useChallengeStore((state) => state.session?.solved ?? false);
  const raycaster = useRef(new Raycaster());
  const ndc = useRef(new Vector2());
  const plane = useRef(new Plane(new Vector3(0, 0, 1), 0));
  const world = useRef(new Vector3());
  const pressSequence = useRef(0);
  const releaseSequence = useRef(0);

  useEffect(() => {
    if (!solved) return;
    const timer = window.setTimeout(() => useChallengeStore.getState().showResult(), 850);
    return () => window.clearTimeout(timer);
  }, [solved]);

  useFrame(() => {
    const session = useChallengeStore.getState().session;
    if (useModeStore.getState().mode !== 'challenge' || !session) return;
    const pointer = pointerController.get();
    const drag = useChallengeStore.getState().drag;
    const newPress = pointer.pressSequence !== pressSequence.current;
    const newRelease = pointer.releaseSequence !== releaseSequence.current;
    if (newPress) pressSequence.current = pointer.pressSequence;
    if (newRelease) releaseSequence.current = pointer.releaseSequence;
    const grab = newPress ? pointer.grab : pointer.releasedGrab;
    if (!drag && !session.solved && newPress && grab.kind === 'object' && grab.targetId) {
      const startIndex = session.barIds.indexOf(grab.targetId);
      if (startIndex >= 0) {
        const point = pointerToLocal(pointer.x, pointer.y, camera, group.current, raycaster.current, ndc.current, plane.current, world.current);
        useChallengeStore.getState().beginDrag(grab.targetId, startIndex, { ...point, z: DRAG_HEIGHT });
      }
    }

    const activeDrag = useChallengeStore.getState().drag;
    if (!activeDrag) return;
    if (pointer.down) {
      const point = pointerToLocal(pointer.x, pointer.y, camera, group.current, raycaster.current, ndc.current, plane.current, world.current);
      const dropIndex = pointer.hoveredObjectId
        ? session.barIds.indexOf(pointer.hoveredObjectId)
        : null;
      const targetIndex = dropIndex !== null && dropIndex >= 0 && dropIndex !== activeDrag.startIndex
        ? dropIndex
        : null;
      useChallengeStore.getState().updateDrag({ ...point, z: DRAG_HEIGHT }, targetIndex);
    }
    if (newRelease || !pointer.down) {
      if (newRelease && grab.kind === 'object' && grab.targetId === activeDrag.barId) {
        const dropId = pointer.hoveredObjectId;
        const dropIndex = dropId ? session.barIds.indexOf(dropId) : -1;
        if (dropIndex >= 0 && dropIndex !== activeDrag.startIndex) {
          const beforeMoves = session.moves;
          useChallengeStore.getState().move(activeDrag.startIndex, dropIndex);
          const after = useChallengeStore.getState().session;
          if (after && after.moves !== beforeMoves) usePlaybackStore.getState().setArray(after.array);
        }
      }
      useChallengeStore.getState().clearDrag();
    }
  });
}

function pointerToLocal(
  x: number,
  y: number,
  camera: Camera,
  group: Group | null,
  raycaster: Raycaster,
  ndc: Vector2,
  plane: Plane,
  world: Vector3,
): { x: number; y: number } {
  ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  raycaster.ray.intersectPlane(plane, world);
  group?.worldToLocal(world);
  return { x: world.x, y: world.y };
}
