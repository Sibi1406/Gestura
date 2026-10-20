import { create } from 'zustand';

export type AppMode = 'watch' | 'challenge' | 'predict';

export type ModeStore = {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  resetMode: () => void;
};

export const useModeStore = create<ModeStore>((set) => ({
  mode: 'watch',
  setMode: (mode) => set({ mode }),
  resetMode: () => set({ mode: 'watch' }),
}));
