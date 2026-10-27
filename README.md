# Gestura

Gestura is a full-screen, 3D sorting explorer controlled by hand gestures or a mouse. Learn supports Bubble, Insertion, Merge, and Quick Sort. Sort it is a direct bar-swap challenge; Predict pauses playback for decision questions.

## Setup

```powershell
cd D:\guestura
npm install
npm run dev
```

Open Vite's localhost URL in Chrome or Edge and allow camera access. Camera APIs require localhost or HTTPS. `npm test` runs Vitest, while `npm run build` runs strict TypeScript and creates the production bundle.

## Layout and controls

- The top-left wordmark and mode pills switch between Learn, Sort it, and Predict.
- The Learn dock has Prev, Play/Pause, Next, New array, and an algorithm chip. The chip opens the algorithm list.
- The coach card shows the current narration in up to two lines.
- The gear opens the right-hand Settings drawer. Sections cover data generation, playback speed, timeline/reset/counters, algorithm complexity, tracking, calibration, and shortcuts. Sections can be collapsed, and settings are saved in local storage.
- A camera bubble at the top-right shows the mirrored webcam and landmarks. Hide/show it with the adjacent control.

Sort it starts from the current array and selected algorithm. Pinch or mouse-drag a bar to another slot to swap; empty-space and same-bar releases cancel. Choose Any swap or Adjacent only, use Hint and Undo (Z), or generate a new array. A solved run shows move/optimal/algorithm comparison, efficiency, elapsed time, and options to retry or watch the selected algorithm. Playback stays stopped while sorting manually.

Predict pauses before sampled comparison decisions (up to 15 per run, configurable in Settings). Answer with the large dock targets; feedback explains the decision, then playback resumes on the next pinch or after 1.5 seconds. The score card shows accuracy, best streak, missed questions, and a Retry missed action. Learn data can be edited by pinching a bar and dragging vertically while playback is paused at step zero; the value is clamped to 1-100 and the selected algorithm's steps are rebuilt. Reset data restores the array from before the first edit.

## Gestures and pointer behavior

| Input | Action |
| --- | --- |
| Pinch on a UI target | Locks to that target; buttons activate on release and sliders drag |
| Pinch on a bar | Locks to the 3D object without rotating the scene |
| Pinch on empty space | Locks to scene rotation until release |
| Open-palm swipe right/left | Advance/back one sorting step |
| Fist | Toggle play/pause once per fist; cooldown prevents repeat triggers |
| Two hands | Change index-fingertip distance to zoom |
| Mouse drag on empty space | Orbit the scene |
| Mouse click/drag on controls | Use native controls through the same pointer state |

The 48px magnet radius helps acquire nearby UI targets. Dwell-click is available in Calibration and is off by default. Cursor smoothing has independent One Euro filter settings from gesture-motion smoothing. The default dominant hand is Auto.

## Keyboard shortcuts

- Space: play/pause
- Left/Right: previous/next step
- Up/Down: playback speed
- R: reset
- Z: undo in Sort it
- Esc: close Settings

## Manual test checklist

1. Start the app with camera permission and confirm the bubble shows mirrored video and landmarks; collapse and restore it.
2. Open Settings using the gear, close with X, outside click, and Esc, then reload and confirm control mode and calibration values persisted.
3. Use Data to change array size and preset, generate a new array, then select each algorithm from the dock chip.
4. In Learn, use Prev, Play/Pause, Next, and New array. In Settings, scrub the playback step and reset; confirm narration and counters update.
5. With Gesture enabled, pinch a dock button and release on it; confirm it activates once and does not rotate the scene.
6. Pinch a settings slider and move across its track; confirm it follows the pointer instead of jumping once.
7. Pinch on a bar and move; confirm the bar highlights and the scene stays fixed. Pinch empty space and confirm rotation continues only until release.
8. Enable dwell-click, hover a button without pinching for the configured time, and confirm it activates once; turn dwell-click off and confirm it does not.
9. Try left/right/auto dominant hand, adjust cursor filtering, then test Gesture and Mouse modes.
10. In Sort it, drag bars with 5 and 20 values, try Adjacent only, use Hint then solve, undo moves with the dock and Z, and try Mouse mode without camera input.
11. Confirm the green solve sweep and result card; test Try again and Watch the algorithm do it.
12. In Learn, pause at step zero, drag a bar vertically, confirm its value and comparison-count message change, then use Reset data.
13. In Predict, answer sampled decisions, verify feedback and bar highlights, continue with another pinch, and confirm the score card and Retry missed.
14. Repeat in low light. If a held bar drops by itself, raise the pinch threshold slightly so the derived release threshold is more tolerant. If grabs feel late, raise the pinch threshold to engage sooner and raise cursor minCutoff slightly to reduce filter lag; adjust one setting at a time.

## Known limitations

- MediaPipe downloads its model and WASM from a CDN on first load; reliable connectivity is required.
- Low light, occlusion, and fast movement can reduce tracking quality. Hand depth is approximate.
- Swipe recognition uses a short horizontal velocity window and may need per-camera threshold tuning.
- Low light, occlusion, and fast movement can cause accidental releases; tune pinch threshold and cursor smoothing in Settings.
- The production bundle is large because Three.js, drei, and MediaPipe ship in the client bundle.
