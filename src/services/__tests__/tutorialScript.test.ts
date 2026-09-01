import { evaluateGuess } from '../wordLogic';
import {
  TUTORIAL_ANSWER,
  TUTORIAL_INITIAL_PHASE,
  TUTORIAL_WORDS,
  TUTORIAL_WRONG_ANSWER_ERROR,
  expectedGuess,
  isTutorialKeyAllowed,
  nextPhaseAfterContinue,
  nextPhaseAfterReveal,
  tutorialCallouts,
  tutorialCopy,
  tutorialHighlightedKey,
  tutorialSampleTiles,
  tutorialSubmitError,
} from '../tutorialScript';

describe('tutorialScript', () => {
  it('uses CRANE, LEMON, ENVOY, then ENJOY', () => {
    expect(TUTORIAL_ANSWER).toBe('ENJOY');
    expect(TUTORIAL_WORDS).toEqual(['CRANE', 'LEMON', 'ENVOY', 'ENJOY']);
  });

  it('scores CRANE as grey-grey-grey-yellow-yellow', () => {
    const result = evaluateGuess(TUTORIAL_ANSWER, 'CRANE');
    expect(result.map((f) => f.feedback)).toEqual([
      'absent',
      'absent',
      'absent',
      'present',
      'present',
    ]);
  });

  it('scores LEMON with green O plus yellow E and N', () => {
    const result = evaluateGuess(TUTORIAL_ANSWER, 'LEMON');
    expect(result.map((f) => `${f.letter}:${f.feedback}`)).toEqual([
      'L:absent',
      'E:present',
      'M:absent',
      'O:correct',
      'N:present',
    ]);
  });

  it('scores ENVOY as green-green-grey-green-green', () => {
    const result = evaluateGuess(TUTORIAL_ANSWER, 'ENVOY');
    expect(result.map((f) => `${f.letter}:${f.feedback}`)).toEqual([
      'E:correct',
      'N:correct',
      'V:absent',
      'O:correct',
      'Y:correct',
    ]);
  });

  it('starts on intro modals, then CRANE, then reveal/continue transitions', () => {
    expect(TUTORIAL_INITIAL_PHASE).toBe('intro-welcome');
    expect(nextPhaseAfterContinue('intro-welcome')).toBe('intro-how');
    expect(nextPhaseAfterContinue('intro-how')).toBe('prompt-word1');
    expect(nextPhaseAfterContinue('prompt-word1')).toBe('word1');
    expect(nextPhaseAfterReveal('word1')).toBe('explain-grey');
    expect(nextPhaseAfterContinue('explain-grey')).toBe('explain-yellow');
    expect(nextPhaseAfterContinue('explain-yellow')).toBe('prompt-word2');
    expect(nextPhaseAfterContinue('prompt-word2')).toBe('word2');
    expect(nextPhaseAfterReveal('word2')).toBe('explain-green');
    expect(nextPhaseAfterContinue('explain-green')).toBe('prompt-word3');
    expect(nextPhaseAfterContinue('prompt-word3')).toBe('word3');
    expect(nextPhaseAfterReveal('word3')).toBe('help-enjoy');
    expect(nextPhaseAfterContinue('help-enjoy')).toBe('prompt-word4');
    expect(nextPhaseAfterContinue('prompt-word4')).toBe('word4');
    expect(nextPhaseAfterReveal('word4')).toBe('complete');
  });

  describe('word1 CRANE — one letter at a time', () => {
    it('allows only the next letter and blocks everything else', () => {
      expect(isTutorialKeyAllowed('word1', '', 'C')).toBe(true);
      expect(isTutorialKeyAllowed('word1', '', 'R')).toBe(false);
      expect(isTutorialKeyAllowed('word1', '', 'ENTER')).toBe(false);
      expect(isTutorialKeyAllowed('word1', '', 'BACKSPACE')).toBe(false);

      expect(isTutorialKeyAllowed('word1', 'C', 'R')).toBe(true);
      expect(isTutorialKeyAllowed('word1', 'CR', 'A')).toBe(true);
      expect(isTutorialKeyAllowed('word1', 'CRA', 'N')).toBe(true);
      expect(isTutorialKeyAllowed('word1', 'CRAN', 'E')).toBe(true);
      expect(isTutorialKeyAllowed('word1', 'CRAN', 'A')).toBe(false);
    });

    it('highlights the next letter, then Submit', () => {
      expect(tutorialHighlightedKey('word1', '')).toBe('C');
      expect(tutorialHighlightedKey('word1', 'CRA')).toBe('N');
      expect(tutorialHighlightedKey('word1', 'CRANE')).toBe('ENTER');
    });

    it('allows Submit only once CRANE is entered', () => {
      expect(isTutorialKeyAllowed('word1', 'CRANE', 'ENTER')).toBe(true);
      expect(isTutorialKeyAllowed('word1', 'CRANE', 'C')).toBe(false);
      expect(isTutorialKeyAllowed('word1', 'CRANE', 'BACKSPACE')).toBe(false);
    });
  });

  describe('word2 LEMON — typed freely but scripted', () => {
    it('only accepts the next letter of LEMON', () => {
      expect(isTutorialKeyAllowed('word2', '', 'L')).toBe(true);
      expect(isTutorialKeyAllowed('word2', '', 'E')).toBe(false);
      expect(isTutorialKeyAllowed('word2', 'L', 'E')).toBe(true);
      expect(isTutorialKeyAllowed('word2', 'LEMO', 'N')).toBe(true);
    });

    it('allows backspace while typing', () => {
      expect(isTutorialKeyAllowed('word2', 'LE', 'BACKSPACE')).toBe(true);
      expect(isTutorialKeyAllowed('word2', '', 'BACKSPACE')).toBe(false);
    });

    it('highlights the next letter, then Submit', () => {
      expect(tutorialHighlightedKey('word2', '')).toBe('L');
      expect(tutorialHighlightedKey('word2', 'LEM')).toBe('O');
      expect(tutorialHighlightedKey('word2', 'LEMON')).toBe('ENTER');
    });
  });

  describe('word3 ENVOY — typed freely but scripted', () => {
    it('only accepts the next letter of ENVOY', () => {
      expect(isTutorialKeyAllowed('word3', '', 'E')).toBe(true);
      expect(isTutorialKeyAllowed('word3', '', 'N')).toBe(false);
      expect(isTutorialKeyAllowed('word3', 'E', 'N')).toBe(true);
      expect(isTutorialKeyAllowed('word3', 'ENVO', 'Y')).toBe(true);
    });

    it('allows backspace while typing', () => {
      expect(isTutorialKeyAllowed('word3', 'EN', 'BACKSPACE')).toBe(true);
      expect(isTutorialKeyAllowed('word3', '', 'BACKSPACE')).toBe(false);
    });

    it('highlights the next letter, then Submit', () => {
      expect(tutorialHighlightedKey('word3', '')).toBe('E');
      expect(tutorialHighlightedKey('word3', 'ENV')).toBe('O');
      expect(tutorialHighlightedKey('word3', 'ENVOY')).toBe('ENTER');
    });
  });

  describe('word4 ENJOY — typed freely but scripted', () => {
    it('only accepts the next letter of ENJOY', () => {
      expect(isTutorialKeyAllowed('word4', '', 'E')).toBe(true);
      expect(isTutorialKeyAllowed('word4', '', 'N')).toBe(false);
      expect(isTutorialKeyAllowed('word4', 'EN', 'J')).toBe(true);
      expect(isTutorialKeyAllowed('word4', 'ENJO', 'Y')).toBe(true);
    });

    it('allows backspace while typing', () => {
      expect(isTutorialKeyAllowed('word4', 'EN', 'BACKSPACE')).toBe(true);
      expect(isTutorialKeyAllowed('word4', '', 'BACKSPACE')).toBe(false);
    });

    it('highlights the next letter, then Submit', () => {
      expect(tutorialHighlightedKey('word4', '')).toBe('E');
      expect(tutorialHighlightedKey('word4', 'ENJ')).toBe('O');
      expect(tutorialHighlightedKey('word4', 'ENJOY')).toBe('ENTER');
    });

    it('rejects any guess that is not the current scripted word', () => {
      expect(tutorialSubmitError(0, 'PLANT')).toBe(TUTORIAL_WRONG_ANSWER_ERROR);
      expect(tutorialSubmitError(1, 'CRANE')).toBe(TUTORIAL_WRONG_ANSWER_ERROR);
      expect(tutorialSubmitError(2, 'LEMON')).toBe(TUTORIAL_WRONG_ANSWER_ERROR);
      expect(tutorialSubmitError(2, 'ENVOY')).toBeNull();
      expect(tutorialSubmitError(3, 'ENVOY')).toBe(TUTORIAL_WRONG_ANSWER_ERROR);
      expect(tutorialSubmitError(3, 'ENJOY')).toBeNull();
    });
  });

  it('blocks all input during intro and explanations', () => {
    expect(isTutorialKeyAllowed('intro-welcome', '', 'C')).toBe(false);
    expect(isTutorialKeyAllowed('intro-how', '', 'L')).toBe(false);
    expect(isTutorialKeyAllowed('prompt-word1', '', 'C')).toBe(false);
    expect(isTutorialKeyAllowed('prompt-word2', '', 'L')).toBe(false);
    expect(isTutorialKeyAllowed('prompt-word3', '', 'E')).toBe(false);
    expect(isTutorialKeyAllowed('help-enjoy', '', 'E')).toBe(false);
    expect(isTutorialKeyAllowed('prompt-word4', '', 'E')).toBe(false);
    expect(isTutorialKeyAllowed('explain-grey', '', 'C')).toBe(false);
    expect(isTutorialKeyAllowed('explain-yellow', '', 'N')).toBe(false);
    expect(isTutorialKeyAllowed('explain-green', 'LEMON', 'ENTER')).toBe(false);
    expect(expectedGuess('explain-green')).toBeNull();
  });

  it('points at grey tiles, then yellow tiles, then the green O', () => {
    expect(tutorialCallouts('explain-grey')).toEqual([
      { rowIndex: 0, indices: [0, 1, 2], kind: 'absent' },
    ]);
    expect(tutorialCallouts('explain-yellow')).toEqual([
      { rowIndex: 0, indices: [3, 4], kind: 'present' },
    ]);
    expect(tutorialCallouts('explain-green')).toEqual([
      { rowIndex: 1, indices: [3], kind: 'correct' },
    ]);
  });

  it('builds sample tiles from the guessed CRANE row', () => {
    const crane = evaluateGuess(TUTORIAL_ANSWER, 'CRANE');
    expect(tutorialSampleTiles('explain-grey', [crane]).map((t) => t.letter)).toEqual([
      'C',
      'R',
      'A',
    ]);
    expect(tutorialSampleTiles('explain-yellow', [crane]).map((t) => t.letter)).toEqual([
      'N',
      'E',
    ]);
  });

  it('keeps the word in dialogue, then as a reminder while typing', () => {
    expect(tutorialCopy('prompt-word1').body).toMatch(/Let's try CRANE/);
    expect(tutorialCopy('word1').body).toBe('CRANE');
    expect(tutorialCopy('prompt-word2').body).toMatch(/LEMON/);
    expect(tutorialCopy('word2').body).toBe('LEMON');
    expect(tutorialCopy('prompt-word3').body).toMatch(/Let's try ENVOY/);
    expect(tutorialCopy('word3').body).toBe('ENVOY');
    expect(tutorialCopy('help-enjoy').body).toMatch(/middle letter/i);
    expect(tutorialCopy('help-enjoy').body).not.toMatch(/ENJOY/i);
    expect(tutorialCopy('prompt-word4').body).toMatch(/Let's try ENJOY/);
    expect(tutorialCopy('word4').body).toBe('ENJOY');
    expect(tutorialCopy('intro-welcome').body).not.toMatch(/ENJOY/i);
    expect(tutorialCopy('explain-green').body).not.toMatch(/ENJOY/i);
    expect(tutorialCopy('complete').body).toMatch(/how to play/i);
  });
});
