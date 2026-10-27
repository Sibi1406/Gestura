import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BoxGeometry, Color, EdgesGeometry, LineBasicMaterial, MeshStandardMaterial, type Group, type Mesh, type Object3D } from 'three';
import type { Bar as BarData, BarStatus } from '../engine/types';
import { getHoveredBarId } from '../hooks/useBarPicking';
import { useChallengeStore } from '../store/useChallengeStore';
import { usePredictStore } from '../store/usePredictStore';
import { getLearnEditDrag } from '../hooks/useLearnEditInteraction';

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
  challengeMode: boolean;
};

export function Bar({ bar, index, count, width, minValue, maxValue, finished, challengeMode }: Props) {
  const group = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const label = useRef<Object3D>(null);
  const color = useRef(new Color(COLORS.idle));
  const arc = useRef(0);
  const finishElapsed = useRef(0);
  const wasFinished = useRef(false);
  const material = useMemo(() => new MeshStandardMaterial({ roughness: 0.32, metalness: 0.12 }), []);
  const outlineGeometry = useMemo(() => new EdgesGeometry(GEOMETRY), []);
  const outlineMaterial = useMemo(() => new LineBasicMaterial({ color: '#c8ffdf', transparent: true, opacity: 0.95 }), []);

  useEffect(() => () => {
    material.dispose();
    outlineGeometry.dispose();
    outlineMaterial.dispose();
  }, [material, outlineGeometry, outlineMaterial]);

  useFrame((_, delta) => {
    const object = group.current;
    if (!object) return;
    const challenge = challengeMode ? useChallengeStore.getState().session : null;
    const drag = challengeMode ? useChallengeStore.getState().drag : null;
    const editDrag = getLearnEditDrag();
    const prediction = usePredictStore.getState().session;
    if (finished && !wasFinished.current) finishElapsed.current = 0;
    finishElapsed.current = finished ? finishElapsed.current + delta : 0;
    wasFinished.current = finished;

    const gap = 0.055;
    const targetX = (index - (count - 1) / 2) * (width + gap);
    const valueRange = maxValue - minValue || 1;
    const proportionalHeight = 0.3 + ((bar.value - minValue) / valueRange) * 2.35;
    const previewHeight = editDrag?.barId === bar.id
      ? 0.3 + ((editDrag.previewValue - minValue) / valueRange) * 2.35
      : proportionalHeight;
    const step = Math.min(1, delta * 11);
    const time = Date.now();
    const dragging = drag?.barId === bar.id;
    const editing = editDrag?.barId === bar.id;
    const swapAnimating = Boolean(challenge?.lastSwap?.includes(bar.id) && time - challenge.lastSwapAt < 280);
    arc.current = bar.status === 'swapping' || swapAnimating
      ? Math.min(1, arc.current + delta / 0.28)
      : Math.max(0, arc.current - delta / 0.24);

    if (dragging && drag) {
      object.position.set(drag.position.x, drag.position.y, drag.position.z);
    } else if (editing && editDrag) {
      object.position.set(editDrag.x, editDrag.y, editDrag.z);
    } else {
      object.position.x += (targetX - object.position.x) * step;
      object.position.y += (BASELINE + proportionalHeight / 2 - object.position.y) * step;
      object.position.z += (Math.sin(arc.current * Math.PI) * 0.55 - object.position.z) * step;
    }
    if (mesh.current) mesh.current.scale.y = editing ? previewHeight : proportionalHeight;
    if (label.current) label.current.position.y = previewHeight / 2 + 0.16;

    const swept = finishElapsed.current > ((index + 1) / count) * 0.55;
    const status = finished && !swept ? 'idle' : bar.status;
    color.current.lerp(COLORS[status], Math.min(1, delta * 9));
    if (challenge?.lastSwap?.includes(bar.id) && time - challenge.feedbackAt < 420) {
      const feedbackColor = challenge.feedback.quality === 'good'
        ? COLORS.sorted
        : challenge.feedback.quality === 'neutral' ? COLORS.comparing : COLORS.swapping;
      color.current.lerp(feedbackColor, Math.min(1, delta * 12));
    }
    material.color.copy(color.current);
    const outline = object.children.find((child) => child.type === 'LineSegments');
    const position = challenge?.barIds.indexOf(bar.id) ?? -1;
    const hintVisible = Boolean(
      challenge?.hintPair?.includes(position) && time - challenge.hintAt < 1800 &&
      Math.sin((time - challenge.hintAt) / 80) > -0.15,
    );
    const question = prediction?.activeIndex === null || prediction?.activeIndex === undefined
      ? undefined
      : prediction.questions.get(prediction.activeIndex);
    const questionVisible = Boolean(question?.barIndices.includes(index));
    outlineMaterial.color.set(questionVisible ? '#9be8ff' : '#c8ffdf');
    if (outline) {
      outline.visible = getHoveredBarId() === bar.id || hintVisible || questionVisible;
      outline.scale.y = editing ? previewHeight : proportionalHeight;
    }
  });

  const proportionalHeight = 0.3 + ((bar.value - minValue) / (maxValue - minValue || 1)) * 2.35;
  const showValue = count <= 20;
  return (
    <group ref={group} userData={{ barId: bar.id }}>
      <mesh ref={mesh} geometry={GEOMETRY} material={material} dispose={null} castShadow receiveShadow scale={[width, proportionalHeight, 0.62]} />
      <lineSegments geometry={outlineGeometry} material={outlineMaterial} scale={[width, proportionalHeight, 0.62]} visible={false} />
      {showValue && (
        <Text
          ref={label}
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