---
phase: 03-frontend
plan: "02"
subsystem: ui
tags: [react-native, expo, zustand, axios, jwt, authService, login, register, TDD]

# Dependency graph
requires:
  - phase: 03-frontend
    plan: "01"
    provides: authService (login/register/getProfile), authStore (login/hydrate), theme tokens

provides:
  - LoginScreen connected to POST /auth/token/ with inline errors and loading state
  - RegisterScreen connected to POST /auth/register/ with field-level errors and auto-login
  - App.tsx hydration (hydrate() on mount before NavigationContainer, no auth flicker)
  - 9 tests covering full auth flow (LoginScreen + RegisterScreen + App hydration)

affects:
  - 03-03 (HomeScreen may check isAuthenticated from authStore)
  - 03-04 (NotificationsScreen uses same auth pattern)
  - 03-05 (ProfileScreen — user object now stored in authStore after login)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auth screens call service functions, await result, handle errors inline — no Alert()"
    - "After login/register: always call getProfile() to hydrate user object before store.login()"
    - "App.tsx: useState(hydrated) + useEffect calling hydrate().finally(() => setHydrated(true))"
    - "Test pattern: jest.mock('@/api/authService') with jest.Mocked<typeof authService>"

key-files:
  created:
    - frontend/__tests__/LoginScreen.test.tsx
  modified:
    - frontend/App.tsx
    - frontend/src/screens/auth/LoginScreen.tsx
    - frontend/src/screens/auth/RegisterScreen.tsx

key-decisions:
  - "getProfile() called after login to populate user object — POST /auth/token/ returns flat {access,refresh}, not user data"
  - "confirmPassword mismatch disables submit button via accessibilityState.disabled (not runtime validation)"
  - "Field errors from backend 400: error.details is Record<string,string[]>; first message per field shown below input"
  - "App.tsx renders loading View (background color only) until both fontsLoaded AND hydrated — prevents nav flicker"

patterns-established:
  - "Inline errors: setError(string) rendered as <Text style={styles.errorText}> — never Alert.alert()"
  - "Loading state: isLoading=true → button disabled + ActivityIndicator spinner inside button"
  - "testID on submit button + accessibilityState={{disabled}} enables test assertions without pressing disabled button"

requirements-completed:
  - NFR-03

# Metrics
duration: 7min
completed: 2026-03-18
---

# Phase 03 Plan 02: Auth Screens — API Integration Summary

**LoginScreen + RegisterScreen wired to real backend API with JWT tokens, getProfile() hydration, inline field errors, and App.tsx session restoration preventing auth flicker**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-18T08:08:44Z
- **Completed:** 2026-03-18T08:15:44Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- App.tsx now calls `authStore.hydrate()` on mount (via useEffect) and gates NavigationContainer render behind `hydrated === true`, eliminating the flash where Login briefly appears before the stored session loads
- LoginScreen replaced fake `login("fake-token", ...)` with real `authService.login()` + `authService.getProfile()` flow; inline error text "Email o contraseña incorrectos" shown below form; button shows ActivityIndicator and is disabled while in-flight; forgot password calls `requestPasswordReset()` and shows inline success text
- RegisterScreen built with 5 fields (firstName, lastName, email, password, confirmPassword); password mismatch disables submit button before API call; auto-login after successful registration (register → login → getProfile → store.login); backend field errors mapped per-field below each input
- 9 tests all green (5 LoginScreen + App, 4 RegisterScreen); TDD RED committed as `test()`, GREEN as `feat()`; ESLint 0 warnings on auth screens

## Task Commits

Each task was committed atomically:

1. **RED: Failing tests for auth screens and App hydration** - `73dc2df` (test)
2. **Task 1: App.tsx hydration and LoginScreen with real API** - `33c3368` (feat)
3. **Task 2: RegisterScreen with real API and auto-login** - `1b9b55a` (feat)

## Files Created/Modified

- `frontend/App.tsx` — Added useState(hydrated), useEffect with hydrate().finally(), loading View before NavigationContainer
- `frontend/src/screens/auth/LoginScreen.tsx` — Real API call via authService.login() + getProfile(); isLoading, error state; testID for tests
- `frontend/src/screens/auth/RegisterScreen.tsx` — 5-field form; authService.register() + auto-login; fieldErrors state mapped from backend 400 details; passwordMismatch disables submit
- `frontend/__tests__/LoginScreen.test.tsx` — 9 tests: Tests 1–5 (LoginScreen + App), Tests 6–9 (RegisterScreen)

## Decisions Made

- **getProfile() after login**: The JWT endpoint `/auth/token/` returns `{access, refresh}` only — no user data. A second call to `getProfile()` is required to get the User object. This pattern is applied in both LoginScreen and RegisterScreen auto-login.
- **Password mismatch as disabled state, not runtime error**: The submit button is disabled (`accessibilityState.disabled`) when `confirmPassword !== password && confirmPassword.length > 0`. No API call is ever made. Tests assert on `accessibilityState.disabled`.
- **App hydration gates NavigationContainer**: Loading screen is a plain `View` with `colors.background`. Both `fontsLoaded` and `hydrated` must be true before rendering. This ensures no auth flicker on restart.

## Deviations from Plan

None — plan executed exactly as written. Mock infrastructure for tests required minor setup (SafeAreaView mock via `require` inside factory to avoid Jest's out-of-scope variable restriction), but this is test tooling, not scope deviation.

## Issues Encountered

- `jest.mock()` factory functions cannot reference variables declared in outer scope (like `React`). Fixed by using `require('react')` and `require('react-native')` inside the factory functions for the `react-native-safe-area-context` mock.
- `act()` warnings in console for async state updates — these are warnings only, not failures. Tests pass cleanly. This is expected behavior with async event handlers in React Native testing.

## User Setup Required

None — no external service configuration required beyond what was already set up.

## Next Phase Readiness

- Auth flow complete end-to-end: register → auto-login → session persisted in SecureStore → restored on restart
- `isAuthenticated` in authStore drives the RootNavigator auth/main stack switch (implemented in 03-01)
- Phase 03 Plan 03 (HomeScreen / Lists) can now rely on `authStore.user` being populated after login

## Self-Check: PASSED

Files confirmed present:
- frontend/__tests__/LoginScreen.test.tsx — FOUND
- frontend/App.tsx — FOUND (modified)
- frontend/src/screens/auth/LoginScreen.tsx — FOUND (modified)
- frontend/src/screens/auth/RegisterScreen.tsx — FOUND (modified)

Commits confirmed:
- 73dc2df (RED tests) — FOUND
- 33c3368 (Task 1) — FOUND
- 1b9b55a (Task 2) — FOUND

---
*Phase: 03-frontend*
*Completed: 2026-03-18*
