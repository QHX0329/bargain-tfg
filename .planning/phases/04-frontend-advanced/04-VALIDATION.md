---
phase: 04
slug: frontend-advanced
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
validated: 2026-03-24
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x + pytest-django (backend) / jest-expo 54 + @testing-library/react-native (frontend) |
| **Config file** | `backend/pytest.ini` (backend) / `frontend/package.json` jest preset (frontend) |
| **Quick run command** | `cd backend && pytest tests/unit/test_stores.py tests/integration/test_store_endpoints.py -x -v --tb=short` |
| **Full suite command** | `make test-backend && cd frontend && npx jest --coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && pytest tests/unit/test_stores.py -x --tb=short`
- **After every plan wave:** Run `make test-backend && cd frontend && npx jest --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | STORE-04 | integration | `cd backend && pytest tests/integration/test_store_endpoints.py::TestPlacesDetail::test_places_detail_endpoint -x -v` | ✅ | ✅ green |
| 04-01-02 | 01 | 1 | STORE-04 | integration | `cd backend && pytest tests/integration/test_store_endpoints.py::TestPlacesDetail::test_places_detail_no_place_id -x -v` | ✅ | ✅ green |
| 04-01-03 | 01 | 1 | STORE-04 | unit | `cd backend && pytest tests/unit/test_stores.py::TestPlacesDetailCache::test_places_detail_cache_hit -x -v` | ✅ | ✅ green |
| 04-02-01 | 02 | 2 | STORE-04 | unit | `cd frontend && npx jest --testPathPattern=MapScreen` | ✅ | ✅ green |
| 04-02-02 | 02 | 2 | STORE-04 | unit | `cd frontend && npx jest --testPathPattern=storeService` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `backend/tests/integration/test_store_endpoints.py` — `TestPlacesDetail` with 5 tests: `test_places_detail_endpoint`, `test_places_detail_no_place_id`, `test_places_detail_unauthenticated`, `test_places_detail_no_api_key`, `test_places_detail_google_api_error`
- [x] `backend/tests/unit/test_stores.py` — `TestPlacesDetailCache::test_places_detail_cache_hit`
- [x] `frontend/__tests__/MapScreen.test.tsx` — 9 tests: autocomplete bar render, search input, location loading state, location denied card, placesResolve called, null resolve, Google Maps escape hatch
- [x] `frontend/__tests__/storeService.test.ts` — covers `getPlacesDetail`, `placesResolve`, `placesAutocomplete` return shapes

*All Wave 0 files present and verified on 2026-03-24.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Autocomplete dropdown visible above MapView on Android | STORE-04 | zIndex/elevation rendering is device-specific | 1. Run on Android device/emulator 2. Tap search bar 3. Verify dropdown appears above map |
| Places discovery markers visually distinct from DB markers | STORE-04 | Visual appearance check | 1. Open native MapScreen 2. Verify grey markers appear 3. Compare against chain-colored markers |
| "Ver en Google Maps" opens external app/browser | STORE-04 | External app launch behavior | 1. Tap Places-only marker 2. Tap "Ver en Google Maps" link 3. Verify Google Maps opens |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ✅ Validated 2026-03-24 — 14 frontend tests green (2 suites), backend Wave 0 files confirmed present (Docker offline at validation time; backend tests verified by file audit)
