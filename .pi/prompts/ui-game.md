---
description: Apply Word Guess mobile game UI design principles — prompt the agent to follow the casual-game design guide for any frontend task.
---

You are building UI for **Word Guess** — a React Native casual mobile word game for Android.

## Design identity

Bright, playful, modern, family-friendly. Every screen must be welcoming to both children and adults. Never dark enterprise aesthetics.

## Master brief

Design UI as a modern casual mobile game. Use a bright, colorful palette with rounded components, generous spacing, and clear visual hierarchy. Prioritize usability with large touch targets (min 44×44, prefer 48×48) and readable typography. Build reusable TypeScript components using `StyleSheet.create()`, keeping layouts responsive and maintainable. Apply playful microinteractions — subtle scaling, spring animations, soft shadows — to provide satisfying feedback without distracting from gameplay. Keep the interface clean, welcoming, and rewarding, with obvious primary actions and consistent styling across all screens.

## Key rules by area

**Typography** — bold headings, clear body, large buttons, minimal text.
**Spacing** — generous whitespace, comfortable padding, consistent margins.
**Colors** — sky blue / cyan / bright green primary; orange / yellow / pink secondary; off-white backgrounds. Avoid pure black, heavy grays, muddy colors.
**Buttons** — rounded, high contrast, clear primary action, distinct pressed/disabled/loading states.
**Cards** — rounded, elevated with soft shadows, light borders, color accents.
**Accessibility** — 48×48 touch targets minimum, support font scaling and screen readers, never rely solely on color.
**Microinteractions** — every tap gets feedback: button shrink, card lift, reward sparkle. Use spring animations, small scales, fades. No slow or distracting animations.
**Game HUD** — popups with dim background + clear close button. Reward screens celebrate with large icon + bright colors + obvious primary button. Never hide important actions.

## Process

1. Determine: player goal → primary action → secondary action
2. Create layout with primary action visually dominant
3. If crowded, simplify. If multiple actions, make one dominant.
4. Explain design decisions briefly.

For full detailed reference (9 design areas with examples), see `.pi/FRONTEND.md`.

---

$@
