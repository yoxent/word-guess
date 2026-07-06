# Phase 2: Core Gameplay - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-04
**Phase:** 2-Core Gameplay
**Areas discussed:** Daily seed obfuscation, Tile animation feel, Sound effects sourcing, Endless mode result flow, Free Play / Daily length picker

---

## Daily Seed Obfuscation

| Option | Description | Selected |
|--------|-------------|----------|
| A - JNI native layer | Split seed across JS + native Kotlin/C++ via JNI, derive part from app signing key. More secure but adds Kotlin/JNI complexity. | |
| B - Multi-source hash | Package name + version + non-obvious constant. Simpler, no JNI. Accepts determined attackers can extract but raises bar for casual cheating. | ✓ |

**User's choice:** B
**Notes:** ProGuard/R8 minification enabled. No native layer needed. Goal is to block casual cheating, not nation-state threat models.

---

## Tile Animation Feel

| Option | Description | Selected |
|--------|-------------|----------|
| A - Fast/snappy | 200ms flip, tighter stagger (50-80ms). Tunable later. | ✓ |
| B - Standard Wordle-paced | 300ms flip, relaxed stagger. | |
| C - Custom | User had specific timing in mind. | |

**User's choice:** A (fast/snappy) + confetti on win
**Notes:** Win state gets a Reanimated-based confetti particle burst. The typegpu-confetti library was evaluated but rejected for now (v0.3.0, WebGPU on Android still experimental). Animation timing constants should be tunable.

---

## Sound Effects Sourcing

| Option | Description | Selected |
|--------|-------------|----------|
| A - Free SFX libraries | freesound.org, mixkit.co — royalty-free files. | |
| B - Generated tones | Programmatic simple tones. | |
| C - User provides | Developer will add sound files separately. | ✓ |

**User's choice:** C (deferred — user adds files later)
**Notes:** SoundService created as a no-op stub with the expected API surface. No sound files in Phase 2.

---

## Endless Mode Result Flow

| Option | Description | Selected |
|--------|-------------|----------|
| A - Brief streak overlay | "Streak: N!" overlay, auto-load next word. | |
| B - Show result briefly | Auto-advance after brief result display. | |
| C - Manual "Play Next" | Play Next button after result. | |
| D - Modal with definition | Results + word definition in a modal, manual "Play Next". | ✓ |

**User's choice:** D (modal with definition)
**Notes:** The definition requires updating the dictionary preprocessing to include definitions. This also means the ResultScreen concept converts to a modal overlay used by all game modes (not just Endless). Free Play / Random / Daily also use the same modal pattern.

---

## Free Play / Daily Length Picker

| Option | Description | Selected |
|--------|-------------|----------|
| A - Horizontal scroll | 6 numbered buttons in a row. | |
| B - Slider | Slider from 5-10. | |
| C - Modal/grid picker | Grid or modal after tapping mode button. | ✓ |

**User's choice:** C (modal/grid picker)
**Notes:** Daily Challenge gets 6 puzzles per day (one per word length). Each length is independently playable. Once a daily game reaches win/loss for a given length, that length is disabled for the day. In-progress games are saved and resumed on return. If continuing in the same session, reuse word length. Going to HomeScreen resets to picker. Completed daily lengths show as disabled with checkmark.

---

## Claude's Discretion

- Precise component file structure for game components
- Layout/spacing details (use existing constants)
- Confetti particle count, colors, spread pattern
- Daily word hash algorithm (DJB2 or similar)
- Standard loading states, error toasts

## Deferred Ideas

- **typegpu-confetti** — GPU-accelerated confetti deferred until the library matures and WebGPU on Android stabilizes
- **Sound files** — Developer to source and add separately
