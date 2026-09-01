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
 * Letter rows only — Keyboard renders Submit (75%) and Delete (25%) in a bar
 * above the letters (internal key codes still `ENTER` / `BACKSPACE`).
 * Empty string `''` is ignored; Keyboard centers shorter rows with equal-width letter keys.
 */
export const KEYBOARD_LAYOUTS: Record<KeyboardLayoutId, string[][]> = {
  qwerty: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ''],
    ['', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ''],
  ],
  qwertz: [
    ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P'],
    ['', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ''],
    ['', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', ''],
  ],
  azerty: [
    ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    ['', 'W', 'X', 'C', 'V', 'B', 'N', ''],
  ],
  abc: [
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    ['', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', ''],
    ['', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', ''],
  ],
};

/** Action keys always present (order: backspace then submit). */
export const KEYBOARD_ACTION_KEYS = ['BACKSPACE', 'ENTER'] as const;

export function getKeyboardRows(layout: KeyboardLayoutId): string[][] {
  return KEYBOARD_LAYOUTS[layout] ?? KEYBOARD_LAYOUTS.qwerty;
}

export function getKeyboardKeys(layout: KeyboardLayoutId): string[] {
  return [
    ...getKeyboardRows(layout).flat().filter((k) => k !== ''),
    ...KEYBOARD_ACTION_KEYS,
  ];
}
