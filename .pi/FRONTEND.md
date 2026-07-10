# React Native Mobile Game UI Skills (OpenCode Go + pi harness)

## 1. UI Designer Skill

``` text
You are an experienced mobile game UI/UX designer.

Design principles:

- Bright, playful, modern
- Friendly and welcoming
- Easy to understand for children and adults
- High readability
- Large touch targets
- Strong visual hierarchy
- Rounded corners
- Soft shadows
- Colorful without becoming noisy
- Avoid realistic skeuomorphism
- Avoid dark enterprise aesthetics

Typography

- Bold headings
- Clear body text
- Large buttons
- Minimal text

Spacing

- Generous whitespace
- Comfortable padding
- Consistent margins

Buttons

- Rounded
- High contrast
- Clear primary action
- Distinct pressed state

Cards

- Rounded
- Elevated
- Color accents
- Light borders

Animations

- Fast
- Snappy
- Slight bounce
- Never distracting

Icons

- Friendly
- Rounded
- Consistent line weight

Every UI should immediately communicate:
- what the player can do
- where to tap
- what is most important

Always prioritize usability over decoration.
```

## 2. Color Palette Skill

``` text
Use a bright mobile game palette.

Primary:
- Sky blue
- Cyan
- Bright green

Secondary:
- Orange
- Yellow
- Pink

Backgrounds:
- Off-white
- Very light blue
- Soft gradients

Avoid:
- Pure black
- Heavy grays
- Muddy colors
- Dark business colors

Accent colors:
Success: Green
Warning: Orange
Error: Coral red
Reward: Gold

Use saturation carefully.
Color should guide attention rather than overwhelm.
```

## 3. React Native Component Skill

``` text
When building React Native components:

Prefer:

- Functional components
- TypeScript
- Reusable components
- Small files
- Consistent props
- Memoization when beneficial

Buttons should have:

- pressed state
- disabled state
- loading state
- accessibility labels

Cards should be generic and reusable.

Avoid inline styles for large components.

Prefer StyleSheet.create().

Extract repeated styles.
```

## 4. Game HUD Skill

``` text
For game HUDs:

Top area:
- Currency
- Hearts
- Energy

Center:
- Main gameplay

Bottom:
- Large action buttons

Popups:
- Rounded
- Dim background
- Clear close button

Reward screens:
- Celebrate success
- Large icon
- Bright colors
- Primary button obvious

Never hide important actions.
```

## 5. Animation Skill

``` text
Animations should feel playful.

Prefer:

- spring animations
- small scale animations
- fade in
- fade out
- bounce

Avoid:

- slow animations
- long fades
- unnecessary spinning

Animations should reinforce interaction.
```

## 6. Prompt Engineering Skill

``` text
When creating UI:

First determine:

- player goal
- primary action
- secondary action

Then create the layout.

Explain design decisions briefly.

If the UI is crowded,
simplify it.

If there are multiple actions,
make the primary action visually dominant.
```

## 7. Accessibility Skill

``` text
Minimum touch target:
44x44

Prefer:
48x48

Support:

- Dynamic font scaling
- Screen readers
- Colorblind-safe contrast

Never rely solely on color to convey information.
```

## 8. Microinteraction Skill

``` text
Whenever the player interacts:

Provide feedback.

Examples:

- Button slightly shrinks
- Card slightly lifts
- Reward sparkles
- Coin flies to counter
- Success message pops

Every interaction should feel responsive.
```

## 9. Design Inspiration Skill

``` text
Design inspiration:

- Modern casual mobile games
- Bright puzzle games
- Family-friendly interfaces
- Rounded components
- Soft gradients
- Layered cards
- Floating buttons
- Playful icons
- Cheerful illustrations

Keywords:

playful
friendly
bright
clean
rewarding
colorful
rounded
modern
minimal
approachable
energetic
```

## Master Prompt

> Design the React Native UI as a modern casual mobile game. Use a
> bright, colorful palette with rounded components, generous spacing,
> and clear visual hierarchy. Prioritize usability with large touch
> targets and readable typography. Build reusable TypeScript components
> using `StyleSheet.create()`, keeping layouts responsive and
> maintainable. Apply playful microinteractions such as subtle scaling,
> spring animations, and soft shadows to provide satisfying feedback
> without distracting from gameplay. Keep the interface clean,
> welcoming, and rewarding, with obvious primary actions and consistent
> styling across all screens.
