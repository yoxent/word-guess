/**
 * Animation timing constants (tunable after Phase 2 per D-31).
 *
 * All tile animations run on the UI thread via Reanimated 4.x worklets.
 * Change values in this file — all components pick up new timing.
 */

/** Tile flip duration in ms (200ms = fast/snappy per D-28) */
export const TILE_FLIP_DURATION = 200;

/** Stagger delay between consecutive tiles in ms (left-to-right) */
export const TILE_STAGGER_DELAY = 50;

/** Scale bounce animation duration for correct tiles: scale-up phase in ms */
export const TILE_BOUNCE_SCALE_UP = 100;

/** Scale bounce animation duration for correct tiles: scale-down phase in ms */
export const TILE_BOUNCE_SCALE_DOWN = 100;

/** Total combined correct bounce duration (scale-up + scale-down) */
export const TILE_BOUNCE_TOTAL = TILE_BOUNCE_SCALE_UP + TILE_BOUNCE_SCALE_DOWN;

/** Correct tile scale peak value — bumped 1.15 → 1.2 for more playful bounce (Phase 4) */
export const TILE_BOUNCE_MAX = 1.2;

/** Resting scale value */
export const TILE_BOUNCE_NORMAL = 1.0;

/** Buffer added after all tile animations complete before unblocking keyboard */
export const ANIMATION_COMPLETION_BUFFER = 50;

/** Maximum possible extra time added for correct tile bounce */
export const TILE_CORRECT_BOUNCE_EXTRA = TILE_BOUNCE_TOTAL;

/** Confetti particle count */
export const CONFETTI_PARTICLE_COUNT = 40;

/** Confetti animation duration in ms */
export const CONFETTI_DURATION = 1500;

/** Confetti stagger delay between particles in ms */
export const CONFETTI_STAGGER_DELAY = 15;

// ── Home Screen Stagger Entrance (Phase 6, D-175–D-177) ──

/** Home screen stagger entrance: delay between element groups in ms */
export const HOME_STAGGER_DELAY = 80;

/** Home screen stagger entrance: fade+slide duration per element in ms */
export const HOME_STAGGER_DURATION = 300;
