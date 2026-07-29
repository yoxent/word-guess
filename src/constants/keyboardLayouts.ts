/** On-screen keyboard layout ids persisted in settings. */
export type KeyboardLayoutId = 'qwerty' | 'qwertz' | 'azerty' | 'abc';

export const KEYBOARD_LAYOUT_OPTIONS: {
  id: KeyboardLayoutId;
  label: string;
  description: string;
}[] = [
  { id: 'qwerty', label: 'QWERTY', description: 'US / UK' },
  { id: 'qwertz', label: 'QWERTZ', description: 'DE / Central EU' },
  { id: 'azerty', label: 'AZERTY', description: 'FR / BE' },
  { id: 'abc', label: 'A–Z', description: 'Alphabetical' },
];

/**
 * Rows for the in-game letter keyboard.
 * Empty string `''` is a half-width spacer (QWERTY / QWERTZ / ABC middle row).
 * ENTER / BACKSPACE are action keys rendered wider.
 */
export const KEYBOARD_LAYOUTS: Record<KeyboardLayoutId, string[][]> = {
  qwerty: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
  ],
  qwertz: [
    ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P'],
    ['', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
  ],
  azerty: [
    ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    ['ENTER', 'W', 'X', 'C', 'V', 'B', 'N', 'BACKSPACE'],
  ],
  abc: [
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    ['', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S'],
    ['ENTER', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'BACKSPACE'],
  ],
};

export function getKeyboardRows(layout: KeyboardLayoutId): string[][] {
  return KEYBOARD_LAYOUTS[layout] ?? KEYBOARD_LAYOUTS.qwerty;
}

export function getKeyboardKeys(layout: KeyboardLayoutId): string[] {
  return getKeyboardRows(layout)
    .flat()
    .filter((k) => k !== '');
}
