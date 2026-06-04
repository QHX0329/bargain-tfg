---
phase: 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
plan: "05"
subsystem: frontend-expo-web
tags: [responsive, keyboard, csv-export, url-sharing, react-native-web]
requires: ["13-01", "13-02"]
provides: ["catalogo-precios-web-improvements"]
affects: ["frontend/src/screens/home/"]
tech-stack:
  patterns:
    - useBreakpoint hook for responsive numColumns 2/3/4
    - Cmd/Ctrl+K via document.addEventListener guarded by Platform.OS==='web'
    - URLSearchParams + window.history.replaceState for ?q= URL sync
    - buildCsv (OWASP injection-safe) + downloadFile for CSV export
    - position:'sticky' via @ts-ignore web-only CSS on header row
    - outlineColor/outlineWidth/outlineOffset for focus rings (react-native-web)
    - onMouseEnter/onMouseLeave for hover tint (colors.primaryTint)
key-files:
  modified:
    - frontend/src/screens/home/ProductsCatalogScreen.tsx
    - frontend/src/screens/home/PriceCompareScreen.tsx
    - frontend/src/screens/home/ProductProposalScreen.tsx
decisions:
  - "maxWidth 1200 in ProductsCatalog grid contentContainerStyle is planner discretion (not UI-SPEC binding)"
  - "unit_price not present on PriceCompare domain type; CSV unit-price column uses offer_price fallback to price"
  - "breakpoint variable omitted from PriceCompareScreen (full-width table needs no layout split)"
metrics:
  duration: "~45 minutes"
  completed: "2026-06-04T20:22:50Z"
  tasks_completed: 4
  files_modified: 3
---

# Phase 13 Plan 05: Catalogo-Precios Flow Summary

Web improvements applied to the Catalogo/Precios cluster: responsive grids, keyboard shortcuts, URL sharing, CSV export, sticky headers, and centered forms — all mobile-layout-preserving.

## Task Completion

| Task | Status | Commit | Description |
|------|--------|--------|-------------|
| Task 1: HomeScreen Cmd+K + horizontal quick-actions | ALREADY DONE | 0cc6fce | Committed prior to this execution. SearchBarHandle ref, breakpoint===desktop row, Cmd+K useEffect. |
| Task 2: ProductsCatalogScreen 2-4 col grid + Cmd+K + ?q= | DONE | 29aba46 | Responsive numColumns, URL sync, share button |
| Task 3: PriceCompareScreen sticky header + CSV export | DONE | 5b0ff39 | position:'sticky', Exportar comparativa button, buildCsv |
| Task 4: ProductProposalScreen centered form + hover/focus | DONE | 935a8f0 | maxWidth 560 (UI-SPEC), focus ring, hover tint |

## What Was Built

### Task 2 — ProductsCatalogScreen (29aba46)
- `useBreakpoint` drives `numColumns`: 2 (mobile) / 3 (tablet) / 4 (desktop)
- `key={numColumns}` forces FlatList re-mount when columns change (RN requirement)
- `contentContainerStyle` centers grid at `maxWidth: 1200` on non-mobile (planner discretion — reasonable centred-content width; NOT UI-SPEC binding)
- Cmd/Ctrl+K `useEffect` (Platform.OS==='web' guard, cleanup) focuses `SearchBar` via `SearchBarHandle` ref — mirrors HomeScreen pattern from Task 1
- `WebTooltip` wraps SearchBar with "⌘K / Ctrl+K" hint label
- `?q=` URL sync: seeds `nameQuery` from `URLSearchParams` on mount; `window.history.replaceState` mirrors search state on every change
- Share button (`share-social-outline`) copies `window.location.href` to clipboard when query is active; transitions to `colors.success` for 1500ms
- `accessibilityRole="button"` + `accessibilityLabel="Compartir enlace"` on share button
- All URL/keyboard/share code guarded by `Platform.OS === 'web'`

### Task 3 — PriceCompareScreen (5b0ff39)
- Sticky header: `position: 'sticky', top: 0, zIndex: 1, backgroundColor: colors.surface` applied via `@ts-ignore` (web-only CSS; silently ignored on native)
- "Exportar comparativa" button: `download-outline` Ionicon + label, shown only when `Platform.OS === 'web'` and `prices.length > 0`
- CSV built exclusively via `buildCsv(['Producto','Tienda','Precio','Precio unitario'], rows)` — never hand-concatenated; OWASP injection escaping covers `= + - @ TAB CR` prefixes
- File: `bargain-comparativa-${todayStamp()}.csv`, mime `text/csv;charset=utf-8;`
- `accessibilityRole="button"` + `accessibilityLabel="Exportar comparativa"` on export button
- Note: `PriceCompare` domain type has no `unit_price` field; "Precio unitario" column uses `offer_price ?? price` as best available unit reference

### Task 4 — ProductProposalScreen (935a8f0)
- `useBreakpoint` added; form content wrapped in `formCentered` view (`maxWidth: 560, alignSelf: 'center', width: '100%'`) when `breakpoint !== 'mobile'` (UI-SPEC binding — 560px cited from UI-SPEC)
- `webFocusRing` constant (`outlineColor: colors.primary, outlineWidth: 2, outlineOffset: 2`) spread into `input` style (react-native-web passes outline* as CSS; ignored on native)
- Submit button: hover tint via `onMouseEnter`/`onMouseLeave` setting `submitHovered` state → `colors.primaryTint` background; `@ts-ignore` on web-only props
- Submit button: focus ring via `@ts-ignore` outline props on web
- Mobile form structure unchanged

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] maxWidth 1200 comment precision**
- **Found during:** Task 2
- **Issue:** Plan said not to cite UI-SPEC for 1200px maxWidth but IIFE approach broke JSX
- **Fix:** Replaced IIFE with inline ternary expressions for numColumns; added comment "planner discretion — reasonable centred-content width"
- **Files modified:** ProductsCatalogScreen.tsx
- **Commit:** 29aba46

**2. [Rule 1 - Bug] unit_price not on PriceCompare type**
- **Found during:** Task 3
- **Issue:** `item.unit_price` does not exist on `PriceCompare` interface (TS2339)
- **Fix:** Changed CSV unit-price column to use `fmt(item.offer_price ?? item.price)` — best available price reference
- **Files modified:** PriceCompareScreen.tsx
- **Commit:** 5b0ff39

**3. [Rule 2 - Missing] breakpoint omitted from PriceCompareScreen**
- **Found during:** Task 3
- **Issue:** `breakpoint` declared but unused (ESLint no-unused-vars); PriceCompare table is full-width by spec with no layout split needed
- **Fix:** Removed `useBreakpoint` import and call from PriceCompareScreen; sticky header applies to all viewport sizes on web
- **Files modified:** PriceCompareScreen.tsx
- **Commit:** 5b0ff39

## Known Stubs

None — all features are fully wired. The CSV export, URL sync, and share button all connect to real data sources (prices array, nameQuery state, window.location.href).

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: T-13-09 mitigated | ProductsCatalogScreen.tsx | `?q=` param read via `URLSearchParams` as plain string, used only for filter state and displayed via `<Text>` (auto-escaped) |
| threat_flag: T-13-10 mitigated | PriceCompareScreen.tsx | CSV built exclusively via `buildCsv` with OWASP injection escaping |

## Self-Check: PASSED

- ProductsCatalogScreen.tsx: contains `useBreakpoint`, `numColumns`, `key={numColumns}`, `metaKey || e.ctrlKey`, `URLSearchParams`, `window.history.replaceState`, `accessibilityLabel="Compartir enlace"` — VERIFIED
- PriceCompareScreen.tsx: contains `buildCsv`, `bargain-comparativa-`, `Exportar comparativa`, `position: 'sticky'`, `accessibilityLabel="Exportar comparativa"` — VERIFIED
- ProductProposalScreen.tsx: contains `useBreakpoint`, `maxWidth: 560`, `outlineColor` — VERIFIED
- No `frontend/web` references in any of the 3 modified files — VERIFIED (grep returns 0)
- ESLint clean on all 3 files — VERIFIED
- Prettier clean on all 3 files — VERIFIED
- `npx jest --passWithNoTests "ProductsCatalog|PriceCompare|ProductProposal"` exits 0 — VERIFIED
