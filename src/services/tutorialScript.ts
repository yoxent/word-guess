import type { GuessFeedback, TileFeedback } from '../types';
import { evaluateGuess } from './wordLogic';

export const TUTORIAL_ANSWER = 'ENJOY';
export const TUTORIAL_WORDS = ['CRANE', 'LEMON', 'ENVOY', 'ENJOY'] as const;
export const TUTORIAL_LETTER_COUNT = 5;
export const TUTORIAL_WRONG_ANSWER_ERROR = 'Not quite — use the clues!';

export type TutorialPhase =
  | 'intro-welcome'
  | 'intro-how'
  | 'prompt-word1'
  | 'word1'
  | 'explain-grey'
  | 'explain-yellow'
  | 'prompt-word2'
  | 'word2'
  | 'explain-green'
  | 'prompt-word3'
  | 'word3'
  | 'help-enjoy'
  | 'prompt-word4'
  | 'word4'
  | 'complete';

export const TUTORIAL_INITIAL_PHASE: TutorialPhase = 'intro-welcome';

export function expectedGuess(phase: TutorialPhase): string | null {
  switch (phase) {
    case 'word1':
      return TUTORIAL_WORDS[0];
    case 'word2':
      return TUTORIAL_WORDS[1];
    case 'word3':
      return TUTORIAL_WORDS[2];
    case 'word4':
      return TUTORIAL_WORDS[3];
    default:
      return null;
  }
}

export function isInputPhase(phase: TutorialPhase): boolean {
  return phase === 'word1' || phase === 'word2' || phase === 'word3' || phase === 'word4';
}

export function isExplainPhase(phase: TutorialPhase): boolean {
  return (
    phase === 'explain-grey' ||
    phase === 'explain-yellow' ||
    phase === 'explain-green'
  );
}

export function isModalPhase(phase: TutorialPhase): boolean {
  return (
    phase === 'intro-welcome' ||
    phase === 'intro-how' ||
    phase === 'prompt-word1' ||
    phase === 'prompt-word2' ||
    phase === 'prompt-word3' ||
    isExplainPhase(phase) ||
    phase === 'help-enjoy' ||
    phase === 'prompt-word4' ||
    phase === 'complete'
  );
}

export function nextPhaseAfterReveal(phase: TutorialPhase): TutorialPhase {
  switch (phase) {
    case 'word1':
      return 'explain-grey';
    case 'word2':
      return 'explain-green';
    case 'word3':
      return 'help-enjoy';
    case 'word4':
      return 'complete';
    default:
      return phase;
  }
}

export function nextPhaseAfterContinue(phase: TutorialPhase): TutorialPhase {
  switch (phase) {
    case 'intro-welcome':
      return 'intro-how';
    case 'intro-how':
      return 'prompt-word1';
    case 'prompt-word1':
      return 'word1';
    case 'explain-grey':
      return 'explain-yellow';
    case 'explain-yellow':
      return 'prompt-word2';
    case 'prompt-word2':
      return 'word2';
    case 'explain-green':
      return 'prompt-word3';
    case 'prompt-word3':
      return 'word3';
    case 'help-enjoy':
      return 'prompt-word4';
    case 'prompt-word4':
      return 'word4';
    default:
      return phase;
  }
}

function normalizeKey(key: string): string {
  if (key === 'ENTER' || key === 'BACKSPACE') return key;
  return key.toUpperCase();
}

/**
 * Word 1: only the next CRANE letter; backspace blocked; Submit when full.
 * Word 2: only the next LEMON letter; backspace allowed; Submit when full.
 * Word 3: only the next ENVOY letter; backspace allowed; Submit when full.
 * Word 4: only the next ENJOY letter; backspace allowed; Submit when full.
 * Explain / complete: no keys.
 */
export function isTutorialKeyAllowed(
  phase: TutorialPhase,
  currentGuess: string,
  key: string,
): boolean {
  const expected = expectedGuess(phase);
  if (!expected) return false;

  const k = normalizeKey(key);

  if (k === 'BACKSPACE') {
    return phase !== 'word1' && currentGuess.length > 0;
  }

  if (k === 'ENTER') {
    if (currentGuess.length !== expected.length) return false;
    return currentGuess === expected;
  }

  if (!/^[A-Z]$/.test(k)) return false;
  if (currentGuess.length >= TUTORIAL_LETTER_COUNT) return false;

  return k === expected[currentGuess.length];
}

export function tutorialHighlightedKey(
  phase: TutorialPhase,
  currentGuess: string,
): string | null {
  const expected = expectedGuess(phase);
  if (!expected) return null;
  if (currentGuess.length < expected.length) return expected[currentGuess.length];
  return 'ENTER';
}

export function tutorialCopy(phase: TutorialPhase): {
  title?: string;
  body: string;
  continueLabel?: string;
} {
  switch (phase) {
    case 'intro-welcome':
      return {
        title: 'Welcome',
        body: 'Guess the hidden word. Type a real word, then submit to see how close you are.',
        continueLabel: 'Next',
      };
    case 'intro-how':
      return {
        title: 'Six tries',
        body: 'You get six guesses. After each one, the tiles change color to guide you.',
        continueLabel: 'Next',
      };
    case 'prompt-word1':
      return {
        body: "Let's try CRANE.",
        continueLabel: 'Next',
      };
    case 'word1':
      return { body: 'CRANE' };
    case 'explain-grey':
      return {
        title: 'Grey',
        body: 'Grey means this letter is not in the word.',
        continueLabel: 'Next',
      };
    case 'explain-yellow':
      return {
        title: 'Yellow',
        body: 'Yellow means this letter is in the word, but it is in the wrong position.',
        continueLabel: 'Next',
      };
    case 'prompt-word2':
      return {
        body: "Now let's try another word. Let's try LEMON.",
        continueLabel: 'Next',
      };
    case 'word2':
      return { body: 'LEMON' };
    case 'explain-green':
      return {
        title: 'Green',
        body: 'Green means this letter is in the word and in the correct position.',
        continueLabel: 'Next',
      };
    case 'prompt-word3':
      return {
        body: "Let's try ENVOY.",
        continueLabel: 'Next',
      };
    case 'word3':
      return { body: 'ENVOY' };
    case 'help-enjoy':
      return {
        title: 'Almost there',
        body: 'Most of the tiles are already green. We only need to guess the middle letter.',
        continueLabel: 'Next',
      };
    case 'prompt-word4':
      return {
        body: "Let's try ENJOY.",
        continueLabel: 'Next',
      };
    case 'word4':
      return { body: 'ENJOY' };
    case 'complete':
      return {
        title: 'Great job!',
        body: 'You now know how to play Wordle.',
        continueLabel: "Let's play",
      };
  }
}

export type TutorialCallout = {
  rowIndex: number;
  indices: number[];
  kind: TileFeedback;
};

function indicesOf(
  feedback: ReturnType<typeof evaluateGuess>,
  kind: TileFeedback,
): number[] {
  return feedback.flatMap((tile, index) => (tile.feedback === kind ? [index] : []));
}

export function tutorialCallouts(phase: TutorialPhase): TutorialCallout[] {
  if (phase === 'explain-grey') {
    const feedback = evaluateGuess(TUTORIAL_ANSWER, TUTORIAL_WORDS[0]);
    return [{ rowIndex: 0, indices: indicesOf(feedback, 'absent'), kind: 'absent' }];
  }
  if (phase === 'explain-yellow') {
    const feedback = evaluateGuess(TUTORIAL_ANSWER, TUTORIAL_WORDS[0]);
    return [{ rowIndex: 0, indices: indicesOf(feedback, 'present'), kind: 'present' }];
  }
  if (phase === 'explain-green') {
    const feedback = evaluateGuess(TUTORIAL_ANSWER, TUTORIAL_WORDS[1]);
    return [{ rowIndex: 1, indices: indicesOf(feedback, 'correct'), kind: 'correct' }];
  }
  return [];
}

/** Sample tiles for explain modals, taken from the guessed row when present. */
export function tutorialSampleTiles(
  phase: TutorialPhase,
  feedbackRows: GuessFeedback[][] | undefined,
): GuessFeedback[] {
  if (phase === 'explain-grey') {
    const row = feedbackRows?.[0] ?? evaluateGuess(TUTORIAL_ANSWER, TUTORIAL_WORDS[0]);
    return row.filter((tile) => tile.feedback === 'absent');
  }
  if (phase === 'explain-yellow') {
    const row = feedbackRows?.[0] ?? evaluateGuess(TUTORIAL_ANSWER, TUTORIAL_WORDS[0]);
    return row.filter((tile) => tile.feedback === 'present');
  }
  if (phase === 'explain-green') {
    const row = feedbackRows?.[1] ?? evaluateGuess(TUTORIAL_ANSWER, TUTORIAL_WORDS[1]);
    return row.filter((tile) => tile.feedback === 'correct');
  }
  return [];
}

export function tutorialSubmitError(guessCount: number, guess: string): string | null {
  const expected = TUTORIAL_WORDS[guessCount];
  if (!expected || guess !== expected) return TUTORIAL_WRONG_ANSWER_ERROR;
  return null;
}
