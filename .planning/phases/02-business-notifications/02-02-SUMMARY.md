---
phase: 02-business-notifications
plan: 02
subsystem: notifications
tags: [celery, redis, expo-push, rate-limiting, soft-delete, event-hooks]

# Dependency graph
requires:
  - phase: 02-business-notifications-01
    provides: Promotion model, business views with perform_create hook point
  - phase: 01-core-backend
    provides: User model, ShoppingList/ListCollaborator, prices/PriceAlert, Store.favorited_by, core responses

provides:
  - Notification inbox model (soft delete, is_read, NotificationType choices)
  - UserPushToken model (unique_together user+device_id for upsert)
  - User notify_price_alerts, notify_new_promos, notify_shared_list_changes per-event pref fields
  - dispatch_push_notification Celery task (rate-limited 10/day via Redis, retry on PushServerError)
  - notify_new_promo_at_store Celery task (fires on Promotion creation)
  - send_shared_list_notification Celery task (fires with 15-min debounce on list item changes)
  - GET/PATCH/DELETE REST inbox at /api/v1/notifications/
  - POST /api/v1/notifications/push-token/ upsert endpoint

affects:
  - Phase 3 (frontend): notifications inbox, push token registration UI
  - Phase 4/5 (optimizer, OCR): can trigger notifications via dispatch_push_notification.delay

# Tech tracking
tech-stack:
  added: [exponent_server_sdk (already in image from Plan 02-01)]
  patterns: [Redis rate-limiting with incr+expire, Redis debounce lock with setex, soft delete via deleted_at, module-level exponent imports for testability]

key-files:
  created:
    - backend/apps/notifications/models.py
    - backend/apps/notifications/serializers.py
    - backend/apps/notifications/views.py
    - backend/apps/notifications/tasks.py
    - backend/apps/notifications/urls.py
    - backend/apps/notifications/migrations/0001_initial.py
    - backend/apps/users/migrations/0002_user_notify_new_promos_user_notify_price_alerts_and_more.py
    - backend/tests/unit/test_notifications_models.py
    - backend/tests/integration/test_notification_dispatch.py
    - backend/tests/integration/test_notification_events.py
  modified:
    - backend/apps/users/models.py
    - backend/apps/prices/tasks.py
    - backend/apps/shopping_lists/views.py
    - backend/apps/business/views.py

key-decisions:
  - "exponent_server_sdk imports moved to module level in tasks.py so unittest.mock.patch() can intercept PushClient without lazy-import AttributeError"
  - "DeviceNotRegisteredError(push_response) requires a positional arg — tests must pass MagicMock() as push_response"
  - "Notification DB record always created regardless of push success (rate limit exceeded, no tokens, server error) — inbox always reflects dispatched events"
  - "_trigger_list_notification uses r.exists() + r.setex() debounce pattern (not r.get) for atomicity — prevents duplicate scheduling in 15-min window"
  - "notify_new_promo_at_store excludes notify_new_promos=False (not None) — None treated as on per plan spec"

patterns-established:
  - "Redis rate-limit pattern: r.incr(key); if count==1: r.expire(key, 86400); if count>LIMIT: return early"
  - "Redis debounce pattern: if not r.exists(lock_key): schedule task + r.setex(lock_key, TTL, 1)"
  - "Soft delete via deleted_at field + get_queryset filter deleted_at__isnull=True"
  - "Celery event hooks via perform_create inline import: from apps.notifications.tasks import X; X.delay(...)"

requirements-completed:
  - NOTIF-01

# Metrics
duration: 10min
completed: 2026-03-17
---

# Phase 2 Plan 02: Notifications System Summary

**Event-driven push notification system with Expo SDK, Redis rate limiting (10/day), 15-min debounced list notifications, price alert dispatch, and soft-delete inbox at /api/v1/notifications/**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-17T16:25:10Z
- **Completed:** 2026-03-17T16:35:45Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Full notifications app: Notification + UserPushToken models with migrations, 3 per-event user pref fields on User model
- Celery dispatch pipeline with 10/day Redis rate limit, DeviceNotRegisteredError token cleanup, PushServerError retry (max 3, 60s)
- Three event hooks: price alerts (prices/tasks), promotion creation (business/views), shared list changes (shopping_lists/views with 900s debounce)
- REST inbox (GET list, PATCH /read/, DELETE soft), push-token upsert endpoint
- 213 tests GREEN (up from 179), overall 88% coverage

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 scaffolds + Notification and UserPushToken models + User pref fields** - `8c5f967` (feat)
2. **Task 2: Notification views, dispatch tasks, and event hooks** - `e095147` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `backend/apps/notifications/models.py` - Notification + UserPushToken models, NotificationType enum
- `backend/apps/notifications/serializers.py` - NotificationSerializer, PushTokenSerializer
- `backend/apps/notifications/views.py` - NotificationViewSet (inbox+soft-delete), PushTokenView (upsert)
- `backend/apps/notifications/tasks.py` - dispatch_push_notification, notify_new_promo_at_store, send_shared_list_notification
- `backend/apps/notifications/urls.py` - DefaultRouter + manual push-token/ path
- `backend/apps/notifications/migrations/0001_initial.py` - Initial notifications migration
- `backend/apps/users/models.py` - Added notify_price_alerts, notify_new_promos, notify_shared_list_changes
- `backend/apps/users/migrations/0002_...py` - User pref fields migration
- `backend/apps/prices/tasks.py` - check_price_alerts hooked to dispatch_push_notification.delay
- `backend/apps/shopping_lists/views.py` - _trigger_list_notification helper + hooks in items action
- `backend/apps/business/views.py` - PromotionViewSet.perform_create hooked to notify_new_promo_at_store.delay
- `backend/tests/unit/test_notifications_models.py` - 11 unit tests (models, upsert, soft delete)
- `backend/tests/integration/test_notification_dispatch.py` - 5 integration tests (rate limit, token deletion, push message, DB record)
- `backend/tests/integration/test_notification_events.py` - 6 integration tests (price alert, promo, shared list trigger)

## Decisions Made
- exponent_server_sdk imports moved to module level so patch() works in tests
- DeviceNotRegisteredError requires `push_response` positional arg — mock with MagicMock()
- Notification DB record always created even when push is skipped (rate limit, no tokens)
- Redis debounce uses `r.exists()` + `r.setex()` for the list notification lock

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] exponent_server_sdk imports moved to module level**
- **Found during:** Task 2 (dispatch tests)
- **Issue:** PushClient was imported lazily inside the task function, making `patch("apps.notifications.tasks.PushClient")` raise AttributeError
- **Fix:** Moved all exponent_server_sdk imports to module level in tasks.py
- **Files modified:** backend/apps/notifications/tasks.py
- **Verification:** 4 dispatch tests went from FAILED to PASSED
- **Committed in:** e095147

**2. [Rule 1 - Bug] DeviceNotRegisteredError instantiation requires push_response arg**
- **Found during:** Task 2 (test_dispatch_device_not_registered_deletes_token)
- **Issue:** `DeviceNotRegisteredError()` raised TypeError — constructor requires push_response positional arg
- **Fix:** Updated test to pass `MagicMock()` as push_response
- **Files modified:** backend/tests/integration/test_notification_dispatch.py
- **Verification:** Test PASSED after fix
- **Committed in:** e095147

**3. [Rule 1 - Bug] PromotionSerializer requires start_date field**
- **Found during:** Task 2 (test_promo_creation_triggers_notify_task)
- **Issue:** POST to /api/v1/business/promotions/ returned 400 — start_date missing from test payload
- **Fix:** Added "start_date": "2026-03-17" to test payload
- **Files modified:** backend/tests/integration/test_notification_events.py
- **Verification:** Test returned 201 PASSED
- **Committed in:** e095147

---

**Total deviations:** 3 auto-fixed (all Rule 1 - bugs)
**Impact on plan:** All fixes necessary for correctness. No scope creep.

## Issues Encountered
- None beyond the 3 auto-fixed bugs above.

## User Setup Required
None - no external service configuration required. Expo push uses existing Redis and Celery infrastructure.

## Next Phase Readiness
- Notifications system fully implemented and tested
- Phase 2 (business + notifications) complete
- Phase 3 (frontend) can use /api/v1/notifications/ inbox and /api/v1/notifications/push-token/ to register devices
- dispatch_push_notification.delay() available for any future phase to trigger notifications

---
*Phase: 02-business-notifications*
*Completed: 2026-03-17*
