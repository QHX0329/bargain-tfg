---
phase: 02-business-notifications
verified: 2026-03-17T17:00:00Z
status: passed
score: 16/16 must-haves verified
re_verification: false
---

# Phase 2: Business & Notifications Verification Report

**Phase Goal:** PYME businesses can manage their store prices and promotions, and users receive relevant notifications
**Verified:** 2026-03-17
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths — Plan 02-01 (Business Portal)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A business user can register a BusinessProfile with CIF/NIF and name; the profile starts unverified | VERIFIED | `BusinessProfile.is_verified=False` default in `business/models.py:34`; `BusinessProfileViewSet.create` enforces `role='business'` and saves with `is_verified=False` |
| 2 | An admin can approve or reject a BusinessProfile via POST /approve/ or /reject/ with a reason string | VERIFIED | `approve` and `reject` `@action` decorators in `business/views.py:70-97`; `get_permissions` returns `[IsAdminUser()]` for these actions |
| 3 | Email is sent to the business on approval and on rejection | VERIFIED | `send_business_approval_email.delay(profile.id)` in `approve` action (line 80); `send_business_rejection_email.delay(profile.id, reason)` in `reject` action (line 95) |
| 4 | An unverified business receives HTTP 403 on write operations | VERIFIED | `IsVerifiedBusiness` permission class in `business/permissions.py` checks `role=='business'` AND `BusinessProfile.is_verified=True`; applied to `PromotionViewSet` and `BusinessPriceViewSet` |
| 5 | A verified business can POST a price with source='business' that never goes stale | VERIFIED | `BusinessPriceViewSet.perform_create` calls `serializer.save(source=Price.Source.BUSINESS, is_stale=False)`; `Price.Source.BUSINESS` choice present in `prices/models.py:21` |
| 6 | A verified business can create, deactivate, and edit promotions; only one active promotion per product+store is enforced | VERIFIED | `PromotionViewSet` with `deactivate` action; `UniqueConstraint(fields=['product','store'], condition=Q(is_active=True))` in `business/models.py:121-126`; `transaction.atomic()` + `PromotionConflictError` (409) on conflict |
| 7 | Active promotions appear as promo_price in price comparison responses | VERIFIED | `PriceCompareView.get()` in `prices/views.py:113-158` prefetches active promotions into `promo_lookup` dict; computes `promo_price` inline; `PriceCompareSerializer` has `promo_price` and `promotion` fields |
| 8 | deactivate_expired_promotions Celery task marks promotions with end_date < today as is_active=False | VERIFIED | `deactivate_expired_promotions` task in `business/tasks.py:74-85` uses `Promotion.objects.filter(is_active=True, end_date__lt=today).update(is_active=False)`; scheduled hourly at :05 in `CELERY_BEAT_SCHEDULE` |

### Observable Truths — Plan 02-02 (Notifications)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /api/v1/notifications/ returns inbox items for the current user (deleted_at IS NULL), ordered by created_at DESC | VERIFIED | `NotificationViewSet.get_queryset()` filters `deleted_at__isnull=True` and `user=request.user`; `Notification.Meta.ordering=['-created_at']` |
| 2 | PATCH /api/v1/notifications/{id}/read/ marks is_read=True; DELETE /api/v1/notifications/{id}/ sets deleted_at (soft delete) | VERIFIED | `read` action sets `notification.is_read=True`; `destroy` override sets `notification.deleted_at=timezone.now()` and returns 204 — does NOT call `super().destroy()` |
| 3 | POST /api/v1/notifications/push-token/ upserts a UserPushToken record | VERIFIED | `PushTokenView.create()` calls `UserPushToken.objects.update_or_create(user=request.user, device_id=device_id, defaults={'token': token})` |
| 4 | When check_price_alerts triggers an alert, dispatch_push_notification.delay() is called | VERIFIED | `prices/tasks.py:92-102` — after `alert.save()`, conditionally calls `dispatch_push_notification.delay(user_id=alert.user_id, ...)` checking `push_notifications_enabled` and `notify_price_alerts is not False` |
| 5 | When a Promotion is created, users who favorited that store receive a push notification | VERIFIED | `PromotionViewSet.perform_create()` calls `notify_new_promo_at_store.delay(serializer.instance.id)`; task queries `promotion.store.favorited_by.filter(...).exclude(notify_new_promos=False)` |
| 6 | Shared list changes schedule a batched Celery task with 15-minute countdown | VERIFIED | `_trigger_list_notification()` in `shopping_lists/views.py:43-64` uses Redis debounce (`r.exists()` + `r.setex()`) and calls `send_shared_list_notification.apply_async(countdown=900)`; hooked in `items` POST, `item_detail` PATCH and DELETE |
| 7 | Push dispatch is limited to 10 notifications per user per day via Redis counter | VERIFIED | `dispatch_push_notification` in `notifications/tasks.py:50-67` uses `r.incr(f"push_rate:{user_id}:{date}")`; returns early if `count > PUSH_RATE_LIMIT (10)` |
| 8 | Users can set per-event notification preferences | VERIFIED | `User` model has `notify_price_alerts`, `notify_new_promos`, `notify_shared_list_changes` (all `BooleanField(null=True, default=None)`) in `users/models.py:74-94` |

**Score:** 16/16 truths verified

---

## Required Artifacts

### Plan 02-01 Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `backend/apps/business/models.py` | BusinessProfile, Promotion models | Yes | Yes (133 lines, both classes, UniqueConstraint) | Imported by views, tasks, serializers | VERIFIED |
| `backend/apps/business/permissions.py` | IsVerifiedBusiness permission class | Yes | Yes (IsVerifiedBusiness + IsBusinessOwner) | Applied in PromotionViewSet and BusinessPriceViewSet | VERIFIED |
| `backend/apps/business/views.py` | BusinessProfileViewSet, PromotionViewSet, BusinessPriceViewSet | Yes | Yes (174 lines, approve/reject actions, perform_create hooks) | Registered in urls.py and included in config/urls.py | VERIFIED |
| `backend/apps/business/tasks.py` | deactivate_expired_promotions, check_competitor_prices, email tasks | Yes | Yes (165 lines, 4 real task implementations) | Scheduled in CELERY_BEAT_SCHEDULE; called from views | VERIFIED |
| `backend/apps/stores/models.py` | Store.business_profile FK (nullable) | Yes | Yes — `business_profile = ForeignKey('business.BusinessProfile', null=True, on_delete=SET_NULL)` | Used in BusinessPriceViewSet and PromotionViewSet queryset filters | VERIFIED |
| `backend/apps/prices/models.py` | Price.Source.BUSINESS choice | Yes | Yes — `BUSINESS = "business", "Portal PYME"` in TextChoices | Referenced in BusinessPriceViewSet.perform_create and check_competitor_prices | VERIFIED |
| `backend/apps/prices/serializers.py` | promo_price field in price comparison | Yes | Yes — `PriceCompareSerializer` has `promo_price` (DecimalField allow_null=True) and `promotion` (PromotionMinimalSerializer) | Instantiated in PriceCompareView.get() with promo_lookup data | VERIFIED |

### Plan 02-02 Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `backend/apps/notifications/models.py` | Notification, UserPushToken models | Yes | Yes (86 lines, both classes, soft-delete field, ordering) | Imported by tasks and views | VERIFIED |
| `backend/apps/notifications/tasks.py` | dispatch_push_notification, notify_new_promo_at_store, send_shared_list_notification | Yes | Yes (221 lines, real Redis rate-limiting, PushClient usage, retry logic) | Called from prices/tasks.py, business/views.py, shopping_lists/views.py | VERIFIED |
| `backend/apps/notifications/views.py` | NotificationViewSet (inbox), PushTokenView | Yes | Yes — soft delete override, read action, upsert in PushTokenView | Registered in notifications/urls.py; included in config/urls.py | VERIFIED |
| `backend/apps/users/models.py` | notify_price_alerts, notify_new_promos, notify_shared_list_changes fields | Yes | Yes — 3 nullable BooleanFields with default=None | Checked in prices/tasks.py, notifications/tasks.py dispatch logic | VERIFIED |

---

## Key Link Verification

### Plan 02-01 Key Links

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `business/views.py BusinessProfileViewSet.approve` | `business/tasks.send_business_approval_email` | `send_business_approval_email.delay(profile.id)` | WIRED | `views.py:80` — `send_business_approval_email.delay(profile.id)` |
| `business/views.py BusinessPriceViewSet.perform_create` | `prices/models.Price source='business'` | `serializer.save(source=Price.Source.BUSINESS)` | WIRED | `views.py:167` — `serializer.save(source=Price.Source.BUSINESS, is_stale=False)` |
| `prices/serializers.py PriceCompareSerializer` | `business/models.Promotion` via promo_lookup | `promo_lookup` dict prefetched in view | WIRED | `prices/views.py:113-119` builds `promo_lookup`; `promo_price` computed at lines 127-143 |

### Plan 02-02 Key Links

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `prices/tasks.check_price_alerts` | `notifications/tasks.dispatch_push_notification` | `dispatch_push_notification.delay(user_id, ...)` | WIRED | `prices/tasks.py:95` — `dispatch_push_notification.delay(...)` after alert fires |
| `business/views.PromotionViewSet.perform_create` | `notifications/tasks.notify_new_promo_at_store` | `notify_new_promo_at_store.delay(promotion.id)` | WIRED | `business/views.py:121-123` — inline import + `.delay(serializer.instance.id)` |
| `shopping_lists/views` | `notifications/tasks.send_shared_list_notification` | `_trigger_list_notification()` helper with `apply_async(countdown=900)` | WIRED | `shopping_lists/views.py:60-63`; called in `items` POST (line 156), `item_detail` PATCH (line 186), DELETE (line 191) |
| `notifications/tasks.dispatch_push_notification` | Redis `push_rate:{user_id}:{date}` | `r.incr(rate_key); r.expire if count==1` | WIRED | `notifications/tasks.py:51-54` — `rate_key = f"push_rate:{user_id}:{timezone.now().date()}"` + `r.incr` + `r.expire` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BIZ-01 | 02-01 | Comercio puede registrar perfil de negocio (datos fiscales, vinculación tienda), sujeto a verificación admin | SATISFIED | `BusinessProfile` model + `BusinessProfileViewSet` with approve/reject; `is_verified=False` default; migrations exist |
| BIZ-02 | 02-01 | Comercio puede actualizar precios manualmente sin caducidad automática | SATISFIED | `BusinessPriceViewSet.perform_create` sets `source=Price.Source.BUSINESS, is_stale=False`; `expire_stale_prices` task in prices/tasks.py does NOT touch `source=BUSINESS` prices |
| BIZ-03 | 02-01 | Comercio puede crear/editar/desactivar promociones con fechas y descuentos | SATISFIED | `PromotionViewSet` with create/deactivate; `Promotion` model has `start_date`, `end_date`, `discount_type`, `discount_value`; 409 on duplicate active promo |
| NOTIF-01 | 02-02 | Sistema envía notificaciones push y/o email según preferencias del usuario para: alertas precio, nuevas promos en favoritas, cambios en listas compartidas, resultados OCR | SATISFIED (partial) | Price alerts, new promos, shared list changes all wired and implemented. OCR results notification is deferred to Phase 5 (OCR module not yet built) — this is by design, not a gap |

**Note on NOTIF-01 and OCR:** REQUIREMENTS.md lists OCR as part of Phase 5. The OCR notification trigger cannot exist until `apps.ocr` is implemented. The three implemented dispatch paths (price alerts, promotions, shared lists) fully cover the current scope. OCR will be wired in Phase 5.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | No anti-patterns detected in Phase 2 files |

Scanned: `business/models.py`, `business/permissions.py`, `business/views.py`, `business/tasks.py`, `notifications/models.py`, `notifications/tasks.py`, `notifications/views.py`, `prices/serializers.py`, `prices/tasks.py`, `shopping_lists/views.py`. No TODO/FIXME/placeholder/stub patterns found.

---

## Human Verification Required

### 1. Email delivery in approval/rejection flow

**Test:** Approve a BusinessProfile via POST /api/v1/business/profiles/{id}/approve/ with a real email configured; check that the email arrives.
**Expected:** Email received with subject "Tu negocio ha sido verificado en BarGAIN" containing the business name.
**Why human:** Email delivery depends on SMTP configuration (EMAIL_BACKEND) in the runtime environment; cannot verify programmatically without a live mail server.

### 2. Expo push notification delivery end-to-end

**Test:** Register a real Expo push token via POST /api/v1/notifications/push-token/, then trigger a price alert, and check the device receives the notification.
**Expected:** Push notification appears on device with correct title/body within seconds of the Celery task running.
**Why human:** Requires a physical device with Expo Go, a running Celery worker, and live Redis. Cannot simulate the full stack in code inspection.

### 3. Redis rate limiting across task executions

**Test:** Trigger `dispatch_push_notification` 11 times for the same user in a single day and verify the 11th call creates a Notification record but does NOT call PushClient.
**Expected:** Rate limit counter in Redis increments; 11th call returns early after creating the DB record; `push_rate:{user_id}:{date}` key has a 24h TTL.
**Why human:** Requires a running Redis instance and Celery worker to observe actual behavior.

---

## Gaps Summary

No gaps found. All 16 observable truths are verified, all artifacts are substantive (not stubs), and all key links are wired with real implementation. The partial OCR notification path is intentional scope deferral to Phase 5.

---

_Verified: 2026-03-17_
_Verifier: Claude (gsd-verifier)_
