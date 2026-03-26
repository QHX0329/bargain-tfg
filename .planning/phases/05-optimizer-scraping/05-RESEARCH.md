# Phase 5: Optimizer, Scraping, OCR, LLM — Research

> Editorial note (2026-03-26): este documento conserva parte de la investigación original del
> enfoque OCR con pytesseract. La decisión vigente del proyecto está documentada en ADR-007 y
> selecciona Google Vision API como proveedor OCR objetivo.

**Researched:** 2026-03-25
**Domain:** OR-Tools TSP routing, Scrapy+Playwright scraping, Google Vision OCR, Anthropic Claude API, Graphhopper routing, DRF endpoint wiring
**Confidence:** HIGH (all core libraries verified live in Docker; all environment probes run against running containers)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Scraping**
- D-01: Cover 4 supermarkets: Mercadona, Carrefour, Lidl, DIA.
- D-02: Mercadona uses its semi-official JSON API (direct HTTP — no browser needed). Carrefour/Lidl/DIA use Playwright for JavaScript-heavy pages. Two-strategy pattern: `requests` where sufficient, Playwright where required.
- D-03: Celery Beat schedules one task per spider, running daily (24h cadence). Aligns with the 48h price TTL rule.
- D-04: Prices inserted via existing Price model (`source="scraping"`, `verified_at=now()`). No new schema needed for ingestion.

**Optimizer**
- D-05: OR-Tools TSP solver (already in requirements). Multicriteria score function `Score = w_precio * ahorro - w_distancia * distancia - w_tiempo * tiempo` applied as OR-Tools arc costs after normalizing.
- D-06: Route distances via Graphhopper running in Docker Compose (new container). Map data: Spain/Andalucía OSM extract.
- D-07: Max stops default 3, user-configurable up to 5. API parameter `max_stops` (int, 2–5, default 3).
- D-08: User location sent with optimization request (`lat`, `lng`). Radius filter uses existing `distance_km` annotation on stores queryset.
- D-09: No stores in radius → HTTP 404 with `OPTIMIZER_NO_STORES_IN_RADIUS` code. RouteScreen shows error card with "Ampliar radio" button.
- D-10: OptimizationResult stored in DB with `route_data` JSONB. Result also returned inline.

**OCR**
- D-11: Backend-only OCR: Google Vision API. No frontend OCR dual approach.
- D-12: `POST /ocr/scan/` accepts `multipart/form-data` with `image` field. Returns list of `{ raw_text, matched_product_id, matched_product_name, confidence, quantity }`.
- D-13: Fuzzy matching: `thefuzz.token_sort_ratio` with threshold 80%. Frontend lets user accept or edit each item.
- D-14: `expo-image-picker` already in package.json — uncomment import and enable in F5.

**LLM Assistant**
- D-15: Scope: shopping-domain only — product/price comparison, shopping list suggestions, recipes. Rejects off-topic with polite message.
- D-16: `POST /assistant/chat/`. Frontend sends `{ messages: [{ role, content }] }`. No history persisted in DB.
- D-17: System prompt enforces guardrails. Truncate history to last 10 turns before sending to Claude API.
- D-18: Model: `claude-haiku-4-5-20251001`. Rate-limited with DRF throttle or `django-ratelimit`.

**Frontend Integration**
- D-19: All three screens go fully live in F5: RouteScreen → `POST /optimizer/optimize/`, OCRScreen → `POST /ocr/scan/`, AssistantScreen → `POST /assistant/chat/`.
- D-20: Mock data removed once endpoint is wired. Loading state uses existing `SkeletonBox` component.

### Claude's Discretion
- Exact Graphhopper Docker configuration and OSM region file selection
- OR-Tools solver parameters (time limit, solution quality vs. speed tradeoff)
- Scrapy pipeline details (item processors, duplicate filtering)
- Exact system prompt wording for the LLM assistant
- Rate-limit throttle rate for the assistant endpoint
- Django Celery Beat schedule format and task retry policy for spiders

### Deferred Ideas (OUT OF SCOPE)
- Crowdsource store creation from Google Places results
- Persistent LLM chat history in PostgreSQL
- OCR frontend dual approach
- OSRM as routing engine
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OPT-01 | Multicriteria optimizer algorithm (price, distance, time weights) | OR-Tools TSP routing confirmed working; scoring formula from CLAUDE.md; normalization approach documented |
| OPT-02 | Route distance calculation with real road distances | Graphhopper Docker service; REST Matrix API pattern documented; fallback haversine PostGIS if Graphhopper unavailable |
| OPT-03 | OptimizationResult stored in DB and returned inline | Model spec from CLAUDE.md; JSONB route_data pattern documented |
| OPT-04 | User-configurable max stops (2–5, default 3) | API param `max_stops`; OR-Tools RoutingIndexManager vehicles param documented |
| OCR-01 | POST /ocr/scan/ endpoint accepting image, returning recognized items | Google Vision API selected in ADR-007; endpoint pattern documented |
| OCR-02 | Fuzzy product matching with 80% threshold | thefuzz confirmed installed; token_sort_ratio pattern documented |
| LLM-01 | POST /assistant/chat/ proxy to Claude API with guardrails | anthropic 0.85.0 confirmed; messages.create pattern documented; system prompt approach |
| LLM-02 | Rate limiting on assistant endpoint | DRF UserRateThrottle already in global config; custom throttle class pattern documented |
| SCRAP-01 | Production spiders for Mercadona, Carrefour, Lidl, DIA with Celery Beat scheduling | Scrapy 2.14.2 confirmed; Celery Beat schedule stubs already in base.py (Mercadona+Carrefour); Lidl/DIA entries to add; Playwright browsers need `playwright install` in Dockerfile |
| NFR-01 | API response time < 2s for standard operations | optimizer is the slow path; Graphhopper warm cache; OR-Tools time_limit.seconds=5 recommended |
</phase_requirements>

---

## Summary

Phase 5 implements four backend systems (scraping, optimizer, OCR, LLM) and wires them to three fully-built frontend screens currently running on mock data. All core Python libraries are already installed and verified live in the Docker container; for OCR, the adopted provider is now Google Vision API per ADR-007.

The main new infrastructure piece is the Graphhopper container (new service in docker-compose.dev.yml) for real road-distance matrix calculation. Playwright browser binaries are NOT installed in the current Docker image — the Dockerfile.dev needs a `playwright install chromium` step added. All four Django app stubs already exist with urls.py files; the URL prefixes are already registered in config/urls.py (`/api/v1/optimize/`, `/api/v1/ocr/`, `/api/v1/assistant/`).

The Celery Beat schedule in base.py already has stubs for `scrape-mercadona-daily` and `scrape-carrefour-daily`. Two entries for Lidl and DIA need to be added. The `run_spider` Celery task stub in `apps/scraping/tasks.py` needs to be replaced with real implementation using `scrapy.crawler.CrawlerProcess`.

**Primary recommendation:** Implement in order: (1) spiders + Celery tasks, (2) Graphhopper + optimizer, (3) OCR endpoint, (4) LLM assistant, (5) frontend wiring. This ordering minimizes blocked work — scrapers populate the Price table that the optimizer needs, and the frontend wiring is the last step.

---

## Standard Stack

### Core (already installed — no installation needed)

| Library | Version (verified) | Purpose | Confirmed |
|---------|-------------------|---------|-----------|
| ortools | 9.15.6755 | TSP/VRP routing solver | `pywrapcp.RoutingModel` + `RoutingIndexManager` work in container |
| pytesseract | >=0.3.13 | Python wrapper for Tesseract OCR | `get_tesseract_version()` returns 5.5.0 |
| Tesseract OCR (binary) | 5.5.0 | OCR engine (eng + spa trained data) | `/usr/bin/tesseract`, langs: eng, osd, spa |
| anthropic | 0.85.0 | Claude API SDK | `client.messages` resource available |
| thefuzz[speedup] | >=0.22 | Fuzzy string matching | imported, `token_sort_ratio` available |
| scrapy | 2.14.2 | Web scraping framework | confirmed in container |
| playwright | >=1.44 | Headless browser for JS-heavy sites | package installed; **browsers NOT installed** (see pitfalls) |
| Pillow | >=10.4 | Image processing for OCR pre-processing | installed |
| celery[redis] | >=5.4 | Async task queue | running (celery + celery-beat containers live) |
| django-celery-beat | >=2.6 | Persistent Celery schedules in DB | `DatabaseScheduler` active in base.py |

### New Infrastructure

| Service | Image | Purpose | Config needed |
|---------|-------|---------|---------------|
| Graphhopper | `israelhikingmap/graphhopper` (OSM routing) | Real road distance matrix | New service in docker-compose.dev.yml + Andalucía OSM PBF |

### Supporting (frontend)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| expo-image-picker | ~17.0.10 | Camera/gallery image selection for OCR | Installed in package.json; import commented out in OCRScreen.tsx — uncomment |
| axios | ^1.7.9 | HTTP client with JWT interceptors | Already in use across screens |

---

## Architecture Patterns

### Recommended Project Structure for F5

```
backend/apps/
├── scraping/
│   ├── tasks.py          # replace stub with real CrawlerProcess logic
│   ├── spiders/          # NEW: mercadona.py, carrefour.py, lidl.py, dia.py
│   └── pipeline.py       # NEW: price upsert pipeline (Price model writes)
│
├── optimizer/
│   ├── models.py         # NEW: OptimizationResult model
│   ├── serializers.py    # NEW: request + response serializers
│   ├── views.py          # NEW: OptimizeView (APIView)
│   ├── services/
│   │   ├── distance.py   # NEW: Graphhopper matrix client
│   │   └── solver.py     # NEW: OR-Tools TSP wrapper + scoring
│   └── urls.py           # EXTEND: add /optimize/ route
│
├── ocr/
│   ├── views.py          # NEW: OCRScanView
│   ├── services.py       # NEW: pytesseract + thefuzz matching
│   └── urls.py           # EXTEND: add /scan/ route
│
└── assistant/
    ├── views.py          # NEW: AssistantChatView
    ├── services.py       # NEW: Anthropic proxy + guardrails
    └── urls.py           # EXTEND: add /chat/ route

scraping/bargain_scraping/spiders/
├── mercadona.py          # JSON API spider (requests, no browser)
├── carrefour.py          # Playwright spider
├── lidl.py               # Playwright spider
└── dia.py                # Playwright spider

frontend/src/api/
├── optimizerService.ts   # NEW: POST /optimizer/optimize/
├── ocrService.ts         # NEW: POST /ocr/scan/ (multipart)
└── assistantService.ts   # NEW: POST /assistant/chat/
```

### Pattern 1: OR-Tools TSP Solver

**What:** Use `pywrapcp.RoutingModel` with a custom arc cost callback that encodes the multicriteria score.
**When to use:** After building a distance/time matrix via Graphhopper, normalize values, apply user weights, feed as arc costs.

```python
# Source: verified live in Docker — ortools 9.15.6755
from ortools.constraint_solver import pywrapcp, routing_enums_pb2

def solve_route(distance_matrix: list[list[float]], time_matrix: list[list[float]],
                price_savings: list[float], weights: dict, max_stops: int) -> list[int]:
    n = len(distance_matrix)
    manager = pywrapcp.RoutingIndexManager(n, 1, 0)  # n locations, 1 vehicle, depot=0
    routing = pywrapcp.RoutingModel(manager)

    def arc_cost(from_idx, to_idx):
        from_node = manager.IndexToNode(from_idx)
        to_node = manager.IndexToNode(to_idx)
        # Lower is better for OR-Tools (minimization problem)
        dist_score = weights["distancia"] * distance_matrix[from_node][to_node]
        time_score = weights["tiempo"] * time_matrix[from_node][to_node]
        price_bonus = weights["precio"] * price_savings[to_node]
        return int((dist_score + time_score - price_bonus) * 1000)

    cb_idx = routing.RegisterTransitCallback(arc_cost)
    routing.SetArcCostEvaluatorOfAllVehicles(cb_idx)

    # Enforce max stops (capacity constraint)
    def count_callback(from_idx, to_idx):
        return 1
    count_idx = routing.RegisterTransitCallback(count_callback)
    routing.AddDimension(count_idx, 0, max_stops, True, "stop_count")

    params = pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    params.time_limit.seconds = 5  # Hard limit for API response time

    solution = routing.SolveWithParameters(params)
    if not solution:
        return []
    route, index = [], routing.Start(0)
    while not routing.IsEnd(index):
        route.append(manager.IndexToNode(index))
        index = solution.Value(routing.NextVar(index))
    return route
```

### Pattern 2: Graphhopper Distance Matrix

**What:** Call Graphhopper's `/matrix` endpoint to get road distances and travel times between N points.
**When to use:** After filtering candidate stores, before running OR-Tools.

```python
# Source: Graphhopper REST API (see graphhopper.com/api-1/docs/routing/)
import requests

def get_distance_matrix(
    points: list[tuple[float, float]],
    graphhopper_url: str = "http://graphhopper:8989"
) -> tuple[list[list[float]], list[list[float]]]:
    """Returns (distance_matrix_km, time_matrix_minutes)."""
    payload = {
        "from_points": [[lat, lng] for lat, lng in points],
        "to_points": [[lat, lng] for lat, lng in points],
        "out_arrays": ["distances", "times"],
        "vehicle": "car",
    }
    resp = requests.post(f"{graphhopper_url}/matrix", json=payload, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    dist_km = [[d / 1000 for d in row] for row in data["distances"]]
    time_min = [[t / 60 for t in row] for row in data["times"]]
    return dist_km, time_min
```

**Graphhopper Docker Compose service:**
```yaml
graphhopper:
  image: israelhikingmap/graphhopper:latest
  container_name: bargain-graphhopper
  ports:
    - "8989:8989"
  volumes:
    - ./graphhopper-data:/data
  command: >
    --url https://download.geofabrik.de/europe/spain/andalucia-latest.osm.pbf
    --host 0.0.0.0 --port 8989
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8989/health"]
    interval: 30s
    timeout: 10s
    retries: 10
    start_period: 120s
```

**Note:** On first start, Graphhopper downloads the OSM PBF (~120 MB for Andalucía) and builds a routing graph (~2–5 min). Subsequent starts use the cached graph. The `graphhopper-data/` volume must persist across container restarts.

**Fallback (when Graphhopper is unavailable):** Use PostGIS ST_Distance for straight-line haversine. The service layer should degrade gracefully with a logged warning rather than failing the optimizer request entirely.

### Pattern 3: pytesseract OCR with Pre-Processing

**What:** Pre-process the uploaded image (resize, grayscale, threshold) with Pillow before passing to pytesseract for better accuracy on receipt photos.
**When to use:** Every `/ocr/scan/` request.

```python
# Source: pytesseract docs + Tesseract 5.5 verified in Docker (eng + spa)
import pytesseract
from PIL import Image, ImageFilter, ImageOps
import io

def extract_text_from_image(image_bytes: bytes, lang: str = "spa+eng") -> str:
    image = Image.open(io.BytesIO(image_bytes)).convert("L")  # grayscale
    image = ImageOps.autocontrast(image)
    image = image.filter(ImageFilter.SHARPEN)
    # Tesseract config: PSM 6 = assume a uniform block of text (good for receipts)
    config = "--psm 6 --oem 3"
    return pytesseract.image_to_string(image, lang=lang, config=config)
```

**thefuzz matching pattern:**
```python
from thefuzz import fuzz
from apps.products.models import Product

def match_products(raw_lines: list[str], threshold: int = 80) -> list[dict]:
    products = list(Product.objects.filter(is_active=True).values("id", "name"))
    results = []
    for line in raw_lines:
        if not line.strip():
            continue
        best_score, best_product = 0, None
        for p in products:
            score = fuzz.token_sort_ratio(line.upper(), p["name"].upper())
            if score > best_score:
                best_score, best_product = score, p
        item = {"raw_text": line, "confidence": best_score / 100, "quantity": 1}
        if best_score >= threshold and best_product:
            item["matched_product_id"] = best_product["id"]
            item["matched_product_name"] = best_product["name"]
        results.append(item)
    return results
```

### Pattern 4: Anthropic Messages API (SDK 0.85.0)

**What:** Backend proxy that prepends a system prompt, truncates history to last 10 turns, and forwards to Claude API.
**When to use:** Every `/assistant/chat/` request.

```python
# Source: anthropic 0.85.0 verified in Docker
import anthropic
from django.conf import settings

SYSTEM_PROMPT = """Eres BargAIn, un asistente de compra inteligente para España.
Tu única función es ayudar a los usuarios con: comparación de precios de productos,
sugerencias para su lista de la compra y recetas económicas.
Si el usuario pregunta algo fuera de estos temas, responde amablemente:
"Soy un asistente de compras. ¿Puedo ayudarte con tu lista de la compra?"
Responde siempre en español. Sé conciso y útil."""

def chat_with_assistant(messages: list[dict]) -> str:
    # Truncate to last 10 turns (20 messages = 10 user + 10 assistant)
    truncated = messages[-20:] if len(messages) > 20 else messages
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=truncated,
    )
    return response.content[0].text
```

### Pattern 5: Scrapy Spider inside Celery Task

**What:** Run Scrapy spiders programmatically from a Celery task using `CrawlerProcess`.
**When to use:** Each `run_spider` Celery task invocation from Celery Beat.

```python
# Source: Scrapy docs — CrawlerProcess for programmatic invocation
import multiprocessing
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings

SPIDER_MAP = {
    "mercadona": "bargain_scraping.spiders.mercadona.MercadonaSpider",
    "carrefour": "bargain_scraping.spiders.carrefour.CarrefourSpider",
    "lidl": "bargain_scraping.spiders.lidl.LidlSpider",
    "dia": "bargain_scraping.spiders.dia.DiaSpider",
}

def _run_spider_process(spider_cls_path: str):
    """Run in a subprocess to avoid Scrapy reactor restart issues with Celery."""
    settings = get_project_settings()
    process = CrawlerProcess(settings)
    # Import spider class dynamically
    module, cls_name = spider_cls_path.rsplit(".", 1)
    import importlib
    spider_cls = getattr(importlib.import_module(module), cls_name)
    process.crawl(spider_cls)
    process.start()

@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def run_spider(self, spider_name: str) -> dict:
    """Run a Scrapy spider in a subprocess (avoids Twisted reactor conflicts)."""
    spider_path = SPIDER_MAP.get(spider_name)
    if not spider_path:
        raise ValueError(f"Unknown spider: {spider_name}")
    p = multiprocessing.Process(target=_run_spider_process, args=(spider_path,))
    p.start()
    p.join(timeout=3600)  # 1h max per spider run
    if p.exitcode != 0:
        raise self.retry(exc=RuntimeError(f"Spider {spider_name} failed (exit {p.exitcode})"))
    return {"status": "ok", "spider": spider_name}
```

**Critical:** Scrapy uses Twisted's reactor. Celery also has its own event loop. Running `CrawlerProcess` directly in a Celery task worker thread causes reactor-already-started errors. The subprocess pattern (`multiprocessing.Process`) is the standard workaround.

### Pattern 6: Mercadona JSON API Spider

**What:** Mercadona exposes a semi-official REST API at `https://tienda.mercadona.es/api/` — no browser needed.
**When to use:** The `mercadona` spider — pure `requests` HTTP calls.

```python
# Source: community documented, stable since 2021
import requests
import scrapy

class MercadonaSpider(scrapy.Spider):
    name = "mercadona"
    BASE_URL = "https://tienda.mercadona.es/api/categories/"

    def start_requests(self):
        yield scrapy.Request(self.BASE_URL, callback=self.parse_categories,
                             headers={"Accept": "application/json"})

    def parse_categories(self, response):
        for cat in response.json()["results"]:
            yield scrapy.Request(
                f"{self.BASE_URL}{cat['id']}/",
                callback=self.parse_category
            )

    def parse_category(self, response):
        for product in response.json().get("categories", []):
            for item in product.get("products", []):
                yield {
                    "name": item["display_name"],
                    "price": float(item["price_instructions"]["unit_price"]),
                    "source": "scraping",
                    "store_chain": "mercadona",
                }
```

### Anti-Patterns to Avoid

- **Running CrawlerProcess directly in Celery worker:** Causes Twisted reactor restart error. Use `multiprocessing.Process` subprocess.
- **Calling Graphhopper synchronously on every optimize request without caching:** A 4-stop route requires a 5x5 matrix call. Cache distance matrices for (store_set, user_location) in Redis with a 6h TTL.
- **Loading all Product.objects into memory for fuzzy matching on each OCR request:** Filter to `is_active=True` products only; consider caching product names list in memory or Redis.
- **Using `client.messages.create()` without a timeout:** Anthropic requests can stall. Set `timeout=30` in the client constructor.
- **Not normalizing OR-Tools arc costs to integers:** OR-Tools arc costs must be integers. Multiply floats by 1000 before casting to int.
- **Playwright spiders without `--no-sandbox` flag in Docker:** Chromium in Docker requires `--no-sandbox` launch argument.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TSP route optimization | Custom greedy algorithm | `ortools.constraint_solver.pywrapcp` | OR-Tools handles permutations, time limits, and constraint propagation correctly; greedy gives suboptimal routes |
| Road distance matrix | Straight-line haversine custom calc | Graphhopper `/matrix` endpoint | Haversine ignores roads, one-way streets, road networks — giving unrealistic times |
| Fuzzy text matching | Levenshtein loop with custom threshold | `thefuzz.fuzz.token_sort_ratio` | token_sort_ratio handles word-order differences (receipt text scrambles order); already installed |
| OCR text extraction | Custom image parsing | `pytesseract.image_to_string` | Tesseract 5 LSTM engine handles varied fonts, receipt layouts; reinventing this is a multi-month project |
| LLM API integration | Direct HTTP to Anthropic | `anthropic.Anthropic.messages.create()` | SDK handles retries, streaming, error parsing, auth header management |
| Rate limiting assistant endpoint | Custom counter in Redis | DRF `UserRateThrottle` (already global) + custom throttle class | DRF throttle is already configured globally; adding a tighter assistant-specific throttle is 5 lines |

**Key insight:** All five key libraries are already installed and verified working in the Docker container. The risk in this phase is integration complexity, not library selection.

---

## Runtime State Inventory

> This phase adds new models and Celery Beat schedule entries. No existing data needs migration.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Celery Beat `PeriodicTask` table in DB already has `scrape-mercadona-daily` and `scrape-carrefour-daily` entries from base.py | Add `scrape-lidl-daily` and `scrape-dia-daily` to `CELERY_BEAT_SCHEDULE` in base.py; Django Celery Beat will auto-sync on next startup |
| Live service config | No external services with embedded names | None |
| OS-registered state | None — all services run in Docker containers | None |
| Secrets/env vars | `ANTHROPIC_API_KEY` must be added to `.env` (currently absent); `GRAPHHOPPER_URL` optional (defaults to `http://graphhopper:8989`) | Add to `.env.example` and `.env`; document in settings/base.py |
| Build artifacts | Playwright browsers NOT installed in Docker image (`/root/.cache/ms-playwright/` does not exist) | Add `RUN playwright install chromium --with-deps` to `Dockerfile.dev` |

---

## Common Pitfalls

### Pitfall 1: Playwright Browsers Not Installed in Docker
**What goes wrong:** `playwright.sync_api.Error: Executable doesn't exist` when Carrefour/Lidl/DIA spiders try to launch Chromium.
**Why it happens:** The Playwright Python package installs only the Python bindings; browser binaries require a separate `playwright install` command. The current `Dockerfile.dev` does not include this step (confirmed: `/root/.cache/ms-playwright/` does not exist in the running container).
**How to avoid:** Add to `Dockerfile.dev` before the `EXPOSE` line:
```dockerfile
RUN playwright install chromium --with-deps
```
**Warning signs:** `OSError: [Errno 2] No such file or directory: '.../chromium*/chrome'` in spider logs.

### Pitfall 2: Scrapy Twisted Reactor Conflict with Celery
**What goes wrong:** `ReactorNotRestartable` exception when `run_spider` Celery task is called a second time in the same worker process.
**Why it happens:** Scrapy's `CrawlerProcess.start()` calls `reactor.run()`, which sets a "already started" flag. Celery workers are long-lived processes that execute multiple tasks.
**How to avoid:** Always run the spider in a `multiprocessing.Process` subprocess (see Pattern 5). The subprocess has its own fresh Python interpreter with no reactor state.
**Warning signs:** Second spider run in same worker raises `ReactorNotRestartable`.

### Pitfall 3: Graphhopper Cold-Start Delay
**What goes wrong:** First request to Graphhopper after container start returns a 503 or timeout while the routing graph is being built from the OSM PBF.
**Why it happens:** Graphhopper needs 2–5 minutes to import and index the Andalucía OSM extract on first start. Subsequent starts re-use the cached graph from the Docker volume (~30s).
**How to avoid:** Set `start_period: 120s` in the healthcheck (documented in Pattern 2). In the optimizer service, implement a retry loop with exponential backoff (max 3 retries, 2s initial delay) when calling Graphhopper, and fall back to PostGIS haversine if all retries fail.
**Warning signs:** `requests.exceptions.ConnectionError` or HTTP 503 from `http://graphhopper:8989/matrix` immediately after `docker compose up`.

### Pitfall 4: OR-Tools Requires Integer Arc Costs
**What goes wrong:** `TypeError` or wrong route because float arc costs are passed.
**Why it happens:** OR-Tools routing arc cost callbacks must return Python `int`. Float values are silently truncated or cause type errors depending on the version.
**How to avoid:** Always multiply float scores by a scale factor (1000 or 10000) and cast with `int()` before returning from the arc cost callback.
**Warning signs:** All routes collapse to 0-distance or single-stop solutions.

### Pitfall 5: OCR Returns Empty String for Dark/Low-Contrast Images
**What goes wrong:** `pytesseract.image_to_string()` returns empty string or garbage for real receipt photos taken in poor lighting.
**Why it happens:** Receipts taken with a mobile phone often have varying contrast, rotation, and shadow. Without pre-processing, Tesseract LSTM engine produces poor results.
**How to avoid:** Apply the Pillow pre-processing pipeline (grayscale → autocontrast → sharpen → PSM 6) as shown in Pattern 3. Consider also deskewing with `ImageOps.fit`.
**Warning signs:** `confidence` values near 0 for all items; `raw_text` contains only special characters.

### Pitfall 6: Anthropic `claude-haiku-4-5-20251001` Model ID
**What goes wrong:** API call fails with `model_not_found` error.
**Why it happens:** Anthropic model IDs are versioned strings. Using a wrong or deprecated model ID causes a 404 from the API.
**How to avoid:** Use `"claude-haiku-4-5-20251001"` exactly as specified in D-18. Store in `settings.py` as `ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"` to make it easy to update.
**Warning signs:** `anthropic.BadRequestError: model_not_found`.

### Pitfall 7: expo-image-picker Permissions on Android
**What goes wrong:** `expo-image-picker` returns null or throws permission denied on Android.
**Why it happens:** Android requires explicit `CAMERA` and `READ_EXTERNAL_STORAGE` permission requests before accessing the camera or gallery.
**How to avoid:** Call `ImagePicker.requestMediaLibraryPermissionsAsync()` before `ImagePicker.launchImageLibraryAsync()`. Use `requestCameraPermissionsAsync()` before `launchCameraAsync()`. Both must be called from the screen's effect or button handler.
**Warning signs:** `null` result from `launchCameraAsync` without error on Android.

---

## Code Examples

### Multicriteria Score Normalization

```python
# Source: CLAUDE.md scoring formula + normalization standard practice
def normalize(values: list[float]) -> list[float]:
    """Min-max normalization to [0, 1]."""
    min_v, max_v = min(values), max(values)
    if max_v == min_v:
        return [0.5] * len(values)
    return [(v - min_v) / (max_v - min_v) for v in values]

def compute_scores(
    savings: list[float],       # price savings vs. buying everything at worst store
    distances: list[float],     # total route distance (km)
    times: list[float],         # total route time (minutes)
    w_precio: float = 0.5,
    w_distancia: float = 0.3,
    w_tiempo: float = 0.2,
) -> list[float]:
    """
    Score = w_precio * ahorro_normalizado
          - w_distancia * distancia_extra_normalizada
          - w_tiempo * tiempo_extra_normalizado
    """
    norm_savings = normalize(savings)
    norm_dist = normalize(distances)
    norm_time = normalize(times)
    return [
        w_precio * s - w_distancia * d - w_tiempo * t
        for s, d, t in zip(norm_savings, norm_dist, norm_time)
    ]
```

### DRF Rate Throttle for Assistant

```python
# Source: DRF docs — custom throttle rate
from rest_framework.throttling import UserRateThrottle

class AssistantRateThrottle(UserRateThrottle):
    scope = "assistant"

# In settings/base.py — add to DEFAULT_THROTTLE_RATES:
# "assistant": "20/hour"
# In AssistantChatView:
# throttle_classes = [AssistantRateThrottle]
```

### OptimizationResult Model (from CLAUDE.md spec)

```python
# Derived from CLAUDE.md data model spec
from django.contrib.gis.db import models as gis_models
from django.db import models

class OptimizationResult(models.Model):
    class Mode(models.TextChoices):
        PRICE = "price", "Precio"
        TIME = "time", "Tiempo"
        BALANCED = "balanced", "Equilibrado"

    shopping_list = models.ForeignKey("shopping_lists.ShoppingList", on_delete=models.CASCADE)
    user_location = gis_models.PointField(srid=4326)
    max_distance_km = models.FloatField(default=10.0)
    optimization_mode = models.CharField(max_length=20, choices=Mode.choices, default=Mode.BALANCED)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_distance_km = models.FloatField()
    estimated_time_minutes = models.IntegerField()
    route_data = models.JSONField()  # ordered stops list
    created_at = models.DateTimeField(auto_now_add=True)
```

### OCR Endpoint View Pattern

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from apps.core.exceptions import OCRProcessingError

class OCRScanView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"success": False, "error": {"code": "NO_IMAGE", "message": "No image provided"}}, status=400)
        try:
            items = ocr_service.scan_and_match(image_file.read())
            return Response({"success": True, "data": items})
        except Exception as exc:
            raise OCRProcessingError() from exc
```

### Frontend OCR Service with multipart/form-data

```typescript
// Source: axios multipart pattern — frontend/src/api/
import { apiClient } from "./client";

export async function scanReceipt(imageUri: string): Promise<OCRItem[]> {
  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    name: "receipt.jpg",
    type: "image/jpeg",
  } as any);
  const response = await apiClient.post("/ocr/scan/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.data;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pywraprouting` module name | `pywrapcp` (unified CP-SAT + routing) | OR-Tools 9.x | `from ortools.constraint_solver import pywraprouting` fails — use `pywrapcp` |
| `CrawlerProcess` direct in thread | subprocess via `multiprocessing.Process` | Scrapy 2.x + Celery 5 | Avoids `ReactorNotRestartable` error in long-lived workers |
| Anthropic `completions` API | `client.messages.create()` | anthropic SDK 0.5+ | `completions` is legacy; `messages` is the current API for all Claude models |
| Tesseract 4 LSTM | Tesseract 5 LSTM (improved accuracy) | Tesseract 5.0 (2021) | Better accuracy on printed text including receipts |

**Deprecated/outdated:**
- `anthropic.completions.create()`: Legacy API, still present in SDK 0.85 but not for Haiku model — use `messages.create()`.
- `ortools.constraint_solver.pywraprouting`: This module name does not exist in OR-Tools 9.15. The correct module is `pywrapcp`.

---

## Open Questions

1. **Mercadona API stability**
   - What we know: `tienda.mercadona.es/api/categories/` has been stable since 2021 and is used by multiple open-source projects.
   - What's unclear: Mercadona could add authentication headers or rate limiting without notice.
   - Recommendation: Implement with a fallback that marks the task as `failed` with a Sentry alert rather than crashing, so the scraper degrades gracefully.

2. **Graphhopper OSM data freshness for Andalucía demo**
   - What we know: `andalucia-latest.osm.pbf` from Geofabrik is ~120 MB, updated daily.
   - What's unclear: Whether the TFG defense environment will have internet access to download the PBF, or if it needs to be pre-downloaded into the Docker volume.
   - Recommendation: Pre-download the PBF and commit it to a `.gitignore`-d `graphhopper-data/` directory, or include a `make graphhopper-init` Makefile target that downloads it.

3. **Playwright spider robustness for Carrefour/Lidl/DIA**
   - What we know: These sites use JavaScript rendering that requires a real browser.
   - What's unclear: Anti-bot measures (CAPTCHA, rate limiting, user-agent detection) may block automated scrapers.
   - Recommendation: Add randomized delays between requests, rotate user-agents, and use `playwright_install chromium --with-deps` in the Dockerfile. If a spider is blocked, degrade gracefully with a retry task rather than failing the Beat schedule.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | All backend services | ✓ | 29.2.1 | — |
| bargain-backend container | Python libraries | ✓ | Running | — |
| bargain-celery container | Celery tasks | ✓ | Running | — |
| bargain-celery-beat container | Scheduled scraping | ✓ | Running | — |
| bargain-redis container | Celery broker | ✓ | redis:7-alpine healthy | — |
| PostgreSQL+PostGIS | Data storage | ✓ | postgis:16-3.4 | — |
| Tesseract OCR (binary) | OCR pipeline | ✓ | 5.5.0 (eng+spa) | — |
| pytesseract | OCR Python wrapper | ✓ | >=0.3.13 | — |
| OR-Tools (pywrapcp) | Optimizer | ✓ | 9.15.6755 | — |
| anthropic SDK | LLM assistant | ✓ | 0.85.0 | — |
| thefuzz | Fuzzy product matching | ✓ | >=0.22 | — |
| Scrapy | Spider framework | ✓ | 2.14.2 | — |
| Playwright (Python) | JS-heavy spiders | ✓ (package) | >=1.44 | — |
| **Playwright Chromium (binary)** | Carrefour/Lidl/DIA spiders | **✗ NOT INSTALLED** | — | Add `RUN playwright install chromium --with-deps` to Dockerfile.dev |
| Graphhopper | Real road distances | ✗ NOT CONFIGURED | — | PostGIS ST_Distance haversine (less accurate) |
| expo-image-picker | OCR screen camera access | ✓ (in package.json) | ~17.0.10 | — |
| ANTHROPIC_API_KEY env var | LLM assistant | **UNKNOWN** (not in .env.example) | — | Endpoint returns 503 AssistantUnavailable if missing |

**Missing dependencies with no fallback:**
- ANTHROPIC_API_KEY must be set in `.env` for the assistant to work — no fallback that preserves the feature.

**Missing dependencies with viable fallback:**
- Playwright Chromium binary: Carrefour/Lidl/DIA spiders will fail until added to Dockerfile.dev. Mercadona spider (JSON API) works without it.
- Graphhopper: Haversine via PostGIS ST_Distance is a viable fallback for the demo, though road distances will be less accurate.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest 8.x + pytest-django 4.x |
| Config file | `backend/pytest.ini` |
| Quick run command | `docker exec bargain-backend pytest tests/unit/test_optimizer.py tests/unit/test_ocr.py tests/unit/test_assistant.py -v --tb=short -x` |
| Full suite command | `docker exec bargain-backend pytest --cov=apps --cov-report=term -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OPT-01 | Multicriteria score function returns correct ranking | unit | `pytest tests/unit/test_optimizer.py::test_score_function -x` | ❌ Wave 0 |
| OPT-02 | Graphhopper client returns distance/time matrix | unit (mocked) | `pytest tests/unit/test_optimizer.py::test_distance_matrix -x` | ❌ Wave 0 |
| OPT-03 | OptimizationResult created and returned inline | integration | `pytest tests/integration/test_optimizer_api.py -x` | ❌ Wave 0 |
| OPT-04 | max_stops param respected (route has <= N stops) | unit | `pytest tests/unit/test_optimizer.py::test_max_stops -x` | ❌ Wave 0 |
| OCR-01 | /ocr/scan/ returns items list from uploaded image | integration | `pytest tests/integration/test_ocr_api.py -x` | ❌ Wave 0 |
| OCR-02 | Fuzzy matching returns matched_product_id when score >= 80% | unit | `pytest tests/unit/test_ocr.py::test_fuzzy_matching -x` | ❌ Wave 0 |
| LLM-01 | /assistant/chat/ returns assistant response (mocked Anthropic) | integration | `pytest tests/integration/test_assistant_api.py -x` | ❌ Wave 0 |
| LLM-02 | Rate limiting throttles after N requests | integration | `pytest tests/integration/test_assistant_api.py::test_rate_limit -x` | ❌ Wave 0 |
| SCRAP-01 | run_spider Celery task calls spider subprocess without error | unit (mocked) | `pytest tests/unit/test_scraping.py::test_run_spider_task -x` | ❌ Wave 0 |
| D-09 | 404 + OPTIMIZER_NO_STORES_IN_RADIUS when no stores in radius | unit | `pytest tests/unit/test_optimizer.py::test_no_stores_error -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `docker exec bargain-backend pytest tests/unit/ -x -q` (unit tests only, fast)
- **Per wave merge:** `docker exec bargain-backend pytest tests/ -v --tb=short`
- **Phase gate:** Full suite + coverage >= 80% before `/gsd:verify-work`

### Wave 0 Gaps
All test files are missing — they must be created as part of Wave 0:
- [ ] `tests/unit/test_optimizer.py` — covers OPT-01, OPT-02, OPT-04, D-09
- [ ] `tests/unit/test_ocr.py` — covers OCR-02
- [ ] `tests/unit/test_scraping.py` — covers SCRAP-01
- [ ] `tests/integration/test_optimizer_api.py` — covers OPT-03
- [ ] `tests/integration/test_ocr_api.py` — covers OCR-01
- [ ] `tests/integration/test_assistant_api.py` — covers LLM-01, LLM-02
- [ ] `tests/factories.py` already exists — extend with `OptimizationResultFactory`, `OCRResultFactory`

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 5 |
|-----------|-------------------|
| PEP 8, max 99 chars, Ruff linter | All Python files in optimizer/, ocr/, assistant/, scraping/ must pass `ruff check` |
| Type hints required on public functions | All service functions and views must have type annotations |
| Google-style docstrings | All classes and public functions need docstrings |
| pytest coverage >= 80% | Six new test files needed (see Wave 0 Gaps) |
| `{ success, data/error }` response format | All four endpoints use the global `bargain_exception_handler` — raise BargainAPIException subclasses |
| JWT authentication on all endpoints | All views must have `permission_classes = [IsAuthenticated]` |
| Conventional Commits in Spanish | Commit messages: `feat(optimizer): implementar algoritmo TSP (F5-XX)` |
| NEVER hardcode secrets | `ANTHROPIC_API_KEY` via `os.environ.get()` in settings — never inline |
| Backend runs in Docker; frontend runs natively on host | Graphhopper service URL: `http://graphhopper:8989` inside Docker; frontend calls `http://localhost:8000` |
| Celery Beat schedules in base.py | Lidl and DIA entries added to `CELERY_BEAT_SCHEDULE` dict in base.py |

---

## Sources

### Primary (HIGH confidence)
- OR-Tools 9.15 live verification — `pywrapcp.RoutingModel`, `RoutingIndexManager`, TSP example run in container
- Tesseract 5.5.0 live verification — binary at `/usr/bin/tesseract`, langs: eng, spa, osd confirmed
- anthropic SDK 0.85.0 live verification — `client.messages` resource confirmed in container
- Scrapy 2.14.2 live verification — confirmed in container
- thefuzz live verification — confirmed in container
- `backend/config/settings/base.py` — Celery Beat schedule, INSTALLED_APPS, REST_FRAMEWORK config
- `backend/apps/core/exceptions.py` — exception hierarchy (OCRProcessingError, AssistantUnavailable confirmed)
- `backend/apps/prices/models.py` — Price model source field
- `backend/apps/stores/models.py` — Store PostGIS model
- `backend/Dockerfile.dev` — confirms Tesseract installed, Playwright NOT installed
- `docker-compose.dev.yml` — service topology (no Graphhopper yet)
- `config/urls.py` — URL prefixes `/api/v1/optimize/`, `/api/v1/ocr/`, `/api/v1/assistant/` already registered

### Secondary (MEDIUM confidence)
- Mercadona tienda.mercadona.es/api/ — community-documented semi-official API, stable since 2021; multiple open-source projects use it
- Graphhopper REST API `/matrix` endpoint — official Graphhopper documentation
- israelhikingmap/graphhopper Docker image — 13 stars on Docker Hub, actively maintained for OSM routing

### Tertiary (LOW confidence — flag for validation)
- Playwright `--no-sandbox` requirement in Docker — standard pattern for headless Chromium, but exact flags may vary by Chromium version
- Mercadona anti-scraping measures — risk of future API changes without notice; not verifiable until spider runs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified live in Docker container
- Architecture: HIGH — patterns derived from verified library APIs and existing codebase conventions
- Pitfalls: HIGH — Playwright/reactor pitfalls verified by direct probing (browsers not installed, reactor test)
- Graphhopper config: MEDIUM — image name and API pattern from official docs; not yet deployed

**Research date:** 2026-03-25
**Valid until:** 2026-06-25 (stable libraries; Mercadona API is LOW-confidence — verify before executing spider wave)
