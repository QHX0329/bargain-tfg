# Codebase Structure

**Analysis Date:** 2026-05-25

## Directory Layout

```
bargain-tfg/
├── backend/                    # Django project root
│   ├── apps/                   # All Django app modules
│   │   ├── core/               # Shared exceptions, responses, health check
│   │   ├── users/              # Auth, profiles, password reset
│   │   ├── products/           # Catalog, categories, proposals
│   │   ├── stores/             # Stores, chains, PostGIS location
│   │   ├── prices/             # Price records, alerts, history
│   │   ├── shopping_lists/     # User shopping lists and items
│   │   ├── optimizer/          # Route optimization (OR-Tools + PostGIS)
│   │   │   └── services/       # solver.py, matching.py, distance.py, semantic.py
│   │   ├── ocr/                # Google Vision API + fuzzy matching
│   │   ├── assistant/          # Gemini LLM proxy
│   │   ├── business/           # PYME portal, promotions, bulk prices
│   │   ├── notifications/      # Inbox + Expo push tokens
│   │   └── scraping/           # Celery tasks + runner for Scrapy
│   ├── config/                 # Django project configuration
│   │   ├── settings/           # base.py, dev.py, prod.py, test.py
│   │   ├── urls.py             # Root URL configuration
│   │   ├── celery.py           # Celery app definition
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── tests/
│   │   ├── unit/               # Per-domain unit tests
│   │   ├── integration/        # API endpoint integration tests
│   │   ├── e2e/
│   │   ├── conftest.py
│   │   └── factories.py        # Test data factories
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── dev.txt
│   │   └── prod.txt
│   ├── manage.py
│   ├── pytest.ini
│   ├── ruff.toml
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── Dockerfile.worker
│
├── frontend/                   # React Native (Expo) mobile app
│   ├── src/
│   │   ├── api/                # Axios client + service modules
│   │   │   ├── client.ts       # Base Axios instance with JWT interceptor
│   │   │   ├── authService.ts
│   │   │   ├── listService.ts
│   │   │   ├── optimizerService.ts
│   │   │   ├── ocrService.ts
│   │   │   ├── assistantService.ts
│   │   │   ├── productService.ts
│   │   │   ├── priceService.ts
│   │   │   ├── storeService.ts
│   │   │   └── notificationService.ts
│   │   ├── screens/            # One directory per tab/feature
│   │   │   ├── auth/           # LoginScreen, RegisterScreen
│   │   │   ├── home/           # HomeScreen, ProductsCatalogScreen, PriceCompareScreen, etc.
│   │   │   ├── lists/          # ListsScreen, ListDetailScreen, OCRScreen, TemplatesScreen
│   │   │   ├── map/            # MapScreen, MapScreen.web.tsx, StoreProfileScreen, RouteScreen
│   │   │   ├── profile/        # ProfileScreen, EditProfileScreen, OptimizerConfigScreen
│   │   │   └── assistant/      # AssistantScreen
│   │   ├── store/              # Zustand state stores
│   │   │   ├── authStore.ts
│   │   │   ├── listStore.ts
│   │   │   ├── profileStore.ts
│   │   │   └── notificationStore.ts
│   │   ├── navigation/         # React Navigation config
│   │   │   ├── RootNavigator.tsx
│   │   │   ├── MainTabs.tsx
│   │   │   └── types.ts
│   │   ├── components/         # Reusable UI components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # Non-HTTP business utilities
│   │   ├── theme/              # Colors, typography, spacing
│   │   ├── types/              # Shared TypeScript types
│   │   └── utils/              # Helpers, secureStorage, constants
│   ├── __tests__/              # Jest test files
│   ├── app.json                # Expo config
│   ├── package.json
│   ├── eslint.config.mjs
│   └── tsconfig.json
│
│   └── web/                    # Vite + React web portal (PYME/admin)
│       ├── src/
│       │   ├── pages/          # Page-level components
│       │   │   ├── LandingPage.tsx
│       │   │   ├── LoginPage.tsx
│       │   │   ├── RegisterPage.tsx
│       │   │   ├── DashboardPage.tsx
│       │   │   ├── BusinessProfilePage.tsx
│       │   │   ├── MerchantOnboardingPage.tsx
│       │   │   ├── PricesPage.tsx
│       │   │   ├── ProductsUploadPage.tsx
│       │   │   ├── PromotionsPage.tsx
│       │   │   ├── AdminApprovalPage.tsx
│       │   │   └── DocsPage.tsx
│       │   ├── api/            # client.ts (Axios), businessStore.ts
│       │   ├── components/
│       │   ├── store/
│       │   └── main.tsx
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       └── package.json
│
├── scraping/                   # Standalone Scrapy project
│   ├── bargain_scraping/
│   │   ├── spiders/            # One file per supermarket
│   │   │   ├── mercadona.py, carrefour.py, lidl.py, dia.py
│   │   │   ├── alcampo.py, hipercor.py, eroski.py, spar.py
│   │   │   ├── consum.py, coviran.py, costco.py
│   │   ├── items.py
│   │   ├── pipelines.py        # Writes Price records to DB
│   │   └── settings.py
│   └── scrapy.cfg
│
├── docs/                       # TFG memory and technical docs
│   ├── memoria/                # Chapter markdown files (01-12)
│   ├── decisiones/             # ADR files
│   └── api/                    # OpenAPI specs
│
├── .planning/                  # Live planning (roadmap, phases, codebase docs)
├── memory/                     # Versioned Claude context files
├── nginx/                      # Nginx config for production
├── docker-compose.yml
├── docker-compose.dev.yml
├── Makefile
├── render.yaml                 # Render.com deployment config
└── .env.example
```

## Directory Purposes

**`backend/apps/`:**
- Each subdirectory is a self-contained Django app with `models.py`, `views.py`, `serializers.py`, `urls.py`, and `migrations/`
- Apps with business logic have a `services.py` or `services/` subdirectory
- Apps with async work have a `tasks.py` with Celery shared tasks
- `apps/core/` is the only app that others import from freely; direct cross-app imports otherwise use lazy imports inside functions

**`backend/config/settings/`:**
- `base.py` — all shared settings including INSTALLED_APPS, MIDDLEWARE, JWT config, Celery beat schedule, DRF config
- `dev.py` — extends base; DEBUG=True, debug toolbar, relaxed CORS
- `prod.py` — extends base; security headers, Sentry, production DB
- `test.py` — extends base; in-memory or test DB overrides

**`frontend/src/api/`:**
- `client.ts` exports `apiClient` (authenticated) and `publicApiClient` (unauthenticated); both unwrap `{ success, data }` envelope automatically
- One service file per backend domain (e.g., `listService.ts` calls `/api/v1/lists/`)

**`frontend/src/screens/`:**
- Organized by navigation tab, not by backend domain
- `map/MapScreen.web.tsx` exists as a web-compatible override for `MapScreen.tsx` (React Native Maps not supported on web)

**`frontend/web/src/pages/`:**
- Standalone Vite/React app for the PYME business portal and admin approval workflow
- Uses Ant Design + Tailwind; connects to the same backend API
- Not bundled with the Expo mobile app

**`scraping/`:**
- Completely independent Python project with its own `scrapy.cfg` and settings
- Invoked by `backend/apps/scraping/runner.py` as a subprocess; never imported directly by Django
- Pipeline in `pipelines.py` writes to the shared PostgreSQL database

## Key File Locations

**Entry Points:**
- `backend/manage.py` — Django management entry point
- `backend/config/wsgi.py` — WSGI entry point for production
- `backend/config/celery.py` — Celery application definition
- `frontend/App.tsx` — React Native app root
- `frontend/web/src/main.tsx` — Vite web portal entry point
- `scraping/bargain_scraping/spiders/` — spider classes, one per supermarket

**Configuration:**
- `backend/config/settings/base.py` — canonical settings source
- `backend/ruff.toml` — Python linter/formatter config
- `frontend/eslint.config.mjs` — ESLint flat config for mobile
- `frontend/web/eslint.config.js` — ESLint config for web portal
- `docker-compose.dev.yml` — Development Docker services (backend + Redis + PostGIS)
- `render.yaml` — Render.com service definitions for staging

**Core Logic:**
- `backend/apps/optimizer/services/solver.py` — `optimize_shopping_list()` and `solve_route()` (OR-Tools)
- `backend/apps/optimizer/services/matching.py` — fuzzy product matching
- `backend/apps/optimizer/services/distance.py` — Graphhopper distance/time matrix
- `backend/apps/core/exceptions.py` — all domain exception types
- `backend/apps/core/responses.py` — `success_response()`, `created_response()`
- `frontend/src/api/client.ts` — Axios instance with JWT interceptor and refresh queue

**Testing:**
- `backend/tests/unit/` — unit tests per domain (e.g., `test_optimizer.py`, `test_ocr.py`)
- `backend/tests/integration/` — API endpoint tests (e.g., `test_auth_endpoints.py`, `test_optimizer_api.py`)
- `backend/tests/factories.py` — shared test data factories
- `backend/pytest.ini` — pytest configuration
- `frontend/__tests__/` — Jest tests for mobile components

## Naming Conventions

**Backend files:**
- Django apps: `snake_case` directory names matching app label
- Service files: `services.py` for single-file or `services/` package with named modules (`solver.py`, `matching.py`)
- Task files: `tasks.py` in the owning app

**Frontend files:**
- Screen components: `PascalCase` + `Screen` suffix (e.g., `ListDetailScreen.tsx`)
- Page components (web): `PascalCase` + `Page` suffix (e.g., `DashboardPage.tsx`)
- Service files: `camelCase` + `Service` suffix (e.g., `listService.ts`)
- Zustand stores: `camelCase` + `Store` suffix (e.g., `authStore.ts`)

## Where to Add New Code

**New backend domain (new Django app):**
- Create directory `backend/apps/<name>/` with standard files
- Register in `LOCAL_APPS` in `backend/config/settings/base.py`
- Add URL include in `backend/config/urls.py` under `/api/v1/<name>/`
- Create `tests/unit/test_<name>.py` and `tests/integration/test_<name>_api.py`

**New API endpoint in existing app:**
- Add view class to `backend/apps/<app>/views.py`
- Add path to `backend/apps/<app>/urls.py`
- Add serializer to `backend/apps/<app>/serializers.py`

**New background task:**
- Add `@shared_task` function to `backend/apps/<app>/tasks.py`
- Add to beat schedule in `backend/config/settings/base.py` if periodic

**New mobile screen:**
- Create `frontend/src/screens/<tab>/NewScreen.tsx`
- Register in `frontend/src/navigation/RootNavigator.tsx` or `MainTabs.tsx`

**New web portal page:**
- Create `frontend/web/src/pages/NewPage.tsx`
- Add route in `frontend/web/src/App.tsx`

**New Scrapy spider:**
- Create `scraping/bargain_scraping/spiders/<chain>.py`
- Add entry to `SPIDER_MAP` in `backend/apps/scraping/tasks.py`

## Special Directories

**`.planning/`:**
- Purpose: Live project planning — roadmap, phases, codebase analysis docs
- Generated: No (manually and by GSD agents)
- Committed: Yes

**`memory/`:**
- Purpose: Claude context files persisted across sessions
- Generated: Partially (by Claude)
- Committed: Yes

**`backend/media/`:**
- Purpose: Uploaded files (OCR images) in development
- Generated: Yes (Django MEDIA_ROOT)
- Committed: No

**`backend/apps/*/migrations/`:**
- Purpose: Django database migration files
- Generated: Yes (via `makemigrations`)
- Committed: Yes

---

*Structure analysis: 2026-05-25*
