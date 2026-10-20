import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BoxGeometry, Color, MeshStandardMaterial, type Group } from 'three';
import type { Bar as BarData, BarStatus } from '../engine/types';

const GEOMETRY = new BoxGeometry(1, 1, 1);
const COLORS: Record<BarStatus, Color> = {
  idle: new Color('#4388d5'),
  comparing: new Color('#f4d35e'),
  swapping: new Color('#f0655b'),
  pivot: new Color('#ae78ec'),
  inRange: new Color('#70b7e8'),
  sorted: new Color('#53cb91'),
};
const BASELINE = -1.35;

type Props = {
  bar: BarData;
  index: number;
  count: number;
  width: number;
  minValue: number;
  maxValue: number;
  finished: boolean;
};

export function Bar({ bar, index, count, width, minValue, maxValue, finished }: Props) {
  const group = useRef<Group>(null);
  const color = useRef(new Color(COLORS.idle));
  const arc = useRef(0);
  const finishElapsed = useRef(0);
  const wasFinished = useRef(false);
  const material = useMemo(() => new MeshStandardMaterial({ roughness: 0.32, metalness: 0.12 }), []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    const object = group.current;
    if (!object) return;
    if (finished && !wasFinished.current) finishElapsed.current = 0;
    finishElapsed.current = finished ? finishElapsed.current + delta : 0;
    wasFinished.current = finished;

    const gap = 0.055;
    const targetX = (index - (count - 1) / 2) * (width + gap);
    const valueRange = maxValue - minValue || 1;
    const proportionalHeight = 0.3 + ((bar.value - minValue) / valueRange) * 2.35;
    const step = Math.min(1, delta * 11);
    arc.current = bar.status === 'swapping'
      ? Math.min(1, arc.current + delta / 0.28)
      : Math.max(0, arc.current - delta / 0.24);

    object.position.x += (targetX - object.position.x) * step;
    object.position.y += (BASELINE + proportionalHeight / 2 - object.position.y) * step;
    object.position.z += (Math.sin(arc.current * Math.PI) * 0.55 - object.position.z) * step;

    const swept = finishElapsed.current > ((index + 1) / count) * 0.55;
    const status = finished && !swept ? 'idle' : bar.status;
    color.current.lerp(COLORS[status], Math.min(1, delta * 9));
    material.color.copy(color.current);
  });

  const proportionalHeight = 0.3 + ((bar.value - minValue) / (maxValue - minValue || 1)) * 2.35;
  const showValue = count <= 20;
  return (
    <group ref={group}>
      <mesh geometry={GEOMETRY} material={material} dispose={null} castShadow receiveShadow scale={[width, proportionalHeight, 0.62]} />
      {showValue && (
        <Text
          position={[0, proportionalHeight / 2 + 0.16, 0]}
          fontSize={0.16}
          color="#eff4f5"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.008}
          outlineColor="#101a22"
        >
          {bar.value}
        </Text>
      )}
    </group>
  );
}