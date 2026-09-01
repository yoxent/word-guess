const mockMarkOnboardingComplete = jest.fn();

jest.mock('../settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      markOnboardingComplete: mockMarkOnboardingComplete,
    }),
  },
}));

import { useTutorialStore } from '../tutorialStore';

describe('tutorialStore', () => {
  beforeEach(() => {
    mockMarkOnboardingComplete.mockClear();
    useTutorialStore.setState({
      active: false,
      phase: 'intro-welcome',
    });
  });

  it('starts on the welcome intro', () => {
    useTutorialStore.getState().start();
    expect(useTutorialStore.getState().active).toBe(true);
    expect(useTutorialStore.getState().phase).toBe('intro-welcome');
  });

  it('continues from intro into CRANE', () => {
    useTutorialStore.getState().start();
    useTutorialStore.getState().continueExplain();
    expect(useTutorialStore.getState().phase).toBe('intro-how');
    useTutorialStore.getState().continueExplain();
    expect(useTutorialStore.getState().phase).toBe('prompt-word1');
    useTutorialStore.getState().continueExplain();
    expect(useTutorialStore.getState().phase).toBe('word1');
  });

  it('advances through explanations after each reveal', () => {
    useTutorialStore.getState().start();
    useTutorialStore.setState({ phase: 'word1' });
    useTutorialStore.getState().advanceAfterReveal();
    expect(useTutorialStore.getState().phase).toBe('explain-grey');

    useTutorialStore.getState().continueExplain();
    expect(useTutorialStore.getState().phase).toBe('explain-yellow');

    useTutorialStore.getState().continueExplain();
    expect(useTutorialStore.getState().phase).toBe('prompt-word2');

    useTutorialStore.getState().continueExplain();
    expect(useTutorialStore.getState().phase).toBe('word2');

    useTutorialStore.getState().advanceAfterReveal();
    expect(useTutorialStore.getState().phase).toBe('explain-green');

    useTutorialStore.getState().continueExplain();
    expect(useTutorialStore.getState().phase).toBe('prompt-word3');

    useTutorialStore.getState().continueExplain();
    expect(useTutorialStore.getState().phase).toBe('word3');

    useTutorialStore.getState().advanceAfterReveal();
    expect(useTutorialStore.getState().phase).toBe('help-enjoy');

    useTutorialStore.getState().continueExplain();
    expect(useTutorialStore.getState().phase).toBe('prompt-word4');

    useTutorialStore.getState().continueExplain();
    expect(useTutorialStore.getState().phase).toBe('word4');
  });

  it('marks onboarding complete after the final reveal', () => {
    useTutorialStore.getState().start();
    useTutorialStore.setState({ phase: 'word4' });
    useTutorialStore.getState().advanceAfterReveal();
    expect(useTutorialStore.getState().phase).toBe('complete');
    expect(useTutorialStore.getState().active).toBe(true);
    expect(mockMarkOnboardingComplete).toHaveBeenCalled();
  });

  it('skip marks onboarding complete and deactivates', () => {
    useTutorialStore.getState().start();
    useTutorialStore.getState().skip();
    expect(useTutorialStore.getState().active).toBe(false);
    expect(mockMarkOnboardingComplete).toHaveBeenCalled();
  });

  it('stop leaves without marking complete', () => {
    useTutorialStore.getState().start();
    useTutorialStore.getState().stop();
    expect(useTutorialStore.getState().active).toBe(false);
    expect(mockMarkOnboardingComplete).not.toHaveBeenCalled();
  });

  it('finish exits the complete card', () => {
    useTutorialStore.getState().start();
    useTutorialStore.setState({ phase: 'complete' });
    useTutorialStore.getState().finish();
    expect(useTutorialStore.getState().active).toBe(false);
    expect(useTutorialStore.getState().phase).toBe('intro-welcome');
  });
});
