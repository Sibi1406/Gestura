import type { Calibration, Landmark } from './types';

const TIP_IDS = [8, 12, 16, 20] as const;
const MCP_IDS = [5, 9, 13, 17] as const;
const FIST_TIP_MAX = 0.58;
const OPEN_TIP_MIN = 0.78;
const THUMB_FIST_MAX = 0.7;

function dist(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Wrist (0) to middle MCP (9) normalizes distances for hand size. */
export function handSize(lm: Landmark[]): number {
  return Math.max(dist(lm[0], lm[9]), 1e-5);
}

export function pinchRatio(lm: Landmark[]): number {
  return dist(lm[4], lm[8]) / handSize(lm);
}

export function palmCenter(lm: Landmark[]): Landmark {
  let x = lm[0].x;
  let y = lm[0].y;
  let z = lm[0].z;
  for (const id of MCP_IDS) {
    x += lm[id].x;
    y += lm[id].y;
    z += lm[id].z;
  }
  return { x: x / 5, y: y / 5, z: z / 5 };
}

function tipDistances(lm: Landmark[]): number[] {
  const palm = palmCenter(lm);
  const size = handSize(lm);
  return TIP_IDS.map((id) => dist(lm[id], palm) / size);
}

export function isFist(lm: Landmark[]): boolean {
  const tipsIn = tipDistances(lm).every((distance) => distance < FIST_TIP_MAX);
  const thumbIn = dist(lm[4], palmCenter(lm)) / handSize(lm) < THUMB_FIST_MAX;
  return tipsIn && thumbIn;
}

export function isPinchPose(lm: Landmark[], cal: Calibration): boolean {
  const indexReach = dist(lm[8], palmCenter(lm)) / handSize(lm);
  return pinchRatio(lm) < cal.pinchOff && indexReach > FIST_TIP_MAX;
}

export function isOpenPalm(lm: Landmark[]): boolean {
  return tipDistances(lm).every((distance) => distance > OPEN_TIP_MIN);
}