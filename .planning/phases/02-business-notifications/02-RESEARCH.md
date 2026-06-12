# Phase 2: Business & Notifications — Research

**Researched:** 2026-03-17
**Domain:** Django DRF ViewSet custom actions, Celery async/countdown tasks, Expo push notifications (exponent_server_sdk), Django email, Redis rate limiting
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Business Profile & Verification**
- 1:N model: one `BusinessProfile` can own multiple `Store` branches (FK on BusinessProfile)
- Profile fields: business name, tax ID (CIF/NIF), address, website (beyond User model)
- Business always creates a **new Store** on registration — no claiming existing scraped chain stores
- Verification via dedicated admin API endpoint (not Django admin toggle): approve/reject actions on BusinessProfile viewset
- Rejection includes a reason string; business can edit profile and re-submit for re-verification
- Blocked until verified: unverified businesses get HTTP 403 on all write operations (price updates, promotions); read access to own profile is fine
- Email sent on approval and rejection — uses existing console/SMTP email backend from Phase 1

**Promotion Model**
- Discount types: both flat (€) and percentage (%) — `discount_type` field ('flat'/'percentage') + `discount_value`
- Scope: product-level — Promotion has FKs to product + store; requires an existing Price record at that store
- Active promotions appear in price comparison response as a `promo_price` field alongside regular price (consistent with existing `offer_price` shape)
- Auto-deactivate via Celery task when `end_date` passes (consistent with Celery patterns established in Phase 1)
- Optional `min_quantity` field (nullable)
- Basic view count (`views` integer) on Promotion model — incremented when included in a price comparison response
- No overlapping promotions: unique constraint enforces only one active promotion per product+store at a time
- Optional `title` + `description` fields — visible to consumers as a badge/label
- Both business and admin can deactivate a promotion

**Business Prices**
- Business price updates create a new Price record with `source='business'` — adds 'business' to `Price.Source` choices
- No expiry — business prices never go stale automatically
- Business price takes priority over scraped when both exist for the same product+store
- Business can only enter prices for products already in the catalog
- Read-only pricing history available to businesses: `GET /business/prices/?store=X`
- Competitor price alert to business: Celery task alerts when a scraped price differs by more than threshold
  - Default threshold: 10%, configurable per BusinessProfile (`price_alert_threshold_pct` field)

**Notification Granularity & Storage**
- Per-event preferences added to User model (nullable booleans, default True):
  - `notify_price_alerts` — user's own price alert triggered
  - `notify_new_promos` — new promotion at a favorited store
  - `notify_shared_list_changes` — collaborator changes a shared list
  - Global `push_notifications_enabled` / `email_notifications_enabled` act as master off-switches
- Expo Push Notifications for push (React Native + Expo frontend)
- `UserPushToken` model (separate table): user FK, token, device_id, created_at — supports multiple devices per user; token upserted on each app launch via a registration endpoint
- All notification dispatch is async via Celery — never blocks the API response

**Notification Events (NOTIF-01)**
- Price alert triggered — dispatched by existing Celery task; add notification dispatch call
- New promo at favorited store — triggered when a Promotion is created/activated
- Shared list changed — batched: changes within a 15-minute window are summarized into one notification per user (Celery delayed task per list)
- Business registration approved/rejected — email to the business user

**Notification Model (in-app inbox)**
- `user` (FK), `notification_type` (TextChoices), `title`, `body`, `is_read` (default False)
- `data` (JSONField) — event-specific payload
- `action_url` — deep link string using `bargain://` scheme
- `created_at`, `deleted_at` (nullable — soft delete)
- Inbox endpoint: `GET /notifications/` returns items WHERE `deleted_at IS NULL`, ordered by `created_at DESC`
- `PATCH /notifications/{id}/read/` marks as read; `DELETE /notifications/{id}/` sets `deleted_at`
- Push rate limit: max 10 push notifications per user per day, tracked in Redis

### Claude's Discretion
- Exact Celery Beat schedule for promotion auto-deactivation task
- Deep link scheme routing on the React Native side (Phase 3 concern)
- Exact batching implementation for shared-list notifications (Celery countdown vs ETA)
- Redis key structure for push rate limiting
- Email template design for approval/rejection messages

### Deferred Ideas (OUT OF SCOPE)
- In-app notification center UI — Phase 3
- Push notification analytics (open rates, tap rates) — future phase or v2
- Business dashboard statistics beyond basic view count — Phase 3
- Promotion types beyond flat/percentage — v2
- Business can claim an existing scraped Store record — v2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BIZ-01 | Comercio puede registrar perfil de negocio (datos fiscales, vinculación tienda), sujeto a verificación admin (RF-032) | BusinessProfile model + ModelViewSet with `approve`/`reject` custom actions; IsAdminUser permission on those actions; IsBusiness + IsVerified custom permissions for write endpoints |
| BIZ-02 | Comercio puede actualizar precios manualmente sin caducidad automática (RF-033) | New Price record with `source='business'`; extend Price.Source TextChoices; no stale-marking for business source; dedicated BusinessPriceViewSet scoped to business' own stores |
| BIZ-03 | Comercio puede crear/editar/desactivar promociones con fechas y descuentos (RF-034) | Promotion model with UniqueConstraint; PromotionViewSet; Celery task for auto-deactivation; `promo_price` field added to PriceCompareSerializer |
| NOTIF-01 | Sistema envía notificaciones push y/o email según preferencias del usuario para: alertas precio, nuevas promos en favoritas, cambios en listas compartidas, resultados OCR (RF-035) | UserPushToken model + registration endpoint; Notification model + inbox CRUD; exponent_server_sdk PushClient; Celery tasks for all 3 async dispatch paths; Redis incr/expire for rate limiting |
</phase_requirements>

---

## Summary

Phase 2 extends Phase 1's already-working Django/DRF/Celery/Redis stack in two directions. The business portal side is a standard DRF ModelViewSet pattern with custom `@action` endpoints for admin approval and a custom permission class (`IsVerifiedBusiness`) that gates all write operations. The notification system has two moving parts: (1) the Notification inbox model + REST endpoints, and (2) the async dispatch layer using Celery tasks and the `exponent_server_sdk` Python library for Expo push notifications.

No new third-party services are introduced. Redis is already running as Celery broker and is used directly via `django-redis` or the raw `redis` Python client (already in `base.txt`) for the push rate-limit counter. Email uses the existing Django email backend (`send_mail`) that Phase 1 already uses for password reset. The Expo push SDK (`exponent_server_sdk`) must be added to `requirements/base.txt`.

**Primary recommendation:** Model all new behavior on Phase 1 patterns — `@shared_task(bind=True)`, `success_response`/`created_response` helpers, `BargainAPIException` subclasses, per-app `tasks.py`, pytest-django fixtures with `@pytest.mark.django_db`. The only genuinely new pattern is `apply_async(countdown=900)` for 15-minute batching and `redis.incr` + `redis.expire` for push rate limiting.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Django REST Framework | 3.15 (pinned in base.txt) | ViewSets, serializers, permissions | Already installed |
| Celery + Redis | 5.4 (pinned) | Async tasks, countdown/ETA, Beat schedule | Already running |
| django-celery-beat | 2.6 (pinned) | DB-backed periodic tasks | Already used for price expiry |
| exponent_server_sdk | latest | Python client for Expo push API | Official community SDK; wraps Expo's HTTPS endpoint |
| redis (Python) | 5.0 (pinned in base.txt) | Direct Redis access for rate-limit counters | Already in requirements |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| django.core.mail.send_mail | built-in | Email for approval/rejection | Synchronous in tasks (called inside @shared_task so non-blocking to API) |
| drf_spectacular @extend_schema | 0.27 (pinned) | OpenAPI schema for new endpoints | All new views follow Phase 1 pattern |
| structlog | 24.x (pinned) | Structured logging in tasks and views | Already configured globally |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| exponent_server_sdk | Direct HTTP to exp.host API | SDK handles batching (100/req), token validation, DeviceNotRegisteredError; no reason to hand-roll |
| Redis incr counter | django-ratelimit | redis incr+expire is 3 lines; no new dependency needed |
| Celery countdown=900 | Celery ETA datetime | countdown is simpler for relative delays; ETA needed only for absolute future times |

**Installation (new package to add to base.txt):**
```bash
pip install exponent_server_sdk
```

Add to `backend/requirements/base.txt`:
```
exponent_server_sdk>=2.0,<3.0
```

---

## Architecture Patterns

### Recommended App Structure

```
apps/business/
├── __init__.py
├── apps.py
├── models.py          # BusinessProfile, Promotion
├── serializers.py     # BusinessProfileSerializer, PromotionSerializer, BusinessPriceSerializer
├── views.py           # BusinessProfileViewSet, PromotionViewSet, BusinessPriceViewSet
├── permissions.py     # IsVerifiedBusiness, IsBusinessOwner
├── tasks.py           # deactivate_expired_promotions, check_competitor_prices
├── migrations/
└── urls.py

apps/notifications/
├── __init__.py
├── apps.py
├── models.py          # Notification, UserPushToken
├── serializers.py     # NotificationSerializer, PushTokenSerializer
├── views.py           # NotificationViewSet, PushTokenView
├── tasks.py           # dispatch_push_notification, dispatch_shared_list_notification
├── migrations/
└── urls.py
```

### Pattern 1: Custom Admin Action on ModelViewSet

**What:** An `@action(detail=True, methods=['post'])` on the BusinessProfile viewset that only admin users may call, to approve or reject a profile.

**When to use:** When a lifecycle state change needs a dedicated endpoint (not a PATCH to a field), especially when it has side effects (send email, update related objects).

**Example:**
```python
# Source: DRF docs — https://www.django-rest-framework.org/api-guide/viewsets/#marking-extra-actions-for-routing
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser

class BusinessProfileViewSet(viewsets.ModelViewSet):
    queryset = BusinessProfile.objects.select_related("user").all()
    serializer_class = BusinessProfileSerializer

    def get_permissions(self):
        if self.action in ("approve", "reject"):
            return [IsAdminUser()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        profile = self.get_object()
        profile.is_verified = True
        profile.rejection_reason = ""
        profile.save(update_fields=["is_verified", "rejection_reason"])
        send_business_approval_email.delay(profile.id)
        return success_response({"status": "verified"})

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        reason = request.data.get("reason", "")
        profile = self.get_object()
        profile.is_verified = False
        profile.rejection_reason = reason
        profile.save(update_fields=["is_verified", "rejection_reason"])
        send_business_rejection_email.delay(profile.id, reason)
        return success_response({"status": "rejected"})
```

### Pattern 2: IsVerifiedBusiness Permission Class

**What:** A DRF permission class that returns 403 for any business user whose profile `is_verified=False`.

**When to use:** On all write endpoints (price update, promotion create/edit) in the business namespace.

**Example:**
```python
# Pattern follows Phase 1's IsOwnerOrCollaborator in shopping_lists/permissions.py
from rest_framework.permissions import BasePermission

class IsVerifiedBusiness(BasePermission):
    """Grants access only to users with role=business AND a verified BusinessProfile."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role != "business":
            return False
        return BusinessProfile.objects.filter(
            user=request.user, is_verified=True
        ).exists()
```

### Pattern 3: Celery Countdown for Batched Notifications

**What:** When a shopping list item changes, fire (or reschedule) a Celery task with a 900-second (15-minute) countdown. Use a Redis flag to coalesce burst edits into a single notification.

**When to use:** Any case where you want to debounce multiple events into one notification window.

**Example:**
```python
# Source: Celery docs — https://docs.celeryq.dev/en/stable/userguide/calling.html#eta-and-countdown
from apps.notifications.tasks import send_shared_list_notification

# In shopping_lists/views.py — after item add/remove/check:
BATCH_WINDOW = 900  # seconds

def _trigger_list_notification(list_id: int, actor_id: int) -> None:
    """Schedules (or reschedules) a batched notification task."""
    import redis as redis_lib
    from django.conf import settings

    r = redis_lib.from_url(settings.CELERY_BROKER_URL)
    lock_key = f"list_notif_pending:{list_id}"

    if not r.exists(lock_key):
        # No task pending — schedule one
        task = send_shared_list_notification.apply_async(
            args=[list_id, actor_id], countdown=BATCH_WINDOW
        )
        r.setex(lock_key, BATCH_WINDOW, task.id)
    # If key exists, a task is already queued — let it fire with whatever changes
    # accumulated in the window
```

### Pattern 4: Expo Push Dispatch Task

**What:** A Celery task that reads `UserPushToken` records, checks preferences and rate limit, then sends via `exponent_server_sdk.PushClient`.

**When to use:** All push dispatches. Never call synchronously from a view or serializer.

**Example:**
```python
# Source: https://github.com/expo/expo-server-sdk-python
from exponent_server_sdk import (
    DeviceNotRegisteredError,
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
)

@shared_task(bind=True, max_retries=3)
def dispatch_push_notification(self, user_id: int, title: str, body: str, data: dict) -> None:
    """Send push notification to all active devices for a user."""
    import redis as redis_lib
    from django.conf import settings
    from apps.notifications.models import UserPushToken

    # Rate limit: max 10 push/user/day
    r = redis_lib.from_url(settings.CELERY_BROKER_URL)
    rate_key = f"push_rate:{user_id}:{timezone.now().date()}"
    current = r.incr(rate_key)
    if current == 1:
        r.expire(rate_key, 86400)  # 24h TTL
    if current > 10:
        logger.info("push_rate_limit_exceeded", user_id=user_id)
        return

    tokens = UserPushToken.objects.filter(user_id=user_id).values_list("token", flat=True)
    client = PushClient()
    for token in tokens:
        try:
            client.publish(
                PushMessage(to=token, title=title, body=body, data=data, sound="default")
            )
        except DeviceNotRegisteredError:
            UserPushToken.objects.filter(token=token).delete()
        except (PushServerError, PushTicketError) as exc:
            raise self.retry(exc=exc, countdown=60)
```

### Pattern 5: Promotion UniqueConstraint + Auto-Deactivation

**What:** Django `UniqueConstraint` with a condition to enforce at most one active promotion per product+store. Celery Beat task runs periodically to deactivate expired promotions.

**When to use:** The constraint protects against concurrent API calls; the task handles the time-based expiry.

**Example:**
```python
# Promotion model
class Promotion(models.Model):
    class DiscountType(models.TextChoices):
        FLAT = "flat", "Importe fijo (€)"
        PERCENTAGE = "percentage", "Porcentaje (%)"

    product = models.ForeignKey("products.Product", on_delete=models.CASCADE, related_name="promotions")
    store = models.ForeignKey("stores.Store", on_delete=models.CASCADE, related_name="promotions")
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    min_quantity = models.PositiveSmallIntegerField(null=True, blank=True)
    title = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    views = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["product", "store"],
                condition=models.Q(is_active=True),
                name="unique_active_promotion_per_product_store",
            )
        ]

# In tasks.py:
@shared_task(bind=True, ignore_result=True)
def deactivate_expired_promotions(self) -> dict:
    from apps.business.models import Promotion
    count = Promotion.objects.filter(
        is_active=True, end_date__lt=timezone.now().date()
    ).update(is_active=False)
    logger.info("deactivate_expired_promotions", count=count)
    return {"deactivated": count}
```

### Pattern 6: UserPushToken Upsert

**What:** A single POST endpoint that creates or updates the push token record for the current user + device_id. Use Django's `update_or_create`.

**When to use:** Called by the Expo app on every launch to keep tokens fresh.

**Example:**
```python
# Source: Django ORM docs
class PushTokenView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PushTokenSerializer

    def create(self, request, *args, **kwargs):
        token = request.data.get("token")
        device_id = request.data.get("device_id", "")
        obj, created = UserPushToken.objects.update_or_create(
            user=request.user,
            device_id=device_id,
            defaults={"token": token},
        )
        serializer = self.get_serializer(obj)
        if created:
            return created_response(serializer.data)
        return success_response(serializer.data)
```

### Anti-Patterns to Avoid

- **Sending push from a view directly:** Always `task.delay()` — Expo API calls can take 1-5 seconds.
- **Hard-coding `is_verified=True` on BusinessProfile create:** New profiles start unverified; set `is_verified=False` as default.
- **Using `offer_price` for promo price:** Phase 1's `offer_price` is a scraped-from-supermarket field. Business promotions are a separate concept — add a distinct `promo_price` field computed at query time in the serializer.
- **Running `deactivate_expired_promotions` task from the view on save:** Use Celery Beat; the view's `perform_create` only fires the "new promo" notification, not the deactivation logic.
- **Calling `r.incr` without setting TTL:** If the `expire` call fails (e.g., Redis restarts mid-day), the counter persists forever. Always `r.setex(key, ttl, 1)` on first create (when incr returns 1) to make TTL setting atomic with creation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Push notification delivery | Custom HTTP calls to exp.host | `exponent_server_sdk.PushClient` | Handles batch of 100, receipt API, DeviceNotRegisteredError cleanup, retries |
| Overlapping promotions enforcement | Application-level check before insert | `UniqueConstraint` with `condition=Q(is_active=True)` | Race conditions; DB constraint is atomic |
| Email for approval/rejection | Custom email class | `django.core.mail.send_mail` inside a `@shared_task` | Already proven pattern (Phase 1 password reset uses it) |
| Push rate limiting | Token bucket algorithm | `redis.incr` + `redis.expire` on `push_rate:{user_id}:{date}` key | Two Redis ops, no extra library |
| Notification persistence | Log file or external service | `Notification` Django model (soft-delete with `deleted_at`) | Queryable inbox, no external dependency |

**Key insight:** All infrastructure (Celery, Redis, email, DRF permissions) is already running from Phase 1. Phase 2 adds models and wires existing patterns together — the only new production dependency is `exponent_server_sdk`.

---

## Common Pitfalls

### Pitfall 1: BusinessProfile FK on Store — migration order

**What goes wrong:** `Store.business_profile` FK points to `business.BusinessProfile`, but `business` app is skeleton-only with no models yet. If `stores` migrations run before `business` migrations exist, Django raises `LookupError`.
**Why it happens:** `stores/models.py` must be updated, but the FK target model does not exist yet in this phase's starting state.
**How to avoid:** Create `BusinessProfile` model and initial migration in `apps.business` first. Then add `business_profile = models.ForeignKey('business.BusinessProfile', null=True, blank=True, on_delete=models.SET_NULL)` to `Store` model with a separate migration in `apps.stores`.
**Warning signs:** `LookupError: No installed app with label 'business'` during `makemigrations`.

### Pitfall 2: Price.Source TextChoices extension breaks existing data

**What goes wrong:** Extending `Source.choices` with `BUSINESS = "business"` is non-destructive at the DB level (it's a `varchar`), but existing tests that assert `Source.choices` length or enumerate values will fail.
**Why it happens:** Hardcoded assertions on the choices list.
**How to avoid:** Add `BUSINESS` to the TextChoices class — no migration needed (choices are only validation, not a DB constraint). Update any tests that enumerate `Source.choices`.
**Warning signs:** Unit tests in `tests/unit/test_prices.py` fail with unexpected values.

### Pitfall 3: Celery countdown tasks accumulate in Redis when not consumed

**What goes wrong:** A countdown task for shared list notifications gets scheduled but the Celery worker is stopped; on restart, all accumulated tasks fire at once.
**Why it happens:** Celery stores ETA/countdown tasks in the broker (Redis) until they are ready. If multiple edit events are made before the first countdown fires, and the lock key already expired, multiple tasks are scheduled.
**How to avoid:** The Redis lock key `list_notif_pending:{list_id}` TTL must match the countdown exactly (900s). On each edit, check the key before scheduling. Accept that if the key expires before the task fires (clock drift, Redis eviction), a second task may be scheduled — this is a known idempotency trade-off acceptable for this use case (duplicate notification is better than no notification).
**Warning signs:** Users receive two "list changed" notifications in quick succession.

### Pitfall 4: Expo push token invalidation not handled

**What goes wrong:** A device uninstalls the app or the push token expires. `exponent_server_sdk` raises `DeviceNotRegisteredError`. If not caught, the task crashes and retries indefinitely.
**Why it happens:** Token lifecycle is managed by Expo/FCM/APNs, not by the backend.
**How to avoid:** Catch `DeviceNotRegisteredError` in the dispatch task and delete the stale `UserPushToken` record immediately. Do not retry.
**Warning signs:** Celery error logs show repeated `DeviceNotRegisteredError` for the same token.

### Pitfall 5: `promo_price` computation in PriceCompareSerializer

**What goes wrong:** Computing `promo_price` inside the serializer's `to_representation` with an extra DB query per price row (N+1 problem).
**Why it happens:** Serializer method fields that hit the DB without prefetch/annotate.
**How to avoid:** Annotate the queryset in `PriceCompareView.get()` with a subquery or LEFT JOIN to the promotions table before passing to the serializer. Alternatively, prefetch active promotions and build a lookup dict.
**Warning signs:** Query count spikes in tests; Django Debug Toolbar shows N+1 pattern.

### Pitfall 6: Business competitor price alert fires on its own price updates

**What goes wrong:** When a business updates its own price, `check_competitor_prices` may compare the new business price against itself.
**Why it happens:** The competitor alert task compares scraped prices against business prices for the same product+store. If the filter does not exclude `source='business'`, a business price is compared against itself.
**How to avoid:** In `check_competitor_prices` task, filter scraped prices with `source__in=[Price.Source.SCRAPING, Price.Source.API]` and business prices with `source=Price.Source.BUSINESS`. Never compare a business price record against itself.

---

## Code Examples

Verified patterns from the existing Phase 1 codebase:

### Existing test fixture pattern (replicate for Phase 2 tests)
```python
# Source: backend/tests/unit/test_prices.py
@pytest.fixture
def user(db, django_user_model):
    return django_user_model.objects.create_user(
        username="testuser_business",
        email="business@test.com",
        password="testpass123",
        role="business",
    )
```

### Existing Celery task pattern (replicate in business/tasks.py and notifications/tasks.py)
```python
# Source: backend/apps/prices/tasks.py
@shared_task(bind=True, ignore_result=True)
def deactivate_expired_promotions(self) -> dict[str, int]:
    from apps.business.models import Promotion
    count = Promotion.objects.filter(
        is_active=True,
        end_date__lt=timezone.now().date(),
    ).update(is_active=False)
    logger.info("deactivate_expired_promotions_complete", deactivated=count)
    return {"deactivated": count}
```

### API response envelope (all new endpoints must use these helpers)
```python
# Source: backend/apps/core/responses.py
from apps.core.responses import created_response, success_response
# GET list → success_response(data)
# POST create → created_response(data)
```

### Email dispatch inside a task (pattern from users/views.py)
```python
# Source: backend/apps/users/views.py (send_mail usage)
from django.core.mail import send_mail

@shared_task(bind=True, ignore_result=True)
def send_business_approval_email(self, profile_id: int) -> None:
    from apps.business.models import BusinessProfile
    profile = BusinessProfile.objects.select_related("user").get(pk=profile_id)
    send_mail(
        subject="Tu negocio ha sido verificado en BarGAIN",
        message=f"Hola {profile.user.get_full_name()}, tu negocio '{profile.business_name}' ha sido verificado.",
        from_email="no-reply@bargain.app",
        recipient_list=[profile.user.email],
        fail_silently=False,
    )
```

### Celery Beat schedule addition (add to base.py CELERY_BEAT_SCHEDULE)
```python
# Source: backend/config/settings/base.py (existing pattern)
"deactivate-expired-promotions-hourly": {
    "task": "apps.business.tasks.deactivate_expired_promotions",
    "schedule": crontab(minute=5, hour="*"),  # 5 min past each hour
},
"check-competitor-prices-daily": {
    "task": "apps.business.tasks.check_competitor_prices",
    "schedule": crontab(minute=0, hour=8),  # 08:00 daily
},
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FCM/APNs direct integration | Expo push API via exponent_server_sdk | Expo SDK era | No need for Firebase credentials on backend; Expo abstracts FCM/APNs |
| Notification delivered via WebSocket | REST inbox + async push dispatch | Phase 2 scope | Simpler; no Django Channels needed |
| Unique constraint in application code | `UniqueConstraint(condition=Q(...))` — partial index | Django 2.2+ | Atomic at DB level; handles race conditions correctly |

**Deprecated/outdated:**
- `offer_price` on Price model: Phase 1's `offer_price` is sourced from scraping (supermarket's own sale tag). Phase 2's promotion `promo_price` is business-managed and computed differently — do NOT conflate them even though they appear in the same serializer.

---

## Open Questions

1. **Promotion `promo_price` computation strategy**
   - What we know: Needs to appear alongside `price` and `offer_price` in `PriceCompareSerializer`; must not cause N+1
   - What's unclear: Whether to annotate via subquery in the view or prefetch+dict-lookup; subquery is cleaner but requires `OuterRef`/`Subquery` Django ORM constructs
   - Recommendation: Use prefetch approach in `PriceCompareView` — `Promotion.objects.filter(store_id__in=..., is_active=True).select_related('product')` then build `{(product_id, store_id): promotion}` dict; pass as context to serializer

2. **`check_competitor_prices` task scope**
   - What we know: Compares scraped vs business prices for same product+store; alerts business by email
   - What's unclear: Whether to also check for price differences that appeared since the last run (incremental) or always scan all active business prices
   - Recommendation: Full scan per run (simpler); mark last alert time on BusinessProfile to avoid repeated alerts within 24h

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.x + pytest-django 4.8 |
| Config file | `backend/pytest.ini` (existing) |
| Quick run command | `docker exec bargain-backend pytest tests/unit/test_business.py tests/unit/test_notifications.py -v --tb=short` |
| Full suite command | `docker exec bargain-backend pytest tests/ --cov=apps --cov-report=term -v` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BIZ-01 | BusinessProfile CRUD + approve/reject actions + 403 for unverified | integration | `pytest tests/integration/test_business_endpoints.py -x` | Wave 0 |
| BIZ-01 | Email sent on approval/rejection (mocked) | unit | `pytest tests/unit/test_business.py -k email -x` | Wave 0 |
| BIZ-02 | Business price create with source='business'; no stale-marking | unit | `pytest tests/unit/test_business.py -k price -x` | Wave 0 |
| BIZ-02 | BusinessPrice endpoint: 403 for unverified, 201 for verified | integration | `pytest tests/integration/test_business_endpoints.py -k price -x` | Wave 0 |
| BIZ-03 | Promotion create/deactivate; UniqueConstraint enforced | unit | `pytest tests/unit/test_business.py -k promotion -x` | Wave 0 |
| BIZ-03 | deactivate_expired_promotions Celery task | unit | `pytest tests/unit/test_business.py -k deactivate -x` | Wave 0 |
| BIZ-03 | promo_price appears in price compare response | integration | `pytest tests/integration/test_price_endpoints.py -k promo -x` | Wave 0 |
| NOTIF-01 | UserPushToken upsert endpoint | integration | `pytest tests/integration/test_notification_endpoints.py -k push_token -x` | Wave 0 |
| NOTIF-01 | Notification model inbox: list, mark-read, soft-delete | integration | `pytest tests/integration/test_notification_endpoints.py -k inbox -x` | Wave 0 |
| NOTIF-01 | dispatch_push_notification Celery task: rate limit, DeviceNotRegisteredError | unit | `pytest tests/unit/test_notifications.py -k dispatch -x` | Wave 0 |
| NOTIF-01 | send_shared_list_notification: countdown scheduling and batching | unit | `pytest tests/unit/test_notifications.py -k shared_list -x` | Wave 0 |
| NOTIF-01 | check_price_alerts triggers notification dispatch (mock) | unit | `pytest tests/unit/test_prices.py -k notify -x` | Wave 0 — extend existing file |

### Sampling Rate
- **Per task commit:** `docker exec bargain-backend pytest tests/unit/test_business.py tests/unit/test_notifications.py -v --tb=short`
- **Per wave merge:** `docker exec bargain-backend pytest tests/ -v --tb=short`
- **Phase gate:** Full suite green + coverage ≥ 80% before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/unit/test_business.py` — unit tests for BusinessProfile, Promotion models, Celery tasks (BIZ-01 through BIZ-03)
- [ ] `backend/tests/unit/test_notifications.py` — unit tests for Notification model, UserPushToken, dispatch tasks (NOTIF-01)
- [ ] `backend/tests/integration/test_business_endpoints.py` — API tests for business portal endpoints
- [ ] `backend/tests/integration/test_notification_endpoints.py` — API tests for inbox + push token endpoints

---

## Sources

### Primary (HIGH confidence)
- Django DRF official docs — ViewSet custom actions, BasePermission, UniqueConstraint with condition
- `backend/apps/prices/tasks.py` — existing Celery pattern in Phase 1 codebase
- `backend/apps/users/views.py` — existing send_mail usage
- `backend/config/settings/base.py` — existing Celery Beat schedule, Redis config
- https://docs.expo.dev/push-notifications/sending-notifications/ — Expo push token format, batch limit (100), API endpoint
- https://docs.celeryq.dev/en/stable/userguide/calling.html#eta-and-countdown — countdown/ETA apply_async parameters

### Secondary (MEDIUM confidence)
- https://github.com/expo/expo-server-sdk-python — `exponent_server_sdk` package name, PushClient usage, DeviceNotRegisteredError handling

### Tertiary (LOW confidence)
- Redis incr+expire rate limiting pattern: well-known pattern but not verified against official Redis docs in this session; low risk given the simplicity

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in requirements.txt except exponent_server_sdk (verified via GitHub)
- Architecture: HIGH — all patterns directly extend Phase 1 code that passed 179 tests
- Pitfalls: HIGH (migration order, N+1, task design) / MEDIUM (countdown Redis key edge cases)
- Expo push API: HIGH — verified via official Expo docs (batch 100, token format)

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable libraries; Expo push API is versioned and stable)
