# Mobile Controls Draft

`SPIKE-ZERO` is currently tuned for desktop-first play.
This draft keeps the existing combat structure and defines the smallest viable mobile control layer.

## Current Status

- Movement depends on keyboard input in `js/core/boot.js`
- Aim depends on pointer position
- Firing is now auto-fire by default, which helps mobile a lot
- Active skills use `Q / E / R`
- Boost directions use `1 / 2 / 3 / 4`

## Recommended Mobile Layout

### Left Side

- Virtual movement stick
- Drag from a fixed bottom-left pad
- Maps to the same movement vector currently driven by `WASD`

### Right Side

- Aim pad / drag zone
- Player aims toward the current touch point
- Auto-fire stays enabled by default

### Right Edge Buttons

- `Skill 1`
- `Skill 2`
- `Skill 3`

### Lower Center or Right-Bottom Cluster

- `Boost Forward`
- `Boost Left`
- `Boost Right`
- `Boost Back`

## Minimal Implementation Plan

1. Add a `mobile` input mode flag in `GameState`
2. Add a touch joystick state object for move + aim
3. Convert joystick vectors into the same `ax / ay` values used in `updatePlayer()`
4. Map skill buttons to `ActiveSkillSystem.tryUseSlotByKey()`
5. Map boost buttons to `ActiveSkillSystem.tryUseBoostDirection()`
6. Auto-detect coarse pointers and show the mobile HUD only on touch devices

## UX Rules

- Keep auto-fire on by default for mobile
- Do not require tap-to-shoot
- Keep the HUD larger and with more spacing than desktop
- Avoid placing controls near the top HUD
- Allow the aim pad to work from a large right-half touch region

## Not Recommended Yet

- Manual fire button
- Dual-stick with very small dead zones
- Drag-anywhere movement without a visible anchor
- Mobile release before a dedicated HUD pass and performance test

## Suggested Rollout

1. Touch detection + temporary debug joysticks
2. One-stick move + right-side aim pad
3. Skill buttons
4. Boost buttons
5. Mobile HUD polish
6. Device test and balance pass
