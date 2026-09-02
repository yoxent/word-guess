import { isIapActive } from '../services/iapService';
import { useAdStore } from '../stores/adStore';
import { useGameStore } from '../stores/gameStore';
import { useTutorialStore } from '../stores/tutorialStore';

/**
 * D-165–D-167: consume Android back during ads, IAP, and tile reveal.
 * Tutorial back uses the same skip-confirm path as the header button.
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

  const tutorial = useTutorialStore.getState();
  const inTutorial = gameStore.session?.isTutorial === true || tutorial.active;
  if (inTutorial) {
    if (tutorial.skipConfirmVisible) {
      tutorial.cancelSkip();
    } else {
      tutorial.requestSkip();
    }
    return true;
  }

  return false;
}
