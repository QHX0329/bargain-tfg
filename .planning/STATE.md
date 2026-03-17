---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
stopped_at: Completed 02-business-notifications-01-PLAN.md
last_updated: "2026-03-17T16:23:10.941Z"
last_activity: 2026-03-17 — Phase 1 complete. 179 tests green, UAT 15/15, Nyquist compliant. Starting Phase 2.
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 8
  completed_plans: 7
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

### Pending Todos

None yet.

### Blockers/Concerns

- GDAL_LIBRARY_PATH must be unset or empty in .env when running in Docker (Windows path breaks container PostGIS)
- Celery Beat will fail at startup if tasks not stubbed — address in Phase 1 (F3-15) or Phase 4 (F5-05)
- Frontend HomeScreen uses hardcoded MOCK_* data — replaced in Phase 3

## Session Continuity

Last session: 2026-03-17T16:23:10.938Z
Stopped at: Completed 02-business-notifications-01-PLAN.md
Resume file: None
