# Roadmap: BargAIn

## Overview

Roadmap operativo sincronizado a 2026-03-25. El proyecto tiene F1, F2 y F3 finalizadas, F4 completada y F5 planificada (5 planes en 3 oleadas).

## Phase Status

- [x] Phase 1: Core Backend (F3) - Completada
- [x] Phase 2: Business & Notifications - Completada
- [x] Phase 3: Frontend Base + Integraciones clave - Completada a nivel de bloque inicial
- [x] Phase 4: Frontend advanced polish y cierre F4 - Completada (2026-03-23)
- [ ] Phase 5: Optimizer, Scraping, OCR, LLM - Planificada (5 planes)
- [ ] Phase 6: Testing final, Deploy, Memoria y Defensa - Pendiente

## Current Execution Focus

### Phase 4 (complete)

**Goal:** Complete Google Places integration (F4-21) to close Phase 4.

**Requirements:** [STORE-04]

**Plans:** 2/2 plans complete

Plans:
- [x] 04-01-PLAN.md — Backend Places enrichment proxy (Store model + endpoint + Redis cache + tests)
- [x] 04-02-PLAN.md — Frontend Places integration (autocomplete + discovery markers + StoreProfile enrichment)

### Phase 5 (active)

**Goal:** Build the four remaining backend systems (optimizer, scraping, OCR, LLM) and wire them to the three frontend screens currently running on mock data.

**Requirements:** [OPT-01, OPT-02, OPT-03, OPT-04, OCR-01, OCR-02, LLM-01, LLM-02, SCRAP-01, NFR-01]

**Plans:** 2/5 plans executed

Plans:
- [ ] 05-01-PLAN.md — Scrapy spiders (Mercadona/Carrefour/Lidl/DIA) + pipeline + Celery Beat schedule
- [x] 05-02-PLAN.md — OCR backend endpoint (pytesseract + fuzzy matching)
- [x] 05-03-PLAN.md — LLM assistant endpoint (Claude API proxy + guardrails)
- [ ] 05-04-PLAN.md — Optimizer algorithm (Graphhopper + OR-Tools + OptimizationResult model)
- [ ] 05-05-PLAN.md — Frontend wiring (RouteScreen + OCRScreen + AssistantScreen to real endpoints)

### Phase 6 (closure)

- E2E global y validacion de requisitos no funcionales.
- Deploy de staging definitivo.
- Cierre de memoria del TFG y preparacion de defensa.

## Progress Table

| Phase | Status | Notes |
|------|--------|-------|
| 1. Core Backend | Complete | Base backend y API consolidada |
| 2. Business & Notifications | Complete | Portal PYME + notificaciones listas |
| 3. Frontend | Complete (baseline) | Pantallas y flujos clave operativos |
| 4. Frontend Advanced | Complete | Google Places integration done (2 plans, 2 waves) |
| 5. IA + Optimizer + Scraping | Planned | 5 plans in 3 waves — scraping/OCR/LLM parallel, optimizer wave 2, frontend wave 3 |
| 6. Final QA + Deploy + Thesis | Not started | Cierre de proyecto |

---
Last updated: 2026-03-25
