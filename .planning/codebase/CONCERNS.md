# Codebase Concerns

**Analysis Date:** 2026-05-25

---

## Tech Debt

**Hardcoded fallback database credentials in base.py:**
- Issue: Default DB URL `postgis://bargain_user:bargain_password@localhost:5432/bargain_db` is committed in settings
- Files: `backend/config/settings/base.py` (line 110)
- Impact: If `DATABASE_URL` env var is unset, Django silently connects with insecure default credentials instead of failing fast
- Fix approach: Remove hardcoded default; raise `ImproperlyConfigured` when `DATABASE_URL` is absent (same pattern used for `ALLOWED_HOSTS` in prod.py)

**Hardcoded insecure SECRET_KEY fallback:**
- Issue: `SECRET_KEY = os.environ.get("SECRET_KEY", "INSECURE-dev-key-change-me")` exists in base.py
- Files: `backend/config/settings/base.py` (line 20)
- Impact: prod.py guards against this for web processes but not for Celery worker/beat processes; a misconfigured worker will start with the insecure key
- Fix approach: prod.py already raises on insecure key for web — confirm Celery startup also calls `check --deploy`

**Non-existent Gemini model name in default config:**
- Issue: `GEMINI_PRODUCT_MATCH_MODEL` defaults to `"gemini-3-flash-preview"` — a model name that does not exist in Google Generative AI as of May 2026
- Files: `backend/config/settings/base.py` (line 358), `backend/apps/optimizer/services/semantic.py` (line 61), `.env.example` (line 49)
- Impact: Every optimizer call that reaches the Gemini semantic service will fail with `ClientError` and fall back to heuristic matching — silently degraded quality, hard to debug
- Fix approach: Correct to `gemini-2.0-flash-lite` (the model already used for the assistant) or validate on startup

**OCR service retains Tesseract language-hint API despite using Google Vision:**
- Issue: `extract_text_from_image` accepts `lang="spa+eng"` with a Tesseract-style format and converts internally; docstring references Tesseract codes
- Files: `backend/apps/ocr/services.py` (lines 67, 215–228)
- Impact: Future callers may pass Vision BCP-47 codes expecting them to work directly; silent mismatch
- Fix approach: Update docstring and parameter name; accept BCP-47 directly; keep `_build_language_hints` for backward compat

**Scraping tasks always default to `config.settings.dev`:**
- Issue: Both `runner.py` and `tasks.py` use `os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")` — this means if the env var is already set to `prod`, the scraping subprocess picks it up from `env`, but if not set at all, it defaults to `dev` in production containers
- Files: `backend/apps/scraping/runner.py` (line 24), `backend/apps/scraping/tasks.py` (line 144)
- Impact: Scraped data in production could be written using dev settings if the env is not explicitly set on the Celery worker
- Fix approach: Remove the `setdefault` and require the caller to have it set; or derive from the parent process's `DJANGO_SETTINGS_MODULE`

**GRAPHHOPPER_URL setting retained despite migration to ORS:**
- Issue: `GRAPHHOPPER_URL` is still defined in base.py (line 363) and referenced in comments as "maintained for retroactive compatibility" but no code currently uses it
- Files: `backend/config/settings/base.py` (line 363)
- Impact: Confuses future contributors; dead config
- Fix approach: Remove or mark with a deprecation comment pointing to ORS

---

## Security Considerations

**Google Vision API key falls back to Google Maps/Places key:**
- Risk: `_get_google_vision_api_key()` accepts `GOOGLE_PLACES_API_KEY` or `GOOGLE_MAPS_API_KEY` as Vision API key if `GOOGLE_CLOUD_VISION_API_KEY` is absent — these keys have different permission scopes
- Files: `backend/apps/ocr/services.py` (lines 54–63)
- Current mitigation: Error raised if no key found
- Recommendations: Remove fallback to Places/Maps keys; fail explicitly with clear message if `GOOGLE_CLOUD_VISION_API_KEY` is missing

**CORS allows localhost in production defaults:**
- Risk: Default `_default_cors_origins` in base.py includes `http://localhost:*` and `exp://localhost:8081`; if `CORS_ALLOWED_ORIGINS` env var is not overridden, dev origins are present in staging
- Files: `backend/config/settings/base.py` (lines 207–220)
- Current mitigation: `render.yaml` explicitly sets `CORS_ALLOWED_ORIGINS` to production origins
- Recommendations: Move default to empty; fail on startup if running under prod settings with localhost in CORS list

**OCR endpoint loads entire active product catalog into memory per request:**
- Risk: `match_products()` does `Product.objects.filter(is_active=True).values(...)` — a full table scan on every OCR call; also creates an O(lines × products) fuzzy-match loop in Python
- Files: `backend/apps/ocr/services.py` (lines 265–296)
- Current mitigation: `ocr` throttle scope (60/hour)
- Recommendations: Cache product list in Redis; consider offloading heavy fuzzy matching to a Celery task for large catalogs

**Optimizer raises `StoreNotFoundError` for unmatched items — reveals catalog gaps:**
- Risk: The error message `"No se encontraron coincidencias para: <item list>"` exposes internal catalog data gaps to the client verbatim
- Files: `backend/apps/optimizer/services/solver.py` (lines 145–150)
- Current mitigation: None
- Recommendations: Return a generic "some items could not be matched" message; log details server-side only

---

## Performance Risks

**N+1 risk in OCR `match_products` for large catalogs:**
- Problem: Full product table loaded per request — no join, no index use; at 10,000+ products each OCR call does a full Python O(N×M) comparison
- Files: `backend/apps/ocr/services.py` (lines 265–267)
- Cause: `thefuzz` matching runs in Python, not in the database (unlike the optimizer's `TrigramSimilarity`)
- Improvement path: Use `TrigramSimilarity` via Django ORM (already used in matching.py) to push comparison to PostgreSQL with GIN index; or cache products in Redis with periodic refresh

**Optimizer `resolve_list_items` calls Gemini per list item (synchronous, in request thread):**
- Problem: Each unchecked shopping list item triggers a synchronous Gemini API call during the HTTP request; 10 items = 10 sequential API roundtrips
- Files: `backend/apps/optimizer/services/semantic.py` (lines 186–260), `backend/apps/optimizer/services/matching.py` (line 206)
- Cause: `select_semantic_intent` is called in a for-loop with no batching or parallelism
- Improvement path: Batch Gemini calls (single prompt with all items); or offload to Celery and return results async; `MAX_SEMANTIC_CANDIDATES=8` caps product context per call

**`_latest_prices_for_products` deduplication in Python, not SQL:**
- Problem: Fetches all price rows ordered by `(product_id, store_id, -verified_at)` then deduplicates in Python using `setdefault`; scales O(N) in memory for large results
- Files: `backend/apps/optimizer/services/matching.py` (lines 118–132)
- Cause: Avoids a window function; correct but memory-intensive at scale
- Improvement path: Use `DISTINCT ON (product_id, store_id) ORDER BY verified_at DESC` via `RawSQL` or ORM annotation to push deduplication to the DB

**`Price` model missing composite unique constraint:**
- Problem: `Price` model has no UNIQUE constraint on `(product, store)` — the pipeline uses `update_or_create(product=..., store=...)` which relies on the ORM-level lookup, not a DB-level constraint
- Files: `backend/apps/prices/models.py`, `scraping/bargain_scraping/pipelines.py` (line 108)
- Cause: Missing `unique_together` or `UniqueConstraint`
- Improvement path: Add `UniqueConstraint(fields=["product", "store"], name="prices_product_store_unique")` and a migration; the pipeline already assumes this semantics

---

## Incomplete Implementations

**F4-21: Google Places API integration (task remains `⬜`):**
- Status: Explicitly marked pending in TASKS.md; `Store` model has `google_place_id` field (migration 0003 exists) but the enrichment logic is missing
- Files: `backend/apps/stores/migrations/0003_store_google_place_id.py`, `backend/apps/stores/management/commands/import_apify_places.py`
- Impact: Store location data relies entirely on seed/import; no automatic enrichment from Google Places
- Note: `import_apify_places` management command exists as an alternative data source

**F5-01 to F5-05: Core scraping spiders not yet activated for production:**
- Status: Mercadona spider implemented and functional; Carrefour, Lidl, DIA, and pipeline integration with Celery Beat are marked `⬜` in TASKS.md
- Files: `scraping/bargain_scraping/spiders/` (files exist but Mercadona is the only one documented as working via API), `backend/config/settings/base.py` (Celery Beat schedule defined for all)
- Impact: Celery Beat schedules run tasks that invoke spiders which may not produce real data; prices in DB depend on seed data
- Note: `SPIDER_MAP` in tasks.py includes all spiders — if spiders fail silently, schedule keeps running without producing data

**F5-17: iOS Live Activities blocked on Expo managed workflow:**
- Status: Marked `❌` — requires native ActivityKit extension outside Expo managed
- Files: ADR-010 referenced in TASKS.md
- Impact: iOS checklist lock screen feature not deliverable without ejecting to bare workflow

**`Dockerfile.worker` referenced in `render.yaml` but not confirmed present:**
- Files: `render.yaml` (lines 76, 108) references `./backend/Dockerfile.worker`
- Impact: If file is absent, Render workers fail to build; backend API builds fine but background jobs never start

---

## Infrastructure Gaps

**No database backup strategy in `render.yaml`:**
- Risk: Render free-tier PostgreSQL has no automated backup window configured
- Files: `render.yaml`
- Current mitigation: Render managed DB has daily backups on paid plan; free plan retention is 1 day
- Recommendations: Add `pg_dump` Celery Beat task or document manual backup procedure; upgrade from free plan before production

**Celery worker and beat on `starter` plan; API on `free` plan:**
- Risk: Render free plan sleeps after 15 minutes of inactivity; API responses will be slow on first wake
- Files: `render.yaml` (line 29 — `plan: free` for web service)
- Impact: First request after sleep can take 30+ seconds; health check at `/api/v1/health/` may time out during deploy
- Recommendations: Upgrade API service to `starter`; or add an uptime monitor pinging the health endpoint

**`maxmemoryPolicy: noeviction` on Redis in staging:**
- Risk: If Redis memory fills (e.g., large Celery result backend), the broker will reject new tasks rather than evict old entries
- Files: `render.yaml` (line 70)
- Recommendations: Change to `allkeys-lru` for a broker+cache combined Redis; or use separate Redis instances for broker and result backend

---

## Dependency Risks

**`google-genai>=0.8,<2.0` — wide version range for an evolving SDK:**
- Risk: Google GenAI Python SDK has had breaking API changes between 0.x versions
- Files: `backend/requirements/base.txt` (line 30)
- Impact: An upgrade within the allowed range could break `client.models.generate_content` call signature
- Migration plan: Pin to `>=1.0,<2.0` or lock exact minor version; run tests against latest allowed version in CI

**`ortools>=9.10,<10.0` — tied to solver algorithm internals:**
- Risk: OR-Tools solver API (RoutingModel, pywrapcp) has changed significantly between major versions
- Files: `backend/requirements/base.txt` (line 31), `backend/apps/optimizer/services/solver.py`
- Recommendations: Lock to exact minor `>=9.10,<9.11`; test upgrade separately from feature work

**`Pillow>=10.4,<11.0` — version constraint misses Pillow 11.x:**
- Risk: Pillow 11 was released; `<11.0` cap means security patches in 11.x won't be applied
- Files: `backend/requirements/base.txt` (line 39)
- Recommendations: Bump to `>=10.4,<12.0` and test image preprocessing in OCR service

---

## Migration / Compatibility Issues

**No migration squashing — 3 migrations in optimizer, growing migration history:**
- Files: `backend/apps/optimizer/migrations/` (0001, 0002, 0003), plus all other apps
- Impact: Fresh DB setups run many incremental migrations; also harder to read schema history
- Recommendations: Squash after feature completion (post-F7); keep original migrations until squash is tested

**`optimization_mode` hardcoded to `"balanced"` in persist call:**
- Issue: `OptimizeView._persist_optimization_result` always saves `optimization_mode="balanced"` regardless of user's selected weights
- Files: `backend/apps/optimizer/views.py` (line 172)
- Impact: Historical results always show "balanced" even if user chose price-heavy or distance-heavy optimization; misleads analytics
- Fix approach: Derive mode from weight ratios or accept it as a request parameter

---

## Test Coverage Gaps

**Optimizer integration tests use mocked distance matrix — no real ORS calls:**
- What's not tested: Behavior when ORS is unavailable; haversine fallback accuracy vs ORS; real coordinate-to-route consistency
- Files: `backend/tests/integration/test_optimizer_api.py`, `backend/tests/unit/test_distance_ors.py`
- Risk: ORS contract change or timeout behavior not caught until staging
- Priority: Medium

**E2E Playwright optimizer spec uses API-level test, not UI flow:**
- What's not tested: Actual mobile screen → optimize button → route display; the spec (`optimizer.spec.ts`) calls the API directly
- Files: `frontend/web/e2e/optimizer.spec.ts`
- Risk: Frontend optimizer screen wiring (RouteScreen, OptimizerConfigScreen) not validated end-to-end
- Priority: Medium (mobile-only feature; web companion lacks UI)

**No tests for scraping pipeline under real network conditions:**
- What's not tested: Spider resilience to 403/429/rate-limit responses; pipeline idempotency on duplicate scrape runs
- Files: `backend/tests/unit/test_scraping_pipeline.py`, `backend/tests/unit/test_scraping_spiders.py`
- Risk: Spiders silently drop items; duplicate prices inserted; pipeline halts on first error
- Priority: High (prices are core data)

**OCR `match_products` not tested with empty catalog:**
- What's not tested: Behavior when `Product.objects.filter(is_active=True)` returns empty queryset
- Files: `backend/apps/ocr/services.py` (lines 265–296), `backend/tests/unit/test_ocr.py`
- Risk: Returns all lines as unmatched with no error — acceptable, but untested
- Priority: Low

---

*Concerns audit: 2026-05-25*
