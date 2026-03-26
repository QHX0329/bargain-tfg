# Phase 5: Optimizer, Scraping, OCR, LLM - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the four remaining backend systems (optimizer, scraping, OCR, LLM) and wire them to the
three frontend screens that currently run on mock data (RouteScreen, OCRScreen, AssistantScreen).

All four Django apps (`optimizer`, `ocr`, `assistant`, `scraping`) exist as empty stubs and all
frontend screens are fully built with mock data pending these endpoints. Phase 5 closes when the
real endpoints are integrated end-to-end.

Out of scope: crowdsource store creation from Places results (F5+ per Phase 4 context), OSRM
with haversine already in PostGIS (Graphhopper chosen), persistent chat history in DB.

</domain>

<decisions>
## Implementation Decisions

### Scraping

- **D-01:** Cover 4 supermarkets: Mercadona, Carrefour, Lidl, DIA.
- **D-02:** Mercadona uses its semi-official JSON API (direct HTTP — no browser needed). Carrefour/Lidl/DIA use Playwright for JavaScript-heavy pages. Two-strategy pattern: `requests` where sufficient, Playwright where required.
- **D-03:** Celery Beat schedules one task per spider, running daily (24h cadence). Aligns with the 48h price TTL rule in CLAUDE.md.
- **D-04:** Prices are inserted via the existing Price model (`source="scraping"`, `verified_at=now()`). No new schema needed for ingestion.

### Optimizer

- **D-05:** Algorithm: OR-Tools TSP solver (already in `requirements/base.txt`). The multicriteria score function from CLAUDE.md (`Score = w_precio * ahorro - w_distancia * distancia - w_tiempo * tiempo`) is applied as OR-Tools arc costs after normalizing across candidates.
- **D-06:** Route distances via **Graphhopper** running in Docker Compose (new container added to `docker-compose.dev.yml`). Map data: Spain/Andalucía OSM extract. This replaces haversine for real road distances.
- **D-07:** Max stops: default 3, user-configurable up to 5. API parameter `max_stops` (int, 2–5, default 3).
- **D-08:** User location sent with optimization request (`lat`, `lng`). Radius filter uses existing `distance_km` annotation on stores queryset.
- **D-09:** When no stores are found in the user's radius: return HTTP 404 with `OPTIMIZER_NO_STORES_IN_RADIUS` code and message suggesting the user widen the radius. `RouteScreen` shows an error card with a "Ampliar radio" action button.
- **D-10:** OptimizationResult stored in DB (model in `optimizer` app) with `route_data` JSONB for the ordered stops. Result also returned inline in the optimize response.

### OCR

- **D-11:** Backend-only OCR: Google Cloud Vision API. No frontend OCR dual approach for F5.
- **D-12:** Endpoint `POST /ocr/scan/` accepts `multipart/form-data` with `image` field. Returns list of `{ raw_text, matched_product_id, matched_product_name, confidence, quantity }`.
- **D-13:** Fuzzy matching: `thefuzz.token_sort_ratio` with threshold **80%**. If similarity >= 80% → map to catalog product. If < 80% → return raw text without `matched_product_id`. Frontend (`OCRScreen`) lets user accept or edit each item before adding to list.
- **D-14:** `expo-image-picker` already marked as TODO in OCRScreen — install and enable in F5 when the backend endpoint is ready.

### LLM Assistant

- **D-15:** Scope (guardrails): The assistant answers only shopping-domain queries — product/price comparison, shopping list suggestions, and recipes based on available ingredients. Rejects off-topic requests with a polite message ("Soy un asistente de compras. ¿Puedo ayudarte con tu lista?").
- **D-16:** Implementation: backend proxy `POST /assistant/chat/`. Frontend sends `{ messages: [{ role, content }] }` array (full local session history). Backend passes history to Claude API. No history persisted in DB — session-scoped only.
- **D-17:** System prompt enforces scope guardrails and sets context as BargAIn shopping assistant. Cost control: truncate history to last 10 turns before sending to Claude API.
- **D-18:** LLM model: `claude-haiku-4-5-20251001` for cost efficiency. The assistant endpoint is rate-limited (existing DRF throttle or `django-ratelimit`).

### Frontend Integration

- **D-19:** All three screens go fully live in F5:
  - `RouteScreen` → `POST /optimizer/optimize/`
  - `OCRScreen` → `POST /ocr/scan/`
  - `AssistantScreen` → `POST /assistant/chat/`
- **D-20:** Mock data in each screen is removed once the endpoint is wired. Each screen uses a loading state skeleton (existing `SkeletonBox` component) while the request is in flight.

### Claude's Discretion

- Exact Graphhopper Docker configuration and OSM region file selection
- OR-Tools solver parameters (time limit, solution quality vs. speed tradeoff)
- Scrapy pipeline details (item processors, duplicate filtering)
- Exact system prompt wording for the LLM assistant
- Rate-limit throttle rate for the assistant endpoint
- Django Celery Beat schedule format and task retry policy for spiders

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project constraints
- `CLAUDE.md` — Algorithm scoring formula, price TTL rules, max stops defaults, OCR + LLM rules of business
- `.planning/REQUIREMENTS.md` — OPT-01..OPT-04, OCR-01..OCR-02, LLM-01..LLM-02, SCRAP-01 (all pending for F5)
- `.planning/PROJECT.md` — 300h budget constraint, demonstrable features priority for defense

### Backend architecture
- `backend/config/settings/base.py` — Installed apps, Celery config, Redis broker
- `backend/apps/core/exceptions.py` — Custom exception classes (OCRProcessingError, AssistantUnavailable already defined)
- `backend/apps/prices/models.py` — Price model (scraping writes here: `source="scraping"`)
- `backend/apps/stores/models.py` — Store model with PostGIS location (optimizer reads this)
- `backend/apps/shopping_lists/models.py` — ShoppingList model (optimizer input)

### Existing stubs
- `backend/apps/optimizer/` — Empty stub app (urls.py, apps.py, migrations/__init__.py)
- `backend/apps/ocr/` — Empty stub app
- `backend/apps/assistant/` — Empty stub app
- `backend/apps/scraping/tasks.py` — Stub `run_spider` Celery task

### Frontend screens (mock → real wiring)
- `frontend/src/screens/lists/RouteScreen.tsx` — Mock OptimizationResult data, documented endpoint `POST /optimizer/optimize/`
- `frontend/src/screens/lists/OCRScreen.tsx` — Mock OCR items, documented endpoint `POST /ocr/scan/`, expo-image-picker TODO
- `frontend/src/screens/assistant/AssistantScreen.tsx` — Mock chat responses, documented endpoint `POST /assistant/chat/`

### Data models spec (from CLAUDE.md)
- `OptimizationResult` model spec: `user_location` (PostGIS), `max_distance_km`, `optimization_mode`, `total_price`, `total_distance_km`, `estimated_time_minutes`, `route_data` (JSONB)

### Scraping
- `scraping/bargain_scraping/spiders/__init__.py` — Empty spiders directory
- `docker-compose.dev.yml` — Add Graphhopper service here

### Prior phase context
- `.planning/phases/04-frontend-advanced/04-CONTEXT.md` — No auto-creation of Store DB records from Places (crowdsource is F5+). Favorites require DB store ID.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/apps/core/exceptions.py`: `OCRProcessingError`, `AssistantUnavailable` already defined — use directly
- `backend/apps/prices/models.py`: `Price` model with `source` field — scraping writes `source="scraping"`
- `frontend/src/components/ui/SkeletonBox.tsx`: Loading skeleton component — use in wired screens while requests are in flight
- `thefuzz[speedup]`: already installed for fuzzy product matching in OCR pipeline
- `ortools 9.10.x`: already installed — no setup cost for OR-Tools solver
- `GOOGLE_CLOUD_VISION_API_KEY`: required for the adopted OCR provider
- `anthropic >=0.30`: already installed — Claude API SDK ready

### Established Patterns
- Backend: `@shared_task` Celery pattern used in `scraping/tasks.py` and `prices/tasks.py` — follow same pattern for spider tasks
- Backend: DRF ViewSet pattern with `IsAuthenticated` permission — all optimizer/OCR/assistant endpoints follow this
- Backend: `{ success, data/error }` response format (global exception handler in `apps/core/`)
- Frontend: Axios client with JWT interceptors at `src/api/client.ts` — all screen API calls go through this
- Frontend: Zustand for global state — don't add new stores unless cross-screen state is needed

### Integration Points
- `backend/config/urls.py` → include `apps.optimizer.urls`, `apps.ocr.urls`, `apps.assistant.urls`
- `backend/config/settings/base.py` → INSTALLED_APPS already has these 4 apps (verify)
- `docker-compose.dev.yml` → add `graphhopper` service (new)
- `frontend/src/api/` → add `optimizerService.ts`, `ocrService.ts`, `assistantService.ts` (or extend existing service files)

</code_context>

<specifics>
## Specific Ideas

- OSRM was initially discussed but **Graphhopper in Docker Compose** was chosen as the routing engine
- The optimizer algorithm spec follows CLAUDE.md exactly: `Score = w_precio * ahorro_normalizado - w_distancia * distancia_extra_normalizada - w_tiempo * tiempo_extra_normalizado`
- The LLM assistant should feel like a polished feature for the TFG defense — not a demo — so the guardrail rejection message should be natural, not robotic
- Graphhopper should cover the Andalucía/Spain OSM region for realistic demo during defense in Seville

</specifics>

<deferred>
## Deferred Ideas

- Crowdsource store creation from Google Places results — explicitly out of scope (noted in Phase 4 context, F5+ item)
- Persistent LLM chat history in PostgreSQL — deferred; session-only history is sufficient for F5
- OCR frontend dual approach — deferred; backend-only Google Vision API is F5 scope
- OSRM as routing engine — evaluated, Graphhopper chosen instead

None — discussion stayed within Phase 5 scope.

</deferred>

---
*Phase: 05-optimizer-scraping*
*Context gathered: 2026-03-25*
