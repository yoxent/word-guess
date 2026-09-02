const mockAdGetState = jest.fn();
const mockGameGetState = jest.fn();
const mockTutorialGetState = jest.fn();
const mockIsIapActive = jest.fn();
const mockRequestSkip = jest.fn();
const mockCancelSkip = jest.fn();

jest.mock('../../stores/adStore', () => ({
  useAdStore: {
    getState: () => mockAdGetState(),
  },
}));

jest.mock('../../stores/gameStore', () => ({
  useGameStore: {
    getState: () => mockGameGetState(),
  },
}));

jest.mock('../../stores/tutorialStore', () => ({
  useTutorialStore: {
    getState: () => mockTutorialGetState(),
  },
}));

jest.mock('../../services/iapService', () => ({
  isIapActive: () => mockIsIapActive(),
}));

import { handleHardwareBackPress } from '../hardwareBackPress';

function gameState(overrides: Partial<{
  isRevealing: boolean;
  session: { isTutorial: boolean } | null;
  setIsRevealing: jest.Mock;
  flushPendingInputs: jest.Mock;
  finalizeRevealOutcome: jest.Mock;
}> = {}) {
  return {
    isRevealing: false,
    session: null,
    setIsRevealing: jest.fn(),
    flushPendingInputs: jest.fn(),
    finalizeRevealOutcome: jest.fn(),
    ...overrides,
  };
}

function tutorialState(overrides: Partial<{
  active: boolean;
  skipConfirmVisible: boolean;
}> = {}) {
  return {
    active: false,
    skipConfirmVisible: false,
    requestSkip: mockRequestSkip,
    cancelSkip: mockCancelSkip,
    ...overrides,
  };
}

describe('handleHardwareBackPress', () => {
  beforeEach(() => {
    mockAdGetState.mockReturnValue({ isAdShowing: false });
    mockIsIapActive.mockReturnValue(false);
    mockGameGetState.mockReturnValue(gameState());
    mockTutorialGetState.mockReturnValue(tutorialState());
    mockRequestSkip.mockClear();
    mockCancelSkip.mockClear();
  });

  it('blocks back while an ad is showing', () => {
    const game = gameState({ isRevealing: true });
    mockAdGetState.mockReturnValue({ isAdShowing: true });
    mockGameGetState.mockReturnValue(game);

    expect(handleHardwareBackPress()).toBe(true);
    expect(game.setIsRevealing).not.toHaveBeenCalled();
  });

  it('blocks back while an IAP purchase is active', () => {
    mockIsIapActive.mockReturnValue(true);

    expect(handleHardwareBackPress()).toBe(true);
    expect(mockGameGetState().setIsRevealing).not.toHaveBeenCalled();
  });

  it('skips tile reveal to the final state and consumes back', () => {
    const game = gameState({ isRevealing: true });
    mockGameGetState.mockReturnValue(game);

    expect(handleHardwareBackPress()).toBe(true);
    expect(game.setIsRevealing).toHaveBeenCalledWith(false);
    expect(game.flushPendingInputs).toHaveBeenCalled();
    expect(game.finalizeRevealOutcome).toHaveBeenCalled();
  });

  it('allows default back when no critical state is active', () => {
    expect(handleHardwareBackPress()).toBe(false);
    expect(mockRequestSkip).not.toHaveBeenCalled();
  });

  it('opens the tutorial skip confirm instead of popping the screen', () => {
    mockGameGetState.mockReturnValue(gameState({
      session: { isTutorial: true },
    }));

    expect(handleHardwareBackPress()).toBe(true);
    expect(mockRequestSkip).toHaveBeenCalledTimes(1);
    expect(mockCancelSkip).not.toHaveBeenCalled();
  });

  it('dismisses the skip confirm on a second hardware back', () => {
    mockGameGetState.mockReturnValue(gameState({
      session: { isTutorial: true },
    }));
    mockTutorialGetState.mockReturnValue(tutorialState({
      active: true,
      skipConfirmVisible: true,
    }));

    expect(handleHardwareBackPress()).toBe(true);
    expect(mockCancelSkip).toHaveBeenCalledTimes(1);
    expect(mockRequestSkip).not.toHaveBeenCalled();
  });
});
