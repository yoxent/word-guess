import { isIapActive } from '../services/iapService';
import { useAdStore } from '../stores/adStore';
import { useGameStore } from '../stores/gameStore';

/**
 * D-165–D-167: consume Android back during ads, IAP, and tile reveal.
 * Returns true when the event is handled (do not pop the screen).
 */
export function handleHardwareBackPress(): boolean {
  if (useAdStore.getState().isAdShowing) return true;
  if (isIapActive()) return true;

  const gameStore = useGameStore.getState();
  if (gameStore.isRevealing) {
    gameStore.setIsRevealing(false);
    gameStore.flushPendingInputs();
    gameStore.finalizeRevealOutcome();
    return true;
  }

  return false;
}
