# Technology Stack

**Analysis Date:** 2026-05-25

## Languages

**Primary:**
- Python 3.12 — Backend (Django, Scrapy, Celery, OR-Tools); `target-version = "py312"` in `backend/ruff.toml`
- TypeScript 5.9 — Mobile frontend (`frontend/`) and business web portal (`frontend/web/`)

**Secondary:**
- JavaScript — Babel config, mock files

## Runtime

**Environment:**
- Python 3.12+ (backend runs in Docker)
- Node.js >=24.0.0 (enforced in `frontend/package.json` `engines` field; frontend runs natively on host per ADR-002)

**Package Managers:**
- pip — Backend Python deps; `backend/requirements/base.txt`, `dev.txt`, `prod.txt`
- npm — Frontend; lockfiles at `frontend/package-lock.json` and `frontend/web/package-lock.json`

## Frameworks

**Backend:**
- Django >=5.1,<5.2 — Core web framework, ORM, admin
- Django REST Framework >=3.15,<4.0 — REST API layer
- `django.contrib.gis` — PostGIS/geospatial support (built into Django; no separate package)

**Frontend Mobile (`frontend/`):**
- Expo ~54.0.0 — Build tooling, native module wrappers, OTA updates
- React Native 0.81.5 — Native mobile app
- React 19.1.0 — Component model

**Frontend Web Portal (`frontend/web/`):**
- Vite ^8.0.0 — Dev server and bundler
- React ^19.2.4 — Component model
- Ant Design (antd) ^6.3.3 — Primary UI component library
- Tailwind CSS ^3.4.17 — Utility CSS
- React Router DOM ^7.13.1 — Client routing
- Framer Motion ^12.23.24 — Animations

**Async Tasks:**
- Celery >=5.4,<6.0 (with Redis transport) — Distributed task queue
- django-celery-beat >=2.6,<3.0 — Periodic task scheduling stored in DB

**Web Scraping:**
- Scrapy >=2.11,<3.0 — Spider framework; spiders in `scraping/bargain_scraping/spiders/`
- Playwright >=1.44,<2.0 + scrapy-playwright >=0.0.34 — JS-rendered page support

## Key Dependencies

**Backend — API Layer:**
- `djangorestframework-simplejwt` >=5.3 — JWT auth with rotation + blacklist
- `django-cors-headers` >=4.4 — CORS policy
- `django-filter` >=24.0 — Query filtering for DRF
- `drf-spectacular` >=0.27 — OpenAPI 3 schema generation

**Backend — Database:**
- `psycopg[binary]` >=3.2 — PostgreSQL driver (psycopg3)
- `dj-database-url` >=2.2 — DATABASE_URL parsing; code in `config/settings/base.py` rewrites `postgresql://` to `postgis://`

**Backend — AI/ML:**
- `google-genai` >=0.8,<2.0 — Gemini API SDK used in `apps/assistant/` and `apps/ocr/`
- `ortools` >=9.10,<10.0 — Google OR-Tools for route optimization in `apps/optimizer/`
- `thefuzz[speedup]` >=0.22 — Fuzzy string matching for OCR/product normalization
- `pypdf` >=4.2 — PDF parsing

**Backend — Infrastructure:**
- `celery[redis]` >=5.4 — Task queue with Redis broker
- `redis` >=5.0 — Redis client
- `exponent_server_sdk` >=2.0 — Expo push notification delivery (`apps/notifications/`)
- `Pillow` >=10.4 — Image processing for OCR uploads
- `requests` >=2.32 — HTTP client for external API calls

**Backend — Observability:**
- `structlog` >=24.0 — Structured JSON logging throughout all apps
- `sentry-sdk[django]` >=2.8 — Error tracking; integrates Django + Celery + Logging

**Backend — Production:**
- `gunicorn` >=22.0 — WSGI server (3 workers, 60s timeout)
- `whitenoise` >=6.7 — Static file serving with compression

**Frontend Mobile — Navigation:**
- `@react-navigation/native` ^7.0.0, `native-stack` ^7.2.0, `bottom-tabs` ^7.2.0, `material-top-tabs` ^7.4.19

**Frontend Mobile — Native Features:**
- `expo-location` ~19.0.8 — Device geolocation
- `expo-image-picker` ~17.0.10 — Camera/gallery access
- `expo-notifications` ~0.32.16 — Push notification handling
- `expo-secure-store` ~15.0.8 — Encrypted token storage

**Frontend Mobile — UI:**
- `react-native-maps` 1.20.1 — Map display
- `react-native-reanimated` ~4.1.1 — Animations
- `react-native-gesture-handler` ~2.28.0
- `@react-google-maps/api` ^2.20.8 — Google Maps for web target
- `@expo/vector-icons` ^15.0.3

**Frontend Mobile — Data:**
- `axios` ^1.7.9 — HTTP with JWT interceptors
- `zustand` ^5.0.0 — Global state management

**Frontend Web — Data:**
- `axios` ^1.13.6 — HTTP client
- `zustand` ^5.0.12 — State management
- `dayjs` ^1.11.11 — Date formatting
- `lucide-react` ^0.552.0 — Icon set

## Build Tools & Dev Tooling

**Backend:**
- Ruff >=0.5 — Linter + formatter (replaces flake8, isort, black); config at `backend/ruff.toml`
- pytest >=8.2 + pytest-django >=4.8 + pytest-cov >=5.0 — Test runner; config at `backend/pytest.ini`
- factory-boy >=3.3 + faker >=26.0 — Test data factories
- django-debug-toolbar >=4.4 — Dev request profiling
- ipython >=8.26 — Enhanced management shell

**Frontend Mobile:**
- Babel with `babel-preset-expo` ~54.0.10 and `babel-plugin-module-resolver` ^5.0.2
- ESLint ^9.17.0 with `eslint-config-expo` ~10.0.0; config at `frontend/eslint.config.mjs`
- Prettier ^3.4.2 — Formatting
- Jest via `jest-expo` ~54.0.0 — Unit test runner
- `@testing-library/react-native` ^13.3.3 — Component testing utilities

**Frontend Web:**
- Vite ^8.0.0 + `@vitejs/plugin-react` ^6.0.0 — Build and HMR
- vitest ^4.1.0 — Unit tests
- `@testing-library/react` ^16.3.2 — Component tests
- Playwright ^1.59.1 — E2E browser tests in `frontend/web/e2e/`
- ESLint ^9.39.4 with `typescript-eslint` ^8.56.1; config at `frontend/web/eslint.config.js`
- PostCSS + autoprefixer

## Configuration

**Environment:**
- All secrets loaded from `.env` via `python-decouple`; `.env.example` at project root
- Settings layered: `config/settings/base.py` → `dev.py` / `prod.py` / `test.py`
- `DJANGO_SETTINGS_MODULE` selects active settings layer

**Build Artifacts:**
- `backend/Dockerfile`, `backend/Dockerfile.dev`, `backend/Dockerfile.worker` — Three distinct backend images
- `docker-compose.yml` — Production services (postgres, redis, backend, celery, celery-beat, nginx)
- `docker-compose.dev.yml` — Development services (same + graphhopper on port 8989)
- `render.yaml` — Render.com infrastructure-as-code (staging deployment)
- `Makefile` — Shorthand commands for common operations

## Platform Requirements

**Development:**
- Docker Desktop — Backend services (PostgreSQL/PostGIS, Redis, Graphhopper) run in containers
- Node.js >=24.0.0 — Frontend runs natively on host; no frontend Docker container
- GDAL + GEOS system libraries — Required for GeoDjango; installed in CI via `apt-get install gdal-bin libgdal-dev`

**Production (Staging):**
- Render.com — Docker-based web service + managed PostgreSQL (free tier) + managed Redis
- Nginx 1.27-alpine — Reverse proxy, static file serving
- GitHub Actions — CI on push/PR to `main` and `develop`

---

*Stack analysis: 2026-05-25*
