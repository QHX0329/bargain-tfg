---
phase: 01-core-backend
plan: "04"
subsystem: prices
tags: [prices, celery, postgis, crowdsourcing, history, alerts]
dependency_graph:
  requires: [01-02, 01-03, 01-05]
  provides: [price-comparison, price-history, price-alerts, crowdsource-prices, celery-price-tasks]
  affects: [optimizer, scraping]
tech_stack:
  added: []
  patterns:
    - PostGIS distance filter (location__distance_lte + D(km=)) for radius-based price comparison
    - TruncDay + Min/Max/Avg aggregation for daily price history chart
    - Celery bulk update (is_stale=True) with 48h/24h staleness rules per source
    - destroy-as-deactivate pattern on PriceAlertViewSet.perform_destroy
key_files:
  created:
    - backend/apps/prices/models.py
    - backend/apps/prices/admin.py
    - backend/apps/prices/serializers.py
    - backend/apps/prices/views.py
    - backend/apps/prices/urls.py
    - backend/apps/prices/migrations/0001_initial.py
    - backend/tests/unit/test_prices.py
    - backend/tests/integration/test_price_endpoints.py
  modified:
    - backend/apps/prices/tasks.py
    - backend/config/settings/base.py
decisions:
  - "Price records are never hard-deleted by business logic — only is_stale=True set; purge_old_price_history is the sole exception (90+ day cleanup)"
  - "Crowdsourced prices get confidence_weight=0.5 set in view layer (not in serializer/model default)"
  - "PriceAlertViewSet.destroy overrides perform_destroy to set is_active=False instead of deleting"
  - "CELERY_BEAT_SCHEDULE updated with check-price-alerts-every-30min and purge-old-price-history-daily pointing to real task names"
  - "ListTotalView is fully functional (not stubbed) since ShoppingList model was created in plan 01-05 (out-of-order execution)"
metrics:
  duration_seconds: 301
  completed_date: "2026-03-16"
  tasks_completed: 2
  tests_added: 35
  files_created: 8
  files_modified: 2
---

# Phase 1 Plan 04: Prices Domain Summary

**One-liner:** Price model with staleness tracking (48h/24h), PostGIS radius comparison, TruncDay history aggregation, Celery alert checks, and crowdsourcing endpoint.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Price and PriceAlert models, migration, admin, and Celery tasks | e117619 | models.py, admin.py, tasks.py, 0001_initial.py, base.py |
| 2 | Price API views, serializers, URLs, and tests | c6ab5e3 | serializers.py, views.py, urls.py, test_prices.py, test_price_endpoints.py |

## What Was Built

### Models (`backend/apps/prices/models.py`)

**Price** — price of a product at a store:
- Fields: product FK, store FK, price, unit_price (nullable), offer_price (nullable), offer_end_date (nullable), source (scraping/crowdsourcing/api), confidence_weight (float, default 1.0), is_stale (bool), verified_at, created_at
- Composite index on (product, store, is_stale) for fast query patterns
- Meta.ordering=["-verified_at"]

**PriceAlert** — user price target:
- Fields: user FK, product FK, store FK (nullable), target_price, is_active, triggered_at (nullable), created_at

### Celery Tasks (`backend/apps/prices/tasks.py`)

| Task | Schedule | Rule |
|------|----------|------|
| `expire_stale_prices` | Hourly | scraping > 48h → stale; crowdsourcing > 24h → stale |
| `check_price_alerts` | Every 30 min | active alerts compared against current min price; triggers notification stub |
| `purge_old_price_history` | Daily 3am | hard-deletes Price records older than 90 days |

### API Endpoints

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| GET | `/api/v1/prices/compare/?product=<id>&lat=<lat>&lng=<lng>` | Public | Prices for product within radius; each has is_stale, distance_km |
| GET | `/api/v1/prices/list-total/?list=<id>&store=<id>` | Required | Total cost of shopping list at a store; missing_items for unavailable products |
| GET | `/api/v1/prices/<product_id>/history/` | Public | Daily min/max/avg aggregations for last 90 days |
| POST | `/api/v1/prices/alerts/` | Required | Create price alert |
| DELETE | `/api/v1/prices/alerts/<id>/` | Required | Deactivate alert (not hard-deleted) |
| POST | `/api/v1/prices/crowdsource/` | Required | Report price with source=crowdsourcing, confidence_weight=0.5 |

## Decisions Made

- Prices are NEVER hard-deleted by business logic; only is_stale=True. The sole exception is `purge_old_price_history` which cleans records older than 90 days.
- `confidence_weight=0.5` for crowdsourced prices is applied in `CrowdsourcePriceView.perform_create`, not in the serializer or model default (keeps the model generic).
- `PriceAlertViewSet.destroy` overrides `perform_destroy` to set `is_active=False` rather than deleting, preserving history.
- `ListTotalView` is fully functional since ShoppingList was created in plan 01-05 (executed before this plan).

## Deviations from Plan

None - plan executed exactly as written. All 35 tests pass on first run. No architectural changes required.

## Test Results

```
35 passed in 6.09s
```

**Unit tests (15):** expire_stale_prices (6), check_price_alerts (6), purge_old_price_history (3)
**Integration tests (20):** compare (5), list-total (5), history (3), alerts (4), crowdsource (3)

## Self-Check: PASSED

All 9 artifacts verified on disk. Both commits (e117619, c6ab5e3) confirmed in git log.
