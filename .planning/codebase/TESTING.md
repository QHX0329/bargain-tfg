# Testing Patterns

**Analysis Date:** 2026-05-25

## Backend Test Framework

**Runner:** pytest + pytest-django
**Config:** `backend/pytest.ini`

```ini
DJANGO_SETTINGS_MODULE = config.settings.test
python_files = tests.py test_*.py *_tests.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short --strict-markers
testpaths = tests apps
```

**Run Commands:**
```bash
make test-backend                        # -v --tb=short
make test-backend-cov                    # HTML + terminal coverage
cd backend && pytest tests/unit/ -v
cd backend && pytest tests/integration/ -v
cd backend && pytest --cov=apps --cov-fail-under=80 -v   # CI threshold
```

**Coverage requirement:** 80% minimum enforced in CI (`--cov-fail-under=80`), reported to Codecov.

## Backend Test Structure

**Layout:**
```
backend/
├── tests/
│   ├── conftest.py          # Global fixtures
│   ├── unit/
│   │   ├── test_products.py
│   │   ├── test_users.py
│   │   ├── test_prices.py
│   │   ├── test_stores.py
│   │   ├── test_optimizer.py
│   │   ├── test_optimizer_semantic.py
│   │   ├── test_shopping_lists.py
│   │   ├── test_assistant.py
│   │   ├── test_ocr.py
│   │   ├── test_scraping_pipeline.py
│   │   ├── test_scraping_spiders.py
│   │   ├── test_business_models.py
│   │   ├── test_notifications_models.py
│   │   ├── test_distance_ors.py
│   │   ├── test_render_yaml.py
│   │   ├── test_seed_data_command.py
│   │   └── test_import_apify_places_command.py
│   └── integration/
│       ├── test_auth_endpoints.py
│       ├── test_product_endpoints.py
│       ├── test_store_endpoints.py
│       ├── test_price_endpoints.py
│       ├── test_list_endpoints.py
│       ├── test_optimizer_api.py
│       ├── test_assistant_api.py
│       ├── test_ocr_api.py
│       ├── test_business_registration.py
│       ├── test_business_prices.py
│       ├── test_business_verification.py
│       ├── test_promotions.py
│       ├── test_bulk_prices.py
│       ├── test_proposal_admin.py
│       ├── test_notification_dispatch.py
│       ├── test_notification_events.py
│       └── test_cross_domain.py
```

**Scope distinction:**
- `unit/` — model methods, serializer validation, service functions, management commands, spider helpers. No HTTP calls.
- `integration/` — full API endpoint tests via DRF `APIClient`. Hit real PostGIS test DB.

## Backend Fixtures (conftest.py)

All fixtures defined in `backend/tests/conftest.py`. Available project-wide without imports.

```python
@pytest.fixture
def api_client() -> APIClient:
    """DRF client without authentication."""
    return APIClient()

@pytest.fixture
def consumer_user(db, django_user_model):
    """User with role=consumer."""
    return django_user_model.objects.create_user(
        username="consumer_test", email="consumer@test.com",
        password="testpass123", role="consumer", ...
    )

@pytest.fixture
def authenticated_client(api_client, consumer_user) -> APIClient:
    """DRF client force-authenticated as consumer."""
    api_client.force_authenticate(user=consumer_user)
    return api_client

@pytest.fixture
def seville_point() -> Point:
    """PostGIS Point at Plaza Nueva, Sevilla (SRID 4326)."""
    return Point(-5.9845, 37.3891, srid=4326)
```

Also provided: `business_user`, `business_client`, `admin_user`, `admin_client`.

## Backend Test Patterns

**Unit test class structure:**
```python
@pytest.mark.django_db
class TestCategoryModel:
    """Tests del modelo Category."""

    def test_slug_auto_generated(self):
        from apps.products.models import Category
        cat = Category.objects.create(name="Frutas y Verduras")
        assert cat.slug == "frutas-y-verduras"
```

**Integration test — endpoint assertions:**
```python
@pytest.mark.django_db
class TestLogin:
    def test_login_returns_jwt_pair(self, api_client, consumer_user):
        response = api_client.post(TOKEN_URL, payload, format="json")
        assert response.status_code == 200
        assert response.data["success"] is True
        assert "access" in response.data["data"]
```

**URL constants:** Integration test files declare URL constants at module level:
```python
TOKEN_URL = "/api/v1/auth/token/"
PROFILE_URL = "/api/v1/auth/profile/me/"
```

**Exception testing:**
```python
with pytest.raises(ValidationError):
    level3.clean()

with pytest.raises(IntegrityError):
    Product.objects.create(name="B", barcode="1234567890123", unit="units")
```

**DB marker:** `@pytest.mark.django_db` required on every test or test class that touches the database.

**PostGIS in CI:** CI spins up `postgis/postgis:16-3.4` service and installs `gdal-bin`. Tests requiring geospatial queries use the `seville_point` fixture.

## Frontend Test Framework

**Runner:** Jest (via Expo preset)
**Assertion library:** Jest built-in + `@testing-library/react-native` v13

**Config:** Defined inside `frontend/package.json` (Expo default Jest preset — no separate `jest.config.*` file at root).

**Run Commands:**
```bash
cd frontend && npm run test              # jest
cd frontend && npm run test -- --coverage --ci   # CI mode with coverage
```

## Frontend Test Structure

**Location:** `frontend/__tests__/` (separate directory, not co-located)

**Files:**
```
frontend/__tests__/
├── LoginScreen.test.tsx      # Auth screens (Login + Register)
├── ProfileScreen.test.tsx    # Profile / preferences screen
├── ListsScreen.test.tsx      # Shopping lists screen
├── MapScreen.test.tsx        # Map + Google Places integration
├── NotificationScreen.test.tsx  # Notifications + HomeScreen widgets
├── SkeletonBox.test.tsx      # UI component + Zustand store unit tests
├── apiClient.test.ts         # authStore (hydrate/login/logout) + Axios interceptors
├── storeService.test.ts      # storeService Google Places methods
└── mapsUtils.test.ts         # Pure utility functions (URL builders)
```

## Frontend Test Patterns

**Mock-first structure:** All `jest.mock()` calls must appear before any `import` statements. Section dividers mark the boundary:
```typescript
// ─── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("@/api/authService", () => ({ authService: { login: jest.fn(), ... } }));

// ─── Imports (after mocks) ────────────────────────────────────────────────────
import { render, fireEvent, waitFor } from "@testing-library/react-native";
```

**Rendering tests:**
```typescript
const { getByPlaceholderText, getByText, getByTestId } = render(<LoginScreen />);
fireEvent.changeText(getByPlaceholderText("tu_usuario"), "test_user");
fireEvent.press(getByText("Iniciar sesión"));
await waitFor(() => expect(mockAuthService.login).toHaveBeenCalledWith(...));
```

**Async service mocking:**
```typescript
mockAuthService.login.mockResolvedValueOnce({ access: "access123", refresh: "ref" });
mockAuthService.login.mockRejectedValueOnce(new Error("Unauthorized"));
```

**Zustand store reset in `beforeEach`:**
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ isAuthenticated: false, user: null, token: null });
});
```

**Accessibility/testID pattern:** Interactive elements expose `testID` for test queries (e.g., `testID="login-submit-button"`, `testID="register-submit-button"`). Disabled state checked via `accessibilityState`:
```typescript
expect(submitButton.props.accessibilityState?.disabled).toBe(true);
```

**Pure utility tests:** No mocks needed — test input/output directly:
```typescript
it("builds a circular route url with origin, destination and waypoints", () => {
  const url = buildGoogleMapsCircularRouteUrl({ origin, stops });
  const parsed = new URL(url as string);
  expect(parsed.searchParams.get("travelmode")).toBe("driving");
});
```

## What is Tested

**Backend — well covered:**
- `users`: registration, JWT login, token refresh, password reset, profile CRUD
- `products`: Category model (slug, hierarchy, ordering), Product model (normalized_name, barcode uniqueness, choices), ProductProposal (status), pg_trgm extension
- `optimizer`: `solve_route` (OR-Tools), weight normalization in serializer, no-store exception
- `scraping`: Spider helpers (Lidl NUXT payload extractor), pipeline item processing
- `business`: BusinessProfile models, verification flow, price endpoints, promotions
- `notifications`: model CRUD, dispatch, event triggers
- `ocr`: processing pipeline
- `assistant`: API endpoint

**Frontend — well covered:**
- Auth flow: login success/failure, register validation, loading state, token hydration
- `authStore`: hydrate/login/logout with SecureStore persistence
- `storeService`: Google Places methods (getPlacesDetail, placesResolve) — null guards, error silence
- Map utils: URL builders for Google Maps, Apple Maps (circular route)
- `SkeletonBox` component: style props applied correctly
- `listStore`, `notificationStore`: state mutations and computed values

## Notable Test Coverage Gaps

**Backend:**
- `scraping/` spiders beyond Lidl (Mercadona, Carrefour, DIA, Alcampo parsers not directly tested)
- `assistant/` LLM streaming or multi-turn conversation flows
- Celery task execution (async tasks tested via mocks, not real broker)
- PostGIS spatial queries (distance filtering, radius search) beyond basic fixture use

**Frontend:**
- `ProfileScreen` — listed in `__tests__/` but coverage depth unknown without reading
- `ListsScreen` — same
- No E2E tests (Playwright/Detox not configured)
- Web portal (`frontend/web/`) has no test files

## CI Test Execution

**Backend CI** (`.github/workflows/ci-backend.yml`):
- Triggers on push/PR to `main` or `develop` when `backend/**` changes
- Runs `ruff check` + `ruff format --check` (lint job) before tests
- Spins up `postgis/postgis:16-3.4` + `redis:7-alpine` as service containers
- Installs GDAL system dependency (`gdal-bin libgdal-dev`)
- Runs migrations then `pytest --cov=apps --cov-report=xml --cov-fail-under=80`
- Uploads coverage to Codecov with `flags: backend`

**Frontend CI** (`.github/workflows/ci-frontend.yml`):
- Triggers on push/PR to `main` or `develop` when `frontend/**` changes
- Node.js 24, installs both `frontend/` and `frontend/web/` dependencies
- Runs `npm run lint` + `npm run format` + `npx tsc --noEmit`
- Runs `npm run test -- --coverage --ci`
- Uploads `frontend/coverage/lcov.info` to Codecov with `flags: frontend`
