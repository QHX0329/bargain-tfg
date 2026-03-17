---
phase: 02-business-notifications
plan: "01"
subsystem: business-portal
tags: [business, pyme, promotions, prices, celery, permissions]
dependency_graph:
  requires:
    - 01-core-backend (Price model, Store model, User model with Role)
  provides:
    - BusinessProfile model with admin verification flow
    - Promotion model with UniqueConstraint (partial index)
    - IsVerifiedBusiness permission class
    - BusinessProfileViewSet (approve/reject with email tasks)
    - PromotionViewSet (create/deactivate/409-conflict)
    - BusinessPriceViewSet (source='business', is_stale=False)
    - promo_price + promotion fields in PriceCompareView
    - deactivate_expired_promotions Celery Beat task (hourly)
    - check_competitor_prices Celery Beat task (daily 08:00)
  affects:
    - apps/prices/serializers.py (promo_price + promotion fields added)
    - apps/prices/views.py (promo_lookup prefetch in PriceCompareView)
    - apps/stores/models.py (business_profile FK added)
    - apps/core/exceptions.py (BusinessNotVerifiedError, PromotionConflictError)
    - config/settings/base.py (CELERY_BEAT_SCHEDULE extended)
tech_stack:
  added:
    - exponent_server_sdk>=2.0,<3.0 (push notification SDK, used in Plan 02-02)
  patterns:
    - DRF ModelViewSet with custom action decorators (@action)
    - Partial UniqueConstraint (Q(is_active=True)) enforced at PostgreSQL index level
    - transaction.atomic() savepoint in create() to surface IntegrityError as 409
    - validators=[] on PromotionSerializer to bypass DRF auto-unique-validator
    - promo_lookup dict prefetch in view to avoid N+1 on price comparison
key_files:
  created:
    - backend/apps/business/models.py
    - backend/apps/business/migrations/0001_initial.py
    - backend/apps/business/permissions.py
    - backend/apps/business/serializers.py
    - backend/apps/business/views.py
    - backend/apps/business/tasks.py
    - backend/apps/business/urls.py
    - backend/apps/stores/migrations/0002_store_business_profile.py
    - backend/tests/unit/test_business_models.py
    - backend/tests/integration/test_business_registration.py
    - backend/tests/integration/test_business_verification.py
    - backend/tests/integration/test_business_prices.py
    - backend/tests/integration/test_promotions.py
  modified:
    - backend/apps/stores/models.py (business_profile FK)
    - backend/apps/prices/models.py (Price.Source.BUSINESS choice)
    - backend/apps/prices/serializers.py (promo_price + promotion fields)
    - backend/apps/prices/views.py (promo_lookup prefetch)
    - backend/apps/core/exceptions.py (2 new exception classes)
    - backend/config/settings/base.py (2 new Celery Beat entries)
    - backend/requirements/base.txt (exponent_server_sdk)
decisions:
  - "DRF auto-unique validator bypassed (validators=[]) on PromotionSerializer so IntegrityError propagates to view as 409, not 400"
  - "transaction.atomic() savepoint wraps serializer.save() in PromotionViewSet.create() to isolate IntegrityError without aborting outer DB transaction"
  - "Partial UniqueConstraint with condition=Q(is_active=True) creates a PostgreSQL partial unique index, not a regular constraint — verified via pg_indexes"
  - "exponent_server_sdk added in Plan 02-01 (not 02-02) so Docker image rebuild happens here, avoiding cold rebuild during Plan 02-02 notifications work"
metrics:
  duration_minutes: 20
  completed_date: "2026-03-17"
  tasks_completed: 2
  files_created: 13
  files_modified: 7
  tests_added: 27
  tests_total: 192
  coverage: "90%"
requirements:
  - BIZ-01
  - BIZ-02
  - BIZ-03
---

# Phase 2 Plan 01: Business Portal Backend Summary

**One-liner:** Full PYME portal with BusinessProfile admin verification, business prices (source='business', never stale), Promotion model with partial-unique-index 409-conflict, and promo_price in price comparison via single-query prefetch.

## What Was Built

### Task 1 — Models, Migrations, Test Scaffolds

- **BusinessProfile model** (`apps/business/models.py`): OneToOne → User, tax_id unique, is_verified=False default, rejection_reason blank, price_alert_threshold_pct=10, last_competitor_alert_at for 24h deduplication.
- **Promotion model**: DiscountType (flat/percentage), partial UniqueConstraint `unique_active_promo_per_product_store` (enforced as PostgreSQL partial unique index).
- **Price.Source.BUSINESS** choice added to existing TextChoices enum (no migration needed).
- **Store.business_profile** nullable FK → BusinessProfile (migration 0002).
- **13 test scaffold files** written before implementation (TDD RED → GREEN).
- All 11 unit model tests GREEN.

### Task 2 — Views, Permissions, Tasks, URL Registration

- **IsVerifiedBusiness** permission: authenticates, checks role='business', verifies BusinessProfile.is_verified.
- **BusinessProfileViewSet**: business users create own profile; admin-only approve/reject actions fire email Celery tasks.
- **PromotionViewSet**: verified business creates/deactivates promotions; second active promo for same product+store returns 409 (via `transaction.atomic()` savepoint + `validators=[]`).
- **BusinessPriceViewSet**: POST creates Price with `source='business'`, `is_stale=False` always.
- **PriceCompareView extended**: single prefetch of active promotions → `promo_lookup` dict → `promo_price` computed inline, no N+1.
- **Celery tasks**: approval/rejection emails, `deactivate_expired_promotions` (hourly at :05), `check_competitor_prices` (daily 08:00).

## Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| Unit — business models | 11 | GREEN |
| Integration — registration | 4 | GREEN |
| Integration — verification | 4 | GREEN |
| Integration — prices | 3 | GREEN |
| Integration — promotions | 5 | GREEN |
| Phase 1 regression | 165 | GREEN |
| **Total** | **192** | **GREEN** |

Coverage: 90% across all apps.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DRF auto-unique-validator intercepts 409 as 400**
- **Found during:** Task 2 — test_second_active_promo_same_product_store_returns_409
- **Issue:** DRF automatically detects the `UniqueConstraint` on `(product, store)` in Promotion and adds a pre-save validator that raises `ValidationError` (HTTP 400) before `serializer.save()` is called, so the view's `except IntegrityError` never fires.
- **Fix:** Added `validators = []` to `PromotionSerializer.Meta` to bypass DRF auto-validators, and wrapped `serializer.save()` in `transaction.atomic()` in `PromotionViewSet.create()` so the DB-level `IntegrityError` is caught and re-raised as `PromotionConflictError` (409).
- **Files modified:** `backend/apps/business/serializers.py`, `backend/apps/business/views.py`
- **Commit:** 5867ecc

## Self-Check

Files exist:
- [x] backend/apps/business/models.py
- [x] backend/apps/business/migrations/0001_initial.py
- [x] backend/apps/stores/migrations/0002_store_business_profile.py
- [x] backend/apps/business/permissions.py
- [x] backend/apps/business/serializers.py
- [x] backend/apps/business/views.py
- [x] backend/apps/business/tasks.py
- [x] backend/apps/business/urls.py
- [x] backend/tests/unit/test_business_models.py
- [x] backend/tests/integration/test_business_*.py (4 files)

Commits exist:
- [x] 6d28e4a — Task 1
- [x] 5867ecc — Task 2
