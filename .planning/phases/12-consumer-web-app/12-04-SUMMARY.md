---
phase: 12-consumer-web-app
plan: "04"
subsystem: ui
tags: [react-leaflet, leaflet, openstreetmap, ant-design, geolocation, favorites, store-map]

requires:
  - phase: 12-consumer-web-app
    provides: storeService, Store type, consumer types, routing scaffold, leaflet installed

provides:
  - MapPage with React Leaflet MapContainer showing nearby store markers on OpenStreetMap
  - StoreProfilePage with store Descriptions, opening hours card, and favorite toggle
  - FavoritesPage with favorite stores list and per-item remove via toggleFavorite
  - Leaflet CSS imported in main.tsx (required for all Leaflet consumers)
  - PNG module declaration in vite-env.d.ts for Leaflet marker image imports

affects: [12-05, 12-06, consumer-web-app]

tech-stack:
  added: []
  patterns:
    - "Leaflet marker icon fix: delete _getIconUrl + L.Icon.Default.mergeOptions at module top-level before component definition"
    - "PNG imports declared via declare module '*.png' in vite-env.d.ts for Vite bundler compatibility"
    - "Geolocation with graceful fallback: attempt navigator.geolocation, fall back to Seville center [37.3886, -5.9823] on denial/unavailability"
    - "PostGIS coordinate reversal: coordinates[1] for lat, coordinates[0] for lng (PostGIS stores [lng, lat])"
    - "Favorite toggle pattern: optimistic state update with loading guard per-item (removingId)"

key-files:
  created:
    - frontend/web/src/pages/consumer/MapPage.tsx
    - frontend/web/src/pages/consumer/StoreProfilePage.tsx
    - frontend/web/src/pages/consumer/FavoritesPage.tsx
  modified:
    - frontend/web/src/main.tsx
    - frontend/web/src/vite-env.d.ts

key-decisions:
  - "Use <a href> inside Leaflet Popup instead of React Router <Link> — React Router context may not propagate inside Leaflet's portal DOM"
  - "Add declare module '*.png' to vite-env.d.ts rather than casting to avoid any — keeps strict TypeScript"
  - "Geolocation call is fire-and-forget with fallback; no spinner blocking the page while waiting for permission"

patterns-established:
  - "Leaflet icon fix: always at module top-level in the file that imports react-leaflet"
  - "PNG type declarations: vite-env.d.ts is the correct place for asset module declarations"

requirements-completed:
  - WEB-04

duration: 15min
completed: 2026-05-27
---

# Phase 12 Plan 04: Map View, Store Profile, and Favorites Summary

**React Leaflet map page with OpenStreetMap tiles and geolocation fallback, plus store profile with favorite toggle and favorites list**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-27T00:00:00Z
- **Completed:** 2026-05-27T00:15:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- MapPage renders an interactive OpenStreetMap with Marker pins for nearby stores; L.Icon.Default fix prevents broken icons under Vite; geolocation falls back gracefully to Seville center when denied
- StoreProfilePage shows store chain/address/opening hours via Ant Design Descriptions and Card; favorite toggle uses loading state and message feedback
- FavoritesPage lists all bookmarked stores with per-item remove action; empty state handled with Ant Design Empty
- Leaflet CSS added as first import in main.tsx; PNG module declaration added to vite-env.d.ts for strict TypeScript

## Task Commits

1. **Tasks 1 & 2: Map, Store Profile, Favorites** - `71e155d` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `frontend/web/src/main.tsx` - Added `import 'leaflet/dist/leaflet.css'` as first import
- `frontend/web/src/vite-env.d.ts` - Added `declare module '*.png'` for Leaflet marker images
- `frontend/web/src/pages/consumer/MapPage.tsx` - React Leaflet map with OSM tiles, geolocation, store markers
- `frontend/web/src/pages/consumer/StoreProfilePage.tsx` - Store detail view with favorite toggle
- `frontend/web/src/pages/consumer/FavoritesPage.tsx` - Favorite stores list with remove action

## Decisions Made

- Used `<a href>` inside Leaflet Popup instead of React Router `<Link>` — React Router context does not reliably propagate into Leaflet's portal-rendered DOM
- Added `declare module '*.png'` to vite-env.d.ts instead of `as string` casts — keeps strict TypeScript without any-casting
- Geolocation handled asynchronously without blocking UI: stores load with fallback coords while permission prompt is open

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added PNG module declaration for Leaflet marker images**
- **Found during:** Task 1 (MapPage implementation)
- **Issue:** TypeScript strict mode rejects `import markerIcon from 'leaflet/dist/images/marker-icon.png'` without a module declaration — would cause tsc error
- **Fix:** Added `declare module '*.png' { const src: string; export default src; }` to vite-env.d.ts
- **Files modified:** frontend/web/src/vite-env.d.ts
- **Verification:** `npx tsc --noEmit` exits clean (no output)
- **Committed in:** 71e155d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Required for TypeScript compilation — no scope creep.

## Issues Encountered

None — plan executed cleanly once PNG type declaration was added.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Map, store profile, and favorites pages are fully implemented and type-safe
- All three pages are already registered in the router (from 12-01 scaffold)
- Ready for Wave 3 phases (12-05: optimizer, 12-06: settings/profile)

---
*Phase: 12-consumer-web-app*
*Completed: 2026-05-27*
