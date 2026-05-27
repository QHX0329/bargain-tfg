# External Integrations

**Analysis Date:** 2026-05-25

## APIs & External Services

**AI / LLM:**
- Google Gemini API — Shopping assistant and product matching
  - SDK: `google-genai` >=0.8,<2.0
  - Auth: `GEMINI_API_KEY` env var
  - Models: `GEMINI_MODEL` (default: `gemini-2.0-flash-lite`), `GEMINI_PRODUCT_MATCH_MODEL` (default: `gemini-3-flash-preview`)
  - Implementation: `apps/assistant/` — proxied through backend, rate-limited to 30 req/hour/user
  - Note: Prior Anthropic/Claude SDK fully removed; `google-genai` is the sole LLM client

**OCR / Computer Vision:**
- Google Cloud Vision API — Receipt and shopping list image text extraction
  - SDK: `google-genai` (same package, Vision REST called via `requests`)
  - Auth: `GOOGLE_CLOUD_VISION_API_KEY` env var
  - Implementation: `apps/ocr/services.py` — image uploaded via multipart, text matched fuzzy against product catalog
  - Rate limit: 60 req/hour/user (`ocr` throttle scope)

**Maps & Geolocation:**
- Google Maps API — Map display on web target
  - Client: `@react-google-maps/api` ^2.20.8 (frontend)
  - Auth: `GOOGLE_MAPS_API_KEY` env var
- Google Places API — Store enrichment (address, hours, details)
  - Auth: `GOOGLE_PLACES_API_KEY` env var
  - Implementation: Backend HTTP calls via `requests`; results cached in Redis

**Routing / Distance Matrix:**
- OpenRouteService (ORS) — Distance matrix for route optimization in staging/production
  - Auth: `ORS_API_KEY` env var
  - Fallback: Haversine calculation if `ORS_API_KEY` is empty
  - Used by: `apps/optimizer/`
- Graphhopper — Local routing engine for development
  - Image: `israelhikingmap/graphhopper:latest`
  - Config: `docker-compose.dev.yml`, served on port 8989
  - OSM data: Andalucía region (`andalucia-latest.osm.pbf` from Geofabrik)
  - Backend setting: `GRAPHHOPPER_URL` env var (default: `http://graphhopper:8989`)

**Push Notifications:**
- Expo Push Notification Service — Mobile push delivery
  - SDK: `exponent_server_sdk` >=2.0,<3.0 (backend)
  - Client-side: `expo-notifications` ~0.32.16 (frontend)
  - Model: `apps/notifications/` — `UserPushToken` stores `(user, device_id)` pairs

**Web Scraping Targets:**
- Mercadona, Carrefour, Lidl, Dia, Alcampo, Consum, Costco, Coviran, Eroski, Hipercor, Spar
  - Spiders: `scraping/bargain_scraping/spiders/*.py` (11 spiders)
  - Framework: Scrapy + Playwright for JS-rendered pages
  - Scheduling: Celery Beat (daily at 06:00–07:30 per spider; see `CELERY_BEAT_SCHEDULE` in `config/settings/base.py`)

## Data Storage

**Primary Database:**
- PostgreSQL 16 with PostGIS 3.4
  - Image: `postgis/postgis:16-3.4`
  - Connection: `DATABASE_URL` env var; code normalizes `postgresql://` → `postgis://` in `config/settings/base.py`
  - Django engine: `django.contrib.gis.db.backends.postgis`
  - Client: `psycopg[binary]` >=3.2 (psycopg3)
  - System libs required: GDAL, GEOS (installed in CI via apt)

**Message Broker / Cache:**
- Redis 7-alpine
  - Connection: `REDIS_URL` env var (default: `redis://redis:6379/0`)
  - Client: `redis` >=5.0
  - Usage: Celery broker, Celery result backend, Google Places response cache

**File Storage:**
- Local filesystem (Docker volumes in production)
  - Static files: `backend/staticfiles/` — served by WhiteNoise (prod) or Django dev server
  - Media files: `backend/media/` — OCR image uploads
  - Docker volumes: `static_files`, `media_files` (defined in `docker-compose.yml`)

## Authentication & Identity

**Auth Provider:**
- Custom JWT via `djangorestframework-simplejwt` >=5.3
  - Access token lifetime: `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` env var (default: 5 minutes)
  - Refresh token lifetime: `JWT_REFRESH_TOKEN_LIFETIME_DAYS` env var (default: 30 days)
  - Rotation: `ROTATE_REFRESH_TOKENS = True`, `BLACKLIST_AFTER_ROTATION = True`
  - Header: `Authorization: Bearer <token>`
  - User model: `apps.users.User` (custom, set via `AUTH_USER_MODEL`)

**Frontend Token Storage:**
- `expo-secure-store` ~15.0.8 — Encrypted storage on native iOS/Android

## Monitoring & Observability

**Error Tracking:**
- Sentry
  - SDK: `sentry-sdk[django]` >=2.8
  - DSN: `SENTRY_DSN` env var (optional; integrations inactive if unset)
  - Integrations activated in `config/settings/prod.py`: `DjangoIntegration`, `CeleryIntegration`, `LoggingIntegration`
  - Traces sample rate: `SENTRY_TRACES_SAMPLE_RATE` env var (default: 0.1)
  - Profiles: `SENTRY_PROFILES_SAMPLE_RATE` (default: 0.0 — disabled)
  - PII: `send_default_pii = False`

**Logs:**
- structlog >=24.0 — Structured logging throughout backend
  - Format: JSON in production, console in dev (toggle: `LOG_JSON_FORMAT` env var)
  - Level: `LOG_LEVEL` env var (default: `INFO`)
  - Processors: context vars, logger name, log level, ISO timestamps

**Metrics:**
- Prometheus + Grafana — Mentioned in CLAUDE.md; not detected as installed packages in `requirements/*.txt`
- Coverage reporting: Codecov via `codecov/codecov-action@v4` in CI workflows

## CI/CD & Deployment

**Hosting:**
- Staging: Render.com (configured via `render.yaml`)
  - Services: `bargain-api` (web, Docker), `bargain-redis` (managed Redis), `bargain-celery-worker` (background worker), `bargain-celery-beat` (background worker)
  - Database: Managed PostgreSQL on Render (free tier)
  - Health check path: `/api/v1/health/`
- Production (planned): AWS

**CI Pipeline:**
- GitHub Actions (`.github/workflows/`)
  - `ci-backend.yml` — Triggers on `backend/**` changes; runs Ruff lint then pytest with PostGIS service container; uploads coverage to Codecov; enforces 80% coverage minimum
  - `ci-frontend.yml` — Triggers on `frontend/**` changes; runs ESLint, Prettier, tsc, Jest with coverage; Node 24
  - `cd-render-staging.yml` — Staging deployment to Render
  - `deploy-web-gh-pages.yml` — Web portal deployment to GitHub Pages
  - `ios-build.yml` — iOS build pipeline

**Application Server:**
- Gunicorn >=22.0 — WSGI; `--workers 3 --timeout 60`
- WhiteNoise >=6.7 — Middleware-level static file serving (inserted at index 1 in prod middleware stack)

**Reverse Proxy:**
- Nginx 1.27-alpine — Config at `nginx/nginx.conf`; ports 80 and 443

## Environment Configuration

**Required env vars:**
- Django core: `DJANGO_SETTINGS_MODULE`, `SECRET_KEY`, `ALLOWED_HOSTS`
- Database: `DATABASE_URL` (`postgis://user:pass@host:port/db`), `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- Geospatial (Windows only): `GDAL_LIBRARY_PATH`, `GEOS_LIBRARY_PATH`
- Redis: `REDIS_URL`
- Gemini LLM: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_PRODUCT_MATCH_MODEL`
- Google APIs: `GOOGLE_CLOUD_VISION_API_KEY`, `GOOGLE_PLACES_API_KEY`, `GOOGLE_MAPS_API_KEY`
- Routing: `ORS_API_KEY` (ORS), `GRAPHHOPPER_URL` (dev only)
- CORS: `CORS_ALLOWED_ORIGINS` (comma-separated)
- Sentry: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `SENTRY_TRACES_SAMPLE_RATE`
- Email: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
- JWT: `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`, `JWT_REFRESH_TOKEN_LIFETIME_DAYS`
- Logging: `LOG_LEVEL`, `LOG_JSON_FORMAT`

**Secrets location:**
- `.env` file at project root (git-ignored); `.env.example` tracked in git as template
- Render Dashboard for production secrets (`sync: false` vars in `render.yaml`)

## Celery Beat Schedule

Periodic tasks defined in `config/settings/base.py` (`CELERY_BEAT_SCHEDULE`):

| Task | Schedule |
|------|----------|
| `expire-stale-prices-hourly` | Every hour at :00 |
| `check-price-alerts-every-30min` | Every 30 minutes |
| `purge-old-price-history-daily` | Daily at 03:00 |
| `scrape-mercadona-daily` | Daily at 06:00 |
| `scrape-carrefour-daily` | Daily at 06:30 |
| `scrape-lidl-daily` | Daily at 07:00 |
| `scrape-dia-daily` | Daily at 07:30 |
| `deactivate-expired-promotions-hourly` | Every hour at :05 |
| `check-competitor-prices-daily` | Daily at 08:00 |

Scheduler: `django_celery_beat.schedulers:DatabaseScheduler` (persisted in Django ORM)

## Webhooks & Callbacks

**Incoming:** None detected.

**Outgoing:**
- Expo push service (push notifications to mobile)
- Sentry (error reporting)
- Email via SMTP (configurable backend)

---

*Integration audit: 2026-05-25*
