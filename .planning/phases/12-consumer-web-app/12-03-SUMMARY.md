---
phase: 12-consumer-web-app
plan: "03"
subsystem: frontend-web
tags: [react, typescript, antd, optimizer, catalog, price-comparison]
dependency_graph:
  requires: [12-01]
  provides: [RoutePage, ProductsCatalogPage, PriceComparePage, ProductProposalPage]
  affects: [frontend/web/src/pages/consumer/]
tech_stack:
  added: []
  patterns:
    - geolocation API with Seville fallback
    - 300ms debounced search with useEffect + setTimeout
    - Ant Design Table with ColumnsType generics
    - Form.useForm() for controlled form reset on success
key_files:
  created: []
  modified:
    - frontend/web/src/pages/consumer/RoutePage.tsx
    - frontend/web/src/pages/consumer/ProductsCatalogPage.tsx
    - frontend/web/src/pages/consumer/PriceComparePage.tsx
    - frontend/web/src/pages/consumer/ProductProposalPage.tsx
decisions:
  - Used void operator on message.success/error promises to satisfy no-floating-promises lint convention
  - navigate(-1) used in PriceComparePage for browser-history back navigation
  - Debounce resets page to 1 on query change (prevents stale pagination)
  - TypeScript ColumnsType<T> generics used throughout — no `any` types
metrics:
  duration_minutes: 15
  completed_date: "2026-05-27"
  tasks_completed: 2
  files_modified: 4
---

# Phase 12 Plan 03: Optimizer Results and Product Catalog Summary

**One-liner:** Four consumer pages — optimizer route display with geolocation, debounced product catalog, per-product price comparison table, and new-product proposal form.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Implement RoutePage — optimization result display | 85f7be9 | RoutePage.tsx |
| 2 | Implement ProductsCatalogPage, PriceComparePage, ProductProposalPage | 85f7be9 | ProductsCatalogPage.tsx, PriceComparePage.tsx, ProductProposalPage.tsx |

## What Was Built

**RoutePage** (`/app/lists/:listId/route`):
- Calls `navigator.geolocation.getCurrentPosition()` on mount; falls back to Seville [37.3886, -5.9823] with a visible Alert warning if geolocation is denied or unavailable
- Calls `optimizerService.optimize({ shopping_list_id, lat, lng })` and renders full-page Spin during fetch
- On error: Alert with descriptive message + Volver button
- On success: Row of 4 Statistic components (total cost, distance, time, stops) followed by one Card per RouteStop showing chain Tag, distance/time text, and a small Table of products with prices

**ProductsCatalogPage** (`/app/catalog`):
- `Input.Search` updates local `query` state; a `useEffect` debounces the value 300ms before updating `debouncedQuery` and resetting page to 1
- Separate `useEffect` fires `productService.list()` whenever `debouncedQuery` or `page` changes
- Ant Design Table with server-side pagination (total from API); product name links to `/app/catalog/compare/:id`; "Ver precios" button per row; "Proponer producto" button navigates to proposal page

**PriceComparePage** (`/app/catalog/compare/:productId`):
- Reads `productId` from `useParams()`; fetches `priceService.compare(productId)` on mount
- Table sorted by price ascending (`defaultSortOrder: 'ascend'`); `is_stale` renders colored Tag (green = Actualizado, orange = Desactualizado)
- Empty state via `<Empty>` component; Spin during loading; "← Volver" button uses `navigate(-1)`

**ProductProposalPage** (`/app/catalog/propose`):
- `Form.useForm()` with vertical layout; required `name` field; optional `brand`, `barcode`, `notes` (textarea), `price` (InputNumber, precision 2), `store` (InputNumber, integer)
- On submit: calls `productService.createProposal(values)`, shows success toast + navigates to `/app/catalog`, or shows error toast on failure
- Form resets on success

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|-----------|
| T-12-08 | All product proposal fields are plain JSX-rendered strings — React escapes output; no exec path client-side |
| T-12-09 | 300ms debounce on search input implemented in ProductsCatalogPage prevents rapid-fire API calls |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all four pages are fully implemented with live API calls.

## Self-Check: PASSED

- `frontend/web/src/pages/consumer/RoutePage.tsx` — FOUND
- `frontend/web/src/pages/consumer/ProductsCatalogPage.tsx` — FOUND
- `frontend/web/src/pages/consumer/PriceComparePage.tsx` — FOUND
- `frontend/web/src/pages/consumer/ProductProposalPage.tsx` — FOUND
- Commit `85f7be9` — FOUND
- `npx tsc --noEmit` — PASSED (no errors)
