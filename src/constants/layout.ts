export const layout = {
  tileSize: 56,
  tileGap: 4,
  tileBorderRadius: 6,
  keyboardKeyHeight: 44,
  keyboardKeyMinWidth: 28,
  keyboardKeyGap: 4,
  keyboardKeyBorderRadius: 6,
  /**
   * Standard screen-edge padding applied to all screens (top/right/bottom/left).
   * 2026-07-09: bumped from 16 to 20 — the user found the settings icons
   * and content too close to the screen edge at 16.
   */
  screenPadding: 20,
  headerHeight: 56,
  maxTileCount: 10,
} as const;
