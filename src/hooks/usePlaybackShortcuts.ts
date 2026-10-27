import { useEffect } from 'react';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { useModeStore } from '../store/useModeStore';
import { useChallengeStore } from '../store/useChallengeStore';

export function usePlaybackShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
      )) return;

      const playback = usePlaybackStore.getState();
      const mode = useModeStore.getState().mode;
      const challengeMode = mode === 'challenge';
      if (mode === 'predict') {
        if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
        return;
      }
      if (event.code === 'KeyZ' && challengeMode) {
        event.preventDefault();
        useChallengeStore.getState().undo();
        const session = useChallengeStore.getState().session;
        if (session) playback.setArray(session.array);
      } else if (challengeMode) {
        if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
        return;
      } else if (event.code === 'Space') {
        event.preventDefault();
        playback.toggle();
      } else if (event.code === 'ArrowLeft') {
        event.preventDefault();
        playback.prev();
      } else if (event.code === 'ArrowRight') {
        event.preventDefault();
        playback.next();
      } else if (event.code === 'ArrowUp') {
        event.preventDefault();
        playback.setSpeed(playback.speed + 0.25);
      } else if (event.code === 'ArrowDown') {
        event.preventDefault();
        playback.setSpeed(playback.speed - 0.25);
      } else if (event.code === 'KeyR') {
        playback.reset();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
