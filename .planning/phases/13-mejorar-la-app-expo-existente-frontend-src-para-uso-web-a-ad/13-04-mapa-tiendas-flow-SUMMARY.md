---
phase: 13
plan: "04"
subsystem: frontend/src/screens/map + frontend/src/screens/home
tags: [responsive, web, desktop, hover, clipboard, share-url, master-detail]
dependency_graph:
  requires: ["13-01", "13-02"]
  provides: [map-store-cluster-web-enhancements]
  affects: [MapScreen.web.tsx, StoreProfileScreen.tsx, FavoriteStoresScreen.tsx]
tech_stack:
  added: []
  patterns:
    - useBreakpoint for breakpoint-driven layout branching
    - onMouseEnter/onMouseLeave + @ts-ignore for hover states
    - Platform.OS === 'web' guard for clipboard/share features
    - copyToClipboard from @/utils/webExport with 1500ms green feedback
    - FlatList numColumns + key change for responsive grid
key_files:
  created: []
  modified:
    - frontend/src/screens/map/MapScreen.web.tsx
    - frontend/src/screens/map/StoreProfileScreen.tsx
    - frontend/src/screens/home/FavoriteStoresScreen.tsx
decisions:
  - "Desktop right-side panel in MapScreen.web.tsx: 320px fixed width with left border divider; map fills flex:1"
  - "StoreProfileScreen desktop: two-column row split using flex:1 on each side, spacing.xl (32px) gap via borderLeft + paddingLeft"
  - "FavoriteStoresScreen maxWidth 900 for centered grid — planner discretion, not a UI-SPEC binding value"
  - "Hover on StoreCard in FavoriteStoresScreen applied to outer View wrapper, not TouchableOpacity, to cover full card area"
metrics:
  duration_minutes: 11
  completed_date: "2026-06-04"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 3
  files_created: 0
---

# Phase 13 Plan 04: Mapa/Tiendas Flow Summary

**One-liner:** Desktop right-side map panel (320px), two-column StoreProfile, and responsive 2-col favorites grid with hover/copy/share web affordances.

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | MapScreen.web.tsx right-side panel on desktop (D-05) | `9e69178` | `MapScreen.web.tsx` |
| 2 | StoreProfileScreen two-column + copy address + share URL (D-05/D-07/D-08) | `579028f` | `StoreProfileScreen.tsx` |
| 3 | FavoriteStoresScreen responsive grid + hover (D-05/D-06) | `7bba739` | `FavoriteStoresScreen.tsx` |

---

## What Was Built

### Task 1 — MapScreen.web.tsx desktop right panel

- Added `useBreakpoint` hook import and `const breakpoint = useBreakpoint()` in the `MapScreen` component.
- On `breakpoint === 'desktop'`: outer container switches to `flexDirection: 'row'` (`containerDesktop`). Map fills `flex: 1` in `mapWrapDesktop`; store panel docks on the RIGHT with `width: 320` (UI-SPEC binding) and `borderLeftWidth: 1 / borderLeftColor: colors.border`.
- On mobile/tablet: existing `flexDirection: 'column'` bottom-panel layout preserved byte-for-byte.
- Store panel content is shared via a `storePanelContent` variable; on desktop the FlatList switches to `horizontal={false}` (vertical scroll) with `storeListContentVertical` style.
- Hover tint (`colors.primaryTint`) added to `StoreCard` via `onMouseEnter`/`onMouseLeave` with `@ts-ignore` (Pitfall 1 from RESEARCH).
- All existing markers, "Buscar en esta zona" pill, error states, and data-fetch logic untouched.

### Task 2 — StoreProfileScreen two-column + copy address + share URL

- Added imports: `Platform`, `useBreakpoint`, `WebTooltip`, `copyToClipboard`.
- Added `breakpoint`, `addressCopied`, `urlCopied`, `handleCopyAddress`, `handleShareUrl` state/callbacks.
- On `breakpoint === 'desktop'`: renders `containerDesktop` (`flexDirection: 'row'`). Left column (`desktopLeft`, `flex: 1`) shows store info in a `ScrollView`. Right column (`desktopRight`, `flex: 1`) shows category filters + `FlatList` products. Column gap is `spacing.xl` (32px) via `paddingLeft: spacing.xl` on the right column (UI-SPEC binding).
- On mobile/tablet: original single-column `FlatList` with `ListHeaderComponent` preserved.
- **Copy address** (D-07): `copy-outline` Ionicon button after address `<Text>`, guarded by `Platform.OS === 'web' && store.address`. Wrapped in `WebTooltip`. On press calls `copyToClipboard(address)`; icon/color flips to `colors.success` + checkmark for 1500ms.
- **Share URL** (D-08): `share-social-outline` button below distance row, guarded by `Platform.OS === 'web'`. Calls `copyToClipboard(window.location.href)`; same green 1500ms feedback.
- Both buttons have `accessibilityRole="button"` and `accessibilityLabel`.

### Task 3 — FavoriteStoresScreen responsive grid + hover

- Added imports: `Platform`, `useBreakpoint`.
- `const numColumns = breakpoint === 'mobile' ? 1 : 2` (UI-SPEC: 2-col on ≥768px).
- FlatList: `numColumns={numColumns}`, `key={numColumns}` (re-mount on column change per RN requirement).
- `contentContainerStyle`: on non-mobile, `maxWidth: 900, alignSelf: 'center', width: '100%'` — planner discretion (reasonable centred-content width, not a UI-SPEC binding).
- `StoreCard` converted from arrow function expression to function body to accommodate `useState` for hover.
- Hover tint (`colors.primaryTint`) on the outer `View` wrapper of `StoreCard` via `onMouseEnter`/`onMouseLeave` + `@ts-ignore`.
- Focus ring (`outlineColor: colors.primary, outlineWidth: 2, outlineOffset: 2`) on the `TouchableOpacity` inside `StoreCard`, guarded by `Platform.OS === 'web'`.
- Empty state copy preserved: "Sin tiendas favoritas" / "Marca tiendas como favoritas desde el mapa para verlas aquí."

---

## Verification Results

- `npx jest "MapScreen|StoreProfile|FavoriteStores" --passWithNoTests`: 7 tests passed (1 suite), 0 failures
- `npx eslint src/screens/map/StoreProfileScreen.tsx src/screens/map/MapScreen.web.tsx src/screens/home/FavoriteStoresScreen.tsx`: clean (no errors, no warnings)
- `grep -rc "frontend/web" [all three files]`: 0 matches in all files
- `MapScreen.tsx` (native): confirmed NOT modified

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing closing `>` on `<TouchableOpacity>` in StoreCard hover edit**
- **Found during:** Task 1
- **Issue:** After adding `onMouseEnter`/`onMouseLeave` props the JSX `>` closing the tag was omitted, causing parse errors (TS1003, TS2657)
- **Fix:** Added the missing `>` on a new line before the card body
- **Files modified:** `MapScreen.web.tsx`
- **Commit:** `9e69178` (folded into task commit)

**2. [Rule 1 - Bug] StoreCard in FavoriteStoresScreen missing closing `};` after converting to function body**
- **Found during:** Task 3
- **Issue:** Converting `StoreCard` from arrow function expression to function body for `useState` left the implicit return structure broken — missing `);` for `return` and `};` for function body
- **Fix:** Added `);` and `};` after the JSX closing tag
- **Files modified:** `FavoriteStoresScreen.tsx`
- **Commit:** `7bba739` (folded into task commit)

---

## Known Stubs

None — all features are fully wired. The `maxWidth: 900` in FavoriteStoresScreen is intentional planner-chosen value (not a stub).

---

## Threat Flags

No new network endpoints, auth paths, or file access patterns introduced. The store address copy and share-URL features copy only server-sourced store data and the app's own URL — both per existing threat model T-13-07 (accepted). No new trust boundary surfaces.

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| Commit `9e69178` (MapScreen.web.tsx) | FOUND |
| Commit `579028f` (StoreProfileScreen) | FOUND |
| Commit `7bba739` (FavoriteStoresScreen) | FOUND |
| `frontend/src/screens/map/MapScreen.web.tsx` | FOUND |
| `frontend/src/screens/map/StoreProfileScreen.tsx` | FOUND |
| `frontend/src/screens/home/FavoriteStoresScreen.tsx` | FOUND |
