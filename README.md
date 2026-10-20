# Gestura

Gestura is a 3D, hand-gesture-controlled sorting explorer. Phase 2 includes Bubble, Insertion, Merge, and Quick Sort. Trees and graphs are not part of this phase.

## Setup

```bash
cd D:\guestura
npm install
npm run dev
```

Open the localhost URL printed by Vite in Chrome or Edge and allow camera access. Camera APIs require `localhost` or HTTPS. Run `npm test` for Vitest and `npm run build` for strict TypeScript plus the production bundle.

## Gestures

| Gesture | Action |
| --- | --- | --- |
| Fist | Toggle sorting play/pause once per fist; cooldown prevents repeat triggers |
| Open-palm swipe right | Advance one step |
| Open-palm swipe left | Step back once |
| Pinch and drag | Rotate the 3D sorting scene |
| Two hands | Change index-fingertip distance to zoom |
| Mouse mode | Drag to orbit and use the wheel to zoom |

Pinch takes priority over fist recognition when the index is extended toward the thumb. Tune swipe speed and cooldowns in Calibration if gesture events feel too eager or too hard to trigger.

## Sorting Controls

- Choose Bubble, Insertion, Merge, or Quick Sort.
- Set size from 5 to 50, choose Random, Reverse, Nearly sorted, or Few values, then select **Generate array**.
- Use Play/Pause, Prev, Next, Reset, or drag the timeline to inspect any step.
- Adjust playback speed from 0.25x to 4x. Counters, narration, and algorithm complexity update with playback.
- Keyboard: Space toggles play/pause, Left/Right steps, Up/Down adjusts speed, and R resets.

## Known Limitations

- MediaPipe downloads its model and WASM from a CDN on first load; reliable connectivity is required.
- Low light, occlusion, and fast movement can reduce tracking quality. Hand depth is approximate.
- Swipe recognition uses a short horizontal velocity window and can need per-camera threshold tuning.
- The initial array is generated randomly; changing size takes effect when **Generate array** is pressed.
- The production bundle is large because Three.js, drei, and MediaPipe ship in the client bundle.

## Manual Test Checklist

1. Run each of the four algorithms with a size-5 array and confirm the final values are ascending.
2. Generate size 50 and run each algorithm; check bar layout, animation, counters, and that the UI remains responsive.
3. Pause playback, use Prev and Next, and scrub backward and forward. Confirm the values and narration follow the selected step.
4. Resume with Play, then make a fist to pause and make another fist to resume. A held fist should not toggle repeatedly.
5. Swipe an open palm right and left. Confirm one step per swipe, then test cooldown with rapid repeated swipes.
6. Pinch-drag to rotate and use two hands to zoom; verify a pinch does not trigger a fist toggle.
7. Repeat tracking tests in low light. If swipes misfire, raise the swipe speed threshold or cooldown; if swipes are missed, lower the speed threshold. Also check camera permission and the landmark preview.
