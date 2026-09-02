const mockAdGetState = jest.fn();
const mockGameGetState = jest.fn();
const mockIsIapActive = jest.fn();

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

jest.mock('../../services/iapService', () => ({
  isIapActive: () => mockIsIapActive(),
}));

import { handleHardwareBackPress } from '../hardwareBackPress';

function gameState(overrides: Partial<{
  isRevealing: boolean;
  setIsRevealing: jest.Mock;
  flushPendingInputs: jest.Mock;
  finalizeRevealOutcome: jest.Mock;
}> = {}) {
  return {
    isRevealing: false,
    setIsRevealing: jest.fn(),
    flushPendingInputs: jest.fn(),
    finalizeRevealOutcome: jest.fn(),
    ...overrides,
  };
}

describe('handleHardwareBackPress', () => {
  beforeEach(() => {
    mockAdGetState.mockReturnValue({ isAdShowing: false });
    mockIsIapActive.mockReturnValue(false);
    mockGameGetState.mockReturnValue(gameState());
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
  });
});
