---
phase: 12-consumer-web-app
plan: "01"
subsystem: frontend/web
tags: [consumer, react, typescript, zustand, ant-design, react-leaflet, scaffold]
dependency_graph:
  requires: []
  provides:
    - frontend/web/src/types/consumer.ts
    - frontend/web/src/api/listService.ts
    - frontend/web/src/api/productService.ts
    - frontend/web/src/api/storeService.ts
    - frontend/web/src/api/optimizerService.ts
    - frontend/web/src/api/assistantService.ts
    - frontend/web/src/api/ocrService.ts
    - frontend/web/src/api/notificationService.ts
    - frontend/web/src/api/priceService.ts
    - frontend/web/src/store/consumer/consumerAuthStore.ts
    - frontend/web/src/store/consumer/listStore.ts
    - frontend/web/src/pages/consumer/ConsumerLayout.tsx
    - frontend/web/src/pages/consumer/* (18 pages)
    - frontend/web/src/App.tsx (/app/* routes)
  affects:
    - frontend/web/src/App.tsx
tech_stack:
  added:
    - react-leaflet@^5.0.0
    - leaflet@^1.9.x
    - "@types/leaflet@^1.9.x"
  patterns:
    - Zustand store per domain slice
    - apiClient from ./client for all service calls
    - Ant Design Layout (Sider + Content) for consumer shell
    - React Router nested routes with RequireAuth guard
key_files:
  created:
    - frontend/web/src/types/consumer.ts
    - frontend/web/src/api/listService.ts
    - frontend/web/src/api/productService.ts
    - frontend/web/src/api/storeService.ts
    - frontend/web/src/api/optimizerService.ts
    - frontend/web/src/api/assistantService.ts
    - frontend/web/src/api/ocrService.ts
    - frontend/web/src/api/notificationService.ts
    - frontend/web/src/api/priceService.ts
    - frontend/web/src/store/consumer/consumerAuthStore.ts
    - frontend/web/src/store/consumer/listStore.ts
    - frontend/web/src/pages/consumer/ConsumerLayout.tsx
    - frontend/web/src/pages/consumer/ListsPage.tsx
    - frontend/web/src/pages/consumer/ListDetailPage.tsx
    - frontend/web/src/pages/consumer/TemplatesPage.tsx
    - frontend/web/src/pages/consumer/RoutePage.tsx
    - frontend/web/src/pages/consumer/ProductsCatalogPage.tsx
    - frontend/web/src/pages/consumer/PriceComparePage.tsx
    - frontend/web/src/pages/consumer/ProductProposalPage.tsx
    - frontend/web/src/pages/consumer/MapPage.tsx
    - frontend/web/src/pages/consumer/StoreProfilePage.tsx
    - frontend/web/src/pages/consumer/FavoritesPage.tsx
    - frontend/web/src/pages/consumer/AssistantPage.tsx
    - frontend/web/src/pages/consumer/OCRPage.tsx
    - frontend/web/src/pages/consumer/ProfilePage.tsx
    - frontend/web/src/pages/consumer/EditProfilePage.tsx
    - frontend/web/src/pages/consumer/ChangePasswordPage.tsx
    - frontend/web/src/pages/consumer/OptimizerConfigPage.tsx
    - frontend/web/src/pages/consumer/NotificationsPage.tsx
    - frontend/web/src/pages/consumer/PriceAlertsPage.tsx
  modified:
    - frontend/web/package.json
    - frontend/web/package-lock.json
    - frontend/web/src/App.tsx
decisions:
  - "Used apiClient (authenticated) for storeService.getNearby instead of publicApiClient from mobile — web consumer section requires auth throughout"
  - "Dropped places-autocomplete, places-resolve, getPlacesDetail from storeService — not needed for consumer web MVP"
  - "All 18 consumer pages are stubs; plans 12-02 through 12-06 will implement them"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-05-27"
  tasks_completed: 2
  files_created: 31
  files_modified: 3
---

# Phase 12 Plan 01: Consumer Web Scaffold Summary

**One-liner:** Consumer web scaffold with 8 typed API services, Zustand stores, Ant Design sidebar layout, 18 stub pages, and /app/* React Router routes behind RequireAuth guard.

## What Was Done

### Task 1 — Packages, types, and service files

Installed `react-leaflet`, `leaflet`, and `@types/leaflet` into `frontend/web/`.

Created `frontend/web/src/types/consumer.ts` with all domain types ported from the mobile `frontend/src/types/domain.ts`: `ShoppingList`, `ShoppingListItem`, `ListTemplate`, `ListTemplateItem`, `Product`, `ProductCategory`, `Store`, `UserProfile`, `Notification`, `PriceAlert`, `PriceCompare`, `OCRItem`, `ChatMessage`, `OptimizerConfig`, `RouteStop`, `RouteStopProduct`, `OptimizeResponse`, plus type aliases `StoreChain`, `ProductUnit`, `PriceSource`.

Created all 8 API service files under `frontend/web/src/api/`, each importing from `./client` and using `apiClient`:

- `listService.ts` — full CRUD for shopping lists and items, template management, paginated response normalizer
- `productService.ts` — product search, autocomplete, categories, proposal submission with RawProduct normalizer
- `storeService.ts` — nearby stores, store detail, favorites toggle, store products with RawStore/RawStoreProductOffer normalizers; places-related methods dropped (not needed for consumer web)
- `optimizerService.ts` — optimize route, get/update optimizer config
- `assistantService.ts` — LLM chat endpoint wrapper
- `ocrService.ts` — multipart FormData image upload for ticket OCR
- `notificationService.ts` — paginated notifications inbox, mark-read, mark-all-read, delete; registerPushToken dropped (web only)
- `priceService.ts` — price comparison and alert CRUD

### Task 2 — Stores, layout, stub pages, App.tsx routes

Created `frontend/web/src/store/consumer/consumerAuthStore.ts` — Zustand store for consumer `UserProfile` state with `setProfile` / `clearProfile` actions.

Created `frontend/web/src/store/consumer/listStore.ts` — Zustand store for `ShoppingList[]` with `setLists`, `upsertList`, `removeList`, `setActiveListId`.

Created `frontend/web/src/pages/consumer/ConsumerLayout.tsx` — Ant Design `Sider` (dark theme, 220px fixed) with 5 nav items (Listas, Catálogo, Mapa, Asistente, Perfil), logout button that clears localStorage tokens and navigates to `/login`, and `<Outlet />` in the content area.

Created 18 stub page components under `frontend/web/src/pages/consumer/` — each exports a default React functional component with an Ant Design `Typography.Title` and a "Próximamente..." placeholder. Plans 12-02 through 12-06 will replace these with full implementations.

Updated `frontend/web/src/App.tsx` — added 19 consumer imports and a `/app/*` route block wrapped in `<RequireAuth><ConsumerLayout /></RequireAuth>`, placed before the catch-all route. All existing PYME and admin routes remain unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] storeService uses apiClient instead of publicApiClient**
- **Found during:** Task 1
- **Issue:** Mobile `storeService` uses `publicApiClient` for `getNearby`, `getDetail`, and `getProducts`. The web consumer section has no `publicApiClient` export from `client.ts` and all consumer routes are behind `RequireAuth`.
- **Fix:** All storeService methods use `apiClient`. Backend enforces ownership; auth is required for consumer section anyway.
- **Files modified:** `frontend/web/src/api/storeService.ts`

**2. [Rule 2 - Missing critical functionality] navigate() return value void-wrapped**
- **Found during:** Task 2
- **Issue:** TypeScript strict mode flags unhandled Promise from `navigate()` call in ConsumerLayout logout handler.
- **Fix:** Wrapped `navigate('/login')` call with `void` to explicitly discard the Promise.
- **Files modified:** `frontend/web/src/pages/consumer/ConsumerLayout.tsx`

## TypeScript Check Result

```
npx tsc --noEmit
(no output — zero errors)
```

## Known Stubs

All 18 pages in `frontend/web/src/pages/consumer/` are stubs that display "Próximamente..." placeholder text. This is intentional per the plan — they are scaffolding targets for plans 12-02 through 12-06.

| Stub | File | Resolved by |
|------|------|-------------|
| ListsPage | pages/consumer/ListsPage.tsx | Plan 12-02 |
| ListDetailPage | pages/consumer/ListDetailPage.tsx | Plan 12-02 |
| TemplatesPage | pages/consumer/TemplatesPage.tsx | Plan 12-02 |
| RoutePage | pages/consumer/RoutePage.tsx | Plan 12-03 |
| ProductsCatalogPage | pages/consumer/ProductsCatalogPage.tsx | Plan 12-04 |
| PriceComparePage | pages/consumer/PriceComparePage.tsx | Plan 12-04 |
| ProductProposalPage | pages/consumer/ProductProposalPage.tsx | Plan 12-04 |
| MapPage | pages/consumer/MapPage.tsx | Plan 12-05 |
| StoreProfilePage | pages/consumer/StoreProfilePage.tsx | Plan 12-05 |
| FavoritesPage | pages/consumer/FavoritesPage.tsx | Plan 12-05 |
| AssistantPage | pages/consumer/AssistantPage.tsx | Plan 12-06 |
| OCRPage | pages/consumer/OCRPage.tsx | Plan 12-06 |
| ProfilePage | pages/consumer/ProfilePage.tsx | Plan 12-06 |
| EditProfilePage | pages/consumer/EditProfilePage.tsx | Plan 12-06 |
| ChangePasswordPage | pages/consumer/ChangePasswordPage.tsx | Plan 12-06 |
| OptimizerConfigPage | pages/consumer/OptimizerConfigPage.tsx | Plan 12-06 |
| NotificationsPage | pages/consumer/NotificationsPage.tsx | Plan 12-06 |
| PriceAlertsPage | pages/consumer/PriceAlertsPage.tsx | Plan 12-06 |

## Self-Check: PASSED

All created files verified present. Commit `202ea4f` confirmed in git log.
