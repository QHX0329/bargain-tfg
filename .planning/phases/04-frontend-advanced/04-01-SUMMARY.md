---
phase: 04-frontend-advanced
plan: 01
subsystem: api
tags: [django, drf, google-places, redis, caching, geospatial]

# Dependency graph
requires:
  - phase: 03-core-backend
    provides: Store model, StoreViewSet, DRF infrastructure, Redis cache

provides:
  - Store.google_place_id nullable CharField with migration
  - GET /api/v1/stores/{id}/places-detail/ endpoint with Redis 24h TTL caching
  - GOOGLE_PLACES_API_KEY setting in base.py
  - Silent fallback for missing place_id, missing key, and Google API failures
  - Integration and unit tests for places-detail behavior

affects:
  - frontend-maps
  - store-detail-screen
  - 04-02 (subsequent plans that use store enrichment)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cache-aside pattern with Redis 24h TTL for external API responses"
    - "Silent fail proxy: returns empty object instead of propagating external API errors"
    - "Django settings.X = os.environ.get('KEY', '') for optional third-party API keys"

key-files:
  created:
    - backend/apps/stores/migrations/0003_store_google_place_id.py
  modified:
    - backend/apps/stores/models.py
    - backend/apps/stores/admin.py
    - backend/apps/stores/views.py
    - backend/config/settings/base.py
    - backend/tests/integration/test_store_endpoints.py
    - backend/tests/unit/test_stores.py

key-decisions:
  - "Silent fail: all Google Places errors (network, 4xx, 5xx) return {} to avoid frontend breakage"
  - "Redis cache key format: places_detail:{pk} with 24h TTL to protect API quota"
  - "google_place_id is nullable (not required) to keep existing stores unaffected"
  - "Used requests library alias (http_requests) to avoid clash with DRF request object"

patterns-established:
  - "External API proxy pattern: cache.get -> API call -> cache.set with error guard"
  - "Django test settings fixture (pytest-django settings) for toggling API keys in tests"

requirements-completed: [STORE-04]

# Metrics
duration: 9min
completed: 2026-03-23
---

# Phase 04 Plan 01: Google Places Backend Proxy Summary

**Backend proxy endpoint GET /stores/{id}/places-detail/ returning normalized Places data (rating, hours, website) via Redis 24h cache, with silent fallback for missing keys and API errors**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-23T18:11:36Z
- **Completed:** 2026-03-23T18:20:28Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Store model extended with nullable `google_place_id` CharField and migration applied cleanly
- New `GET /api/v1/stores/{id}/places-detail/` endpoint with Redis 24h TTL caching protecting Google API quota
- Complete test coverage: 5 integration tests + 1 cache unit test, all passing (228 total suite passes)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add google_place_id field to Store model and migration** - `111298f` (feat)
2. **Task 2: Implement places-detail endpoint with Redis caching and tests** - `cb89661` (feat)

**Plan metadata:** (docs commit pending)

## Files Created/Modified

- `backend/apps/stores/models.py` - Added nullable google_place_id CharField
- `backend/apps/stores/admin.py` - Added google_place_id to list_display and search_fields
- `backend/apps/stores/migrations/0003_store_google_place_id.py` - Migration for new field
- `backend/apps/stores/views.py` - Added places_detail @action with Redis caching and Google Places call
- `backend/config/settings/base.py` - Added GOOGLE_PLACES_API_KEY setting (reads from env)
- `backend/tests/integration/test_store_endpoints.py` - 5 new integration tests for places-detail
- `backend/tests/unit/test_stores.py` - Cache hit unit test verifying Google API called only once

## Decisions Made

- Silent fail strategy: any exception from Google Places (network, 4xx, 5xx) returns `{}` rather than propagating — prevents frontend breakage when the optional enrichment service is unavailable
- Cache key format `places_detail:{pk}` ensures per-store isolation with 24h TTL
- `google_place_id` is nullable so existing store records remain unaffected, enabling gradual population via admin
- Alias `http_requests` for the `requests` library to avoid shadowing DRF's `request` object in the action method

## Deviations from Plan

None - plan executed exactly as written. Docker port conflict with other running containers required using a temporary `docker-compose.migrate.yml` (no port bindings) to run migrations — this is an environmental constraint, not a code deviation.

## Issues Encountered

- Port conflicts (5432 and 6379) with other Docker containers (aura_redis, aura_db) prevented using the standard `docker compose -f docker-compose.dev.yml` commands. Resolved by creating a temporary `docker-compose.migrate.yml` that uses named volumes without port bindings, allowing the bargain containers to share network space without port conflicts.

## User Setup Required

To enable live Google Places enrichment, add to `.env`:
```
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
```

Without this variable, the endpoint returns `{}` (silent fail) — no frontend crash.

## Next Phase Readiness

- Frontend can now call `GET /api/v1/stores/{id}/places-detail/` to show enriched store info
- Admin can manually enter `google_place_id` for any store via Django admin panel
- Redis caching is in place — no risk of quota exhaustion during development
- Temporary `docker-compose.migrate.yml` can be removed once port conflicts are resolved

## Self-Check: PASSED

All files verified present. All commits verified in git history.

| Item | Status |
|------|--------|
| backend/apps/stores/models.py | FOUND |
| backend/apps/stores/migrations/0003_store_google_place_id.py | FOUND |
| backend/apps/stores/views.py | FOUND |
| backend/config/settings/base.py | FOUND |
| backend/tests/integration/test_store_endpoints.py | FOUND |
| backend/tests/unit/test_stores.py | FOUND |
| .planning/phases/04-frontend-advanced/04-01-SUMMARY.md | FOUND |
| Commit 111298f | FOUND |
| Commit cb89661 | FOUND |

---
*Phase: 04-frontend-advanced*
*Completed: 2026-03-23*
