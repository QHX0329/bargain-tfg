# Codebase Structure

**Analysis Date:** 2026-03-16

## Directory Layout

```
bargain-tfg/
├── CLAUDE.md                    # Project instructions + stack overview
├── TASKS.md                     # Task tracking (synced with Notion)
├── Makefile                     # Development commands (test, lint, migrate, etc.)
├── README.md                    # Project presentation
├── docker-compose.yml           # Production container config
├── docker-compose.dev.yml       # Development container config (backend only)
├── .env                         # Environment variables (DO NOT COMMIT)
├── .env.example                 # Template for .env
│
├── .planning/                   # GSD codebase mapping output (not committed)
│   └── codebase/
│       ├── ARCHITECTURE.md
│       ├── STRUCTURE.md
│       ├── CONVENTIONS.md
│       ├── TESTING.md
│       ├── STACK.md
│       ├── INTEGRATIONS.md
│       └── CONCERNS.md
│
├── docs/                        # Project documentation (TFG memory)
│   ├── memoria/
│   │   ├── 01-introduccion.md
│   │   ├── 02-objetivos.md
│   │   ├── 03-antecedentes.md
│   │   ├── 04-comparativa.md
│   │   ├── 05-herramientas.md
│   │   ├── 06-planificacion.md
│   │   ├── 07-requisitos.md
│   │   ├── 08-diseno-implementacion.md
│   │   ├── 09-manual-usuario.md
│   │   ├── 10-pruebas.md
│   │   ├── 11-conclusiones.md
│   │   └── 12-bibliografia.md
│   ├── diagramas/               # Architecture, ER, class, sequence diagrams
│   ├── decisiones/              # ADR (Architecture Decision Records)
│   └── ai-mistakes-log.md       # Log of AI agent errors + fixes
│
├── backend/                     # Django 5.x REST API (Python 3.12+)
│   ├── Dockerfile
│   ├── manage.py
│   ├── requirements/
│   │   ├── base.txt             # Core deps (Django, DRF, Celery, etc.)
│   │   ├── dev.txt              # Development-only (pytest, debug-toolbar, etc.)
│   │   └── prod.txt             # Production-only (gunicorn, etc.)
│   │
│   ├── config/                  # Django configuration
│   │   ├── urls.py              # Root URL router → all API endpoints
│   │   ├── wsgi.py              # WSGI application entry point
│   │   ├── asgi.py              # ASGI application (future async support)
│   │   ├── celery.py            # Celery broker config + beat schedule
│   │   └── settings/
│   │       ├── base.py          # Shared settings (apps, middleware, DB, auth)
│   │       ├── dev.py           # Development overrides (DEBUG=True, CORS open)
│   │       ├── prod.py          # Production hardening
│   │       └── test.py          # Test database + settings
│   │
│   ├── apps/                    # Domain-driven app architecture
│   │   ├── core/                # Shared infrastructure
│   │   │   ├── views.py         # Health check endpoint
│   │   │   ├── exceptions.py    # Global exception classes + handler
│   │   │   ├── permissions.py   # Role-based permission classes
│   │   │   ├── urls.py
│   │   │   ├── management/
│   │   │   │   └── commands/    # Custom Django commands
│   │   │   └── migrations/
│   │   │
│   │   ├── users/               # User accounts + authentication
│   │   │   ├── models.py        # Extended User model with roles + location
│   │   │   ├── views.py         # ViewSet for auth endpoints (to be added)
│   │   │   ├── serializers.py   # User serializer (to be added)
│   │   │   ├── urls.py
│   │   │   └── migrations/
│   │   │
│   │   ├── products/            # Product catalog (normalized)
│   │   │   ├── models.py        # Product model with barcode, category
│   │   │   ├── views.py         # ProductViewSet (to be added)
│   │   │   ├── serializers.py   # (to be added)
│   │   │   ├── urls.py
│   │   │   └── migrations/
│   │   │
│   │   ├── stores/              # Physical stores + geolocation (PostGIS)
│   │   │   ├── models.py        # Store model with location PointField
│   │   │   ├── views.py         # StoreViewSet for search (to be added)
│   │   │   ├── serializers.py   # (to be added)
│   │   │   ├── urls.py
│   │   │   └── migrations/
│   │   │
│   │   ├── prices/              # Product prices by store + history
│   │   │   ├── models.py        # Price model with expiration logic
│   │   │   ├── tasks.py         # Celery task to expire stale prices
│   │   │   ├── urls.py
│   │   │   └── migrations/
│   │   │
│   │   ├── shopping_lists/      # User shopping lists + items
│   │   │   ├── models.py        # ShoppingList + ShoppingListItem models
│   │   │   ├── views.py         # CRUD endpoints (to be added)
│   │   │   ├── urls.py
│   │   │   └── migrations/
│   │   │
│   │   ├── optimizer/           # Route optimization algorithm (core TFG logic)
│   │   │   ├── views.py         # POST /optimize/ endpoint (to be added)
│   │   │   ├── services.py      # Multi-criteria scoring algorithm (to be added)
│   │   │   ├── urls.py
│   │   │   └── migrations/
│   │   │
│   │   ├── ocr/                 # Image → text extraction (Google Vision target)
│   │   │   ├── views.py         # Image upload endpoint (to be added)
│   │   │   ├── services.py      # OCR processing logic (to be added)
│   │   │   ├── urls.py
│   │   │   └── migrations/
│   │   │
│   │   ├── scraping/            # Web scraper orchestration (Scrapy + Playwright)
│   │   │   ├── tasks.py         # Celery task to trigger spiders
│   │   │   ├── management/
│   │   │   │   └── commands/
│   │   │   │       └── scrapy_runner.py  # Run spiders from Django
│   │   │   └── __init__.py
│   │   │
│   │   ├── assistant/           # LLM chat (Claude API via proxy)
│   │   │   ├── views.py         # Chat endpoint (to be added)
│   │   │   ├── services.py      # Claude API client (to be added)
│   │   │   ├── urls.py
│   │   │   └── migrations/
│   │   │
│   │   ├── business/            # SME portal (subscription, pricing, manual updates)
│   │   │   ├── models.py        # BusinessProfile + SubscriptionPlan (to be added)
│   │   │   ├── views.py         # Portal endpoints (to be added)
│   │   │   ├── urls.py
│   │   │   └── migrations/
│   │   │
│   │   ├── notifications/       # Push + email alerts
│   │   │   ├── models.py        # Notification templates (to be added)
│   │   │   ├── tasks.py         # Send notification Celery tasks (to be added)
│   │   │   ├── urls.py
│   │   │   └── migrations/
│   │   │
│   │   └── __init__.py
│   │
│   ├── tests/                   # Test suite (pytest + pytest-django)
│   │   ├── conftest.py          # Global fixtures (api_client, users, authenticated_client)
│   │   ├── __init__.py
│   │   ├── unit/
│   │   │   └── test_seed_data_command.py
│   │   ├── integration/         # API endpoint tests
│   │   └── e2e/                 # End-to-end scenarios
│   │
│   ├── scripts/                 # Utility scripts
│   │   └── (custom commands)
│   │
│   └── pytest.ini               # Pytest configuration (db markers, coverage)
│
├── frontend/                    # React Native + Expo (TypeScript)
│   ├── Dockerfile              # Multi-stage build for web/EAS
│   ├── package.json            # Dependencies + scripts
│   ├── tsconfig.json           # TypeScript config
│   ├── babel.config.js         # Babel presets
│   ├── eslint.config.mjs        # ESLint 9 flat config
│   ├── app.json                # Expo app config
│   ├── App.tsx                 # Root component + font loading
│   │
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts       # Axios instance with JWT interceptors
│   │   │
│   │   ├── navigation/
│   │   │   ├── RootNavigator.tsx    # Auth/Main branching
│   │   │   ├── MainTabs.tsx         # Bottom tab navigation (Home, Lists, Map, Profile)
│   │   │   ├── types.ts             # ParamList type definitions
│   │   │   └── index.ts             # Exports
│   │   │
│   │   ├── screens/            # Screen components (1 file = 1 screen)
│   │   │   ├── auth/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   └── RegisterScreen.tsx
│   │   │   ├── home/
│   │   │   │   └── HomeScreen.tsx
│   │   │   ├── lists/
│   │   │   │   ├── ListsScreen.tsx
│   │   │   │   └── ListDetailScreen.tsx
│   │   │   ├── map/
│   │   │   │   └── MapScreen.tsx
│   │   │   └── profile/
│   │   │       └── ProfileScreen.tsx
│   │   │
│   │   ├── components/         # Reusable UI components
│   │   │   └── ui/
│   │   │       ├── ProductCard.tsx     # Vertical/horizontal variants
│   │   │       ├── PriceTag.tsx
│   │   │       ├── SearchBar.tsx
│   │   │       ├── BargainButton.tsx
│   │   │       ├── BottomTabBar.tsx
│   │   │       └── index.ts           # Barrel exports
│   │   │
│   │   ├── store/              # Zustand state management
│   │   │   └── authStore.ts    # Auth state (user, token, login/logout)
│   │   │
│   │   ├── hooks/              # Custom React hooks
│   │   │   └── (shared hooks)
│   │   │
│   │   ├── types/
│   │   │   ├── domain.ts       # Business domain types (Product, Store, Price, etc.)
│   │   │   └── navigation.ts   # Navigation param types
│   │   │
│   │   ├── theme/              # Design system
│   │   │   ├── colors.ts       # Color palette + chain colors
│   │   │   ├── typography.ts   # Font families + text styles
│   │   │   ├── spacing.ts      # Spacing scales
│   │   │   └── index.ts        # Unified theme exports
│   │   │
│   │   ├── utils/              # Helper functions
│   │   │   └── (formatting, validation, etc.)
│   │   │
│   │   └── assets/             # Static files
│   │       ├── images/
│   │       ├── icons/
│   │       └── fonts/
│   │
│   ├── __tests__/              # Jest test files
│   │   └── App.test.tsx
│   │
│   └── .expo/                  # Expo local cache (gitignored)
│
└── scraping/                   # Scrapy project (independent from Django)
    ├── scrapy.cfg
    └── bargain_scraping/
        ├── spiders/
        │   ├── mercadona.py    # Mercadona price scraper
        │   ├── carrefour.py    # Carrefour price scraper
        │   ├── lidl.py         # Lidl price scraper
        │   ├── dia.py          # Día price scraper
        │   └── alcampo.py      # Alcampo price scraper
        ├── items.py            # Scrapy item definitions
        ├── pipelines.py        # Data processing (validation, deduplication)
        └── middlewares.py      # Request/response processing
```

## Directory Purposes

**`backend/`:**
- Purpose: Django REST API server; all business logic, database, async tasks
- Contains: App modules, models, views, serializers, migrations, config, tests, scripts
- Key files: `config/urls.py` (route registry), `config/settings/base.py` (app list + auth)

**`frontend/`:**
- Purpose: React Native app; UI layer with Zustand state management
- Contains: Screens, components, navigation, API client, stores, theme, types
- Key files: `App.tsx` (entry), `navigation/RootNavigator.tsx` (auth branching), `src/api/client.ts` (HTTP)

**`backend/apps/core/`:**
- Purpose: Shared infrastructure across all domain apps
- Contains: Global exception handler, permission classes, health check, utilities
- Key files: `exceptions.py`, `permissions.py`

**`backend/apps/users/`:**
- Purpose: User accounts, authentication, roles
- Contains: Extended User model with location + preferences
- Key files: `models.py` (User with roles: consumer/business/admin)

**`backend/apps/products/`:**
- Purpose: Product catalog normalization and search
- Contains: Product model with barcode, brand, category
- Key files: `models.py` (to be fully defined)

**`backend/apps/stores/`:**
- Purpose: Physical store locations with geospatial queries
- Contains: Store model with PostGIS PointField for location
- Key files: `models.py` (to be fully defined)

**`backend/apps/prices/`:**
- Purpose: Product pricing by store + historical tracking
- Contains: Price model with source tracking (scraping/API/crowdsourcing) and expiration
- Key files: `models.py` (to be defined), `tasks.py` (Celery expiration)

**`backend/apps/shopping_lists/`:**
- Purpose: User shopping lists with items
- Contains: ShoppingList + ShoppingListItem models
- Key files: `models.py` (to be defined)

**`backend/apps/optimizer/`:**
- Purpose: Core TFG logic — multi-criteria route optimization
- Contains: Algorithm implementation combining price, distance, time weighting
- Key files: `services.py` (algorithm), `views.py` (POST /optimize/ endpoint)

**`backend/apps/ocr/`:**
- Purpose: Image → text extraction for receipt/list recognition
- Contains: OCR provider integration, image upload handling, fuzzy matching
- Key files: `services.py` (processing), `views.py` (endpoint)

**`backend/apps/scraping/`:**
- Purpose: Web scraper orchestration (separate Scrapy project integration)
- Contains: Celery task to trigger spiders, Django command wrapper
- Key files: `tasks.py`, `management/commands/`

**`backend/apps/assistant/`:**
- Purpose: LLM chat via Claude API
- Contains: Conversation history, message relay to Claude
- Key files: `services.py` (API client), `views.py` (endpoint)

**`backend/apps/business/`:**
- Purpose: SME/business portal for manual pricing + subscriptions
- Contains: BusinessProfile, subscription plans, pricing management
- Key files: `models.py` (to be defined)

**`backend/apps/notifications/`:**
- Purpose: Push + email notifications
- Contains: Notification templates, sending logic
- Key files: `tasks.py` (Celery send jobs), `models.py`

**`frontend/src/navigation/`:**
- Purpose: TypeScript-safe screen routing
- Contains: RootNavigator (auth/main switch), MainTabs (bottom navigation)
- Key files: `RootNavigator.tsx` (entry point), `types.ts` (ParamList)

**`frontend/src/screens/`:**
- Purpose: Individual screen implementations
- Contains: Login, Register, Home, Lists, ListDetail, Map, Profile
- Key files: One per screen, following naming `[FeatureName]Screen.tsx`

**`frontend/src/components/ui/`:**
- Purpose: Reusable design system components
- Contains: ProductCard (vertical/horizontal), PriceTag, SearchBar, BargainButton, BottomTabBar
- Key files: Each component in own file, barrel export in `index.ts`

**`frontend/src/store/`:**
- Purpose: Global state management
- Contains: Zustand stores (currently only authStore)
- Key files: `authStore.ts` (user + token)

**`frontend/src/theme/`:**
- Purpose: Design system (colors, spacing, typography)
- Contains: Color palette with chain-specific colors, text styles, spacing scale
- Key files: `colors.ts`, `typography.ts`, `spacing.ts`, barrel export in `index.ts`

**`backend/tests/`:**
- Purpose: Test suite organization
- Contains: Fixtures (conftest.py), unit tests, integration tests, e2e tests
- Key files: `conftest.py` (shared fixtures like api_client, consumer_user)

## Key File Locations

**Entry Points:**
- `backend/manage.py`: Django CLI entry point
- `backend/config/wsgi.py`: WSGI application (production)
- `backend/config/asgi.py`: ASGI application (async, future)
- `frontend/App.tsx`: React Native entry point

**Configuration:**
- `backend/config/settings/base.py`: Core Django configuration (apps, middleware, databases, auth)
- `backend/config/urls.py`: Root API router; includes all app URLs
- `backend/config/celery.py`: Celery + Redis broker + beat schedule
- `docker-compose.dev.yml`: Local development (backend in Docker, frontend on host)
- `.env`: Environment variables (secrets, database URL, API keys)

**Core Logic:**
- `backend/apps/optimizer/services.py`: Route optimization algorithm (to be implemented)
- `backend/apps/users/models.py`: User model with roles + location preferences
- `backend/apps/core/exceptions.py`: Global error classes + handler
- `frontend/src/api/client.ts`: HTTP client with JWT interceptors
- `frontend/src/store/authStore.ts`: Auth state management (Zustand)

**Testing:**
- `backend/tests/conftest.py`: Global pytest fixtures (api_client, users)
- `backend/tests/unit/`: Unit tests for individual services
- `backend/tests/integration/`: API endpoint tests
- `backend/pytest.ini`: Pytest configuration

## Naming Conventions

**Files:**
- Python: `snake_case.py` (models, views, services, tasks)
- React/TypeScript: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- Django apps: `lowercase_plural` (users, products, stores, prices)
- Django models: `PascalCase` (User, Product, Store, Price)

**Directories:**
- Backend apps: Plural noun in lowercase (`apps/users/`, `apps/products/`, `apps/stores/`)
- Frontend screens: Feature name in lowercase (`screens/auth/`, `screens/lists/`, `screens/map/`)
- Frontend components: Feature or component type (`components/ui/`)

## Where to Add New Code

**New Feature (end-to-end):**
- Backend model: `backend/apps/{feature}/models.py`
- Backend serializer: `backend/apps/{feature}/serializers.py` (to be added)
- Backend view: `backend/apps/{feature}/views.py`
- Backend migration: `backend/apps/{feature}/migrations/XXXX_*.py` (auto-generated)
- Backend URL: `backend/apps/{feature}/urls.py`
- Backend tests: `backend/tests/unit/apps/test_{feature}.py`
- Frontend screen: `frontend/src/screens/{feature}/{FeatureName}Screen.tsx`
- Frontend store (if global state): `frontend/src/store/{feature}Store.ts`
- Frontend API: `frontend/src/api/{feature}.ts` (service functions calling endpoints)

**New Component/Module:**
- Frontend component: `frontend/src/components/{category}/{ComponentName}.tsx`
- Export in: `frontend/src/components/{category}/index.ts`
- Share in design system: `frontend/src/components/ui/` (if core UI)

**Utilities/Helpers:**
- Frontend: `frontend/src/utils/{utility-name}.ts`
- Backend: `backend/apps/core/utils.py` or app-specific `backend/apps/{app}/utils.py`

## Special Directories

**`backend/apps/scraping/`:**
- Purpose: Bridges Django backend with independent Scrapy project
- Generated: Spider outputs fed into Price model via pipeline
- Committed: Scrapy source code yes, spider output data no

**`frontend/src/assets/`:**
- Purpose: Static images, icons, fonts
- Generated: No
- Committed: Yes (but LFS recommended for large binaries)

**`docs/memoria/`:**
- Purpose: TFG memory documentation (chapters 1-12)
- Generated: No (manually written by student)
- Committed: Yes

**`.env`:**
- Purpose: Environment variables (database URL, API keys, secrets)
- Generated: By developer from `.env.example` template
- Committed: No (in .gitignore)

**`frontend/.expo/`:**
- Purpose: Expo CLI cache (device list, recent sessions)
- Generated: By Expo CLI automatically
- Committed: No (gitignored)

**`backend/.pytest_cache/`:**
- Purpose: Pytest cache for fast test reruns
- Generated: By pytest automatically
- Committed: No (gitignored)

---

*Structure analysis: 2026-03-16*
