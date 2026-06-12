# Phase 7: Testing Final, Deploy, Memoria y Defensa - Research

**Researched:** 2026-04-08
**Domain:** Playwright E2E, Render deploy, ORS API, iOS GitHub Actions build, LaTeX TFG template
**Confidence:** HIGH (codebase verified) / MEDIUM (ORS API format from docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** NFR-02 (disponibilidad 99% staging): Render uptime screenshot. No monitorización externa.
- **D-02:** NFR-04 (usabilidad WCAG 2.1 AA + 3 taps): Spot-check Lighthouse Accessibility en 3 flujos web. No audit WCAG completo.
- **D-03:** NFR-05 (escalabilidad 10k usuarios): Justificación arquitectural Celery workers. Sin load test real.
- **D-04:** Deploy Render free tier — Web Service (Django/Gunicorn 3w) + PostgreSQL + Redis + Celery worker + Celery beat. Graphhopper NO se despliega. Optimizer usa OpenRouteService API (`ORS_API_KEY`).
- **D-05:** Demo móvil iPhone via GitHub Actions (`macos-latest`) + xcodebuild + Sideloadly. Re-sideload 1-2 días antes de la defensa.
- **D-06:** Web companion NO se despliega a staging. Se usa localmente para Playwright y grabación de demo.
- **D-07:** 4 flujos Playwright: auth completo, lista→optimizar→ruta, OCR ticket→lista, business portal.
- **D-08:** Playwright apunta al web companion Vite+React (`frontend/web/`). Backend puede ser Render o Docker local.
- **D-09:** Flujos nativos móvil (GPS, cámara física) cubren con UAT manual.
- **D-10:** Capítulos pendientes en `docs/memoria/`: 08 (F5/F6), 09 (capturas), 10 (resultados E2E + NFR), 11 (eliminar referencias a F5/F6 como pendiente).
- **D-13:** Resultados cuantitativos se integran en Cap. 10 (no capítulo separado).
- **D-14:** Memoria entregada en PDF con portada oficial ETSII. Contenido Markdown → LaTeX con plantilla `memoriaTFG/Plantilla TfG/` (clase `pclass.cls`).
- **D-15:** Formato ETSII: Arial/Helvetica 11pt, interlineado 1.0 o 1.5, márgenes 2.5 cm sup/inf, 3 cm laterales. Idioma español.
- **D-16:** Entrega requiere: PDF con portada oficial + Declaración de autoría + Presentación (slides).
- **D-17:** Tribunal 2-3 profesores; calificación 40% tutor + 60% tribunal.
- **D-18:** Slides: Portada, Motivación, Problema+Objetivos+Requisitos, Solución+Diseño+Arquitectura, Resultados, Conclusiones.
- **D-19:** Demo grabada (no en vivo). Duración 20-30 min + preguntas. Vídeo: app iPhone + web companion.

### Claude's Discretion

- Herramienta de grabación para el vídeo de demo.
- Número exacto de diapositivas y balance de tiempo por sección.
- Orden de ejecución de los tests Playwright.

### Deferred Ideas (OUT OF SCOPE)

- EAS Build (alternativa de respaldo si ios-build.yml falla)
- Deploy web companion a staging
- Load test con Locust/k6 (NFR-05 cubre con documentación arquitectural)
- WCAG audit completo
</user_constraints>

---

## Project Constraints (from CLAUDE.md)

| Directive | Detail |
|-----------|--------|
| Backend tests | pytest + pytest-django, cobertura mínima 80%, ejecutar en Docker |
| Linter backend | Ruff (ruff check + ruff format) |
| Type hints | Obligatorios en funciones públicas Python |
| Docstrings | Google style en clases y funciones públicas |
| Commits | Conventional Commits en español + ID tarea |
| Frontend web | Vite + React + Ant Design en `frontend/web/` |
| Entorno dev | Modelo híbrido: backend Docker, frontend nativo en host |
| NO dockerizar frontend | Docker volúmenes en Windows rompen HMR |
| API responses | Siempre `{ success, data/error }` |

---

## 1. Playwright Setup State

### Current State: No Playwright installed, no E2E tests exist

**Verified findings:**

- No `playwright.config.ts` or `playwright.config.js` exists anywhere in the repo [VERIFIED: find command, no matches outside node_modules].
- `backend/tests/e2e/` directory exists but contains only `__init__.py` — no test files [VERIFIED: `backend/tests/e2e/__init__.py` is the only file].
- `frontend/web/` uses **Vitest** for unit tests (`vitest ^4.1.0` in `package.json`), not Playwright. Test files found: `src/__tests__/LoginPage.test.tsx`, `src/__tests__/UnverifiedGuard.test.tsx` [VERIFIED: `frontend/web/package.json`].
- Playwright is listed in `backend/requirements/base.txt` as `playwright>=1.44,<2.0` but **only for Scrapy** (scrapy-playwright middleware for headless scraping), not for E2E testing [VERIFIED: `backend/requirements/base.txt` line 27-28].

**What needs to be created from scratch:**

- `playwright.config.ts` at `frontend/web/playwright.config.ts`
- `frontend/web/e2e/` directory with 4 test files
- Playwright added as dev dependency to `frontend/web/package.json`
- `@playwright/test` package installation

**Web companion routes (Playwright target pages):** [VERIFIED: `frontend/web/src/App.tsx`]

| Route | Page Component | Auth Required |
|-------|---------------|---------------|
| `/` | LandingPage | No |
| `/login` | LoginPage | No |
| `/register` | RegisterPage | No |
| `/onboarding` | MerchantOnboardingPage | No |
| `/dashboard` | DashboardPage | Yes + verified business |
| `/prices` | PricesPage | Yes + verified business |
| `/products-upload` | ProductsUploadPage | Yes + verified business |
| `/promotions` | PromotionsPage | Yes + verified business |
| `/profile` | BusinessProfilePage | Yes + verified business |
| `/admin` | AdminApprovalPage | Yes (no business guard) |
| `/demo` | DemoPage | No |
| `/docs` | DocsPage | No |

**Auth mechanism:** Token stored in `localStorage` key `access_token`. `RequireAuth` guard at line 22 of `App.tsx` checks `localStorage.getItem('access_token')`.

**4 E2E flows to implement (D-07):**

1. **Auth flow** (`e2e/auth.spec.ts`): POST `/api/v1/auth/register/` → POST `/api/v1/auth/token/` → POST `/api/v1/auth/token/refresh/` → logout (clear localStorage). Route: `/register` → `/login` → `/dashboard` → logout.
2. **Lista → Optimizer → Ruta** (`e2e/optimizer.spec.ts`): Requires backend API, not testable purely via web companion UI (web companion is a business portal, not consumer app). **CRITICAL GAP:** The web companion does NOT have shopping list or optimizer pages — those are mobile-only screens. This flow cannot be driven through the web companion UI. It must be tested via direct API calls in the Playwright test (using `request` fixture), or the test must be reclassified as an API integration test in pytest.
3. **OCR ticket → lista** (`e2e/ocr.spec.ts`): Similarly, OCR upload is a mobile screen (`frontend/src/screens/`), not a web companion page. Same gap applies.
4. **Business portal** (`e2e/business.spec.ts`): Fully testable via web companion: `/register` → `/onboarding` (PYME registration) → admin `/admin` approve → PYME `/dashboard` (price visible).

**Gap summary for flows 2 and 3:** The web companion (`frontend/web/`) is a **business portal only** — it has no consumer-facing shopping list, optimizer, or OCR pages. Flows 2 and 3 as described in D-07 cannot be driven through a browser UI. Resolution options:
- Use Playwright `request` API to hit backend endpoints directly (HTTP-level E2E, not UI E2E).
- Or implement as pytest integration tests (already partially covered by `test_optimizer_api.py` and `test_ocr_api.py`).

**Playwright dev server config:** `vite.config.ts` uses `usePolling: true` for Windows filesystem compatibility (OneDrive path). Playwright `webServer` block must use `npm run dev` in `frontend/web/` and wait for port 5173.

### Installation command (to be added as Wave 0 task):
```bash
cd frontend/web && npm install --save-dev @playwright/test
npx playwright install --with-deps chromium
```

---

## 2. Render Deploy Config

### Service Architecture (D-04, from ADR-011)

5 Render services required:

| Render Service Type | Maps to | Command |
|---------------------|---------|---------|
| Web Service | Django API | `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 60` |
| PostgreSQL | Render Database | Managed — provides `DATABASE_URL` |
| Redis | Render Redis | Managed — provides `REDIS_URL` |
| Background Worker | Celery worker | `celery -A config worker -l info --concurrency 4` |
| Background Worker | Celery beat | `celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler` |

**No `nginx` service** — Render handles TLS termination. The `nginx` service in `docker-compose.yml` is local-only.

### Dockerfile for Render [VERIFIED: `backend/Dockerfile`]

`backend/Dockerfile` is production-ready:
- Base: `python:3.12-slim`
- Installs: `build-essential`, `gdal-bin`, `libgdal-dev`, `libgeos-dev`, `libproj-dev`
- Installs: `requirements/prod.txt` (gunicorn + whitenoise + base.txt)
- Build context: `./backend`

**Build root for Render:** `./backend` directory, `Dockerfile` (not `Dockerfile.dev`).

### Required Environment Variables

Collected from `config/settings/prod.py`, `config/settings/base.py` (inferred), and `.env.example`:

| Variable | Source | Required | Notes |
|----------|--------|----------|-------|
| `SECRET_KEY` | Django | CRITICAL | Long random string |
| `ALLOWED_HOSTS` | `prod.py` line 14 | CRITICAL | Render URL e.g. `bargain-api.onrender.com` |
| `DATABASE_URL` | Render managed | Auto-injected | `postgis://...` format needed |
| `REDIS_URL` | Render managed | Auto-injected | — |
| `DJANGO_SETTINGS_MODULE` | Docker compose | CRITICAL | `config.settings.prod` |
| `ORS_API_KEY` | ADR-011 | CRITICAL | New — does not exist in `.env.example` yet |
| `GOOGLE_MAPS_API_KEY` | `.env.example` | Required | Places enrichment |
| `GEMINI_API_KEY` | `.env.example` | Required | LLM assistant |
| `GOOGLE_CLOUD_VISION_API_KEY` | `.env.example` | Required | OCR |
| `CORS_ALLOWED_ORIGINS` | `.env.example` | Required | Include `http://localhost:5173` for local Playwright |
| `SENTRY_DSN` | `prod.py` | Optional | Error monitoring |
| `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | `.env.example` | Optional | Email notifications |
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | `.env.example` | Optional | Frontend only |

**CRITICAL GAP — `DATABASE_URL` format:** Render provides a PostgreSQL connection string in `postgresql://` format. Django PostGIS requires `postgis://` prefix. The `DATABASE_URL` may need a custom adapter or the `dj-database-url` library (already installed: `dj-database-url>=2.2` in `base.txt`) to handle the prefix swap. Verify `config/settings/base.py` uses `dj_database_url.parse()`.

**CRITICAL GAP — `SECURE_SSL_REDIRECT`:** `prod.py` line 21 sets `SECURE_SSL_REDIRECT = True`. Render terminates SSL at the load balancer and forwards HTTP internally. This setting will cause a redirect loop. Must add `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` to `prod.py`, or override for Render via env var.

### `make deploy-staging` current state [VERIFIED: `Makefile` lines 116-119]
```makefile
deploy-staging:
    @echo "Desplegando a staging..."
    docker compose build
    @echo "Configura las variables de entorno en Render y empuja la imagen."
```
This is a stub — it builds the image locally but does not push to Render. The actual deploy must use Render's GitHub integration (auto-deploy on push to `main`) or Render CLI (`render deploy`).

### Static files
`prod.py` configures whitenoise (`STATICFILES_STORAGE = CompressedManifestStaticFilesStorage`). Render Web Service must run `python manage.py collectstatic --noinput` as a pre-deploy command (Render supports a "Build Command" field).

---

## 3. ORS Integration Gap

### Current implementation [VERIFIED: `backend/apps/optimizer/services/distance.py`]

File: `backend/apps/optimizer/services/distance.py`

Function: `get_distance_matrix(points, graphhopper_url=None)` (lines 76-151)

**Current behavior:**
- Reads `GRAPHHOPPER_URL` setting (default: `http://graphhopper:8989`)
- Sends `POST {graphhopper_url}/matrix` with payload:
  ```json
  {
    "from_points": [[lng, lat], ...],
    "to_points": [[lng, lat], ...],
    "out_arrays": ["distances", "times"],
    "vehicle": "car"
  }
  ```
- Reads response: `data["distances"]` (meters → km) and `data["times"]` (seconds → minutes)
- Fallback: haversine `_fallback_matrices()` on `ConnectionError`, `Timeout`, `HTTPError`

### ORS Matrix API format [CITED: openrouteservice.org/dev/#/api-docs/v2/matrix/{profile}/post]

**Endpoint:** `POST https://api.openrouteservice.org/v2/matrix/driving-car`

**Headers required:**
```
Authorization: {ORS_API_KEY}
Content-Type: application/json
```

**Request payload:**
```json
{
  "locations": [[lng, lat], [lng, lat], ...],
  "metrics": ["distance", "duration"],
  "units": "km"
}
```

Note: ORS uses `locations` (not separate `from_points`/`to_points`). When `sources` and `destinations` are omitted, it computes the full N×N matrix (all-to-all), which is what the optimizer needs.

**Response structure:**
```json
{
  "durations": [[0, 1200.5, ...], ...],   // seconds (float)
  "distances": [[0, 5.2, ...], ...]        // km (float, if units="km")
}
```

Note: durations in seconds must still be converted to minutes (`/ 60`). Distances in km already if `units="km"` is set.

### Exact changes needed in `distance.py`

1. **Rename/add parameter:** Replace `graphhopper_url` with `ors_api_key=None` (or read from Django settings `ORS_API_KEY`).
2. **Change endpoint:** `POST https://api.openrouteservice.org/v2/matrix/driving-car`
3. **Change payload key:** `"from_points"/"to_points"` → `"locations"` (same `[lng, lat]` order — no change needed)
4. **Add `Authorization` header:** `headers={"Authorization": settings.ORS_API_KEY}`
5. **Change response parsing:**
   - `data["distances"]` stays the same key name but is now km (no `/1000` needed when `units="km"`)
   - `data["times"]` → `data["durations"]` (still seconds, still `/60`)
6. **Update settings:** Add `ORS_API_KEY = os.environ.get("ORS_API_KEY", "")` to `config/settings/base.py`
7. **Update `.env.example`:** Add `ORS_API_KEY=your-ors-api-key`

**Callers of `get_distance_matrix`:** The function is called from `backend/apps/optimizer/services/solver.py` which imports it via `from .distance import get_distance_matrix`. The function signature change is internal — callers pass `points` only; the routing backend URL/key is internal state. No changes needed in `solver.py` or `views.py`.

**Rate limit awareness (D-04):** ORS free tier allows 40 req/min, 2.000 req/day. Each Playwright E2E run of the optimizer flow sends 1 ORS request. Batch Playwright runs are safe. Production scraping tasks should not trigger optimizer calls.

---

## 4. iOS Build Workflow

### iOS directory status [VERIFIED: `frontend/app.json`]

`frontend/app.json` has iOS config block (lines 15-18):
```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.bargain.app"
}
```

**No `frontend/ios/` directory exists.** [VERIFIED: find command returned no `ios/` directory under `frontend/` outside node_modules.]

An Expo project without a pre-generated `ios/` folder requires `npx expo prebuild` to generate native code before `xcodebuild` can be used. Without prebuild, there is no `.xcworkspace` to build.

### Expo prebuild + xcodebuild sequence [ASSUMED — based on Expo documentation patterns]

```bash
# Step 1: Generate native iOS project
cd frontend
npx expo prebuild --platform ios --clean

# Step 2: Install CocoaPods dependencies
cd ios
pod install

# Step 3: Build unsigned .app archive
xcodebuild \
  -workspace BarGAIN.xcworkspace \
  -scheme BarGAIN \
  -configuration Release \
  -archivePath build/BarGAIN.xcarchive \
  CODE_SIGNING_ALLOWED=NO \
  archive

# Step 4: Export unsigned .ipa
xcodebuild \
  -exportArchive \
  -archivePath build/BarGAIN.xcarchive \
  -exportPath build/output \
  -exportOptionsPlist ExportOptions.plist
```

For Sideloadly with a free Apple ID, the `.ipa` must be **unsigned** (CODE_SIGNING_ALLOWED=NO). Sideloadly re-signs it during installation.

### ExportOptions.plist for unsigned IPA [ASSUMED]
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>ad-hoc</string>
  <key>compileBitcode</key>
  <false/>
  <key>signingCertificate</key>
  <string>-</string>
</dict>
</plist>
```

### GitHub Actions workflow structure

Existing CI workflow `ci-backend.yml` patterns [VERIFIED: `.github/workflows/ci-backend.yml`]:
- Uses `actions/checkout@v4`, `actions/cache@v4`
- Triggered on `push` to `main`/`develop` with path filter

New file: `.github/workflows/ios-build.yml`

```yaml
name: iOS Build

on:
  workflow_dispatch:    # Manual trigger only — not on every push
  push:
    tags:
      - 'ios-*'        # Or tag-based trigger

jobs:
  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install frontend dependencies
        run: cd frontend && npm install

      - name: Install @expo/cli
        run: npm install -g expo-cli

      - name: Expo prebuild (generate ios/)
        run: cd frontend && npx expo prebuild --platform ios --clean
        env:
          EXPO_PUBLIC_GOOGLE_MAPS_KEY: ${{ secrets.EXPO_PUBLIC_GOOGLE_MAPS_KEY }}

      - name: Cache CocoaPods
        uses: actions/cache@v4
        with:
          path: frontend/ios/Pods
          key: ${{ runner.os }}-pods-${{ hashFiles('frontend/ios/Podfile.lock') }}

      - name: Install CocoaPods
        run: cd frontend/ios && pod install

      - name: Build unsigned .xcarchive
        run: |
          cd frontend/ios
          xcodebuild \
            -workspace BarGAIN.xcworkspace \
            -scheme BarGAIN \
            -configuration Release \
            -archivePath ../../build/BarGAIN.xcarchive \
            CODE_SIGNING_ALLOWED=NO \
            archive

      - name: Export unsigned .ipa
        run: |
          xcodebuild \
            -exportArchive \
            -archivePath build/BarGAIN.xcarchive \
            -exportPath build/output \
            -exportOptionsPlist frontend/ExportOptions.plist

      - name: Upload .ipa artifact
        uses: actions/upload-artifact@v4
        with:
          name: BarGAIN-unsigned
          path: build/output/BarGAIN.ipa
          retention-days: 7
```

**Key gap:** The workspace name `BarGAIN.xcworkspace` and scheme `BarGAIN` depend on what `expo prebuild` generates. The scheme name is derived from `app.json` `"name": "BarGAIN"`. Verify after prebuild.

**`macos-latest` note [ASSUMED]:** GitHub-hosted `macos-latest` runners have Xcode preinstalled (typically Xcode 15.x or 16.x as of 2026). No Xcode install step needed. CocoaPods is also pre-installed.

---

## 5. LaTeX Template State

### Template structure [VERIFIED: filesystem scan of `memoriaTFG/Plantilla TfG/`]

| File/Dir | Purpose |
|----------|---------|
| `memoriaTFG/Plantilla TfG/proyect.tex` | **Main entry point** — `\documentclass{pclass}` |
| `memoriaTFG/Plantilla TfG/pclass.cls` | Official ETSII document class |
| `memoriaTFG/Plantilla TfG/resumen.tex` | Required abstract template |
| `memoriaTFG/Plantilla TfG/agradecimientos.tex` | Acknowledgements |
| `memoriaTFG/Plantilla TfG/tocdef.tex` | Table of contents configuration |
| `memoriaTFG/Plantilla TfG/Capitulos/` | Chapter templates (8 example chapters) |
| `memoriaTFG/Plantilla TfG/codigo/macrotabla.tex` | Table macros |
| `memoriaTFG/Plantilla TfG/img/` | Template images (us.jpg, knuth.eps, etc.) |
| `memoriaTFG/Plantilla TfG/apacite.sty` | APA bibliography style |

**`proyect.tex` entry point structure** [VERIFIED: `memoriaTFG/Plantilla TfG/proyect.tex`]:
```latex
\documentclass{pclass}
\usepackage[utf8]{inputenc}
\usepackage{times}    % Font — will need to change to Arial/Helvetica

\begin{document}
\tipo{Grado}
\titulopro{...}
\tutor{...}
\departamento{...}
\autores{...}{{\ }}
\dia{...}
\titulacion{...}

\hacerportada       % Official ETSII cover

\input{tocdef}
\frontmatter
    \input{resumen}
    \input{agradecimientos}
    \tableofcontents
    \listoftables
    \listoffigures
    \lstlistoflistings

\mainmatter
    \input{Capitulos/capitulo1}
    \input{Capitulos/capitulo2}
    % ... more chapters

\backmatter
    \bibliographystyle{apacite}
    \bibliography{pfcbib}
\end{document}
```

**Font issue [VERIFIED: `proyect.tex` line 8]:** Template uses `\usepackage{times}` (Times New Roman). ETSII requires Arial/Helvetica 11pt. Must replace with `\usepackage{helvet}\renewcommand{\familydefault}{\sfdefault}` or `\usepackage{uarial}`.

**Compilation toolchain:** The template uses `apacite.bst` for bibliography (not BibLaTeX). Compile sequence: `pdflatex` → `bibtex` → `pdflatex` → `pdflatex`.

### Existing Markdown chapters [VERIFIED: `docs/memoria/` directory]

| Chapter | File | Status (from CONTEXT.md) |
|---------|------|--------------------------|
| 01 Introducción | `docs/memoria/01-introduccion.md` | Complete |
| 02 Objetivos | `docs/memoria/02-objetivos.md` | Complete |
| 03 Antecedentes | `docs/memoria/03-antecedentes.md` | Complete |
| 04 Comparativa | `docs/memoria/04-comparativa.md` | Complete |
| 05 Herramientas | `docs/memoria/05-herramientas.md` | Complete |
| 06 Planificación | `docs/memoria/06-planificacion.md` | Complete |
| 07 Requisitos | `docs/memoria/07-requisitos.md` | Complete |
| 08 Diseño e impl. | `docs/memoria/08-diseno-implementacion.md` | **Pending update (F5/F6)** |
| 09 Manual usuario | `docs/memoria/09-manual-usuario.md` | **Pending screenshots** |
| 10 Pruebas | `docs/memoria/10-pruebas.md` | **Pending E2E + NFR results** |
| 11 Conclusiones | `docs/memoria/11-conclusiones.md` | **Pending rewrite** |
| 12 Bibliografía | `docs/memoria/12-bibliografia.md` | Complete |

### Markdown-to-LaTeX conversion approach

Recommended tool: `pandoc` with a custom template referencing `pclass.cls`. Each `docs/memoria/XX-*.md` becomes one `\input{Capitulos/chapterXX.tex}` in `proyect.tex`.

```bash
pandoc docs/memoria/08-diseno-implementacion.md \
  -o memoriaTFG/Plantilla\ TfG/Capitulos/cap08.tex \
  --from markdown --to latex
```

Manual post-processing required for: images (pandoc outputs `\includegraphics` but paths must be adjusted), tables (complex Markdown tables may need manual LaTeX), code blocks (use `lstlisting` environment matching template style).

**Alternative approach:** Write chapters directly in LaTeX within the `Capitulos/` directory, using the Markdown as source material. Given 4 chapters need heavy rewrites anyway (08, 09, 10, 11), direct LaTeX authoring may be faster than pandoc + cleanup.

---

## 6. Test Infrastructure

### Backend test suite [VERIFIED: filesystem scan]

**pytest configuration** (`backend/pytest.ini`):
- `DJANGO_SETTINGS_MODULE = config.settings.test`
- `testpaths = tests apps`
- `addopts = -v --tb=short --strict-markers`

**Existing integration test files:**

| File | Coverage |
|------|----------|
| `test_auth_endpoints.py` | Register, login, refresh, profile |
| `test_optimizer_api.py` | POST `/api/v1/optimize/` with mock distance matrix |
| `test_ocr_api.py` | POST `/api/v1/ocr/scan/` with mock Google Vision |
| `test_business_verification.py` | Admin approve/reject BusinessProfile |
| `test_business_registration.py` | PYME onboarding |
| `test_business_prices.py` | Business price management |
| `test_bulk_prices.py` | Bulk price update |
| `test_proposal_admin.py` | Product proposal approve/reject |
| `test_list_endpoints.py` | Shopping list CRUD |
| `test_cross_domain.py` | Cross-domain integration |
| `test_notification_dispatch.py` | Push/email dispatch |
| `test_notification_events.py` | Notification events |
| `test_price_endpoints.py` | Price API |
| `test_product_endpoints.py` | Product API |
| `test_store_endpoints.py` | Store API |
| `test_assistant_api.py` | LLM assistant |
| `test_promotions.py` | Promotions |

**Backend coverage of Phase 7 E2E flows:**

| E2E Flow | Backend API coverage | Gap |
|----------|---------------------|-----|
| Auth (register→login→refresh→logout) | Full: `test_auth_endpoints.py` | None for logout (stateless JWT, just clear client) |
| Lista→Optimizar→Ruta | Partial: `test_optimizer_api.py` mocks `get_distance_matrix` | ORS client not tested yet |
| OCR ticket→lista | Partial: `test_ocr_api.py` mocks Google Vision | Full flow (add items to list after OCR) not tested |
| Business portal | Full: `test_business_verification.py` + `test_proposal_admin.py` | None |

**Distance matrix test gap:** `test_optimizer_api.py` uses `unittest.mock.patch` on `get_distance_matrix`. There is no test for `get_distance_matrix` itself calling ORS. A unit test for `get_distance_matrix` with ORS format will be needed in `tests/unit/test_optimizer.py` (currently exists, likely tests the Graphhopper version).

### Frontend web test suite [VERIFIED: `frontend/web/src/__tests__/`]

| File | Coverage |
|------|----------|
| `LoginPage.test.tsx` | Login form rendering and submission |
| `UnverifiedGuard.test.tsx` | Unverified business guard redirect |

Uses Vitest + `@testing-library/react`. No Playwright tests exist.

### Backend e2e directory

`backend/tests/e2e/__init__.py` — empty, reserved for future Python-level E2E tests. Not used by Phase 7.

### Phase 7 test gaps summary

| Gap | File to create | Priority |
|-----|---------------|----------|
| ORS client unit test | `tests/unit/test_distance_ors.py` | HIGH — needed before deploy |
| Playwright auth flow | `frontend/web/e2e/auth.spec.ts` | HIGH |
| Playwright business portal flow | `frontend/web/e2e/business.spec.ts` | HIGH |
| Playwright optimizer flow (API-level) | `frontend/web/e2e/optimizer.spec.ts` | MEDIUM — see gap above |
| Playwright OCR flow (API-level) | `frontend/web/e2e/ocr.spec.ts` | MEDIUM — see gap above |
| NFR-02 documentation | Cap. 10 (prose + screenshot) | HIGH |
| NFR-04 Lighthouse script | Manual via Chrome DevTools | MEDIUM |
| NFR-05 documentation | Cap. 10 (prose justification) | HIGH |

---

## 7. Open Questions

### Q1: ORS `distances` units behavior
**What we know:** ADR-011 says to call `https://api.openrouteservice.org/v2/matrix/driving-car`. ORS docs state that `units: "km"` returns distances in km.
**What's unclear:** Whether Render's outbound HTTP to `api.openrouteservice.org` works without additional proxy config. Render free tier does not block outbound HTTP.
**Recommendation:** Add a smoke test in CI that hits the ORS endpoint with a dummy request using the staging API key to verify connectivity before the E2E run.

### Q2: Optimizer and OCR E2E flows in Playwright
**What we know:** Web companion has no consumer-facing pages for shopping lists, optimizer, or OCR upload. These pages exist only in the Expo mobile app.
**What's unclear:** Whether D-07 intended these flows to be UI-driven (impossible via web companion) or API-driven (possible via Playwright `request` fixture against the backend URL).
**Recommendation:** Implement flows 2 and 3 as API-level tests using Playwright's `request` fixture (HTTP calls, no browser UI). This satisfies D-07 as "automated" without requiring a web UI for consumer flows. The planner should confirm this interpretation with the user or default to it per Claude's discretion (D-08 says "backend can be staging Render or Docker local").

### Q3: `DATABASE_URL` prefix for Render PostgreSQL
**What we know:** Render provides `DATABASE_URL` as `postgresql://...`. Django PostGIS requires `postgis://`. `dj-database-url` is installed.
**What's unclear:** Whether `config/settings/base.py` currently handles the prefix conversion.
**Recommendation:** Plan task to read `config/settings/base.py` and verify/add `DATABASE_URL` handling that converts `postgresql://` → `postgis://`.

### Q4: iOS workspace/scheme name after prebuild
**What we know:** `expo prebuild` generates `ios/` directory. The scheme name derives from `app.json` `"name": "BarGAIN"`.
**What's unclear:** Exact `.xcworkspace` filename and scheme name without running prebuild.
**Recommendation:** The ios-build.yml workflow should include a step to list available schemes: `xcodebuild -list -workspace ios/*.xcworkspace` and fail fast if the scheme doesn't match.

### Q5: Render `SECURE_SSL_REDIRECT` loop
**What we know:** `prod.py` sets `SECURE_SSL_REDIRECT = True`. Render load balancer terminates SSL.
**What's unclear:** Whether the current `base.py` already handles this via `SECURE_PROXY_SSL_HEADER`.
**Recommendation:** Plan task to add `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` to `prod.py` and confirm it prevents redirect loops on Render.

---

## Sources

### Primary (HIGH confidence — verified in this repo)
- `backend/apps/optimizer/services/distance.py` — Complete Graphhopper client implementation
- `backend/config/settings/prod.py` — Production settings, security headers, whitenoise
- `backend/Dockerfile` — Production container configuration
- `docker-compose.yml` — Service architecture reference for Render mapping
- `frontend/web/package.json` — Vitest (not Playwright), web companion deps
- `frontend/web/src/App.tsx` — All routes, auth guard mechanism
- `frontend/web/vite.config.ts` — Dev server config, Windows polling
- `memoriaTFG/Plantilla TfG/proyect.tex` — LaTeX entry point, `\documentclass{pclass}`
- `memoriaTFG/Plantilla TfG/Capitulos/capitulo1.tex` — ETSII format requirements confirmed
- `backend/tests/` — Full test inventory verified
- `.github/workflows/ci-backend.yml` — Existing workflow patterns
- `frontend/app.json` — iOS bundle identifier, no `ios/` directory exists
- `backend/pytest.ini` — Test configuration
- `.env.example` — All current environment variables (no `ORS_API_KEY`)
- `docs/decisiones/011-deploy-staging.md` — ADR-011, Render+ORS decision

### Secondary (MEDIUM confidence — cited from official docs)
- ORS Matrix API endpoint and payload format [CITED: openrouteservice.org API docs — `POST /v2/matrix/{profile}`]
- Expo prebuild + xcodebuild sequence for unsigned IPA [ASSUMED — documented Expo pattern, not verified in this session]

### Tertiary (LOW confidence — training knowledge)
- GitHub Actions `macos-latest` Xcode version [ASSUMED — approximately Xcode 15/16 as of 2026]
- Pandoc LaTeX conversion approach [ASSUMED — standard toolchain]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `macos-latest` runner has Xcode preinstalled, no install step needed | iOS Build Workflow | Minor delay if install needed; add `xcode-install` step |
| A2 | `expo prebuild` generates workspace named `BarGAIN.xcworkspace` with scheme `BarGAIN` | iOS Build Workflow | Build command fails; workflow needs dynamic scheme discovery |
| A3 | ORS `units: "km"` returns distances already in km | ORS Integration | Distance values off by 1000x; remove `/1000` conversion |
| A4 | Render outbound HTTP to `api.openrouteservice.org` is not blocked on free tier | Render Deploy | ORS calls fail silently; optimizer falls back to haversine |
| A5 | `pandoc` markdown→latex conversion is viable for chapter content | LaTeX Template | Manual LaTeX authoring needed; more time required |
| A6 | `config/settings/base.py` uses `dj_database_url.parse()` for DATABASE_URL | Render Deploy Config | PostGIS schema mismatch; migrations fail at deploy |

---

## Metadata

**Confidence breakdown:**
- Playwright Setup State: HIGH — verified by filesystem scan; gap for flows 2/3 is structural fact
- Render Deploy Config: HIGH for service architecture; MEDIUM for `SECURE_SSL_REDIRECT` gap (needs base.py read)
- ORS Integration Gap: HIGH for what to change in `distance.py`; MEDIUM for exact response field names
- iOS Build Workflow: MEDIUM — Expo prebuild/xcodebuild pattern is standard but `ios/` directory doesn't exist yet
- LaTeX Template State: HIGH — template structure fully verified
- Test Infrastructure: HIGH — complete inventory verified

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable stack; ORS free tier limits and Render service details may change)
