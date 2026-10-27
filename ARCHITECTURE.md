# Gestura Architecture

## Layout and settings

`App.tsx` composes a full-screen `SortingScene`, minimal mode/navigation shell, narration card, mode-specific dock, camera bubble, cursor, and a closed-by-default Settings drawer. Learn maps to the existing `watch` store value; Sort it uses direct bar swaps and Predict uses decision-question controls. The former sidebar and always-visible calibration HUD were removed.

`SettingsDrawer` groups array generation, playback speed, Predict sample size, timeline/reset/counters, algorithm complexity, tracking, calibration, and shortcuts into collapsible sections. Playback configuration is persisted through `usePlaybackStore`, while control mode, Predict sample size, and calibration are persisted through `useGestureStore`; temporary status, FPS, and gesture snapshots are not persisted. Storage writes are deduplicated so animation and status updates do not repeatedly write unchanged settings.

## Pointer and hand tracking

```
webcam frames -> HandLandmarker -> GestureEngine
                              -> filtered cursor -> PointerController
DOM targets ------------------------------^          |
bar raycast (useBarPicking) ---------------^          +-> click / slider / rotate lock
```

The hand cursor uses a separate One Euro filter configured by `cursorMinCutoff` and `cursorBeta`. While pinching, it follows the midpoint between thumb and index tips. Dominant-hand selection defaults to Auto and can be set to Left or Right.

At pinch start, `PointerController` hit-tests UI first, then 3D bars, then empty scene. It locks the grab as `ui`, `object`, or `rotate` until release. UI buttons click only after press-and-release on the same target; sliders map the moving pointer's X coordinate to the input track. Nearby UI targets use a 48px magnet radius. Dwell-click is a disabled-by-default accessibility fallback. Mouse movement/down/up updates this same pointer abstraction while native browser clicks remain intact.

`useBarPicking` raycasts from pointer NDC each render frame without React state updates. It stores the hovered bar ID transiently; `Bar` reads that ID in its frame callback to show an emissive edge outline. `SortingScene` only applies one-hand rotation while the locked grab is `rotate`, so a control or bar pinch cannot rotate the scene.

## Sorting playback

```
algorithm generator -> precomputed Step[] -> applyStep reducer -> BarState -> 3D scene
```

Algorithms only yield data. `buildSteps` precomputes the timeline, `applyStep` is a deterministic reducer, and `stateAt` rebuilds any timeline position for reverse stepping and scrubbing. The playback store owns the array, timeline, speed, counters, and narration. The scene animates bars by stable ID and never calls an algorithm.

## Sort it challenge

`engine/challenge.ts` remains the shared source for inversion count, minimum swaps, swap quality, adjacency checks, and algorithm hints. `engine/challengeSession.ts` is a pure reducer for the challenge array, rule, move-quality counts, undo snapshots, solved state, feedback, and result metrics. It never sorts automatically. `useChallengeStore` keeps that session plus a mutable drag position; pointer/frame updates mutate only the transient drag record, so they do not trigger React renders.

At release, the reducer validates the active rule and performs one swap. The scene swaps stable bar IDs with values and animates each bar toward its new slot using the existing position lerp and Z arc. Bar picking excludes the held bar while dragging; a live ghost slot follows the destination. An adjacent-only rejection leaves the array and move history untouched and drives the red feedback/coach message.

The hint system calls `nextHint` for the current algorithm and array, then verifies progress. If that suggestion is not a legal improving swap (such as an overwrite step), it searches for an inversion-reducing or minimum-swap-improving alternative; adjacent-only hints remain adjacent. Undo restores the previous array/IDs and counters. Solve feedback sweeps the bars green before exposing results; Watch the algorithm do it restores the session's starting array and starts normal playback. Sort it pauses and suppresses playback ticks and gesture playback shortcuts.

## Predict decisions and Learn data editing

`engine/questions.ts` walks the precomputed steps while applying each step to an evolving bar state, so prompts use the values and bar positions relevant to each comparison. `predictSession.ts` samples at most 15 decision indices and records pause/answer/continue state, correctness, streaks, and missed questions. The Predict dock answers Yes/No or Left/Right; `SortingScene` stops playback before the selected comparison, highlights the two involved bars, and resumes after the next press or a 1.5-second feedback window. A completed run displays the score and can replay only missed decisions.

Learn editing is enabled only while paused at step zero. `useLearnEditInteraction` keeps the bar's pointer-following position and value preview transient; release calls `usePlaybackStore.editValue`, which clamps data to 1-100 and rebuilds the selected algorithm timeline. The first edit saves a baseline for Reset data. The coach reports the comparison-count change, and playback remains paused until the user explicitly resumes.

## Boundaries

- `src/engine/` and `src/gestures/` remain pure TypeScript; existing engine and gesture behavior/tests remain independent of React and Three.js.
- `usePlaybackStore` precomputes steps when the algorithm or array changes; `SortingScene` consumes `BarState` and playback ticks.
- `useHandTracking` owns camera/model lifetime, GPU-to-CPU fallback, landmark drawing, cursor smoothing, FPS, and one-shot gesture events.
- `useGestureStore` provides transient gesture/status snapshots plus persisted tracking and calibration settings.
- Predict pauses at question boundaries; Sort it uses direct bar swaps and does not auto-sort.
