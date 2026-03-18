---
phase: 03-frontend
plan: "06"
subsystem: ui
tags: [react, vite, antd, zustand, axios, vitest, jwt, business-portal]

# Dependency graph
requires:
  - phase: 02-business-notifications
    provides: business profile API (/business/profiles/), promotions API (/business/promotions/), prices API (/business/prices/)
provides:
  - Standalone React + Vite + Ant Design web portal at frontend/web/
  - LoginPage connected to POST /api/v1/auth/token/ with handleLogin() exported
  - UnverifiedGuard blocking pending/rejected businesses with getGuardContent() exported
  - AppLayout with AntD Sider navigation (Dashboard, Prices, Promotions, Profile)
  - DashboardPage with business stats from API
  - PricesPage with table, drawer, product search + barcode scan/fallback
  - PromotionsPage with table + modal form for promotion creation
  - BusinessProfilePage with read/edit view and verification status badge
  - 7 vitest tests covering UnverifiedGuard and LoginPage logic (all passing)
affects: [04-optimizer, future e2e testing phases]

# Tech tracking
tech-stack:
  added:
    - Vite 8 + React 19 + TypeScript (frontend/web standalone app)
    - Ant Design 6 (admin-grade tables, forms, modals, drawers)
    - Zustand 5 (businessStore for token + profile + promotions)
    - React Router DOM v7 (BrowserRouter, Routes, nested protected routes)
    - Axios 1.x (apiClient with JWT interceptors + {success,data} unwrapping)
    - Vitest 4 + jsdom + @testing-library/react (unit tests)
  patterns:
    - Export pure functions (getGuardContent, handleLogin) alongside React components for testability
    - apiClient.create() guarded against undefined in mocked test environments
    - tsconfig.app.json excludes __tests__/ from production build; separate vitest type setup
    - vite.config.ts uses vitest/config defineConfig to include test config
    - usePolling: true in vite server.watch for Windows/OneDrive filesystem compatibility

key-files:
  created:
    - frontend/web/src/api/client.ts
    - frontend/web/src/store/businessStore.ts
    - frontend/web/src/App.tsx
    - frontend/web/src/components/AppLayout.tsx
    - frontend/web/src/components/UnverifiedGuard.tsx
    - frontend/web/src/pages/LoginPage.tsx
    - frontend/web/src/pages/DashboardPage.tsx
    - frontend/web/src/pages/PricesPage.tsx
    - frontend/web/src/pages/PromotionsPage.tsx
    - frontend/web/src/pages/BusinessProfilePage.tsx
    - frontend/web/src/__tests__/UnverifiedGuard.test.tsx
    - frontend/web/src/__tests__/LoginPage.test.tsx
    - frontend/web/vite.config.ts
    - frontend/web/package.json
    - frontend/web/tsconfig.app.json
  modified: []

key-decisions:
  - "vite.config.ts uses defineConfig from vitest/config (not vite) so the test: {} config is valid TypeScript"
  - "apiClient creation guarded with try/catch fallback: axios.create() returns undefined when axios is vi.mock()ed; interceptors only attached if interceptors property exists"
  - "tsconfig.app.json excludes src/__tests__/ from production build to avoid vi namespace errors in tsc -b"
  - "handleLogin() accepts an axiosInstance parameter instead of importing apiClient directly — enables testing without triggering apiClient module-level side effects"
  - "UnverifiedGuard wraps AppLayout as outlet parent; RequireAuth is a separate component checking localStorage before rendering protected routes"
  - "BarcodeDetector API used when available (Chrome/Edge on HTTPS); manual Input fallback shown otherwise (acceptable for TFG demo)"

patterns-established:
  - "Testable exports: export pure functions alongside React components (getGuardContent, handleLogin)"
  - "JWT in localStorage for web portal (not SecureStore — web only, no Expo dependency)"
  - "Zustand store hydration from localStorage on store creation (token: localStorage.getItem('access_token'))"

requirements-completed: [NFR-03]

# Metrics
duration: 11min
completed: 2026-03-18
---

# Phase 3 Plan 06: PYME Business Web Portal Summary

**Standalone React + Vite + Ant Design PYME portal at frontend/web/ with JWT auth, route guard, 4 pages (Dashboard/Prices/Promotions/Profile), barcode scan, and 7 passing vitest tests**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-18T09:08:27Z
- **Completed:** 2026-03-18T09:19:30Z
- **Tasks:** 3 (Task 3 TDD, Task 1 implementation, Task 2 pages)
- **Files modified:** 16 created

## Accomplishments

- Bootstrapped complete standalone Vite + React 19 + Ant Design 6 + Zustand 5 web portal at `frontend/web/` — separate from the React Native mobile app
- LoginPage connects to POST /api/v1/auth/token/, stores JWT in localStorage, loads business profile; UnverifiedGuard blocks pending/rejected businesses with full-page AntD Result components
- All 4 PYME portal pages implemented: Dashboard (stats via API), Prices (table + drawer + barcode scan), Promotions (table + modal form), BusinessProfile (read/edit with verification badge)
- 7 vitest tests pass covering UnverifiedGuard (4 states) and handleLogin (success/401/endpoint assertion)
- Production build succeeds (`npm run build` exits 0, no TypeScript errors)

## Task Commits

Each task was committed atomically:

1. **Task 3: TDD RED — vitest test files** - `da3b27b` (test)
2. **Task 1: Bootstrap + core files** - `6fb39b5` (feat)
3. **Task 2: 4 page components** - `5ec731a` (feat)
4. **Vite scaffolding files** - `a2a5878` (chore)

## Files Created/Modified

- `frontend/web/src/api/client.ts` - Axios instance with JWT Bearer interceptor + {success,data} unwrapper + 401 redirect
- `frontend/web/src/store/businessStore.ts` - Zustand store: token, BusinessProfile, Promotion[], logout
- `frontend/web/src/App.tsx` - BrowserRouter with RequireAuth + UnverifiedGuard + AppLayout as outlet parent
- `frontend/web/src/components/AppLayout.tsx` - AntD Layout/Sider with nav menu + logout button
- `frontend/web/src/components/UnverifiedGuard.tsx` - Blocks pending/rejected; exports `getGuardContent(status, reason)`
- `frontend/web/src/pages/LoginPage.tsx` - AntD Form card; exports `handleLogin(email, pass, axiosInstance)`
- `frontend/web/src/pages/DashboardPage.tsx` - Stats cards + recent prices list via API
- `frontend/web/src/pages/PricesPage.tsx` - Table + Drawer + AutoComplete product search + BarcodeDetector/manual fallback
- `frontend/web/src/pages/PromotionsPage.tsx` - Table + Modal form + deactivate action
- `frontend/web/src/pages/BusinessProfilePage.tsx` - Descriptions read view + Form edit mode + verification Tag
- `frontend/web/src/__tests__/UnverifiedGuard.test.tsx` - 4 tests for getGuardContent pure function
- `frontend/web/src/__tests__/LoginPage.test.tsx` - 3 tests for handleLogin async function
- `frontend/web/vite.config.ts` - vitest/config defineConfig + jsdom + usePolling
- `frontend/web/tsconfig.app.json` - Excludes __tests__/ from production tsc build

## Decisions Made

- Used `defineConfig` from `vitest/config` (not `vite`) so the `test: {}` config block is TypeScript-valid. Discovered this causes build issues when using the base vite `defineConfig`.
- `apiClient` creation wrapped in try/catch: when `vi.mock('axios')` is called in tests, `axios.create()` returns `undefined`, which would crash module initialization. Interceptors only attached when `interceptors` property is available.
- `tsconfig.app.json` excludes `src/__tests__/` from production build — prevents `vi` namespace errors in `tsc -b` because vitest globals aren't defined in the app build context.
- `handleLogin()` accepts an `axiosInstance` parameter (not `apiClient`) so tests can inject a mocked axios without triggering the apiClient module's side effects.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed axios mock crash in test environment**
- **Found during:** Task 3 GREEN phase (running LoginPage tests)
- **Issue:** `client.ts` called `axios.create()` at module import time; when `vi.mock('axios')` replaces axios, `create()` returns `undefined`, and accessing `.interceptors` on `undefined` threw `TypeError`
- **Fix:** Wrapped `axios.create()` in try/catch with fallback; guarded interceptor attachment with `if (apiClient?.interceptors?.request)`
- **Files modified:** `frontend/web/src/api/client.ts`
- **Verification:** All 7 vitest tests pass after fix
- **Committed in:** `6fb39b5` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed TypeScript build failure — vite.config.ts test config**
- **Found during:** Task 2 build verification
- **Issue:** `defineConfig` from `vite` doesn't include `test` in its type definition; using it caused `TS2769: No overload matches this call`
- **Fix:** Changed import to `defineConfig` from `vitest/config` which includes the `test` property
- **Files modified:** `frontend/web/vite.config.ts`
- **Verification:** `npm run build` exits 0 after fix
- **Committed in:** `6fb39b5` (Task 1 commit)

**3. [Rule 1 - Bug] Fixed tsc build failure — vi namespace not found in test files**
- **Found during:** Task 2 build verification
- **Issue:** `tsconfig.app.json` included `src/__tests__/` in its compilation scope; `tsc -b` couldn't find `vi` namespace (vitest globals not available in app build context)
- **Fix:** Added `exclude` field to `tsconfig.app.json` listing test files
- **Files modified:** `frontend/web/tsconfig.app.json`
- **Verification:** `tsc -b` succeeds without errors
- **Committed in:** `6fb39b5` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 bugs discovered during test/build verification)
**Impact on plan:** All fixes necessary for TypeScript correctness and test environment compatibility. No scope creep.

## Issues Encountered

- Windows path in OneDrive (`C:\Users\xxnii\OneDrive\...`) required `usePolling: true` in vite server config to avoid potential EPERM issues with filesystem watchers (proactive per RESEARCH.md pitfall 7).

## User Setup Required

None - no external service configuration required. The portal connects to the existing backend at `http://localhost:8000/api/v1` (configurable via `VITE_API_URL` env var).

## Next Phase Readiness

- Business portal is fully functional as a standalone Vite app — PYME users can log in, manage prices and promotions, and view/edit their profile
- Portal dev server: `cd frontend/web && npm run dev` → http://localhost:5173
- Production build: `cd frontend/web && npm run build`
- Tests: `cd frontend/web && npm test` (7 tests, all green)
- Phase 4 (optimizer) can proceed independently — portal is complete

---
*Phase: 03-frontend*
*Completed: 2026-03-18*
