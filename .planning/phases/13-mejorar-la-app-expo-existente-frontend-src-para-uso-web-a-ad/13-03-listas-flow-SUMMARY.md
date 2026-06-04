---
phase: 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
plan: 03
subsystem: ui
tags: [react-native-web, responsive, drag-drop, csv-export, clipboard, deep-linking, lists]

# Dependency graph
requires:
  - 13-01-foundation-layout
  - 13-02-foundation-web-utils-linking
provides:
  - "ListsScreen — centered max-width 600 list on tablet/desktop + hover/focus on cards (web)"
  - "TemplatesScreen — responsive grid (3/2/1 cols via numColumns+key) + hover, centered 1000px"
  - "OCRScreen — centered content max-width 560 on >=768px + accessible pickers"
  - "ListDetailScreen — web export .txt + share-URL (clipboard) + Enter-to-add + Esc-to-close"
  - "ListDetailScreen.web.tsx — HTML5 drag-reorder (optimistic, session-only) variant"
  - "RouteScreen — two-column (stops left / summary right) on desktop + export route .txt + hover"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hover via onMouseEnter/onMouseLeave + local state, @ts-ignore for web-only props (Pattern 3/B)"
    - "FlatList numColumns requires key={numColumns} to avoid RN runtime error"
    - "Esc-to-close via document keydown listener in Platform.OS==='web'-guarded useEffect (cleanup on unmount)"
    - "HTML5 DragEvents: onDragOver MUST call e.preventDefault() or onDrop never fires (Pitfall 6)"
    - "Drag reorder mutates LOCAL React state only (session-only); no listService/order-PATCH (deferred)"
    - "RouteScreen desktop two-column via IIFE rendering shared hero/stops/actions blocks to keep mobile order byte-for-byte"

key-files:
  created:
    - "frontend/src/screens/lists/ListDetailScreen.web.tsx"
  modified:
    - "frontend/src/screens/lists/ListsScreen.tsx"
    - "frontend/src/screens/lists/TemplatesScreen.tsx"
    - "frontend/src/screens/lists/OCRScreen.tsx"
    - "frontend/src/screens/lists/ListDetailScreen.tsx"
    - "frontend/src/screens/lists/RouteScreen.tsx"
---

# 13-03 — Listas flow (Wave 1)

## What was built

The four web-improvement categories applied across the five Listas-cluster screens, plus the
new drag-drop `.web.tsx` divergence (D-10):

- **Task 1 — ListsScreen / TemplatesScreen / OCRScreen (D-05/D-06):** responsive centering
  (600 / 1000 / 560 max-widths), TemplatesScreen responsive grid (3/2/1 columns via `numColumns`
  + `key={numColumns}`), hover tint (`colors.primaryTint`) on cards, web focus ring on ListsScreen
  cards, and accessible OCR picker buttons. Mobile layouts unchanged.
- **Task 2 — ListDetailScreen + ListDetailScreen.web.tsx (D-07/D-06/D-10):**
  - Shared `.tsx`: web-only "Exportar lista" (.txt download), "Compartir" (copies `window.location.href`
    to clipboard, 1.5s success feedback), Enter-to-add (existing `onSubmitEditing`) + "Pulsa Enter
    para añadir" hint, and an Esc-to-close keydown listener.
  - New `.web.tsx`: complete web variant resolved by Metro over `.tsx`. Renders the item list with
    HTML5 drag handles (`draggable`/`onDragStart`/`onDragOver`+preventDefault/`onDrop`), lifting the
    dragged row with `shadows.elevated`. Reorder is **optimistic and session-only** — it mutates a
    local `order: string[]` state and never calls `listService` for ordering. Item CRUD (toggle, qty,
    delete, quick-add) reuses `listService` exactly like the native screen.
- **Task 3 — RouteScreen (D-05/D-07):** desktop two-column layout (stops list left, hero summary +
  action buttons right) implemented with an IIFE that renders shared `heroCard`/`stopsList`/`actions`
  blocks so the mobile stacked order is preserved byte-for-byte. Added web-only "Exportar ruta" (.txt
  with ordered stops + products + totals) and hover tint on stop rows.

## Scope note — drag-drop persistence deferred

Per the plan SCOPE NOTE, backend persistence of item order is **out of scope for Phase 13**. It would
require exposing the `ordering` column in `ShoppingListItemSerializer` and a reorder method in
`listService.ts`; both are deferred. No backend file and no `listService.ts` were modified. The
reordered array lives only in the web screen's React state and resets on remount.

## Tests / verification

- `npx jest "ListDetail|ListsScreen"` green (13 ListsScreen assertions, no regression).
- `npx jest --passWithNoTests RouteScreen` exits 0.
- eslint clean on all six touched files.
- `grep -rc "frontend/web" frontend/src/screens/lists/` → 0 across all files.
- No `updateItemOrder` / order-PATCH call introduced.

## Notes / deviations

- Executed inline on the main tree (worktrees disabled after the Wave 0 corruption — see
  feedback_worktrees_disabled). Committed per task.
- RouteScreen has no embedded map (it opens Google Maps externally), so the UI-SPEC "map right"
  column was realized as the hero summary + action buttons column on desktop.
