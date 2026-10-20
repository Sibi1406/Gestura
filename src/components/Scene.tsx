import { OrbitControls, Grid, Edges } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Mesh } from 'three';
import { Color, MeshStandardMaterial } from 'three';
import { useGestureStore } from '../store/useGestureStore';

const ROTATE_GAIN = 4.2;
const ZOOM_GAIN = 2.8;
const DAMP = 0.14;
const MIN_SCALE = 0.45;
const MAX_SCALE = 2.8;
const LIVE = new Color('#5b8cff');

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function GestureCube() {
  const mesh = useRef<Mesh>(null);
  const target = useRef({ rx: 0.25, ry: 0.4, scale: 1 });
  const color = useMemo(() => new Color().copy(LIVE), []);

  useFrame((_, dt) => {
    const { gesture, controlMode } = useGestureStore.getState();
    const cube = mesh.current;
    if (!cube) return;

    if (controlMode === 'gesture') {
      target.current.ry += gesture.rotateDelta.x * ROTATE_GAIN;
      target.current.rx += gesture.rotateDelta.y * ROTATE_GAIN;
      target.current.rx = Math.max(-1.2, Math.min(1.2, target.current.rx));
      const next = target.current.scale + gesture.zoomDelta * ZOOM_GAIN;
      target.current.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
    }

    const k = 1 - Math.pow(1 - DAMP, dt * 60);
    cube.rotation.x = lerp(cube.rotation.x, target.current.rx, k);
    cube.rotation.y = lerp(cube.rotation.y, target.current.ry, k);
    const s = lerp(cube.scale.x, target.current.scale, k);
    cube.scale.setScalar(s);

    color.lerp(LIVE, 0.15);
    const mat = cube.material;
    if (mat instanceof MeshStandardMaterial) {
      mat.color.copy(color);
    }
  });

  return (
    <mesh ref={mesh} castShadow>
      <boxGeometry args={[1.25, 1.25, 1.25]} />
      <meshStandardMaterial color={LIVE} metalness={0.18} roughness={0.38} />
      <Edges color="#d7e6ff" threshold={15} />
    </mesh>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.32} />
      <directionalLight position={[4.5, 6, 3]} intensity={1.15} />
      <pointLight position={[-5, 2, -2]} intensity={0.35} color="#88a0ff" />
    </>
  );
}

export function Scene() {
  const mouseMode = useGestureStore((s) => s.controlMode === 'mouse');

  return (
    <div className="scene">
      <Canvas
        camera={{ position: [0, 1.4, 5.2], fov: 45 }}
        gl={{ antialias: true }}
        style={{ background: '#0e1413' }}
      >
        <Lights />
        <GestureCube />
        <Grid
          position={[0, -1.15, 0]}
          args={[12, 12]}
          cellSize={0.5}
          cellColor="#1c2433"
          sectionColor="#2c3a52"
          fadeDistance={16}
          fadeStrength={1.4}
        />
        <OrbitControls
          enabled={mouseMode}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}
