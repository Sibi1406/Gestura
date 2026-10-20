import { useRef } from 'react';
import { CursorOverlay } from './components/CursorOverlay';
import { HUD } from './components/HUD';
import { ControlPanel } from './components/ControlPanel';
import { SortingScene } from './components/SortingScene';
import { WebcamPreview } from './components/WebcamPreview';
import { useHandTracking } from './hooks/useHandTracking';

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useHandTracking(videoRef, canvasRef);

  return (
    <>
      <SortingScene />
      <CursorOverlay />
      <HUD />
      <ControlPanel />
      <WebcamPreview videoRef={videoRef} canvasRef={canvasRef} />
    </>
  );
}
