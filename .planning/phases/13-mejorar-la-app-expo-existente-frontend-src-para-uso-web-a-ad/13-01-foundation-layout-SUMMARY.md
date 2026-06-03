---
phase: 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
plan: 01
subsystem: ui
tags: [react-native-web, responsive, breakpoint, master-detail, tooltip, tab-bar]

# Dependency graph
requires: []
provides:
  - "useBreakpoint(): Breakpoint — mobile|tablet|desktop from useWindowDimensions (1024/768 thresholds, 0-guard)"
  - "MasterDetailLayout — split-pane on desktop (360px master + 1px divider + flex detail), single pane on mobile/tablet"
  - "WebTooltip — web-only hover label (400ms), passthrough on native"
  - "BottomTabBar desktop restyle — maxWidth 900 centered, effective-26px icons via 26/24 scale (no MainTabs edit)"
affects:
  - 13-03-listas-flow
  - 13-04-mapa-tiendas-flow
  - 13-05-catalogo-precios-flow
  - 13-06-asistente-notif-flow

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useBreakpoint hook centralizes width-based layout branching for all in-scope screens"
    - "MasterDetailLayout takes breakpoint as a prop (callers own the hook call) — keeps it pure/testable"
    - "WebTooltip uses Platform.OS !== 'web' guard + @ts-ignore for web-only onMouseEnter/onMouseLeave"
    - "BottomTabBar scales the pre-rendered icon node (26/24) instead of editing MainTabs Ionicons size"

key-files:
  created:
    - "frontend/src/hooks/useBreakpoint.ts"
    - "frontend/src/components/ui/MasterDetailLayout.tsx"
    - "frontend/src/components/ui/WebTooltip.tsx"
    - "frontend/src/__tests__/hooks/useBreakpoint.test.ts"
    - "frontend/src/__tests__/components/ui/MasterDetailLayout.test.tsx"
    - "frontend/src/__tests__/components/ui/WebTooltip.test.tsx"
    - "frontend/src/__tests__/components/ui/BottomTabBar.test.tsx"
  modified:
    - "frontend/src/components/ui/index.ts"
    - "frontend/src/components/ui/BottomTabBar.tsx"
---

# 13-01 — Foundation Layout (Wave 0)

## What was built

The three shared web-foundation primitives every Wave-1 flow plan depends on, plus the
desktop restyle of the existing `BottomTabBar`:

1. **`useBreakpoint`** (D-09) — returns `mobile | tablet | desktop` from `useWindowDimensions`
   (thresholds 1024 desktop, 768 tablet; `width === 0` guards to mobile for SSR/first render).
2. **`MasterDetailLayout`** (D-05) — renders a split pane (360px master + 1px divider + flex
   detail) on desktop, a single full-width master pane on mobile/tablet. Takes `breakpoint`
   as a prop so it stays pure and testable.
3. **`WebTooltip`** (D-06) — web-only hover tooltip that appears after a 400ms delay; on native
   it is a transparent passthrough (`Platform.OS !== 'web'` guard).
4. **`BottomTabBar` restyle** (D-12) — on desktop the bar centers with `maxWidth: 900` and
   enlarges icons to an effective 26px by scaling the pre-rendered icon node by 26/24 (icons are
   created at 24px by `MainTabs.tsx`, which was NOT edited). Mobile rendering is unchanged.

Both new components are re-exported from the `@/components/ui` barrel.

## Tests

7 test files / 37 assertions green (`useBreakpoint`, `MasterDetailLayout`, `WebTooltip`,
`BottomTabBar`, plus the pre-existing Wave-0 `webUtils` and `linking` suites). eslint clean on
all touched source files. `MainTabs.tsx` untouched.

## Notes / deviations

- This plan was originally dispatched as a parallel worktree agent, but worktree isolation
  failed on this Windows + OneDrive setup (stale-base branches, work leaking into the main tree).
  Only Task 1 (`useBreakpoint`) had been committed before the agent hit a session limit. Tasks 2–3
  were completed inline on the main working tree (which is also the corruption root-cause fix).
- Icon enlargement is delivered by node scaling (26/24) rather than an `Ionicons size` prop, per
  the plan's architecture note — `BottomTabBar` does not own the `<Ionicons>` element.
