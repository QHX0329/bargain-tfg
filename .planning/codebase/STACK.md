# Technology Stack

**Analysis Date:** 2026-03-16

## Languages

**Primary:**
- Python 3.12+ - Backend (Django, Celery, Scrapy)
- JavaScript/TypeScript - Frontend (React Native, Expo)

**Secondary:**
- SQL (PostgreSQL with PostGIS extension)

## Runtime

**Environment:**
- Python 3.12+ (backend via Docker)
- Node.js >=24.0.0 (frontend, native on host per ADR-002)
- Docker 3.9+ (containerization)

**Package Manager:**
- pip (Python dependencies)
- npm (Node.js dependencies)
- Lockfiles: requirements.txt, package-lock.json (both present)

## Frameworks

**Core:**
- Django 5.1.x - Web framework and ORM
- Django REST Framework (DRF) 3.15+ - REST API construction
- React Native 0.83.2 - Cross-platform mobile UI
- Expo 55.0.6 - React Native CLI and development environment

**Async/Task Processing:**
- Celery 5.4.x - Distributed task queue
- Django Celery Beat 2.6.x - Periodic task scheduling
- Redis 7-alpine - Message broker and result backend

**Web Scraping:**
- Scrapy 2.11.x - Web scraping framework
- Playwright 1.44+ - Headless browser automation

**API Documentation:**
- drf-spectacular 0.27.x - OpenAPI/Swagger generation

**Routing & Navigation (Frontend):**
- React Navigation 7.0+ - Screen and tab navigation
- React Navigation Bottom Tabs 7.2.0 - Tab-based navigation
- React Navigation Native Stack 7.2.0 - Stack-based navigation

## Key Dependencies

**Critical:**
- PostgreSQL 16 with PostGIS 3.4 - Geospatial queries and distance calculations
- anthropic >=0.30 - Claude API integration for LLM assistant
- django-cors-headers 4.4.x - CORS handling
- djangorestframework-simplejwt 5.3.x - JWT authentication with refresh token rotation
- redis 5.0.x - Caching and Celery broker

**Infrastructure:**
- psycopg[binary] 3.2.x - PostgreSQL adapter
- dj-database-url 2.2.x - Database URL parsing
- gunicorn 22.0.x - Production WSGI server
- whitenoise 6.7.x - Static file serving
- django-filter 24.0.x - DRF filtering
- structlog 24.0.x - Structured JSON logging

**AI/ML:**
- Google Cloud Vision API - OCR provider approved in ADR-007 (legacy code path still references pytesseract)
- ortools 9.10.x - OR-Tools for route optimization
- thefuzz[speedup] 0.22.x - Fuzzy string matching (for product normalization)

**Frontend:**
- axios 1.7.9 - HTTP client
- zustand 5.0.0 - State management
- react-native-reanimated 3.17.4 - Animation library
- react-native-safe-area-context 5.6.2 - Safe area support
- react-native-screens 4.23.0 - Native screen navigation

**Monitoring & Error Tracking:**
- sentry-sdk[django] 2.8.x - Error tracking with Django, Celery, Logging integrations

**Development/Testing:**
- pytest 8.2.x - Test runner
- pytest-django 4.8.x - Django pytest plugin
- pytest-cov 5.0.x - Coverage reporting
- factory-boy 3.3.x - Test data factories
- faker 26.0.x - Fake data generation
- ruff 0.5.x - Python linter and formatter
- ESLint 9.17.0 - JavaScript linter
- Prettier 3.4.2 - Code formatter
- TypeScript 5.9.2 - Type checking
- Jest (via jest-expo) - JavaScript test runner

## Configuration

**Environment:**
- `.env.example` present with all required variables (location: repository root)
- Environment variables required:
  - `DJANGO_SETTINGS_MODULE`: Django environment (dev/prod/test)
  - `SECRET_KEY`: Django secret key
  - `DATABASE_URL`: PostgreSQL connection string
  - `REDIS_URL`: Redis connection string
  - `ANTHROPIC_API_KEY`: Claude API authentication
  - `GOOGLE_MAPS_API_KEY`: Google Maps integration
  - `SENTRY_DSN`: Error tracking endpoint
  - See `.env.example` for complete list

**Build:**
- `Dockerfile` in `backend/` - Production image definition
- `docker-compose.yml` - Multi-service orchestration (PostgreSQL, Redis, Backend, Celery, Celery Beat, Nginx)
- `docker-compose.dev.yml` - Development overrides
- `Makefile` - Build and development commands

**Frontend Config:**
- `app.json` (Expo configuration at `frontend/app.json`)
- `babel.config.js` - Babel transpiler config
- `tsconfig.json` - TypeScript configuration
- `jest` config in `frontend/package.json`

**Backend Config:**
- `config/settings/base.py` - Base Django settings
- `config/settings/dev.py` - Development overrides
- `config/settings/prod.py` - Production overrides
- `config/settings/test.py` - Testing configuration
- `config/urls.py` - Django URL routing
- `config/celery.py` - Celery application definition
- `config/wsgi.py` - WSGI entry point

## Platform Requirements

**Development:**
- Docker + Docker Compose (for backend services)
- Node.js >=24.0.0 (frontend runs natively on host, not dockerized per ADR-002)
- Python 3.12+ (if running backend natively without Docker)
- Git for version control
- Makefile support (or direct Docker commands)
- Windows/macOS/Linux compatible

**Production:**
- Docker runtime
- PostgreSQL 16+ server (can be managed by container)
- Redis 7+ server (can be managed by container)
- Nginx reverse proxy (included in docker-compose.yml)
- HTTPS/TLS support recommended (Sentry ready, SECURE_SSL_REDIRECT in prod)
- Render (current staging) or AWS (planned production)

---

*Stack analysis: 2026-03-16*
