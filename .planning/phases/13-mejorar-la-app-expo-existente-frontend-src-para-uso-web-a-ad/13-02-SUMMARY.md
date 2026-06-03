---
phase: 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
plan: 02
subsystem: ui
tags: [react-native-web, react-navigation, deep-linking, csv-export, clipboard, platform-guard]

# Dependency graph
requires: []
provides:
  - "downloadFile(content, filename, mime): void — web-only anchor download, no-op on native"
  - "copyToClipboard(text): Promise<boolean> — navigator.clipboard + execCommand fallback"
  - "buildCsv(headers, rows): string — RFC4180 CSV with OWASP formula-injection guard"
  - "todayStamp(): string — YYYY-MM-DD for bargain-{type}-{date}.{ext} filenames"
  - "linking: LinkingOptions<RootStackParamList> — all 15 D-08 URL paths resolved"
  - "NavigationContainer linked — deep-link URL resolution active in App.tsx"
affects:
  - 13-03-listas-flow
  - 13-04-mapa-tiendas-flow
  - 13-05-catalogo-precios-flow
  - 13-06-asistente-notif-flow

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Platform.OS !== 'web' guard for all browser-only APIs (webA11y.ts precedent extended)"
    - "OWASP CSV injection guard: cells starting with = + - @ prefixed with single quote"
    - "React Navigation linking config mirrors navigator tree: Main > {Tab} > {Stack}"
    - "FavoriteStores registered under HomeTab despite /app/map/favorites URL (Pitfall 8)"
    - "@jest-environment jsdom docblock for tests requiring DOM APIs (document, navigator)"

key-files:
  created:
    - "frontend/src/utils/webExport.ts"
    - "frontend/src/navigation/linking.ts"
    - "frontend/src/__tests__/utils/webUtils.test.ts"
    - "frontend/src/__tests__/navigation/linking.test.ts"
  modified:
    - "frontend/App.tsx"

key-decisions:
  - "Used @jest-environment jsdom docblock (not jest.config testEnvironment) to scope DOM environment only to tests that need it"
  - "FavoriteStores URL is /app/map/favorites but registered under HomeTab.screens (it lives in HomeStack, not MapStack)"
  - "linking.ts prefixes include localhost:8081 (Expo default) in addition to localhost:19006 and bargain.app"
  - "todayStamp() uses new Date().toISOString().slice(0,10) — no date library needed"

patterns-established:
  - "Pattern: All browser DOM/navigator APIs guarded by Platform.OS !== 'web' (non-web returns no-op/false)"
  - "Pattern: CSV escape applied before RFC4180 quoting (injection guard first, then comma/quote wrapping)"
  - "Pattern: LinkingOptions config object exported named as 'linking' from navigation/linking.ts for direct import"

requirements-completed: []

# Metrics
duration: 35min
completed: 2026-06-03
---

# Phase 13 Plan 02: Foundation Web Utils & Linking Summary

**Web download/clipboard/CSV utilities with OWASP injection guard, plus React Navigation deep-linking config wiring 15 screens via NavigationContainer linking prop**

## Performance

- **Duration:** 35 min
- **Started:** 2026-06-03T13:30:00Z
- **Completed:** 2026-06-03T14:05:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `webExport.ts` delivers three web-only utilities (downloadFile, copyToClipboard, buildCsv) and a `todayStamp` helper, all guarded by `Platform.OS !== 'web'` with no-op on native
- CSV builder implements OWASP formula-injection guard (cells starting with `= + - @` prefixed with single quote) plus RFC4180 quoting — unit-tested with 7 cases
- `linking.ts` exports a `LinkingOptions<RootStackParamList>` config mirroring the full Main/Auth navigator tree, mapping all 15 D-08 URL paths including parameterized routes `:listId` and `:storeId`
- `App.tsx` wired with `<NavigationContainer linking={linking}>` — fonts, hydrate, and providers left untouched
- 23 tests total: 13 for webExport (jsdom environment), 10 for linking (URL-to-state, round-trip, structure), all green

## Task Commits

1. **Task 1: webExport util (download, clipboard, CSV-safe)** - `1f9aa08` (feat)
2. **Task 2: Deep-linking config + wire onto NavigationContainer** - `9cf07e9` (feat)

## Files Created/Modified

- `frontend/src/utils/webExport.ts` — downloadFile, copyToClipboard, buildCsv, todayStamp
- `frontend/src/navigation/linking.ts` — LinkingOptions config for all 15 screens
- `frontend/App.tsx` — added `linking` import and `linking={linking}` prop on NavigationContainer
- `frontend/src/__tests__/utils/webUtils.test.ts` — 13 tests (jsdom, Platform.OS guards, CSV injection)
- `frontend/src/__tests__/navigation/linking.test.ts` — 10 tests (URL resolution, round-trip, structure)

## Decisions Made

- Used `@jest-environment jsdom` docblock on tests that access `document`/`navigator` instead of changing the global jest config — avoids affecting other tests that rely on the native (non-jsdom) environment
- FavoriteStores registered under `HomeTab.screens` even though its URL is `/app/map/favorites`; this follows Pitfall 8 from RESEARCH.md since the screen lives in HomeStack not MapStack
- Added `http://localhost:8081` to the `prefixes` array alongside `:19006` since Expo web can run on either port depending on build tool
- Chose static import (not dynamic `import()`) for tests since jest-expo does not support `--experimental-vm-modules` needed by dynamic imports

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added @jest-environment jsdom to test files requiring DOM APIs**

- **Found during:** Task 1 (webUtils test execution — RED phase)
- **Issue:** jest-expo preset runs tests in a non-jsdom environment by default; tests accessing `document.createElement`, `URL.createObjectURL`, and `document.execCommand` threw `ReferenceError: document is not defined`
- **Fix:** Added `@jest-environment jsdom` JSDoc annotation at the top of both test files (webUtils.test.ts and linking.test.ts)
- **Files modified:** `frontend/src/__tests__/utils/webUtils.test.ts`, `frontend/src/__tests__/navigation/linking.test.ts`
- **Verification:** All 23 tests pass after fix
- **Committed in:** `1f9aa08`, `9cf07e9` (part of task commits)

**2. [Rule 1 - Bug] Switched from dynamic import() to static import in tests**

- **Found during:** Task 1 (initial test design)
- **Issue:** First version of tests used `await import('@/utils/webExport')` to reload module per describe block (pattern for Platform.OS mocking); jest-expo threw `TypeError: A dynamic import callback was invoked without --experimental-vm-modules`
- **Fix:** Used static top-level import and `Object.defineProperty(Platform, 'OS', ...)` to mutate Platform.OS per test instead of reloading module
- **Files modified:** `frontend/src/__tests__/utils/webUtils.test.ts`
- **Verification:** All 13 webExport tests pass
- **Committed in:** `1f9aa08`

---

**Total deviations:** 2 auto-fixed (both Rule 1 — test environment bugs)
**Impact on plan:** Both fixes required for correct test execution. No scope creep; no new files beyond plan spec.

## Issues Encountered

- jest-expo preset's default environment (non-jsdom) is not documented prominently — discovered via test failure message pointing to the `@jest-environment` solution. Resolved by adding the docblock annotation rather than changing global jest config to preserve native-platform test behavior for other test files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `downloadFile`, `copyToClipboard`, `buildCsv`, `todayStamp` ready to import from `@/utils/webExport` in all Wave-1 flow plans
- `linking` config is active; any screen reachable via its D-08 URL immediately (no per-flow changes needed)
- Wave-1 flow plans (13-03 through 13-06) can proceed in parallel — no further navigation wiring needed

## Self-Check

---
*Phase: 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad*
*Completed: 2026-06-03*
