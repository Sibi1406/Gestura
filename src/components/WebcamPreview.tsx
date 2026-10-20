import type { Landmark } from '../gestures/types';
import type { RefObject } from 'react';

const CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

/** Draw 21 landmarks in mirrored image space so they sit on the CSS-flipped video. */
export function drawHands(
  ctx: CanvasRenderingContext2D,
  hands: Landmark[][],
): void {
  const { width: w, height: h } = ctx.canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(120, 200, 255, 0.9)';
  ctx.fillStyle = 'rgba(255, 230, 120, 0.95)';

  for (const lm of hands) {
    if (lm.length < 21) continue;
    ctx.beginPath();
    for (const [a, b] of CONNECTIONS) {
      ctx.moveTo((1 - lm[a].x) * w, lm[a].y * h);
      ctx.lineTo((1 - lm[b].x) * w, lm[b].y * h);
    }
    ctx.stroke();
    for (const p of lm) {
      ctx.beginPath();
      ctx.arc((1 - p.x) * w, p.y * h, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
};

export function WebcamPreview({ videoRef, canvasRef }: Props) {
  return (
    <div className="webcam">
      <video
        ref={videoRef}
        className="webcam-video"
        playsInline
        muted
        autoPlay
      />
      <canvas ref={canvasRef} className="webcam-overlay" />
    </div>
  );
}
