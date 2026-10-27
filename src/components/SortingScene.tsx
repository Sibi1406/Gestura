import { Grid, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Group } from 'three';
import { Bar } from './Bar';
import { useGestureStore } from '../store/useGestureStore';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { useBarPicking } from '../hooks/useBarPicking';
import { useSortItInteraction } from '../hooks/useSortItInteraction';
import { pointerController } from '../input/pointer';
import { useModeStore } from '../store/useModeStore';
import { useChallengeStore } from '../store/useChallengeStore';
import { usePredictStore } from '../store/usePredictStore';
import { useLearnEditInteraction } from '../hooks/useLearnEditInteraction';
import { BoxGeometry, MeshBasicMaterial } from 'three';

const GHOST_GEOMETRY = new BoxGeometry(1, 1, 1);
const GHOST_MATERIAL = new MeshBasicMaterial({ color: '#91efb3', transparent: true, opacity: 0.28 });

const ROTATE_GAIN = 4.2;
const ZOOM_GAIN = 2.8;

function SortingStage() {
  const group = useRef<Group>(null);
  const ghostSlot = useRef<Group>(null);
  const target = useRef({ x: 0.15, y: 0.25, scale: 1 });
  const { camera, size } = useThree();
  useBarPicking();
  useSortItInteraction(group);
  useLearnEditInteraction(group);
  const playbackBars = usePlaybackStore((state) => state.barState);
  const playbackFinished = usePlaybackStore((state) => state.status === 'finished');
  const sortItMode = useModeStore((state) => state.mode === 'challenge');
  const challenge = useChallengeStore((state) => state.session);
  const bars = sortItMode && challenge
    ? challenge.array.map((value, index) => ({
        id: challenge.barIds[index] ?? `bar-${index}`,
        value,
        status: challenge.solved ? 'sorted' as const : 'idle' as const,
      }))
    : playbackBars;
  const finished = sortItMode ? Boolean(challenge?.solved) : playbackFinished;
  const count = bars.length;
  const minValue = Math.min(...bars.map((bar) => bar.value), 0);
  const maxValue = Math.max(...bars.map((bar) => bar.value), 1);
  const width = Math.max(0.1, Math.min(0.62, 8.8 / count - 0.055));
  const viewWidth = 2 * camera.position.length() * Math.tan((37 * Math.PI) / 360) * (size.width / size.height);
  const contentWidth = count * (width + 0.055) - 0.055;
  const fitScale = Math.min(1, (viewWidth * 0.84) / contentWidth);

  useFrame((_, delta) => {
    const store = usePlaybackStore.getState();
    const mode = useModeStore.getState().mode;
    if (mode === 'predict') {
      const prediction = usePredictStore.getState();
      const session = prediction.session;
      const pointer = pointerController.get();
      if (session?.answered) {
        if (pointer.pressSequence > session.answerPressSequence || Date.now() - session.answerAt >= 1500) {
          prediction.continue();
          store.play();
        }
      } else if (store.status === 'playing') {
        const nextQuestion = session?.questionIndices.find((index) => !session.completedIndices.includes(index));
        if (nextQuestion === store.stepIndex) {
          store.pause();
          prediction.pauseAt(nextQuestion);
        } else {
          store.tick(delta, nextQuestion);
          const stopped = usePlaybackStore.getState();
          if (nextQuestion !== undefined && stopped.status === 'paused' && stopped.stepIndex === nextQuestion) {
            prediction.pauseAt(nextQuestion);
          }
        }
      }
      const afterTick = usePlaybackStore.getState();
      const current = usePredictStore.getState().session;
      if (afterTick.status === 'finished' && current && !current.scoreVisible) prediction.finish();
    } else if (!sortItMode) {
      store.tick(delta);
    }
    const { gesture, controlMode } = useGestureStore.getState();
    if (!sortItMode && controlMode === 'gesture' && pointerController.get().grab.kind === 'rotate') {
      target.current.y += gesture.rotateDelta.x * ROTATE_GAIN;
      target.current.x += gesture.rotateDelta.y * ROTATE_GAIN;
      target.current.x = Math.max(-1.05, Math.min(1.05, target.current.x));
      target.current.scale = Math.max(0.55, Math.min(2.2, target.current.scale + gesture.zoomDelta * ZOOM_GAIN));
    }
    const activeGroup = group.current;
    if (!activeGroup) return;
    const damping = 1 - Math.pow(0.86, delta * 60);
    activeGroup.rotation.x += (target.current.x - activeGroup.rotation.x) * damping;
    activeGroup.rotation.y += (target.current.y - activeGroup.rotation.y) * damping;
    const desiredScale = target.current.scale * fitScale;
    const scale = activeGroup.scale.x + (desiredScale - activeGroup.scale.x) * damping;
    activeGroup.scale.setScalar(scale);
    if (ghostSlot.current) {
      const activeDrag = useChallengeStore.getState().drag;
      ghostSlot.current.visible = sortItMode && Boolean(activeDrag);
      if (activeDrag) {
        const index = activeDrag.dropIndex ?? activeDrag.startIndex;
        ghostSlot.current.position.x = (index - (count - 1) / 2) * (width + 0.055);
      }
    }
  });

  return (
    <group ref={group}>
      {bars.map((bar, index) => (
        <Bar
          key={bar.id}
          bar={bar}
          index={index}
          count={count}
          width={width}
          minValue={minValue}
          maxValue={maxValue}
          finished={finished}
          challengeMode={sortItMode}
        />
      ))}
      <group ref={ghostSlot} visible={false} position={[0, -1.31, 0]}>
        <mesh geometry={GHOST_GEOMETRY} material={GHOST_MATERIAL} scale={[width + 0.055, 0.06, 0.7]} />
      </group>
    </group>
  );
}

function SceneOrbitControls({ mouseMode }: { mouseMode: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { gl } = useThree();
  useEffect(() => {
    const onPointerDown = (event: PointerEvent): void => {
      pointerController.setMouse({ x: event.clientX, y: event.clientY }, true);
      const grab = pointerController.get().grab.kind;
      if (controls.current) controls.current.enabled = mouseMode && grab !== 'ui' && grab !== 'object';
    };
    const onPointerUp = (event: PointerEvent): void => {
      pointerController.setMouse({ x: event.clientX, y: event.clientY }, false);
    };
    gl.domElement.addEventListener('pointerdown', onPointerDown, true);
    gl.domElement.addEventListener('pointerup', onPointerUp, true);
    return () => {
      gl.domElement.removeEventListener('pointerdown', onPointerDown, true);
      gl.domElement.removeEventListener('pointerup', onPointerUp, true);
    };
  }, [gl, mouseMode]);
  useFrame(() => {
    const grab = pointerController.get().grab.kind;
    if (controls.current) controls.current.enabled = mouseMode && grab !== 'ui' && grab !== 'object';
  });
  return <OrbitControls ref={controls} enabled={mouseMode} enableDamping dampingFactor={0.08} enablePan={false} />;
}

export function SortingScene() {
  const mouseMode = useGestureStore((state) => state.controlMode === 'mouse');

  useEffect(() => {
    const pauseWhenHidden = (): void => {
      if (document.hidden) usePlaybackStore.getState().pause();
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);

  return (
    <div className="scene">
      <Canvas camera={{ position: [0, 2.9, 11.5], fov: 37 }} dpr={[1, 1.5]} shadows>
        <color attach="background" args={['#0b1117']} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 8, 5]} intensity={2.2} castShadow />
        <pointLight position={[-5, 3, 1]} intensity={0.7} color="#59a9d6" />
        <SortingStage />
        <Grid
          position={[0, -1.36, 0]}
          args={[18, 12]}
          cellSize={0.5}
          cellColor="#1c3545"
          sectionColor="#315365"
          fadeDistance={18}
          fadeStrength={1.5}
        />
        <SceneOrbitControls mouseMode={mouseMode} />
      </Canvas>
    </div>
  );
}