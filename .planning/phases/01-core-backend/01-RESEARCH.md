# Phase 1: Core Backend - Research

**Researched:** 2026-03-16
**Domain:** Django REST Framework, SimpleJWT, PostGIS, Celery, pg_trgm
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**JWT Session Policy**
- Access tokens live 5 minutes
- Refresh tokens live 30 days
- Refresh token rotation: rotate on every use (old token invalidated, new one issued)
- Multi-device: both sessions stay active — each device gets its own independent refresh token
- Password reset: single-use token link sent by email, expires after 1 hour
- Email backend: console for dev, SMTP for production (no third-party transactional service)

**Product Search**
- Fuzzy search implementation: pg_trgm trigram similarity (PostgreSQL native extension, threshold ~0.3)
- Barcode search: exact match only — if barcode not in DB, return 404 and suggest crowdsourced entry
- Category hierarchy: 2 levels (parent + subcategory, e.g., Lácteos > Leche)
- Product autocomplete uses trigram similarity on `normalized_name` field

**Crowdsourcing & Catalog**
- New product proposals (PROD-05): pending admin review before becoming visible — not immediate publish
- Crowdsourced prices (PRICE-05): shown alongside scraped prices with lower confidence weight, never override scraped prices directly. Tagged with `source=crowdsourcing`.

**Price Data Policies**
- Price history retention: 90 days — Celery periodic task purges older records
- Price expiry: mark stale (keep in DB with stale flag), never hard delete
  - Scraped prices: stale after 48h
  - Crowdsourced prices: stale after 24h
- Price alerts (PRICE-04): Celery periodic task checks every 30 minutes
- Price comparison endpoint (PRICE-01): filters by user's search radius using PostGIS
- Price history chart (PRICE-03): daily aggregated (min/max/avg per day) — one data point per day for the 90-day window

**Shopping List Sharing**
- Collaboration mode: full co-edit — both owner and collaborators can add, remove, and check items
- Invite mechanism: by username
- When collaborator is removed: their items stay on the list, only future edit access is revoked
- Templates (LIST-04): items only — copies product names, no quantities, no checked state; all items reset to unchecked with quantity=1
- Active list limit: at 20 active lists, block creation with HTTP 409 and message "Archiva una lista para crear una nueva"

### Claude's Discretion
- Exact pg_trgm similarity threshold (start at 0.3, tune if needed)
- Loading skeleton and error state UI patterns (backend concerns only here)
- Exact Celery Beat schedule for price stale-marking task
- Admin moderation UI for product approvals (Django admin is sufficient)
- structlog logging format details
- Swagger/OpenAPI schema field descriptions

### Deferred Ideas (OUT OF SCOPE)
- Share list by public link (v2-01)
- Open Food Facts API fallback for barcode lookup
- Real-time collaborative list sync (WebSocket)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Usuario puede registrarse con email y contraseña | UserRegistrationSerializer + CreateAPIView pattern; password validation via Django validators |
| AUTH-02 | Usuario puede iniciar sesión y recibe par JWT access+refresh | simplejwt TokenObtainPairView — already installed; needs custom serializer to return `{ success, data }` wrapper |
| AUTH-03 | Usuario puede recuperar contraseña por email | Custom PasswordResetRequestView + PasswordResetConfirmView; Django's one-use token via `django.contrib.auth.tokens.PasswordResetTokenGenerator`; 1h expiry via `PASSWORD_RESET_TIMEOUT` setting |
| AUTH-04 | Usuario puede consultar y modificar su perfil | UserProfileViewSet with retrieve/partial_update; User model already implemented |
| AUTH-05 | Usuario puede configurar preferencias de optimización | Subset of AUTH-04 — same endpoint, fields already on User model |
| PROD-01 | Usuario puede buscar productos por nombre, categoría, marca o código de barras | Product model + ProductViewSet; barcode exact match; name/category/brand via django-filter + SearchFilter |
| PROD-02 | Usuario puede ver detalle de producto con rango de precios cercano | ProductDetailSerializer annotated with price range from Price table filtered by user location radius |
| PROD-03 | Sistema ofrece autocompletado con matching fuzzy en búsqueda | pg_trgm extension + `TrigramSimilarity` from `django.contrib.postgres.search`; threshold ~0.3 on `normalized_name` |
| PROD-04 | Productos organizados en jerarquía de categorías navegable | Category model with self-FK (parent nullable); 2-level hierarchy; CategoryViewSet |
| PROD-05 | Usuario puede proponer nuevo producto al catálogo (crowdsourcing, sujeto a validación) | ProductProposal model with `status=pending`; Django admin action to approve/reject |
| STORE-01 | Sistema lista tiendas en radio configurable ordenadas por distancia | Store model with PostGIS PointField; `Distance` filter from `django.contrib.gis.db.models.functions`; order by distance |
| STORE-02 | Usuario puede ver detalle de tienda con precios de su lista activa | StoreDetailSerializer annotated with active list item prices |
| STORE-03 | Tiendas mostradas en mapa interactivo diferenciando cadenas y comercios locales | `is_local_business` bool field + `chain` FK; serializer exposes both; no extra backend work beyond data |
| STORE-04 | Usuario puede marcar tiendas como favoritas | UserFavoriteStore M2M model; toggle endpoint |
| PRICE-01 | Sistema muestra comparación de precios de un producto en tiendas del radio | Price queryset filtered by PostGIS distance; annotate fresh/stale indicator |
| PRICE-02 | Sistema calcula coste total de la lista en cada tienda individual | Aggregate endpoint: sum(unit_price × quantity) per store for items in a shopping list |
| PRICE-03 | Usuario puede consultar histórico de precios de un producto en gráfico temporal | Price history queryset grouped by date (TruncDay) with Min/Max/Avg annotation; 90-day window |
| PRICE-04 | Usuario puede definir alerta de precio objetivo; sistema notifica cuando se alcanza | PriceAlert model; Celery Beat task every 30 min; triggers notification |
| PRICE-05 | Usuario puede reportar precio de un producto en una tienda (crowdsourcing, caduca 24h) | Price record with `source=crowdsourcing`; stale after 24h; confidence weight field |
| LIST-01 | Usuario puede crear, consultar, editar, archivar y eliminar listas (máx. 20 activas) | ShoppingList model with `is_archived` bool; pre_save validation; HTTP 409 at limit |
| LIST-02 | Usuario puede añadir/modificar/eliminar ítems con buscador y autocompletado | ShoppingListItem model nested in list; item search reuses PROD-03 endpoint |
| LIST-03 | Usuario puede compartir lista con otro usuario registrado para edición conjunta | ListCollaborator M2M with invite-by-username; permission check on all item mutations |
| LIST-04 | Usuario puede guardar lista como plantilla y crear nuevas desde plantillas | ListTemplate model; create-from-template endpoint resets quantities to 1, unchecked |
</phase_requirements>

---

## Summary

Phase 1 implements all backend REST API endpoints for authentication, product catalog, store geolocation, price tracking, and shopping lists. The infrastructure (Django 5, DRF, SimpleJWT, PostGIS, Celery, Redis) is fully configured and running in Docker. All five target apps (`users`, `products`, `stores`, `prices`, `shopping_lists`) exist as skeletons with empty `urlpatterns` — the entire implementation is net-new models, serializers, views, and tests.

The most significant technical pieces are: (1) the pg_trgm fuzzy search setup requiring a PostgreSQL extension and Django's `django.contrib.postgres.search` module, (2) the PostGIS geospatial query patterns for store radius filtering, and (3) the Celery tasks for price staleness and alert checking. The simplejwt settings in `base.py` need to be corrected — the current defaults (60 min access / 7 day refresh) do not match the locked decisions (5 min access / 30 day refresh); this must be fixed via environment variables or settings override.

The existing conftest.py provides `api_client`, `consumer_user`, `business_user`, `admin_user`, `authenticated_client`, `business_client`, `admin_client`, and `seville_point` fixtures. Tests run with `pytest` from the `backend/` directory. The target is 80% coverage across all implemented apps.

**Primary recommendation:** Implement apps in dependency order — users/auth first (no deps), then products+categories (no geo), then stores (PostGIS), then prices (depends on products + stores), then shopping lists (depends on products + users).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Django | >=5.1,<5.2 | Web framework | Already installed, project standard |
| djangorestframework | >=3.15,<4.0 | REST API layer | Already installed, project standard |
| djangorestframework-simplejwt | >=5.3,<6.0 | JWT auth | Already installed, simplejwt configured in settings |
| django.contrib.gis | Django built-in | PostGIS ORM integration | Already enabled in INSTALLED_APPS and DB backend |
| django-filter | >=24.0,<25.0 | Queryset filtering | Already installed and in DEFAULT_FILTER_BACKENDS |
| drf-spectacular | >=0.27,<1.0 | OpenAPI schema gen | Already installed, AutoSchema configured |
| celery[redis] | >=5.4,<6.0 | Async task queue | Already installed, tasks registered per-app |
| django-celery-beat | >=2.6,<3.0 | Periodic task scheduling | Already installed, DatabaseScheduler configured |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| django.contrib.postgres | Django built-in | pg_trgm TrigramSimilarity, TruncDay aggregation | PROD-03 fuzzy search, PRICE-03 history chart |
| factory-boy | >=3.3,<4.0 | Test data factories | All model tests — generates realistic fixture data |
| faker | >=26.0,<27.0 | Fake data generation | Used by factory-boy for names, emails, coordinates |
| pytest-django | >=4.8,<5.0 | pytest Django integration | Already in dev.txt; provides `db`, `django_user_model` fixtures |
| pytest-cov | >=5.0,<6.0 | Coverage reports | Already in dev.txt; `--cov=apps` flag |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pg_trgm trigram similarity | Elasticsearch / typesense | pg_trgm is PostgreSQL-native, zero extra infra, sufficient for catalog size |
| Celery Beat for price checks | Django management commands + cron | Celery Beat is already configured with DatabaseScheduler — consistent with existing setup |
| simplejwt built-in views | Djoser | simplejwt already installed and configured; Djoser adds dependency weight without benefit here |

**Installation:** No new packages needed — all required libraries are in `base.txt` and `dev.txt`. Only PostgreSQL extension activation needed:

```sql
-- Run once in Docker PostgreSQL container
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

Or via Django migration:

```python
from django.contrib.postgres.operations import TrigramExtension

class Migration(migrations.Migration):
    operations = [
        TrigramExtension(),
        ...
    ]
```

---

## Architecture Patterns

### Recommended Project Structure (per app)

```
apps/{app_name}/
├── models.py          # Django models
├── serializers.py     # DRF serializers (create this file)
├── views.py           # ViewSets and APIViews (create this file)
├── urls.py            # Router registration (already exists, currently empty)
├── permissions.py     # Custom permission classes (create if needed)
├── filters.py         # django-filter FilterSet classes (create if needed)
├── tasks.py           # Celery tasks (already exists in prices/)
├── admin.py           # Django admin registration (create this file)
├── apps.py            # App config (already exists)
└── migrations/        # DB migrations (already exists)
```

Tests live in `backend/tests/unit/` and `backend/tests/integration/` — one subdirectory per app:

```
tests/
├── conftest.py              # Shared fixtures (already populated)
├── unit/
│   ├── test_users.py
│   ├── test_products.py
│   ├── test_stores.py
│   ├── test_prices.py
│   └── test_shopping_lists.py
└── integration/
    ├── test_auth_endpoints.py
    ├── test_product_endpoints.py
    ├── test_store_endpoints.py
    ├── test_price_endpoints.py
    └── test_list_endpoints.py
```

### Pattern 1: Standard ViewSet with Router

**What:** DRF ModelViewSet registered with DefaultRouter; router handles all CRUD URL generation.
**When to use:** All resource endpoints (products, stores, prices, shopping lists).

```python
# apps/products/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Product
from .serializers import ProductSerializer

class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet para operaciones CRUD de productos."""

    queryset = Product.objects.select_related("category").all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["category", "is_active"]

    def get_queryset(self) -> QuerySet[Product]:
        """Filtra productos activos para usuarios no-admin."""
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            return qs.filter(is_active=True)
        return qs
```

```python
# apps/products/urls.py
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet

router = DefaultRouter()
router.register("", ProductViewSet, basename="product")
urlpatterns = router.urls
```

### Pattern 2: pg_trgm Fuzzy Search

**What:** PostgreSQL trigram similarity search on `normalized_name`. Requires `pg_trgm` extension enabled.
**When to use:** PROD-03 autocomplete, product search endpoint.

```python
# apps/products/views.py
from django.contrib.postgres.search import TrigramSimilarity
from rest_framework.decorators import action
from rest_framework.response import Response

class ProductViewSet(viewsets.ModelViewSet):
    ...

    @action(detail=False, methods=["get"], url_path="autocomplete")
    def autocomplete(self, request) -> Response:
        """Autocompletado de productos usando trigram similarity."""
        query = request.query_params.get("q", "").strip()
        if len(query) < 2:
            return Response({"success": True, "data": []})

        results = (
            Product.objects.annotate(similarity=TrigramSimilarity("normalized_name", query))
            .filter(similarity__gte=0.3, is_active=True)
            .order_by("-similarity")[:10]
        )
        serializer = ProductSerializer(results, many=True)
        return Response({"success": True, "data": serializer.data})
```

### Pattern 3: PostGIS Distance Query

**What:** Filter and order stores by distance from a user-provided location.
**When to use:** STORE-01 nearby stores, PRICE-01 price comparison with radius filter.

```python
# apps/stores/views.py
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D

class StoreViewSet(viewsets.ReadOnlyModelViewSet):
    ...

    def get_queryset(self):
        lat = self.request.query_params.get("lat")
        lng = self.request.query_params.get("lng")
        radius_km = float(
            self.request.query_params.get("radius_km", self.request.user.max_search_radius_km)
        )
        if lat and lng:
            user_location = Point(float(lng), float(lat), srid=4326)
            return (
                Store.objects.filter(location__distance_lte=(user_location, D(km=radius_km)))
                .annotate(distance=Distance("location", user_location))
                .order_by("distance")
            )
        return Store.objects.none()
```

### Pattern 4: Standard API Response Wrapper

**What:** All endpoints return `{ "success": true/false, "data": {} }` or `{ "success": false, "error": { ... } }`.
**When to use:** Every endpoint in every app. The exception handler in `core/exceptions.py` handles error wrapping automatically. Success responses need explicit wrapping.

Use a custom `BargainResponse`:

```python
# apps/core/responses.py  (create this file)
from rest_framework.response import Response

def success_response(data, status=200) -> Response:
    """Wraps data in BarGAIN standard success envelope."""
    return Response({"success": True, "data": data}, status=status)
```

Or override `finalize_response` in a base ViewSet mixin. The bargain_exception_handler in `core/exceptions.py` already handles error wrapping — only success responses need wrapping.

### Pattern 5: Celery Periodic Task

**What:** Celery Beat runs tasks on a schedule. Tasks are registered in `tasks.py` per app.
**When to use:** Price staleness marking (every hour), price alert checking (every 30 min), price history purge (daily).

```python
# apps/prices/tasks.py
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import structlog

logger = structlog.get_logger(__name__)

@shared_task(bind=True, ignore_result=True)
def expire_stale_prices(self) -> dict[str, int]:
    """Marca precios expirados con is_stale=True."""
    now = timezone.now()
    scraping_cutoff = now - timedelta(hours=48)
    crowdsourcing_cutoff = now - timedelta(hours=24)

    scraping_count = Price.objects.filter(
        source="scraping", is_stale=False, verified_at__lt=scraping_cutoff
    ).update(is_stale=True)

    crowdsourcing_count = Price.objects.filter(
        source="crowdsourcing", is_stale=False, verified_at__lt=crowdsourcing_cutoff
    ).update(is_stale=True)

    logger.info("expire_stale_prices", scraping=scraping_count, crowdsourcing=crowdsourcing_count)
    return {"scraping": scraping_count, "crowdsourcing": crowdsourcing_count}
```

Add the alert task to `CELERY_BEAT_SCHEDULE` in `base.py`:

```python
"check-price-alerts-every-30min": {
    "task": "apps.prices.tasks.check_price_alerts",
    "schedule": crontab(minute="*/30"),
},
"purge-old-price-history-daily": {
    "task": "apps.prices.tasks.purge_old_price_history",
    "schedule": crontab(minute=0, hour=3),
},
```

### Pattern 6: JWT Settings Fix

**What:** The locked decisions require access=5min / refresh=30 days. Current `base.py` reads from env vars with defaults of 60 min / 7 days. The fix is to update defaults or set env vars in `.env`.

```python
# In base.py — update defaults to match locked decisions
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=int(os.environ.get("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", 5))  # changed: 60 → 5
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(os.environ.get("JWT_REFRESH_TOKEN_LIFETIME_DAYS", 30))  # changed: 7 → 30
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}
```

### Pattern 7: Password Reset with Django Token

**What:** Single-use token via `PasswordResetTokenGenerator`; expires via `PASSWORD_RESET_TIMEOUT` setting (default 3 days in Django; set to 3600 seconds = 1 hour).
**When to use:** AUTH-03.

```python
# In settings/base.py
PASSWORD_RESET_TIMEOUT = 3600  # 1 hour in seconds

# apps/users/views.py
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        email = request.data.get("email")
        try:
            user = User.objects.get(email=email)
            token = PasswordResetTokenGenerator().make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            # Send email with uid + token link
            send_password_reset_email(user, uid, token)
        except User.DoesNotExist:
            pass  # Don't reveal whether email exists (security)
        return success_response({"message": "Si el email existe, recibirás un enlace."})
```

### Anti-Patterns to Avoid

- **N+1 queries in serializers:** Always use `select_related`/`prefetch_related` on ViewSet querysets, never lazy-load in serializer `to_representation`. Shopping list items need `prefetch_related("items__product__category")`.
- **Returning raw DRF response without wrapper:** All success responses must be `{"success": true, "data": ...}`. The exception handler handles errors automatically — only wrap success responses.
- **Hard-deleting prices:** Never `price.delete()` — only set `is_stale=True` or archive. This preserves the history chart integrity.
- **Blocking list creation without checking archived status:** The 20-list limit is on `is_archived=False` lists only. Check `ShoppingList.objects.filter(owner=user, is_archived=False).count()`.
- **Storing raw lat/lng as FloatFields:** Use PostGIS `PointField(srid=4326)` — it enables efficient `distance_lte` queries. Float fields cannot use spatial indexes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy text search | Custom Levenshtein loop | `TrigramSimilarity` from `django.contrib.postgres.search` | PostgreSQL computes this at index speed; Python loops are O(n*m) |
| Geospatial radius filter | Haversine formula in Python | PostGIS `distance_lte` + `D(km=...)` | Uses GIST spatial index; scales to thousands of stores |
| JWT token generation/validation | Custom HMAC signing | simplejwt `TokenObtainPairView` + blacklist app | Token blacklist, rotation, and expiry already implemented |
| Password reset tokens | Custom UUID table | `PasswordResetTokenGenerator` + `PASSWORD_RESET_TIMEOUT` | HMAC-based, single-use, no DB table needed |
| Periodic task scheduling | `django-crontab` or raw cron | `django-celery-beat` with `DatabaseScheduler` | Already configured; schedules stored in DB, manageable from admin |
| Price history aggregation | Python loop over 90 days | `TruncDay` + `Annotate(Min, Max, Avg)` queryset | Single SQL query vs 90+ queries |
| API response envelope | Manual wrapping in every view | `bargain_exception_handler` + `success_response()` helper | Consistent format; exception handler already wired in settings |

**Key insight:** The Django/PostgreSQL stack already provides native solutions for every complex query pattern in this phase. The goal is to wire them correctly, not build custom solutions.

---

## Common Pitfalls

### Pitfall 1: pg_trgm Extension Not Enabled
**What goes wrong:** `TrigramSimilarity` raises `django.db.utils.ProgrammingError: function similarity(character varying, unknown) does not exist`
**Why it happens:** PostgreSQL extension not activated in the database.
**How to avoid:** Add `TrigramExtension()` to the products or core initial migration, or run `CREATE EXTENSION pg_trgm` manually in the Docker container.
**Warning signs:** Error on first query involving `TrigramSimilarity`.

### Pitfall 2: GDAL_LIBRARY_PATH Breaks Docker PostGIS
**What goes wrong:** Django fails to start in Docker container with `OSError: [Errno 2] No such file or directory: '/path/on/windows'`
**Why it happens:** Windows `.env` sets `GDAL_LIBRARY_PATH` to a Windows path; Docker container sees a Linux environment where that path doesn't exist.
**How to avoid:** STATE.md already documents this — `GDAL_LIBRARY_PATH` must be unset or empty in `.env` when running in Docker. The `base.py` settings only apply `GDAL_LIBRARY_PATH` if the path `exists()`, which protects against this.
**Warning signs:** Django fails to start inside Docker with a path error.

### Pitfall 3: Celery Beat Fail at Startup (scraping tasks not registered)
**What goes wrong:** `CELERY_BEAT_SCHEDULE` references `apps.scraping.tasks.run_spider` which doesn't exist yet.
**Why it happens:** Celery Beat tries to register tasks at startup — unresolvable task name causes warnings or errors.
**How to avoid:** Add a stub `run_spider` task to `apps/scraping/tasks.py` in Phase 1 (or it may already exist). STATE.md flags this as a known concern.
**Warning signs:** Celery Beat worker logs show `Received unregistered task of type 'apps.scraping.tasks.run_spider'`.

### Pitfall 4: simplejwt Token Blacklist Migration Not Applied
**What goes wrong:** `rest_framework_simplejwt.token_blacklist` is in INSTALLED_APPS but migration not run → `Table 'token_blacklist_outstandingtoken' doesn't exist`
**Why it happens:** BlacklistApp needs its own migrations applied.
**How to avoid:** Run `python manage.py migrate` — this applies simplejwt blacklist migrations. Verify in Docker with `make migrate-docker`.
**Warning signs:** Login works but refresh token rotation throws 500.

### Pitfall 5: PostGIS SRID Mismatch
**What goes wrong:** Distance queries return wrong results or `ValueError: Geometry has invalid SRID` errors.
**Why it happens:** Mixing coordinates stored with SRID=4326 (WGS84, lat/lng) and SRID=3857 (web mercator, meters).
**How to avoid:** Always use `srid=4326` on all PointFields. When creating Points in code use `Point(longitude, latitude, srid=4326)` — note longitude comes first in PostGIS convention, opposite of most mapping APIs.
**Warning signs:** Distance calculations return values in degrees instead of meters/km.

### Pitfall 6: List Enrichment N+1 Query
**What goes wrong:** Shopping list endpoint takes O(n) queries where n = number of items.
**Why it happens:** Serializer calls `item.product.latest_price` or similar in a loop without prefetching.
**How to avoid:** Use `prefetch_related("items__product__category")` on the ShoppingList queryset. For price enrichment, annotate with a subquery or use `Prefetch` with a queryset that includes latest prices.
**Warning signs:** Django Debug Toolbar shows 20+ queries for a single list GET.

### Pitfall 7: Password Reset Email in Dev
**What goes wrong:** Test user can't receive reset email in dev environment.
**Why it happens:** SMTP not configured in dev.
**How to avoid:** `EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'` in `dev.py` (per CONTEXT.md). The reset link prints to console stdout. This is the locked decision.
**Warning signs:** No error but email never appears — check that `dev.py` not `base.py` is active.

---

## Code Examples

### Shopping List Active Limit Check

```python
# apps/shopping_lists/views.py
from apps.core.exceptions import BargainAPIException
from rest_framework import status

class ActiveListLimitError(BargainAPIException):
    status_code = status.HTTP_409_CONFLICT
    default_code = "ACTIVE_LIST_LIMIT_REACHED"
    default_detail = "Archiva una lista para crear una nueva"

class ShoppingListViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):
        active_count = ShoppingList.objects.filter(
            owner=self.request.user, is_archived=False
        ).count()
        if active_count >= 20:
            raise ActiveListLimitError()
        serializer.save(owner=self.request.user)
```

### Price History Daily Aggregation

```python
# apps/prices/views.py
from django.db.models.functions import TruncDay
from django.db.models import Min, Max, Avg
from django.utils import timezone
from datetime import timedelta

@action(detail=True, methods=["get"], url_path="history")
def history(self, request, pk=None):
    """Histórico de precios diario para los últimos 90 días."""
    product = self.get_object()
    cutoff = timezone.now() - timedelta(days=90)

    daily_data = (
        Price.objects.filter(product=product, verified_at__gte=cutoff)
        .annotate(day=TruncDay("verified_at"))
        .values("day", "store__id", "store__name")
        .annotate(min_price=Min("price"), max_price=Max("price"), avg_price=Avg("price"))
        .order_by("day")
    )
    return success_response(list(daily_data))
```

### Factory for Tests

```python
# tests/factories.py  (create this file)
import factory
from factory.django import DjangoModelFactory
from django.contrib.gis.geos import Point

class UserFactory(DjangoModelFactory):
    class Meta:
        model = "users.User"

    username = factory.Sequence(lambda n: f"user_{n}")
    email = factory.LazyAttribute(lambda o: f"{o.username}@test.com")
    password = factory.PostGenerationMethodCall("set_password", "testpass123")
    role = "consumer"

class StoreFactory(DjangoModelFactory):
    class Meta:
        model = "stores.Store"

    name = factory.Faker("company", locale="es_ES")
    location = factory.LazyFunction(lambda: Point(-5.9845, 37.3891, srid=4326))
    is_local_business = False
```

### Integration Test Pattern

```python
# tests/integration/test_auth_endpoints.py
import pytest

@pytest.mark.django_db
class TestRegistration:
    def test_register_creates_user(self, api_client):
        payload = {
            "username": "newuser",
            "email": "new@test.com",
            "password": "securepass123",
            "password_confirm": "securepass123",
        }
        response = api_client.post("/api/v1/auth/register/", payload)
        assert response.status_code == 201
        assert response.data["success"] is True
        assert "data" in response.data

    def test_login_returns_jwt_pair(self, api_client, consumer_user):
        payload = {"username": consumer_user.username, "password": "testpass123"}
        response = api_client.post("/api/v1/auth/token/", payload)
        assert response.status_code == 200
        assert "access" in response.data["data"]
        assert "refresh" in response.data["data"]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `psycopg2` | `psycopg[binary]` (psycopg3) | Django 4.2+ | Already in requirements; async-capable, better type support |
| `djangorestframework-jwt` (PyJWT-based) | `djangorestframework-simplejwt` | ~2020 | Already installed; JWT blacklist, rotation built-in |
| Raw `django.test.TestCase` | `pytest-django` with fixtures | Standard since ~2018 | Already configured; faster, composable fixtures |
| `django.contrib.gis.utils.layermapping` for geo imports | PostGIS PointField direct | Always | Direct field use is simpler for this use case |

**Deprecated/outdated in this project:**
- `dj_database_url` env var defaults in base.py point to `localhost:5432` — inside Docker this works because the service is named `db`, not `localhost`. The `DATABASE_URL` env var is what matters in practice; the default string is only a fallback.

---

## Open Questions

1. **scraping tasks stub at startup**
   - What we know: `CELERY_BEAT_SCHEDULE` references `apps.scraping.tasks.run_spider` which has no implementation yet.
   - What's unclear: Whether the current Celery Beat startup raises an error or just a warning.
   - Recommendation: Add a no-op stub to `apps/scraping/tasks.py` in the first wave of Phase 1 to prevent boot errors.

2. **Price freshness indicator in list enrichment**
   - What we know: CONTEXT.md specifies the price comparison result should include a `fresh`/`stale` indicator per entry.
   - What's unclear: Whether the shopping list enrichment endpoint (STORE-02, LIST-01) should also include this indicator.
   - Recommendation: Include `is_stale` as a boolean field in all serializers that expose price data — it costs nothing and the frontend can use it.

3. **pg_trgm in existing migrations**
   - What we know: No existing migration creates the extension.
   - What's unclear: Whether the Docker PostgreSQL container has pg_trgm pre-installed but not activated.
   - Recommendation: Add `TrigramExtension()` to a new migration in the products app (Wave 1) to ensure it's enabled before fuzzy search is needed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest 8.x + pytest-django 4.x |
| Config file | `backend/pytest.ini` |
| Quick run command | `cd backend && pytest tests/unit/ -x --tb=short` |
| Full suite command | `cd backend && pytest --cov=apps --cov-report=term -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | POST /auth/register/ creates user | integration | `pytest tests/integration/test_auth_endpoints.py::TestRegistration -x` | ❌ Wave 0 |
| AUTH-02 | POST /auth/token/ returns JWT pair | integration | `pytest tests/integration/test_auth_endpoints.py::TestLogin -x` | ❌ Wave 0 |
| AUTH-03 | POST /auth/password-reset/ sends email | integration | `pytest tests/integration/test_auth_endpoints.py::TestPasswordReset -x` | ❌ Wave 0 |
| AUTH-04 | GET/PATCH /auth/profile/ reads/updates user | integration | `pytest tests/integration/test_auth_endpoints.py::TestProfile -x` | ❌ Wave 0 |
| AUTH-05 | PATCH /auth/profile/ updates optimization prefs | integration | `pytest tests/integration/test_auth_endpoints.py::TestProfile -x` | ❌ Wave 0 |
| PROD-01 | GET /products/?q= filters by name/category/barcode | integration | `pytest tests/integration/test_product_endpoints.py::TestProductSearch -x` | ❌ Wave 0 |
| PROD-02 | GET /products/{id}/ returns price range | integration | `pytest tests/integration/test_product_endpoints.py::TestProductDetail -x` | ❌ Wave 0 |
| PROD-03 | GET /products/autocomplete/?q= returns trigram matches | integration | `pytest tests/integration/test_product_endpoints.py::TestAutocomplete -x` | ❌ Wave 0 |
| PROD-04 | GET /products/categories/ returns 2-level tree | integration | `pytest tests/integration/test_product_endpoints.py::TestCategories -x` | ❌ Wave 0 |
| PROD-05 | POST /products/proposals/ creates pending proposal | integration | `pytest tests/integration/test_product_endpoints.py::TestProposals -x` | ❌ Wave 0 |
| STORE-01 | GET /stores/?lat=&lng=&radius_km= returns nearby stores | integration | `pytest tests/integration/test_store_endpoints.py::TestNearbyStores -x` | ❌ Wave 0 |
| STORE-02 | GET /stores/{id}/ returns store with active list prices | integration | `pytest tests/integration/test_store_endpoints.py::TestStoreDetail -x` | ❌ Wave 0 |
| STORE-03 | Store serializer includes is_local_business + chain | unit | `pytest tests/unit/test_stores.py::TestStoreSerializer -x` | ❌ Wave 0 |
| STORE-04 | POST /stores/{id}/favorite/ toggles favorite | integration | `pytest tests/integration/test_store_endpoints.py::TestFavorites -x` | ❌ Wave 0 |
| PRICE-01 | GET /prices/compare/?product=&lat=&lng= returns stores in radius | integration | `pytest tests/integration/test_price_endpoints.py::TestPriceCompare -x` | ❌ Wave 0 |
| PRICE-02 | GET /prices/list-total/?list=&store= sums item prices | integration | `pytest tests/integration/test_price_endpoints.py::TestListTotal -x` | ❌ Wave 0 |
| PRICE-03 | GET /prices/{product_id}/history/ returns daily aggregates | integration | `pytest tests/integration/test_price_endpoints.py::TestPriceHistory -x` | ❌ Wave 0 |
| PRICE-04 | POST /prices/alerts/ creates alert; task triggers notification | unit + integration | `pytest tests/unit/test_prices.py::TestAlertTask -x` | ❌ Wave 0 |
| PRICE-05 | POST /prices/crowdsource/ creates price with source=crowdsourcing | integration | `pytest tests/integration/test_price_endpoints.py::TestCrowdsource -x` | ❌ Wave 0 |
| LIST-01 | POST /lists/ blocked at 20 active with HTTP 409 | integration | `pytest tests/integration/test_list_endpoints.py::TestListLimit -x` | ❌ Wave 0 |
| LIST-02 | POST /lists/{id}/items/ adds item with product search | integration | `pytest tests/integration/test_list_endpoints.py::TestListItems -x` | ❌ Wave 0 |
| LIST-03 | POST /lists/{id}/collaborators/ invites by username | integration | `pytest tests/integration/test_list_endpoints.py::TestCollaborators -x` | ❌ Wave 0 |
| LIST-04 | POST /lists/{id}/save-template/ + POST /lists/from-template/ | integration | `pytest tests/integration/test_list_endpoints.py::TestTemplates -x` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd backend && pytest tests/unit/ -x --tb=short`
- **Per wave merge:** `cd backend && pytest --cov=apps --cov-report=term -v`
- **Phase gate:** Full suite green with coverage ≥80% before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/factories.py` — shared factory-boy factories for all models
- [ ] `tests/integration/test_auth_endpoints.py` — covers AUTH-01 through AUTH-05
- [ ] `tests/integration/test_product_endpoints.py` — covers PROD-01 through PROD-05
- [ ] `tests/integration/test_store_endpoints.py` — covers STORE-01 through STORE-04
- [ ] `tests/integration/test_price_endpoints.py` — covers PRICE-01 through PRICE-05
- [ ] `tests/integration/test_list_endpoints.py` — covers LIST-01 through LIST-04
- [ ] `tests/unit/test_users.py` — covers User model logic
- [ ] `tests/unit/test_products.py` — covers fuzzy search logic
- [ ] `tests/unit/test_stores.py` — covers PostGIS distance logic
- [ ] `tests/unit/test_prices.py` — covers stale-marking task and alert task
- [ ] `tests/unit/test_shopping_lists.py` — covers list limit logic and template copy

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `backend/config/settings/base.py` — JWT settings, installed apps, DRF config, Celery Beat schedule
- Direct inspection of `backend/apps/users/models.py` — User model fields confirmed
- Direct inspection of `backend/apps/core/exceptions.py` — exception hierarchy and response format confirmed
- Direct inspection of `backend/apps/prices/tasks.py` — Celery stub structure confirmed
- Direct inspection of `backend/tests/conftest.py` — available fixtures confirmed
- Direct inspection of `backend/requirements/base.txt` and `dev.txt` — all library versions confirmed
- Direct inspection of `backend/pytest.ini` — test runner configuration confirmed
- Direct inspection of `.planning/phases/01-core-backend/01-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- Django official docs for `PasswordResetTokenGenerator` and `PASSWORD_RESET_TIMEOUT` (knowledge cutoff Aug 2025 — behavior stable since Django 3.x)
- PostGIS `distance_lte` + `D(km=...)` pattern — well-documented in Django GIS docs, stable API
- `TrigramSimilarity` from `django.contrib.postgres.search` — stable since Django 2.x

### Tertiary (LOW confidence)
- None — all findings are based on direct code inspection or stable Django APIs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from requirements files and settings
- Architecture: HIGH — patterns derived from existing project conventions in CLAUDE.md and conftest.py
- Pitfalls: HIGH — directly observed from STATE.md blockers and code inspection
- Test mapping: HIGH — pytest.ini and conftest.py both confirmed

**Research date:** 2026-03-16
**Valid until:** 2026-06-16 (90 days — Django and DRF are stable; PostGIS API is stable)
