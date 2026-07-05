// ── Animation Timing Constants ──
// Tunable after Phase 2 per D-31
// All values in milliseconds unless noted

/** Tile flip duration in ms (200ms = fast/snappy per D-28) */
export const TILE_FLIP_DURATION = 200;

/** Stagger delay between consecutive tiles in ms */
export const TILE_STAGGER_DELAY = 50;

/** Scale bounce animation durations for correct tiles [scaleUp, scaleDown] in ms */
export const TILE_BOUNCE_SCALE_UP = 100;
export const TILE_BOUNCE_SCALE_DOWN = 100;
export const TILE_BOUNCE_TOTAL = TILE_BOUNCE_SCALE_UP + TILE_BOUNCE_SCALE_DOWN; // 200ms

/** Correct tile scale values */
export const TILE_BOUNCE_MAX = 1.15;
export const TILE_BOUNCE_NORMAL = 1.0;

/** Buffer added after all tile animations complete before unblocking keyboard */
export const ANIMATION_COMPLETION_BUFFER = 50;

/** Maximum possible extra time added for correct tile bounce */
export const TILE_CORRECT_BOUNCE_EXTRA = TILE_BOUNCE_TOTAL; // 200ms

/** Confetti particle count */
export const CONFETTI_PARTICLE_COUNT = 40;

/** Confetti animation duration in ms */
export const CONFETTI_DURATION = 1500;

/** Confetti stagger delay between particles in ms */
export const CONFETTI_STAGGER_DELAY = 15;
