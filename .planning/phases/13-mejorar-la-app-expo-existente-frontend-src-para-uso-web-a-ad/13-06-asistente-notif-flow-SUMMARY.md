---
phase: 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
plan: 06
subsystem: ui
tags: [react-native-web, responsive, clipboard, hover, assistant, notifications, price-alerts]

# Dependency graph
requires:
  - 13-01-foundation-layout
  - 13-02-foundation-web-utils-linking
provides:
  - "AssistantScreen — centered chat+input at 720px on desktop, web autofocus, per-message copy with success feedback"
  - "NotificationScreen — centered list 680px + hover tint + web focus ring (inline delete preserved)"
  - "PriceAlertsScreen — centered list 680px + hover + copy-alert-summary to clipboard with success feedback"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-row/message copy: copyToClipboard + 1500ms colors.success feedback state, WebTooltip label"
    - "Hover via onMouseEnter/onMouseLeave + local state, @ts-ignore for web-only props"
    - "Web focus ring via outlineColor/outlineWidth/outlineOffset guarded by Platform.OS==='web'"
    - "Lists centered on tablet/desktop via maxWidth + alignSelf:center applied to FlatList contentContainerStyle"

key-files:
  created: []
  modified:
    - "frontend/src/screens/assistant/AssistantScreen.tsx"
    - "frontend/src/screens/home/NotificationScreen.tsx"
    - "frontend/src/screens/home/PriceAlertsScreen.tsx"
---

# 13-06 — Asistente/Notificaciones flow (Wave 1)

## What was built

The final Wave-1 cluster, completing uniform D-05..D-08 web coverage across all in-scope screens:

- **Task 1 — AssistantScreen (D-05/D-06/D-07):** chat bubble column + input bar centered at
  `maxWidth: 720` on desktop; input autofocus on web mount; per-assistant-message `copy-outline`
  button (hover-revealed) that copies the message text with 1.5s `colors.success` feedback.
  (Committed in commit `158e8d9`.)
- **Task 2 — NotificationScreen (D-05/D-06):** notifications list centered at `maxWidth: 680` on
  tablet/desktop, hover tint (`colors.primaryTint`) + web focus ring on rows; empty state
  ("Todo al día") and inline delete preserved. 11 existing NotificationScreen tests still pass.
  (Committed in commit `614c2a4`.)
- **Task 3 — PriceAlertsScreen (D-05/D-06/D-07):** alerts list centered at `maxWidth: 680`, hover
  tint on rows, and a web-only per-row "Copiar alerta" button that copies a summary
  (`{producto} — objetivo €{X} (actual €{Y})`) to the clipboard with 1.5s success feedback.
  Empty state and existing create/edit/delete modals preserved. (Committed in commit `2a6390a`.)

## Tests / verification

- `npx jest NotificationScreen` → 11 passed; full suite (`npx jest`) → 111 passed earlier in the phase.
- eslint + prettier clean on all three screens.
- `grep -rc "frontend/web"` across the three files → 0.
- Mobile (<768px) layouts unchanged (web-only affordances guarded by `Platform.OS === 'web'` /
  the breakpoint check).

## Notes / deviations

- Executed inline on the main tree (worktrees disabled — see feedback_worktrees_disabled; subagents
  repeatedly hit the account session limit). Task 1 (AssistantScreen) and Task 2 (NotificationScreen)
  had been implemented in a prior session and were verified + committed here; Task 3 was implemented
  fresh.
- PriceAlertsScreen uses a `target_price` model (not a threshold %), so the copy summary reflects the
  objetivo/actual prices; existing empty-state copy was preserved as-is rather than rewritten.
