import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useEffect } from 'react';
import type { RefObject } from 'react';
import { drawHands } from '../components/WebcamPreview';
import { GestureEngine } from '../gestures/gestureEngine';
import type { Landmark } from '../gestures/types';
import { mapHandToScreen, pointerController } from '../input/pointer';
import { useGestureStore } from '../store/useGestureStore';
import { usePlaybackStore } from '../store/usePlaybackStore';

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const engine = new GestureEngine();

function activateHandTarget(x: number, y: number): void {
  const target = document.elementFromPoint(x, y)?.closest<HTMLElement>(
    'button, a, input, select, textarea, [role="button"], [data-gesture-click]',
  );
  if (!target || target.matches(':disabled')) return;

  if (target instanceof HTMLInputElement && target.type === 'range') {
    const bounds = target.getBoundingClientRect();
    const min = Number(target.min || 0);
    const max = Number(target.max || 100);
    const step = Number(target.step || 1);
    const fraction = Math.min(1, Math.max(0, (x - bounds.left) / bounds.width));
    const value = min + fraction * (max - min);
    const stepped = min + Math.round((value - min) / step) * step;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(target, String(Math.min(max, Math.max(min, stepped))));
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  target.click();
}

async function createLandmarker(
  vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  delegate: 'GPU' | 'CPU',
): Promise<HandLandmarker> {
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO',
    numHands: 2,
  });
}

export function useHandTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
): void {
  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let landmarker: HandLandmarker | null = null;
    let raf = 0;
    let lastVideoTime = -1;
    let frames = 0;
    let fpsWindow = performance.now();
    let hudAt = 0;

    const store = useGestureStore;
    store.getState().setStatus('loading');

    const loop = (): void => {
      if (cancelled) return;
      raf = requestAnimationFrame(loop);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !landmarker || video.readyState < 2) return;
      if (video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const now = performance.now();
      const result = landmarker.detectForVideo(video, now);
      const hands: Landmark[][] = result.landmarks.map((hand) =>
        hand.map((p) => ({ x: p.x, y: p.y, z: p.z })),
      );

      const ctx = canvas.getContext('2d');
      if (ctx) drawHands(ctx, hands);

      const { calibration, setGestureTransient } = store.getState();
      const gesture = engine.update(hands, now, calibration);
      setGestureTransient(gesture);

      if (store.getState().controlMode === 'gesture' && hands[0]?.length >= 21) {
          const tip = hands[0][8];
          const position = mapHandToScreen(
            { x: 1 - tip.x, y: tip.y },
            { width: window.innerWidth, height: window.innerHeight },
            0.9,
            'left',
          );
          const previous = pointerController.get();
          const wasPinching = previous.source === 'hand' && previous.down;
          pointerController.setHand(position, gesture.kind === 'pinch');
          if (gesture.kind === 'pinch' && !wasPinching) {
            activateHandTarget(position.x, position.y);
          }
      } else {
        const previous = pointerController.get();
        if (previous.source === 'hand') {
          pointerController.setHand(previous, false);
        }
      }

      const playback = usePlaybackStore.getState();
      for (const event of gesture.events) {
        if (event === 'toggle') playback.toggle();
        else if (event === 'next') playback.next();
        else if (event === 'prev') playback.prev();
      }

      frames += 1;
      if (now - fpsWindow >= 1000) {
        const fps = Math.round((frames * 1000) / (now - fpsWindow));
        frames = 0;
        fpsWindow = now;
        store.getState().setHud({ kind: gesture.kind, hands: gesture.hands, fps });
        hudAt = now;
      } else if (now - hudAt >= 100) {
        const { hud } = store.getState();
        store.getState().setHud({ ...hud, kind: gesture.kind, hands: gesture.hands });
        hudAt = now;
      }
    };

    const start = async (): Promise<void> => {
      if (!navigator.mediaDevices?.getUserMedia) {
        store.getState().setStatus('no_camera');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : '';
        store.getState().setStatus(
          name === 'NotAllowedError' || name === 'PermissionDeniedError'
            ? 'permission_denied'
            : 'no_camera',
        );
        return;
      }
      if (cancelled) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }

      const video = videoRef.current;
      if (!video) {
        for (const track of stream.getTracks()) track.stop();
        store.getState().setStatus('no_camera');
        return;
      }
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        for (const track of stream.getTracks()) track.stop();
        video.srcObject = null;
        if (!cancelled) store.getState().setStatus('no_camera');
        return;
      }
      if (cancelled) return;

      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        if (cancelled) return;
        let created: HandLandmarker;
        try {
          created = await createLandmarker(vision, 'GPU');
        } catch {
          if (cancelled) return;
          created = await createLandmarker(vision, 'CPU');
        }
        if (cancelled) {
          created.close();
          return;
        }
        landmarker = created;
      } catch {
        if (!cancelled) store.getState().setStatus('model_error');
        return;
      }
      if (cancelled) return;
      store.getState().setStatus('tracking');
      raf = requestAnimationFrame(loop);
    };

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      engine.reset();
      const pointer = pointerController.get();
      if (pointer.source === 'hand') pointerController.setHand(pointer, false);
      landmarker?.close();
      landmarker = null;
      if (stream) {
        for (const track of stream.getTracks()) track.stop();
      }
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, [canvasRef, videoRef]);
}
