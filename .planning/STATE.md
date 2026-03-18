---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
stopped_at: Completed 03-frontend-03-05-PLAN.md
last_updated: "2026-03-18T08:35:09.120Z"
last_activity: 2026-03-17 — Phase 1 complete. 179 tests green, UAT 15/15, Nyquist compliant. Starting Phase 2.
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 14
  completed_plans: 14
---

---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
stopped_at: Phase 1 complete — UAT 15/15 passed, Nyquist compliant
last_updated: "2026-03-17"
last_activity: 2026-03-17 — Phase 1 complete. 179 tests green, UAT 15/15, Nyquist compliant. Starting Phase 2.
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 12
  completed_plans: 6
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** User submits shopping list, gets optimal multi-store route minimizing price + travel, saving >5% vs. single store
**Current focus:** Phase 1 — Core Backend

## Current Position

Phase: 2 of 6 (Business & Notifications)
Plan: 0 of 2 in current phase
Status: Phase 1 complete, Phase 2 not started
Last activity: 2026-03-17 — Phase 1 complete. 179 tests green, UAT 15/15, Nyquist compliant. Starting Phase 2.

Progress: [████████░░░░░░░░░░░░] ~40% (F1+F2+F3-partial complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0h (this roadmap scope; F1+F2 took ~85h separately)

**By Phase:**

| Phase | Plans | Total time | Avg/Plan |
|-------|-------|------------|----------|
| 01-core-backend | 6 | ~405 min | ~67 min |

**Recent Trend:**
- Last 5 plans: none yet
- Trend: -

*Updated after each plan completion*
| Phase 01-core-backend P01 | 10 | 2 tasks | 10 files |
| Phase 01-core-backend P02 | 7 | 2 tasks | 9 files |
| Phase 01-core-backend P03 | 52 | 2 tasks | 8 files |
| Phase 01-core-backend P05 | 25 | 2 tasks | 10 files |
| Phase 01-core-backend P04 | 301 | 2 tasks | 10 files |
| Phase 01-core-backend P06 | 15 | 2 tasks | 2 files |
| Phase 02-business-notifications P01 | 20 | 2 tasks | 20 files |
| Phase 02-business-notifications P02 | 10 | 2 tasks | 14 files |
| Phase 03-frontend P01 | 9 | 2 tasks | 19 files |
| Phase 03-frontend P02 | 7 | 2 tasks | 4 files |
| Phase 03-frontend P03 | 9 | 2 tasks | 3 files |
| Phase 03-frontend P06 | 11 | 3 tasks | 16 files |
| Phase 03-frontend P04 | 546 | 2 tasks | 4 files |
| Phase 03-frontend P05 | 10 | 2 tasks | 10 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Key decisions affecting current work:

- [F2]: Hybrid model (ADR-002) — backend in Docker, frontend native on host. HMR breaks with Docker volumes on Windows.
- [F2]: Celery Beat schedule references tasks not yet implemented. Stub tasks or remove schedule until F5 completes.
- [F3]: Multiple backend apps are skeleton-only (no models/serializers/views). Phase 1 must implement all of them.
- [Phase 01-core-backend]: JWT access token lifetime 5 minutes, refresh 30 days; email uniqueness validated in serializer; factory-boy lazy model resolution for skeleton apps
- [Phase 01-core-backend P02]: Autocomplete uses threshold 0.1 (not 0.3) — short partial terms score ~0.21, below 0.3 threshold
- [Phase 01-core-backend P02]: CategoryViewSet has no pagination; returns flat array with children nested
- [Phase 01-core-backend P02]: ProductDetailSerializer returns null for price_min/price_max until Plan 01-04 implements Price model
- [Phase 01-core-backend]: favorite action uses Store.objects.get(pk=pk) directly to avoid requiring lat/lng for non-geospatial operations
- [Phase 01-core-backend]: ActiveListLimitError in views.py (domain-specific exception, not in core/exceptions.py)
- [Phase 01-core-backend]: Product Meta.indexes must declare GIN index to match 0001_initial migration — prevents Django generating spurious removal migration on each makemigrations call
- [Phase 01-core-backend]: ListCollaborator related_name=listcollaborator_set to match IsOwnerOrCollaborator permission filter; template copy rule: product FKs only, qty=1, is_checked=False
- [Phase 01-core-backend]: Price records never hard-deleted by business logic; only is_stale=True. purge_old_price_history sole exception (90+ day cleanup)
- [Phase 01-core-backend]: Crowdsourced prices: confidence_weight=0.5 set in CrowdsourcePriceView.perform_create; destroy-as-deactivate on PriceAlertViewSet
- [Phase 01-core-backend]: Schema endpoints at /api/v1/schema/ (versioned path consistent with all other v1 endpoints)
- [Phase 01-core-backend]: Phase 1 gate: 179 tests passing, 92% coverage across all 5 apps
- [Phase 02-business-notifications]: DRF auto-unique validator bypassed (validators=[]) on PromotionSerializer; transaction.atomic() savepoint in create() to surface IntegrityError as 409
- [Phase 02-business-notifications]: Partial UniqueConstraint with Q(is_active=True) creates PostgreSQL partial unique index, not a regular constraint
- [Phase 02-business-notifications]: exponent_server_sdk added in Plan 02-01 so Docker image rebuild happens before Plan 02-02 notifications work
- [Phase 02-business-notifications]: exponent_server_sdk imports at module level in tasks.py for testability with patch()
- [Phase 02-business-notifications]: Notification DB record always created regardless of push success — inbox reflects all dispatched events
- [Phase 02-business-notifications]: Redis debounce for list notifications: r.exists()+r.setex() with 900s TTL prevents duplicate Celery scheduling
- [Phase 03-frontend]: Zustand 5 does not support built-in persist middleware with expo-secure-store — manual hydration via hydrate() on app mount
- [Phase 03-frontend]: Refresh token endpoint uses a separate axios.create() instance (refreshAxios) to avoid interceptor recursion
- [Phase 03-frontend]: API layer: one service file per domain; all functions typed; no direct apiClient calls from screens
- [Phase 03-frontend]: getProfile() called after login to populate user object — POST /auth/token/ returns flat {access,refresh}, not user data
- [Phase 03-frontend]: App.tsx renders loading View until both fontsLoaded AND hydrated — prevents NavigationContainer auth flicker on restart
- [Phase 03-frontend]: makeRenderItem uses named function declaration (not arrow) so react/display-name ESLint rule is satisfied without workarounds
- [Phase 03-frontend]: Alert mocked via jest.spyOn in beforeEach — jest.mock react-native breaks jest-expo preset
- [Phase 03-frontend]: RNTL pull-to-refresh: access refreshControl.props.onRefresh() directly (not fireEvent on FlatList)
- [Phase 03-frontend]: vite.config.ts uses defineConfig from vitest/config; apiClient creation guarded for test mocking; tsconfig.app.json excludes test files; handleLogin accepts axiosInstance for testability
- [Phase 03-frontend]: HomeScreen always re-fetches on mount (no empty-guard); mark-all-read rendered in ListHeaderComponent for testability; __DEV__ GPS fallback to Seville coords
- [Phase 03-frontend]: Slider removed from react-native core (RN 0.83) — use @react-native-community/slider; add Jest moduleNameMapper mock
- [Phase 03-frontend]: react-native-maps NativeAirMapsModule requires Jest moduleNameMapper to mock TurboModule in Node environment

### Pending Todos

None yet.

### Blockers/Concerns

- GDAL_LIBRARY_PATH must be unset or empty in .env when running in Docker (Windows path breaks container PostGIS)
- Celery Beat will fail at startup if tasks not stubbed — address in Phase 1 (F3-15) or Phase 4 (F5-05)
- Frontend HomeScreen uses hardcoded MOCK_* data — replaced in Phase 3

## Session Continuity

Last session: 2026-03-18T08:35:09.117Z
Stopped at: Completed 03-frontend-03-05-PLAN.md
Resume file: None
