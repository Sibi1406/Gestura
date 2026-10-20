import { Grid, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { Group } from 'three';
import { Bar } from './Bar';
import { useGestureStore } from '../store/useGestureStore';
import { usePlaybackStore } from '../store/usePlaybackStore';

const ROTATE_GAIN = 4.2;
const ZOOM_GAIN = 2.8;

function SortingStage() {
  const group = useRef<Group>(null);
  const target = useRef({ x: 0.15, y: 0.25, scale: 1 });
  const { camera, size } = useThree();
  const bars = usePlaybackStore((state) => state.barState);
  const finished = usePlaybackStore((state) => state.status === 'finished');
  const count = bars.length;
  const minValue = Math.min(...bars.map((bar) => bar.value), 0);
  const maxValue = Math.max(...bars.map((bar) => bar.value), 1);
  const width = Math.max(0.1, Math.min(0.62, 8.8 / count - 0.055));
  const viewWidth = 2 * camera.position.length() * Math.tan((37 * Math.PI) / 360) * (size.width / size.height);
  const contentWidth = count * (width + 0.055) - 0.055;
  const fitScale = Math.min(1, (viewWidth * 0.84) / contentWidth);

  useFrame((_, delta) => {
    const store = usePlaybackStore.getState();
    store.tick(delta);
    const { gesture, controlMode } = useGestureStore.getState();
    if (controlMode === 'gesture') {
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
        />
      ))}
    </group>
  );
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
        <OrbitControls enabled={mouseMode} enableDamping dampingFactor={0.08} enablePan={false} />
      </Canvas>
    </div>
  );
}