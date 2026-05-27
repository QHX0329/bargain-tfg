---
phase: 12-consumer-web-app
plan: "02"
subsystem: frontend-web
tags: [react, typescript, ant-design, shopping-lists, consumer-web]
dependency_graph:
  requires: [12-01]
  provides: [ListsPage, ListDetailPage, TemplatesPage]
  affects: [frontend/web/src/pages/consumer]
tech_stack:
  added: []
  patterns:
    - Ant Design List + Modal pattern for CRUD pages
    - Optimistic local state updates (no re-fetch after mutations)
    - useParams for dynamic route segments in list detail
    - Space.Compact for inline add-item form
key_files:
  created: []
  modified:
    - frontend/web/src/pages/consumer/ListsPage.tsx
    - frontend/web/src/pages/consumer/ListDetailPage.tsx
    - frontend/web/src/pages/consumer/TemplatesPage.tsx
decisions:
  - Optimistic local state updates chosen over re-fetch after each mutation for snappier UX
  - Space.Compact used for inline add-item form per plan spec
  - Named exports added alongside default exports for both named and default import compatibility
  - void operator used on floating Promises from message.* calls to satisfy TypeScript strict mode
metrics:
  duration_minutes: 20
  completed_date: "2026-05-27"
  tasks_completed: 2
  files_modified: 3
---

# Phase 12 Plan 02: Shopping Lists Pages Summary

**One-liner:** Three fully functional Ant Design shopping list pages — CRUD lists, item management with checkbox/add/delete, and template browser with create-from-template flow.

## What Was Built

### Task 1: ListsPage — list CRUD

`frontend/web/src/pages/consumer/ListsPage.tsx` (156 lines)

- Fetches all shopping lists on mount via `listService.getLists()`
- Renders Ant Design `List` with per-row open (navigate) and delete (Popconfirm) actions
- Create modal with controlled `Input`, triggered by "Nueva lista" button
- Empty state with `Empty` component and inline create CTA
- Secondary "Plantillas" button navigating to `/app/templates`
- Loading spinner during API calls
- All errors surfaced via `message.error`

### Task 2: ListDetailPage and TemplatesPage

`frontend/web/src/pages/consumer/ListDetailPage.tsx` (202 lines)

- Reads `listId` from `useParams<{ listId: string }>()`
- Fetches list detail on mount via `listService.getList(listId)`
- Item list with `Checkbox` toggle (calls `updateItem` with `is_checked`), strike-through style when checked, quantity display, optional price display
- Delete item via `Popconfirm` → `deleteItem`
- `Space.Compact` inline add-item form (name Input + quantity InputNumber + Add Button)
- Prominent "Optimizar ruta" button (primary) navigates to `/app/lists/:listId/route`
- "Guardar como plantilla" secondary button opens Modal → `saveAsTemplate`
- Back link `← Mis listas` to `/app/lists`

`frontend/web/src/pages/consumer/TemplatesPage.tsx` (165 lines)

- Fetches templates on mount via `listService.getTemplates()`
- Renders template list with item count `Tag`, "Crear lista" button, delete Popconfirm
- Create-from-template Modal with optional list name input → `createListFromTemplate` → navigate to new list
- Empty state with guidance text
- Back link to `/app/lists`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all three pages are fully wired to `listService.ts`. No hardcoded or placeholder data.

## Threat Flags

None — no new network endpoints or auth paths introduced. All data flows through the existing `listService` / `apiClient` which enforces JWT auth. React JSX auto-escapes all text content (T-12-05 mitigated). Backend ownership enforcement covers T-12-06.

## Self-Check: PASSED

- `frontend/web/src/pages/consumer/ListsPage.tsx` — exists, 156 lines, imports listService
- `frontend/web/src/pages/consumer/ListDetailPage.tsx` — exists, 202 lines, imports listService, useParams, useNavigate
- `frontend/web/src/pages/consumer/TemplatesPage.tsx` — exists, 165 lines, imports listService
- `tsc --noEmit` — 0 errors
- Commit `361bc9e` — `feat(web): Phase 12 Wave 2 — shopping lists (12-02)`
