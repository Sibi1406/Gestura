import type { HandLandmarker } from '@mediapipe/tasks-vision';
import { useEffect } from 'react';
import type { RefObject } from 'react';
import { drawHands } from '../components/WebcamPreview';
import { GestureEngine } from '../gestures/gestureEngine';
import { Vec2EuroFilter } from '../gestures/oneEuroFilter';
import type { Landmark } from '../gestures/types';
import { mapHandToScreen, pointerController } from '../input/pointer';
import { useGestureStore } from '../store/useGestureStore';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { useModeStore } from '../store/useModeStore';
import { loadHandLandmarker } from './handTrackingLoader';

const engine = new GestureEngine();

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
    const cursorFilter = new Vec2EuroFilter();

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
      cursorFilter.setParams(calibration.cursorMinCutoff, calibration.cursorBeta);
      pointerController.setDwellSettings(calibration.dwellClick, calibration.dwellMs);
      const gesture = engine.update(hands, now, calibration);
      setGestureTransient(gesture);

      const { handednesses } = result;
      const dominantHand = calibration.dominantHand;
      const selectedHandIndex = dominantHand === 'auto'
        ? 0
        : handednesses.findIndex((categories) => categories[0]?.categoryName.toLowerCase() === dominantHand);
      const pointerHand = selectedHandIndex >= 0 ? hands[selectedHandIndex] : undefined;
      if (store.getState().controlMode === 'gesture' && pointerHand && pointerHand.length >= 21) {
        const isPinching = gesture.kind === 'pinch';
        const tip = isPinching
          ? { x: (pointerHand[4].x + pointerHand[8].x) / 2, y: (pointerHand[4].y + pointerHand[8].y) / 2 }
          : pointerHand[8];
        const mirrored = { x: 1 - tip.x, y: tip.y };
        const filtered = cursorFilter.filter(mirrored.x, mirrored.y, now / 1000);
        const position = mapHandToScreen(
          filtered,
          { width: window.innerWidth, height: window.innerHeight },
          calibration.activeRegion,
          dominantHand,
        );
        pointerController.setHand(position, isPinching);
      } else {
        const previous = pointerController.get();
        if (previous.source === 'hand') {
          pointerController.setHand(previous, false);
        }
        cursorFilter.reset();
      }

      if (useModeStore.getState().mode === 'watch') {
        const playback = usePlaybackStore.getState();
        for (const event of gesture.events) {
          if (event === 'toggle') playback.toggle();
          else if (event === 'next') playback.next();
          else if (event === 'prev') playback.prev();
        }
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
        landmarker = await loadHandLandmarker(() => cancelled);
        if (!landmarker) return;
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
      cursorFilter.reset();
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
