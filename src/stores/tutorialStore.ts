import { create } from 'zustand';
import {
  TUTORIAL_INITIAL_PHASE,
  nextPhaseAfterContinue,
  nextPhaseAfterReveal,
  type TutorialPhase,
} from '../services/tutorialScript';
import { useSettingsStore } from './settingsStore';

interface TutorialState {
  active: boolean;
  phase: TutorialPhase;
  start: () => void;
  stop: () => void;
  skip: () => void;
  finish: () => void;
  continueExplain: () => void;
  advanceAfterReveal: () => void;
}

function reset(): Pick<TutorialState, 'active' | 'phase'> {
  return { active: false, phase: TUTORIAL_INITIAL_PHASE };
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  ...reset(),

  start: () => set({ active: true, phase: TUTORIAL_INITIAL_PHASE }),

  stop: () => set(reset()),

  skip: () => {
    useSettingsStore.getState().markOnboardingComplete();
    set(reset());
  },

  finish: () => {
    useSettingsStore.getState().markOnboardingComplete();
    set(reset());
  },

  continueExplain: () => {
    const { active, phase } = get();
    if (!active) return;
    set({ phase: nextPhaseAfterContinue(phase) });
  },

  advanceAfterReveal: () => {
    const { active, phase } = get();
    if (!active) return;
    const next = nextPhaseAfterReveal(phase);
    if (next === 'complete') {
      useSettingsStore.getState().markOnboardingComplete();
    }
    set({ phase: next });
  },
}));
