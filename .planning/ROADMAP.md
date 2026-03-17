# Roadmap: BargAIn

## Overview

BargAIn is a TFG project (300h, 20 weeks) at ~28% completion with F1 (analysis) and F2 (infrastructure) done. This roadmap covers the remaining ~215h across 6 phases: building the full backend domain, the React Native frontend, the scraping and optimization engine, advanced AI features, and finally testing plus thesis delivery. Each phase delivers a coherent, verifiable slice of the application. The core value — user submits shopping list, gets optimal multi-store route with >5% savings — is only fully realized when Phase 4 completes. Everything before that is necessary scaffolding.

## Phases

- [x] **Phase 1: Core Backend** - Users, products, stores, prices, and shopping lists — the full domain API (completed 2026-03-16)
- [ ] **Phase 2: Business & Notifications** - PYME portal, promotions, and push/email notifications
- [ ] **Phase 3: Frontend** - All React Native screens connected to real API data
- [ ] **Phase 4: Optimizer & Scraping** - Price scraping + multi-criteria route optimization (core value delivery)
- [ ] **Phase 5: Advanced AI** - OCR receipt scanning and LLM shopping assistant
- [ ] **Phase 6: Testing, Deploy & Thesis** - E2E tests, staging deploy, usability tests, memory completion

## Phase Details

### Phase 1: Core Backend
**Goal**: Users can authenticate and manage shopping lists, and the system has a complete, tested API for products, stores, and prices
**Depends on**: Nothing (F1+F2 already complete — this starts at F3)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, STORE-01, STORE-02, STORE-03, STORE-04, PRICE-01, PRICE-02, PRICE-03, PRICE-04, PRICE-05, LIST-01, LIST-02, LIST-03, LIST-04
**Success Criteria** (what must be TRUE):
  1. User can register, log in, receive JWT tokens, and recover a forgotten password via email
  2. User can search products by name/category/barcode and see a price range from nearby stores
  3. System returns stores within a configurable radius ordered by distance, shown on an interactive map
  4. System shows price comparison for a product across stores, historical price chart, and triggers an alert when a target price is reached
  5. User can create, edit, archive, share, and template-ize shopping lists with item autocomplete
**Plans**: 6 plans

Plans:
- [ ] 01-01: Users module — model, roles, JWT auth, profile, preferences, tests (F3-01 to F3-04)
- [ ] 01-02: Products module — catalog, fuzzy search, categories, crowdsourcing, tests (F3-05 to F3-08)
- [ ] 01-03: Stores module — PostGIS model, geospatial search API, tests (F3-09 to F3-12)
- [ ] 01-04: Prices module — price model, multi-store comparison, expiry via Celery, price history, alerts, tests (F3-13 to F3-16)
- [ ] 01-05: Shopping Lists module — CRUD, item management, sharing, templates, tests (F3-17 to F3-20)
- [ ] 01-06: Integration tests + OpenAPI documentation (F3-27, F3-28)

### Phase 2: Business & Notifications
**Goal**: PYME businesses can manage their store prices and promotions, and users receive relevant notifications
**Depends on**: Phase 1
**Requirements**: BIZ-01, BIZ-02, BIZ-03, NOTIF-01
**Success Criteria** (what must be TRUE):
  1. A business can register, get verified by admin, and update its store prices without automatic expiry
  2. A business can create, activate, and deactivate promotions with start/end dates and discount values
  3. User receives a push or email notification when a price alert is triggered, a promotion is added at a favorited store, or a shared list changes
**Plans**: 6 plans

Plans:
- [ ] 02-01: Business portal — profile model, admin verification, price update API, promotions, tests (F3-21 to F3-24)
- [ ] 02-02: Notifications system — push + email dispatch, event triggers, preferences, tests (F3-25 to F3-26)

### Phase 3: Frontend
**Goal**: All user-facing screens are connected to real backend data — no more hardcoded mock values
**Depends on**: Phase 1, Phase 2
**Requirements**: NFR-03
**Success Criteria** (what must be TRUE):
  1. User can complete full auth flow (register, login, logout, password reset) on the mobile app
  2. User can create a shopping list, search and add products with autocomplete, and see prices from real stores
  3. User can view nearby stores on an interactive map and compare real prices for their list items
  4. User can view the PYME business dashboard (for business accounts) and manage prices/promotions
  5. App runs correctly on both iOS 15+ and Android 10+ (via Expo Go)
**Plans**: 6 plans

Plans:
- [ ] 03-01: Navigation system, global theme, reusable component library (F4-01 to F4-03)
- [ ] 03-02: Auth screens — login, register, profile, JWT refresh interceptor (F4-04 to F4-06)
- [ ] 03-03: Shopping list screens — list management, item search, autocomplete (F4-07 to F4-09)
- [ ] 03-04: Price comparison screen + store map with real data (F4-10 to F4-11)
- [ ] 03-05: Business PYME dashboard web screen (F4-19)
- [ ] 03-06: Frontend tests — Jest + React Native Testing Library (F4-20)

### Phase 4: Optimizer & Scraping
**Goal**: Users can request an optimized multi-store route and see real scraped prices — the application's core value is fully operational
**Depends on**: Phase 1, Phase 3
**Requirements**: OPT-01, OPT-02, OPT-03, OPT-04, SCRAP-01, NFR-01
**Success Criteria** (what must be TRUE):
  1. System scrapes Mercadona, Carrefour, Lidl, and DIA prices every 24h via Celery Beat with a normalization pipeline
  2. User can request route optimization and receive top-3 multi-store routes ranked by configurable weights (price, distance, time)
  3. Optimized route displays on an interactive map with polylines, per-stop product assignments, and total/breakdown cost
  4. User can recalculate route by excluding a store or adjusting weights; result returns in under 5 seconds
  5. API responds in under 500ms p95 for standard CRUD; optimizer completes in under 5 seconds for 100 products across 30 stores
**Plans**: 6 plans

Plans:
- [ ] 04-01: Scraping spiders — Mercadona (F5-01), Carrefour (F5-02), Lidl + DIA (F5-03)
- [ ] 04-02: Scraping pipeline — normalization, DB insertion, Celery Beat scheduling (F5-04 to F5-05)
- [ ] 04-03: Optimizer algorithm — multicriterio scoring function, OR-Tools integration (F5-06 to F5-07)
- [ ] 04-04: Route distance/time — OSRM/Google Directions integration, optimizer tests (F5-08 to F5-09)
- [ ] 04-05: Frontend optimizer screens — config screen, route map with polylines, savings breakdown (F4-12 to F4-14)

### Phase 5: Advanced AI
**Goal**: Users can scan a handwritten list or receipt with OCR to populate their list, and consult the LLM assistant for shopping advice
**Depends on**: Phase 1, Phase 4
**Requirements**: OCR-01, OCR-02, LLM-01, LLM-02
**Success Criteria** (what must be TRUE):
  1. User can photograph a handwritten list or printed receipt and the system extracts text (>=75% accuracy on typical inputs)
  2. Extracted text is matched fuzzy against the product catalog; user reviews and confirms matches before items are added to the list
  3. User can ask the LLM assistant in natural language (e.g., "where is milk cheapest near me?") and receive a response grounded in real catalog data
  4. Assistant proposes savings strategies based on the user's price history and current trends; responses stay within shopping-related scope
**Plans**: 6 plans

Plans:
- [ ] 05-01: OCR backend — Tesseract service, image validation, fuzzy catalog matching (F5-10 to F5-11)
- [ ] 05-02: OCR frontend — camera/gallery capture screen, review and correction UI (F4-15 to F4-16)
- [ ] 05-03: LLM assistant — Claude API integration, prompt engineering, guardrails, chat history (F5-12 to F5-13, F4-17 to F4-18)

### Phase 6: Testing, Deploy & Thesis
**Goal**: The application passes E2E tests with real users, is deployed to staging, and the TFG thesis is complete and ready to defend
**Depends on**: Phase 4, Phase 5
**Requirements**: NFR-02, NFR-04, NFR-05
**Success Criteria** (what must be TRUE):
  1. Backend test coverage reaches >=80%; all critical API flows pass E2E tests in CI
  2. At least 5 real users complete a usability test session and critical blocking issues are resolved
  3. Application is deployed and accessible on Render staging with automated CI/CD pipeline
  4. RGPD compliance is confirmed: location consent prompt shown, user can delete their account and data
  5. TFG thesis sections 09-12 are written and the full memory document is ready for submission
**Plans**: 6 plans

Plans:
- [ ] 06-01: Integration tests + E2E tests (backend and frontend) — coverage report (F6-01 to F6-02)
- [ ] 06-02: Usability testing with real users + bug fixes (F6-03 to F6-05)
- [ ] 06-03: Staging deploy on Render + CI/CD pipeline + RGPD compliance (F6-04, NFR-04, NFR-05)
- [ ] 06-04: Thesis writing — sections 09-12 + demo video + defense prep (F6-06 to F6-08)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Backend | 6/6 | Complete   | 2026-03-16 |
| 2. Business & Notifications | 0/2 | Not started | - |
| 3. Frontend | 0/6 | Not started | - |
| 4. Optimizer & Scraping | 0/5 | Not started | - |
| 5. Advanced AI | 0/3 | Not started | - |
| 6. Testing, Deploy & Thesis | 0/4 | Not started | - |
