import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

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

export async function loadHandLandmarker(cancelled: () => boolean): Promise<HandLandmarker | null> {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  if (cancelled()) return null;
  let landmarker: HandLandmarker;
  try {
    landmarker = await createLandmarker(vision, 'GPU');
  } catch {
    if (cancelled()) return null;
    landmarker = await createLandmarker(vision, 'CPU');
  }
  if (cancelled()) {
    landmarker.close();
    return null;
  }
  return landmarker;
}
