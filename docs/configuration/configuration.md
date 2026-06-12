<!-- generated-by: gsd-doc-writer -->
# Configuration

## Environment Variables
Source of truth: `.env.example`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DJANGO_SETTINGS_MODULE` | Yes | `config.settings.dev` | Active Django settings module |
| `SECRET_KEY` | Yes | `CHANGE-ME-to-a-long-random-string` | Django secret key |
| `DEBUG` | No | `True` | Debug mode flag |
| `ALLOWED_HOSTS` | Yes | `localhost,127.0.0.1` | Django allowed hosts |
| `DATABASE_URL` | Yes | `postgis://...@localhost:5432/bargain_db` | Main PostgreSQL/PostGIS DSN |
| `OSGEO4W_ROOT` | No | `C:\OSGeo4W` | Windows GIS root path |
| `GDAL_LIBRARY_PATH` | No | `C:\OSGeo4W\bin\gdal312.dll` | GDAL library path (host-only) |
| `GEOS_LIBRARY_PATH` | No | `C:\OSGeo4W\bin\geos_c.dll` | GEOS library path (host-only) |
| `POSTGRES_USER` | Yes | `bargain_user` | Compose/PostgreSQL user |
| `POSTGRES_PASSWORD` | Yes | `bargain_password` | Compose/PostgreSQL password |
| `POSTGRES_DB` | Yes | `bargain_db` | Compose/PostgreSQL database |
| `REDIS_URL` | Yes | `redis://localhost:6379/0` | Redis DSN for Celery/cache |
| `CORS_ALLOWED_ORIGINS` | Yes | local origins list | Allowed frontend origins |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | No | `60` | Access token lifetime |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | No | `7` | Refresh token lifetime |
| `GOOGLE_MAPS_API_KEY` | Optional* | placeholder | Backend geocoding/maps integrations |
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | Optional* | placeholder | Public key used by Expo frontend |
| `EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID` | Optional* | placeholder | Google Maps map style id |
| `OSRM_BASE_URL` | No | `https://router.project-osrm.org` | OSRM fallback routing base URL |
| `ORS_API_KEY` | Optional* | placeholder | OpenRouteService API key |
| `GEMINI_API_KEY` | Optional* | placeholder | Gemini API key for assistant features |
| `GEMINI_PRODUCT_MATCH_MODEL` | No | `gemini-3-flash-preview` | Gemini model id for product matching |
| `GOOGLE_CLOUD_VISION_API_KEY` | Optional* | placeholder | OCR provider key |
| `EMAIL_BACKEND` | No | Django SMTP backend | Email backend class |
| `EMAIL_HOST` | No | `smtp.gmail.com` | SMTP host |
| `EMAIL_PORT` | No | `587` | SMTP port |
| `EMAIL_USE_TLS` | No | `True` | SMTP TLS flag |
| `EMAIL_HOST_USER` | Optional | placeholder | SMTP username |
| `EMAIL_HOST_PASSWORD` | Optional | placeholder | SMTP password/app password |
| `DEFAULT_FROM_EMAIL` | No | `noreply@bargain.app` | Sender address |
| `SENTRY_DSN` | Optional | empty | Sentry DSN |
| `SENTRY_ENVIRONMENT` | No | `development` | Sentry environment label |
| `SENTRY_RELEASE` | Optional | empty | Release id for Sentry |
| `SENTRY_TRACES_SAMPLE_RATE` | No | `0.1` | Traces sample rate |
| `SENTRY_PROFILES_SAMPLE_RATE` | No | `0.0` | Profiles sample rate |
| `LOG_LEVEL` | No | `INFO` | Logging verbosity |
| `LOG_JSON_FORMAT` | No | `false` | Structured JSON logs toggle |
| `SCRAPING_USER_AGENT` | No | `BarGAIN-Bot/1.0 (+https://github.com/QHX0329/bargain-tfg)` | User agent for spiders |
| `SCRAPING_CONCURRENT_REQUESTS` | No | `4` | Scraper concurrency |
| `SCRAPING_DOWNLOAD_DELAY` | No | `2` | Scraper delay seconds |

`Optional*` means optional for booting local API, but required when the corresponding feature is
enabled (maps, OCR, assistant, ORS matrix).

## Config File Format
Main configuration files:
- `backend/config/settings/base.py` - shared Django settings
- `backend/config/settings/dev.py` - local development settings
- `backend/config/settings/test.py` - test profile
- `backend/config/settings/prod.py` - production profile
- `render.yaml` - Render infrastructure as code
- `docker-compose.dev.yml` / `docker-compose.yml` - local and prod-like service topology

## Required vs Optional Settings
Required for normal backend startup:
- `DJANGO_SETTINGS_MODULE`
- `SECRET_KEY`
- `DATABASE_URL`
- `REDIS_URL`
- `ALLOWED_HOSTS`

Feature-dependent keys:
- `GOOGLE_MAPS_API_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID`
- `ORS_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_CLOUD_VISION_API_KEY`
- SMTP credentials for email notifications

## Defaults
Defaults currently defined in repository-visible config:
- `DEBUG=True` for local setup (`.env.example`)
- `OSRM_BASE_URL=https://router.project-osrm.org`
- `JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60`
- `JWT_REFRESH_TOKEN_LIFETIME_DAYS=7`
- `LOG_LEVEL=INFO`

## Per-Environment Overrides
- Development: `.env` copied from `.env.example` + Docker backend + host frontend.
- CI backend: `.github/workflows/ci-backend.yml` injects `DJANGO_SETTINGS_MODULE=config.settings.test`
  and service URLs for PostgreSQL/Redis.
- Production/staging: Render `envVars` from `render.yaml` and dashboard-managed secrets.

<!-- VERIFY: Production CORS origin list should be confirmed in Render dashboard before release. -->
<!-- VERIFY: Final production SENTRY_DSN value is managed outside the repository. -->