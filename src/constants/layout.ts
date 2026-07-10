/**
 * Layout tokens — spatial constants used across all screens.
 *
 * Updated 2026-07-10: increased border radii for playful, rounded feel.
 * Tile and keyboard key border radii bumped from 6 → 8 for softer edges.
 * Card and button radii are defined here as reference but applied via
 * component styles (Button, StatCard, modals).
 */
export const layout = {
  // ── Tile dimensions ──
  tileSize: 56,
  tileGap: 4,
  tileBorderRadius: 8,        // was 6 — more rounded, playful

  // ── Keyboard dimensions ──
  keyboardKeyHeight: 44,
  keyboardKeyMinWidth: 28,
  keyboardKeyGap: 4,
  keyboardKeyBorderRadius: 8, // was 6 — match tiles

  // ── Component radii (reference values) ──
  cardBorderRadius: 16,       // was 12 — softer cards
  buttonBorderRadius: 20,     // was 12 — pill-shaped buttons
  modalBorderRadius: 24,      // was 16-20 — softer modals

  // ── Screen layout ──
  screenPadding: 20,
  headerHeight: 56,
  maxTileCount: 10,
} as const;
