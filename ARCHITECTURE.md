# Gestura Architecture

## Hand Tracking

```
webcam frames
    -> HandLandmarker (requestAnimationFrame, VIDEO mode)
    -> GestureEngine (pure TypeScript)
    -> transient gesture store + one-shot events
    -> playback actions / SortingScene useFrame
```

The camera loop skips unchanged video frames. It sends landmark data directly to the pure gesture engine, then updates the transient gesture store. Fist and swipe events are consumed once in the tracking loop; HUD snapshots update at a throttled rate. Pinch rotation and two-hand zoom are read by the scene without per-frame React state updates.

## Sorting Playback

```
algorithm generator -> precomputed Step[] -> applyStep reducer -> BarState -> 3D scene
```

Algorithms only yield data. `buildSteps` precomputes the timeline, `applyStep` is a deterministic reducer, and `stateAt` rebuilds any timeline position for reverse stepping and scrubbing. The playback store owns the array, timeline, speed, counters, and narration. The scene animates bars by stable ID and never calls an algorithm.

## Add An Algorithm

1. Add a generator under `src/engine/algorithms/` that works on a copy and yields typed steps with source line numbers.
2. Add its complexity metadata and Java/Python source in `src/engine/registry.ts`.
3. Add replay, immutability, and edge-case coverage in `src/engine/engine.test.ts`; the dropdown reads from the registry automatically.

## Boundaries

- `src/engine/` and `src/gestures/` are pure TypeScript with no React or Three imports.
- `usePlaybackStore` precomputes steps when the algorithm or array changes; `SortingScene` only consumes `BarState` and playback ticks.
- `useHandTracking` owns camera/model lifetime, GPU-to-CPU fallback, canvas landmarks, FPS, and one-shot event dispatch.
- `useGestureStore` provides transient gesture reads to `useFrame`; React subscribes only to UI snapshots and settings.
- Mouse mode uses OrbitControls. Gesture mode keeps camera rotation/zoom and playback controls independent.
