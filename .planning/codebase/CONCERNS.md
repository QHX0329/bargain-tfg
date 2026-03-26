# Codebase Concerns

**Analysis Date:** 2026-03-16

## Tech Debt

**JWT Refresh Token Implementation:**
- Issue: 401 response on expired token immediately logs user out instead of attempting refresh
- Files: `frontend/src/api/client.ts` (lines 46, 51-54)
- Impact: Users lose session state without warning when token expires during activity. No automatic token refresh despite backend supporting it (SIMPLE_JWT.ROTATE_REFRESH_TOKENS = True)
- Fix approach: Implement refresh token rotation interceptor that catches 401, attempts refresh before logout. Store refresh token securely (requires React Native secure storage library)

**Incomplete Backend App Implementations:**
- Issue: Multiple critical backend modules have skeleton structure only (no models, serializers, or views)
- Files:
  - `backend/apps/products/` - Missing models.py, serializers.py, views.py
  - `backend/apps/stores/` - Missing models.py, serializers.py, views.py
  - `backend/apps/prices/` - Missing models.py, serializers.py, views.py
  - `backend/apps/optimizer/` - Empty urls.py, no algorithm implementation
  - `backend/apps/ocr/` - Missing models.py, serializers.py, views.py
  - `backend/apps/assistant/` - Missing models.py, serializers.py, views.py
  - `backend/apps/business/` - Missing models.py, serializers.py, views.py
  - `backend/apps/shopping_lists/` - Missing models.py, serializers.py, views.py
  - `backend/apps/notifications/` - Missing models.py, serializers.py, views.py
  - `backend/apps/scraping/` - Only has empty tasks.py, no spider implementations
- Impact: Core functionality cannot work. API endpoints defined in urls.py (config/urls.py) will 404 or 500
- Fix approach: Follow F3 task checklist (F3-05 through F3-28). Each app requires: models (2-4 hours), serializers (1 hour), viewsets (3-4 hours), tests (2-3 hours)

**Frontend Mock Data Hardcoding:**
- Issue: All frontend screens use hardcoded MOCK_* data instead of API calls
- Files: `frontend/src/screens/home/HomeScreen.tsx` (lines 72-83+)
- Impact: UI development complete but disconnected from backend. Data never flows from API. No integration testing possible
- Fix approach: Replace MOCK_* objects with Zustand store selectors that fetch from apiClient. Implement error boundaries for network failures
- Timeline: F4 phase, specifically F4-07 through F4-14

**Scraping Module Not Implemented:**
- Issue: Scrapy project structure exists but no spider implementations
- Files: `scraping/` directory structure only, `backend/apps/scraping/tasks.py` empty
- Impact: Celery Beat scheduler (base.py lines 205-214) references tasks that don't exist. Tasks F5-01 through F5-05 are blockers for F5-06 (optimizer)
- Fix approach: Implement spiders per F5 phase (F5-01: Mercadona, F5-02: Carrefour, F5-03: DIA/Lidl, F5-04: pipeline, F5-05: scheduling)

**Celery Task Configuration Without Tasks:**
- Issue: CELERY_BEAT_SCHEDULE defined in base.py (lines 200-215) references tasks that don't exist
- Files: `backend/config/settings/base.py` (lines 200-215)
- Impact: Celery Beat will fail at startup if tasks aren't defined. Redis/Celery setup complete but unusable
- Fix approach: Either remove schedule entries temporarily until F5 completes, or create stub tasks that log "not implemented"

**Optimizer Algorithm Missing:**
- Issue: Core business logic (multicriterio scoring) not implemented
- Files: `backend/apps/optimizer/` - urls.py exists but views missing, no models, no scoring algorithm
- Impact: Cannot calculate optimized shopping routes. Feature F5-06 and F5-07 depend on this
- Fix approach: Implement ScoreCalculator service in F5-06. Requires: multicriterio function, route optimization with OR-Tools, distance/time calculations via PostGIS

**OCR Pipeline Missing:**
- Issue: No OCR service implementation; tickets/receipts cannot be processed
- Files: `backend/apps/ocr/` - urls.py exists but no models, serializers, views, or integración estable con Google Vision API
- Impact: F4-15/F4-16 (capture and edit) screens have no backend support
- Fix approach: F5-10 implements Google Vision API service, F5-11 adds fuzzy matching to catalog

## Known Bugs

**Default Database Connection Path Hardcoded:**
- Symptoms: Local development requires exact database credentials in DATABASE_URL or .env; no graceful fallback
- Files: `backend/config/settings/base.py` (lines 101-106)
- Trigger: Run Django without .env or DATABASE_URL set
- Workaround: Always set DATABASE_URL or .env with matching credentials before `python manage.py migrate`

**GDAL/GEOS Conditional Loading Can Cause Silent Failures:**
- Symptoms: In Docker, PostGIS queries fail with "OSError: GDAL library not found" if .env contains Windows path
- Files: `backend/config/settings/base.py` (lines 108-115)
- Trigger: Windows development with Docker; GDAL_LIBRARY_PATH points to `C:\OSGeo4W\...` which doesn't exist in container
- Workaround: Ensure .env GDAL_LIBRARY_PATH is unset or left empty when running in Docker. The container's system libgdal.so is used automatically
- Root cause: ERR-004 in ai-mistakes-log.md documents this issue

**Frontend HomeScreen Navigation Broken:**
- Symptoms: "View shopping list" button commented out or non-functional
- Files: `frontend/src/screens/home/HomeScreen.tsx` (line 527)
- Trigger: Tap "View my lists" button
- Workaround: Manual navigation to lists screen
- Status: Requires API integration (F4-07)

**Debug Toolbar Import Not Gracefully Handled:**
- Symptoms: If debug_toolbar not installed in development, URLs fail to import but exception is silently swallowed
- Files: `backend/config/urls.py` (lines 30-38)
- Trigger: Settings.DEBUG=True but django-debug-toolbar not in requirements
- Impact: Low (development only), but silently masks configuration issue
- Fix approach: Either always require debug_toolbar in dev.txt, or log a warning when import fails

## Security Considerations

**Hardcoded Insecure Secret Key Default:**
- Risk: If SECRET_KEY env var not set, Django defaults to "INSECURE-dev-key-change-me"
- Files: `backend/config/settings/base.py` (line 20)
- Current mitigation: Documented in CLAUDE.md and .env.example; Django itself will throw warnings
- Recommendations:
  - Add management command `python manage.py check --deploy` in CI
  - Enforce non-empty SECRET_KEY in prod.py with explicit exception

**CORS Whitelist Not Restrictive Enough:**
- Risk: Default CORS_ALLOWED_ORIGINS includes localhost:3000 and :8081 (web and mobile dev) in all environments
- Files: `backend/config/settings/base.py` (lines 187-189)
- Current mitigation: Environment variable, but default allows dev URLs
- Recommendations:
  - Prod deployment must override CORS_ALLOWED_ORIGINS to actual frontend domain
  - Check at startup that CORS whitelist doesn't include localhost in production

**JWT Tokens Not Invalidated on Logout:**
- Risk: Tokens in BLACKLIST still valid until expiration
- Files: `backend/config/settings/base.py` (line 181: BLACKLIST_AFTER_ROTATION = True)
- Current mitigation: Short-lived tokens (60 min default, configurable)
- Recommendations:
  - Implement token introspection endpoint to validate token wasn't revoked
  - Document token lifetime and refresh behavior in API docs
  - Consider implementing immediate token blacklist on logout (requires additional table query)

**OCR Input Not Validated:**
- Risk: Image upload endpoint will accept arbitrary files when implemented
- Files: `backend/apps/ocr/` - not yet implemented
- Current mitigation: None (feature not built)
- Recommendations: When F5-10 is implemented:
  - Validate file type (image/* only) and size (<10MB)
  - Scan with antivirus/malware detection
  - Sanitize OCR output before fuzzy matching and downstream processing

**Scraping Spiders Can Hammer Target Servers:**
- Risk: Scrapy configured without rate limiting or user-agent rotation
- Files: `scraping/` - not yet implemented, but will need `bargain_scraping/middlewares.py`
- Current mitigation: None (feature not built)
- Recommendations: When F5-01 onwards is implemented:
  - Implement RobotsMiddleware to respect robots.txt
  - Add AutoThrottle for automatic rate limiting
  - Rotate user agents and respect Retry-After headers
  - Consider proxy rotation for large-scale scraping

**API Rate Limiting Not Tuned for Real Load:**
- Risk: DEFAULT_THROTTLE_RATES set to 100/hour (anon) and 1000/hour (user) - may be too permissive
- Files: `backend/config/settings/base.py` (lines 160-167)
- Current mitigation: Rate limits are in place
- Recommendations:
  - Monitor actual usage patterns in staging before production
  - Tighten limits on sensitive endpoints (assistant, ocr, optimize) — suggest 10/hour for expensive operations
  - Implement per-user quotas for PYME tier

**Assistant API Key Passed Without Encryption:**
- Risk: Claude API key stored in environment variable, passed to frontend unencrypted if not proxied correctly
- Files: `backend/apps/assistant/` - not yet implemented
- Current mitigation: Should be backend-only proxy (not passed to frontend)
- Recommendations: When F5-12 is implemented:
  - API key must NEVER be sent to frontend
  - Implement backend endpoint `/api/v1/assistant/chat/` that proxies to Claude
  - Frontend calls backend endpoint only
  - Log all assistant requests for audit (Sentry + structlog)

## Performance Bottlenecks

**PostGIS Queries Unoptimized:**
- Problem: Store proximity searches and optimization route calculation will be slow without proper spatial indexing
- Files: `backend/apps/stores/models.py` (not yet implemented) and `backend/apps/optimizer/` (not yet implemented)
- Cause: PostGIS PointField queries without GIST indexes will do full table scans
- Improvement path:
  - Add `class Meta: indexes = [GistIndex(fields=['location'])]` to Store model
  - Use Django's GIS functions: `Distance`, `DWithin`, `GeomFromText`
  - Cache store locations in Redis (Celery) with 24h TTL
  - Benchmark with `django.test.utils.CaptureQueriesContext` and EXPLAIN ANALYZE

**Frontend Component Re-renders Not Memoized:**
- Problem: HomeScreen and ListScreen re-render on every state change, including parent updates
- Files: `frontend/src/screens/home/HomeScreen.tsx` - uses mock data so optimization not yet critical
- Cause: Functional components without React.memo() or useMemo hooks
- Improvement path:
  - Wrap heavy components with React.memo()
  - Use useMemo for expensive calculations (list filters, sorting)
  - Use useCallback to stabilize event handlers passed to children
  - Profile with React DevTools Profiler (Expo supports this)

**No Caching Layer for Price Data:**
- Problem: Every price comparison query hits database; no caching of frequently accessed prices
- Files: `backend/apps/prices/` (not yet implemented)
- Cause: Price data fetched fresh every request
- Improvement path:
  - Implement Redis cache with 1-hour TTL for `prices:store:{store_id}:product:{product_id}`
  - Cache aggregate queries (cheapest stores by category)
  - Invalidate cache on new price from scraper
  - Add `@cache.cached(timeout=3600)` decorator to expensive QuerySets

**Optimization Algorithm Will Have Exponential Complexity:**
- Problem: Generating all combinations of stores × products without pruning
- Files: `backend/apps/optimizer/` (not yet implemented) - F5-06 task
- Cause: Naive algorithm without constraint propagation
- Improvement path:
  - Limit to max_stops (default 3, user-configurable) early
  - Use OR-Tools VRP solver (already in requirements: ortools 9.10)
  - Implement branch-and-bound pruning to skip suboptimal routes
  - Cache distance matrix (PostGIS) for repeated queries
  - Set 10-second timeout on solver to avoid hanging on large baskets

**No Pagination on List Items in Frontend:**
- Problem: ShoppingList can grow unbounded; rendering 1000 items causes lag
- Files: `frontend/src/screens/lists/` (not yet fully implemented)
- Cause: No pagination or virtual scrolling implemented
- Improvement path:
  - Implement FlatList or FlashList with `initialNumToRender=10` and `maxToRenderPerBatch=5`
  - Paginate API responses (already configured in base.py: PAGE_SIZE=20)
  - Add "Load more" button or infinite scroll
  - Profile with React Native DevTools on actual device (not web)

## Fragile Areas

**User Model with Many Optional Fields:**
- Files: `backend/apps/users/models.py` (lines 34-75)
- Why fragile: avatar, default_location, phone are all nullable; code must handle missing values
- Safe modification:
  - Provide sensible defaults in serializers, not just null
  - Add property methods for avatar_url with fallback to avatar CDN placeholder
  - Always use null-safe lookups: `user.default_location or user_default_from_ip()`
- Test coverage: F3-03 and F3-04 must test all combinations of optional fields

**Exception Handler Global Configuration:**
- Files: `backend/apps/core/exceptions.py` (lines 20-50)
- Why fragile: All exceptions globally wrapped; format changes affect entire API
- Safe modification:
  - Add comprehensive tests for each exception type before changing format
  - Keep response format stable (success/error/details structure)
  - Test backward compatibility with frontend error handlers
  - Add versioning to error codes if format changes in future

**Celery Task Definitions:**
- Files: `backend/config/celery.py` (not yet read, but critical), CELERY_BEAT_SCHEDULE in base.py
- Why fragile: Task names hardcoded in schedule; if task.py function renamed, scheduler silently fails at runtime
- Safe modification:
  - Always match task name exactly: task decorator must be @app.task(name='apps.scraping.tasks.run_spider')
  - Test task execution in CI: `celery -A config.celery call apps.scraping.tasks.run_spider`
  - Log all scheduled task executions to Sentry
  - Add smoke test in test suite that triggers each scheduled task

**Django Settings Split Across Files:**
- Files: base.py, dev.py, prod.py, test.py with imports and overrides
- Why fragile: Settings inheritance can cause unexpected values (e.g., logging level from dev bleeding into test)
- Safe modification:
  - Always explicitly set all required settings in each environment file
  - Use `python manage.py diffsettings --all` to verify environment-specific overrides
  - Never rely on base.py as default if production must differ
  - Test settings in CI: `python manage.py check --deploy`

## Scaling Limits

**Single Redis Instance:**
- Current capacity: Standard Redis (5GB default) sufficient for current schema
- Limit: Cache coherency breaks with multiple backend instances (no coordination)
- Scaling path:
  - Implement Redis Cluster for multi-instance deployment
  - Add consistent hashing for cache keys if sharding needed
  - Monitor memory usage with Prometheus (already in CLAUDE.md)
  - Set eviction policy to `allkeys-lru` in prod

**PostgreSQL Without Read Replicas:**
- Current capacity: Single PostGIS instance handles concurrent development use
- Limit: Geo queries (Distance, DWithin) are CPU-intensive; won't scale to thousands of concurrent users
- Scaling path:
  - Configure read replicas for SELECT-heavy queries (product searches, price comparisons)
  - Use Django's database router to send reads to replicas
  - Keep writes on primary only
  - Benchmark geo queries with pgBench

**Frontend Bundle Size:**
- Current capacity: React Native + all dependencies ~500MB installed
- Limit: Over-the-air updates will be slow; first load on 3G takes 30+ seconds
- Scaling path:
  - Implement code splitting per tab (React.lazy + Suspense)
  - Use EAS Updates (Expo) for delta OTA updates
  - Monitor bundle size in CI with `expo prebuild --list`
  - Remove unused dependencies (audit with `npm ls --depth=0`)

**File Upload Storage (Images/Avatars):**
- Current capacity: Local filesystem (MEDIA_ROOT in base.py) fine for development
- Limit: Single server can't handle thousands of avatar uploads
- Scaling path:
  - Implement S3 (or Render's managed storage) for media files
  - Use django-storages package to swap backends without code changes
  - Configure CDN (CloudFront or similar) for image delivery
  - Implement image compression middleware (Pillow already in requirements)

## Dependencies at Risk

**Django 5.1:**
- Risk: Major version within 1 year; may have breaking changes in 5.2
- Impact: All backend models, ORM queries, middleware affected
- Migration plan:
  - Set `Django>=5.1,<6.0` to allow patch upgrades
  - Monitor Django 5.2 release notes when it comes out
  - Create automated test to check upgrade compatibility 6 months before EOL

**Python 3.12 Dependency:**
- Risk: Python 3.13 will be released in Oct 2024; 3.12 will enter security-only phase
- Impact: Dependency management, type checking, async features
- Migration plan:
  - Build and test against Python 3.13 in CI before 3.12 EOL
  - Update Dockerfile to specify explicit version: `FROM python:3.13-slim-bullseye`

**Playwright and Scrapy Versions:**
- Risk: Both are rapid-release projects; version drift will break spiders
- Impact: Mercadona/Carrefour HTML changes won't be captured; prices become stale
- Migration plan:
  - Lock versions in requirements/base.txt (currently `playwright>=1.44`, `scrapy>=2.11`)
  - Add periodic dependency audit in CI (e.g., GitHub Dependabot)
  - Monitor playwright/scrapy issues for breaking changes to modern sites
  - Test spiders against live sites weekly (use dedicated test environment)

**Anthropic API (`anthropic>=0.30`):**
- Risk: API contract may change; version < 1.0 indicates unstable API
- Impact: Claude API integration (F5-12) could break with new version
- Migration plan:
  - Pin major version: `anthropic>=0.30,<0.31` initially, upgrade cautiously
  - Wrap API calls in `AssistantClient` service (apps/assistant/services.py)
  - Version all prompts and system messages in config, not hardcoded
  - Add API compatibility layer to isolate version changes

**PostGIS on PostgreSQL:**
- Risk: PostGIS version must match PostgreSQL version; mismatches cause crashes
- Impact: All geospatial queries fail; app non-functional in production
- Migration plan:
  - Docker ensures matching versions (see docker-compose.yml)
  - Document required versions in setup guide
  - Add health check: `SELECT PostGIS_version()` in startup tasks
  - Pin versions: `postgres:16-alpine`, `postgis/postgis:16-3.4`

## Missing Critical Features

**Backup and Disaster Recovery:**
- Problem: No automated backups documented or implemented
- Blocks: Production deployment (F6)
- Implementation:
  - Configure daily PostgreSQL dumps to S3
  - Document recovery procedures
  - Test restore from backup monthly
  - Add `pg_dump` task to Celery Beat

**Monitoring and Alerting:**
- Problem: Sentry configured but no Prometheus/Grafana setup for metrics
- Blocks: Scaling decisions, capacity planning, performance debugging
- Implementation:
  - Deploy Prometheus scraper for Django metrics
  - Set up Grafana dashboards for key metrics (response time, DB queries, task queue depth)
  - Configure alerts for high error rates, queue depth > threshold
  - Document runbook for common alerts

**Automated Testing in CI:**
- Problem: GitHub Actions workflows defined but may not be running
- Blocks: Merging untested code to develop/main
- Implementation:
  - Verify `.github/workflows/ci-backend.yml` and `ci-frontend.yml` are triggered on all PRs
  - Set branch protection rules requiring passing checks
  - Run coverage reports and fail if < 80%
  - Document test execution time expectations

**Error Recovery and Retry Logic:**
- Problem: Transient failures (network timeouts, rate limits) not handled
- Blocks: Reliability in production (F6)
- Implementation:
  - Add exponential backoff to API client (frontend)
  - Implement retry decorator for Celery tasks with max_retries=3
  - Add circuit breaker pattern for external service calls (Claude API, OSRM)
  - Test failure scenarios with chaos engineering tools

## Test Coverage Gaps

**No Frontend Tests:**
- What's not tested: UI components, navigation, state management, API integration
- Files: `frontend/src/screens/`, `frontend/src/store/`, `frontend/src/api/`
- Risk: Regressions in UI logic, broken screens deployed to production
- Priority: High (F4-20 requires writing 40+ component tests)

**Backend Models Not Tested Beyond Seed Command:**
- What's not tested: User model validations, geospatial queries, model constraints
- Files: `backend/apps/users/models.py` - only seed_data_command tested
- Risk: Migration failures, constraint violations in production
- Priority: High (each app needs 5-10 unit tests per F3 task)

**No Integration Tests Across Services:**
- What's not tested: API requests flow through authentication → DB → response; Celery task execution
- Files: `backend/tests/integration/` directory empty
- Risk: Services work in isolation but fail together (e.g., JWT refresh breaks when combined with user queries)
- Priority: Medium (F3-27 task, ~6 hours)

**No E2E Tests:**
- What's not tested: Complete user workflows (signup → create list → optimize → view route)
- Files: No E2E framework configured (no Cypress, Playwright test runner, or Detox)
- Risk: Ship broken user journeys that aren't caught by unit tests
- Priority: Medium-High (F6-02 task)

**Optimizer Algorithm Not Stress-Tested:**
- What's not tested: Edge cases (100-item list in 1 store, 4 stops with 5 items each), performance with distance matrix
- Files: `backend/apps/optimizer/` not yet implemented, but tests should be in F5-09
- Risk: Algorithm hangs on large inputs, produces invalid routes (negative distances, crossing paths)
- Priority: Critical (blocker for feature release)

**OCR Fuzzy Matching Not Tested Against Real Receipts:**
- What's not tested: Robustness to blurry images, rotated text, poor lighting, handwriting
- Files: `backend/apps/ocr/` not yet implemented, F5-10/F5-11 should include test fixtures
- Risk: Users get wrong products matched, waste time correcting
- Priority: High (user-facing feature)

---

*Concerns audit completed on 2026-03-16. This document should be reviewed before each phase to track resolution of identified issues.*
