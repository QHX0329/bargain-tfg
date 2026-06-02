# Roadmap: BargAIn

## Overview

Roadmap operativo sincronizado a 2026-04-05. El proyecto tiene F1-F6 finalizadas, F7 reservada para cierre final y F8-F10 abiertas como fases de cierre post-auditoria.

## Phase Status

- [x] Phase 1: Core Backend (F3) - Completada
- [x] Phase 2: Business & Notifications - Completada
- [x] Phase 3: Frontend Base + Integraciones clave - Completada a nivel de bloque inicial
- [x] Phase 4: Frontend advanced polish y cierre F4 - Completada (2026-03-23)
- [x] Phase 5: Optimizer, Scraping, OCR, LLM - Completada (5 planes)
- [x] Phase 6: Portal Business y App Movil - cierre de flujos, tests, UAT, sync docs - Completada
- [x] Phase 7: Testing Final, Deploy, Memoria y Defensa - Completada (2026-04-09)
- [ ] Phase 8: Milestone Evidence Recovery - Pendiente
- [ ] Phase 9: Traceability Normalization - Pendiente
- [ ] Phase 10: Contract Alignment Cleanup - Pendiente
- [ ] Phase 12: Consumer Web App - Pendiente

## Current Execution Focus

### Phase 4 (complete)

**Goal:** Complete Google Places integration (F4-21) to close Phase 4.

**Requirements:** [STORE-04]

**Plans:** 2/2 plans complete

Plans:
- [x] 04-01-PLAN.md - Backend Places enrichment proxy (Store model + endpoint + Redis cache + tests)
- [x] 04-02-PLAN.md - Frontend Places integration (autocomplete + discovery markers + StoreProfile enrichment)

### Phase 5 (complete)

**Goal:** Build the four remaining backend systems (optimizer, scraping, OCR, LLM) and wire them to the three frontend screens currently running on mock data.

**Requirements:** [OPT-01, OPT-02, OPT-03, OPT-04, OCR-01, OCR-02, LLM-01, LLM-02, SCRAP-01, NFR-01]

**Plans:** 5/5 plans complete

Plans:
- [x] 05-01-PLAN.md - Scrapy spiders (Mercadona/Carrefour/Lidl/DIA) + pipeline + Celery Beat schedule
- [x] 05-02-PLAN.md - OCR backend endpoint (actualmente legado con pytesseract; decision vigente: Google Vision API + fuzzy matching)
- [x] 05-03-PLAN.md - LLM assistant endpoint (Claude API proxy + guardrails)
- [x] 05-04-PLAN.md - Optimizer algorithm (Graphhopper + OR-Tools + OptimizationResult model)
- [x] 05-05-PLAN.md - Frontend wiring (RouteScreen + OCRScreen + AssistantScreen to real endpoints)

### Phase 6 (complete)

**Goal:** Cerrar todos los flujos del Portal Business y App Movil: servicio de aprobacion compartido, tests de integracion para propuestas y precios bulk, UAT manual, sync de documentacion.

**Requirements:** [SVC-01, PRO-01, PRO-02, PRO-03, PRO-04, BULK-01, BULK-02, UAT-01, UAT-02, UAT-03, DOC-01]

**Plans:** 5/5 plans complete

Plans:
- [x] 06-01-PLAN.md -- Shared approval service (services.py extraction + views.py + admin.py update)
- [x] 06-02-PLAN.md -- Integration tests: proposal admin (6 tests)
- [x] 06-03-PLAN.md -- Integration tests: CSV bulk-update (5 tests)
- [x] 06-04-PLAN.md -- UAT verification and frontend bug fixes
- [x] 06-05-PLAN.md -- Sync documentation and planning

### Phase 7: Testing Final, Deploy, Memoria y Defensa

**Goal:** E2E global, validación NFR, deploy staging en Render, cierre de la memoria del TFG (caps. 8-11 + LaTeX), y preparación de la defensa (slides + demo grabada).

**Requirements:** [NFR-02, NFR-04, NFR-05]

**Plans:** 3/6 plans executed

Plans:
- [x] 07-01-PLAN.md - ORS API integration + Render deployment fixes (Wave 1)
- [x] 07-02-PLAN.md - E2E Playwright: 4 flujos automatizados (Wave 1)
- [x] 07-03-PLAN.md - iOS GitHub Actions build + Render staging deploy process (Wave 2)
- [x] 07-04-PLAN.md - Memoria TFG: caps. 8-11 actualizados + conversión LaTeX (Wave 2)
- [x] 07-05-PLAN.md - Slides de defensa (Marp) + script demo grabada (Wave 3)
- [x] 07-06-PLAN.md - Cierre formal: VERIFICATION.md, TASKS.md, PDF, commit (Wave 3)

### Phase 8: Milestone Evidence Recovery

**Goal:** Recuperar las evidencias de cierre faltantes de F1, F4 y F5 para que el milestone tenga verificacion formal archive-ready.

**Requirements:** [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, STORE-01, STORE-02, STORE-03, PRICE-01, PRICE-02, PRICE-03, PRICE-04, PRICE-05, LIST-01, LIST-02, LIST-03, LIST-04, OPT-01, OPT-02, OPT-03, OPT-04, LLM-01, LLM-02, SCRAP-01, NFR-01]

**Gap Closure:** Closes missing verification artifacts for phases 01, 04, and 05 plus the orphaned NFR-01 audit gap.

**Plans:** 0/0 pending planning

### Phase 9: Traceability Normalization

**Goal:** Normalizar `requirements-completed` y la trazabilidad documental en F2 y F6 para que los requisitos ya implementados puedan cerrarse en la re-auditoria.

**Requirements:** [BIZ-01, BIZ-02, BIZ-03, SVC-01, PRO-01, PRO-02, PRO-03, PRO-04, BULK-01, BULK-02, UAT-01, UAT-02, UAT-03, DOC-01]

**Gap Closure:** Closes partial requirement traceability gaps from phases 02 and 06.

**Plans:** 0/0 pending planning

### Phase 10: Contract Alignment Cleanup

**Goal:** Resolver ambiguedades de contrato documental antes del re-audit, especialmente `STORE-04` y el contrato OCR frente a ADR-007.

**Requirements:** [STORE-04, OCR-01, OCR-02]

**Gap Closure:** Closes requirement identity ambiguity and OCR documentation drift highlighted by the milestone audit.

**Plans:** 0/0 pending planning

## Progress Table

| Phase | Status | Notes |
|------|--------|-------|
| 1. Core Backend | Complete | Base backend y API consolidada |
| 2. Business & Notifications | Complete | Portal PYME + notificaciones listas |
| 3. Frontend | Complete (baseline) | Pantallas y flujos clave operativos |
| 4. Frontend Advanced | Complete | Google Places integration done (2 plans, 2 waves) |
| 5. IA + Optimizer + Scraping | Complete | 5 plans - scraping/OCR/LLM/optimizer/frontend |
| 6. Business Portal + Mobile App | Complete | Service extraction, 11 integration tests, UAT passed |
| 7. Final QA + Deploy + Thesis | Complete | ORS+Render, E2E Playwright, iOS build CI, Memoria LaTeX, Defensa slides (2026-04-09) |
| 8. Milestone Evidence Recovery | Not started | Backfill de VERIFICATION.md y cierre formal de evidencia |
| 9. Traceability Normalization | Not started | Reparacion de requirements-completed y trazabilidad audit-ready |
| 10. Contract Alignment Cleanup | Not started | Alinear IDs ambiguos y contrato OCR antes de re-auditar |
| 12. Consumer Web App | Not started | 6 planes en 3 waves |

### Phase 11: Auditar memoria TFG contra guías oficiales y preparar despliegue reproducible

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 10
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 11 to break down)

---

### Phase 12: Consumer Web App

**Goal:** Implement all consumer-facing mobile features as web pages in `frontend/web/` under routes `/app/*`, using React Leaflet for the map (OpenStreetMap) and file upload for OCR.

**Requirements:** [WEB-01, WEB-02, WEB-03, WEB-04, WEB-05, WEB-06]

**Plans:** 4/6 plans executed

Plans:
- [x] 12-01-PLAN.md — Consumer section scaffold (layout, routing, stores, services)
- [x] 12-02-PLAN.md — Shopping lists + list detail + templates
- [x] 12-03-PLAN.md — Optimizer result + product catalog + price comparison + proposal
- [x] 12-04-PLAN.md — Map (React Leaflet) + store profile + favorites
- [ ] 12-05-PLAN.md — AI assistant chat + OCR file upload
- [ ] 12-06-PLAN.md — Profile + optimizer config + notifications + price alerts

### Phase 13: Mejorar la app Expo existente (frontend/src) para uso web: añadir nuevas funcionalidades dentro de las screens ya existentes orientadas al uso web, sin crear nuevas pantallas

**Goal:** Hacer que las 15 screens existentes de la app Expo (`frontend/src`) ofrezcan una experiencia web real (layout ancho/master-detail, ratón/teclado, conveniencias web y deep-linking) sin crear pantallas nuevas, sin tocar `frontend/web/` ni `auth/`/`profile/`, y manteniendo la UX móvil intacta por debajo de 768px.
**Decisions:** D-01..D-13 (CONTEXT.md) — cobertura colectiva de D-05/D-06/D-07/D-08 en las 15 screens + D-09/D-10/D-12.
**Depends on:** Phase 12
**Plans:** 6 plans (2 waves)

Plans:
- [ ] 13-01-foundation-layout-PLAN.md — useBreakpoint + MasterDetailLayout + WebTooltip + BottomTabBar restyle (Wave 0)
- [ ] 13-02-foundation-web-utils-linking-PLAN.md — webExport (download/clipboard/CSV) + deep-linking config (Wave 0)
- [ ] 13-03-listas-flow-PLAN.md — Listas: responsive + ListDetail.web.tsx drag-drop + export/share (Wave 1)
- [ ] 13-04-mapa-tiendas-flow-PLAN.md — Mapa/Tiendas: panel lateral + ficha 2-col + copiar/compartir (Wave 1)
- [ ] 13-05-catalogo-precios-flow-PLAN.md — Catálogo/Precios: grid 2-4col + Cmd+K + ?q= + CSV (Wave 1)
- [ ] 13-06-asistente-notif-flow-PLAN.md — Asistente/Notif.: chat centrado + copiar mensaje/alerta (Wave 1)

---
Last updated: 2026-06-02
