# Phase 4: Frontend Advanced Polish - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the remaining F4 task: integrate Google Places API into the store/map flow (F4-21). All other F4 tasks (F4-01 through F4-27) are already implemented and verified. Once F4-21 is done, Phase 4 closes and Phase 5 (Optimizer, Scraping, OCR, LLM) begins immediately.

</domain>

<decisions>
## Implementation Decisions

### F4-21 Scope — What Google Places adds

**Autocomplete (client-side, native only):**
- Search bar at the top of the native MapScreen (not the web version)
- Filter to `supermarket` + `grocery_or_supermarket` place types only
- Selecting a result that IS in our DB: pan map + highlight DB marker
- Selecting a result NOT in our DB: pan map + show lightweight info card (name, address, "Ver en Google Maps" external link)
- Last item in autocomplete list: "Buscar en Google Maps" escape hatch that opens Google Maps app
- Key: `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` in frontend `.env` (Expo public, build-time)

**Enrichment (backend proxy, both platforms):**
- Endpoint: `GET /stores/{id}/places-detail/` on the backend
- Fields returned: opening hours (real schedule + open/closed now), star rating + review count, website URL
- Rendered in StoreProfileScreen; if no Places data returned, those sections simply don't render (no empty placeholders)
- Backend caches Places responses in Redis with 24h TTL to protect quota
- Key: `GOOGLE_PLACES_API_KEY` in backend `.env` (server-side, never exposed to client)

**Discovery (native MapScreen):**
- Google Places markers shown alongside DB markers using a distinct visual style (grey color/icon vs. chain-colored DB markers)
- Tapping a Places discovery marker shows a lightweight bottom card (name, address, "Ver en Google Maps") — does NOT push StoreProfile
- No favorite button on Places-only markers (favorites require a DB store ID)

### Fallback strategy

- **API key missing / Places API unavailable:** Show the autocomplete search bar as grayed-out with label "Búsqueda avanzada no disponible". Feature is visible but clearly inactive — app works normally with DB stores only.
- **No Places data for a specific store:** StoreProfile shows DB data only. Enrichment sections (opening hours, rating, website) are omitted entirely — no empty slots, no loading skeletons for those fields.
- **Places API runtime error:** Silent — enrichment fields simply don't appear. No toast for enrichment failures (avoid noisy UX in production).

### Platform split

- **Native (MapScreen.tsx):** Full Places integration — autocomplete bar, discovery markers, enrichment
- **Web (MapScreen.web.tsx):** No Places autocomplete. The web map shows DB stores only. No search bar added.
- **StoreProfile enrichment:** Works on both platforms — it's a backend proxy call, platform-agnostic.

### Favorites

- Only DB-backed stores (with a real `store.id`) can be favorited
- Places discovery markers show no favorite button
- No auto-creation of Store DB records from Places results — that's crowdsource scope (F5+)

### Phase closure

- F4-21 is implemented within Phase 4 (not deferred to F5)
- Once F4-21 is done and tested, Phase 4 closes immediately
- Phase 5 starts right after — no buffer period between phases

### Claude's Discretion

- Exact react-native-google-places-autocomplete component props and styling within the MapScreen top bar
- Redis cache key format for `/stores/{id}/places-detail/`
- Exact placement and sizing of the grey Places discovery markers relative to chain markers
- Whether the lightweight Places info card uses the existing AppModal or a custom bottom sheet

</decisions>

<specifics>
## Specific Ideas

- The autocomplete bar goes at the top of MapScreen — same position as the search bars in Home and Catalog screens (consistent with F4-24 pattern)
- The "distinct visual style" for Places discovery markers should make it instantly clear these are not BargAIn stores (grey, smaller, or a generic map pin vs. chain-branded markers)
- The disabled state for the autocomplete bar when the key is missing mirrors how "Optimizar ruta" was shown as "Próximamente" in F4 — visible but inactive, not hidden

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MapScreen.tsx` / `MapScreen.web.tsx` (screens/map/): Both exist — autocomplete bar is added to the native variant only
- `StoreProfileScreen.tsx` (screens/map/): Already built in F4-25; Places enrichment sections added here
- `storeService.ts` (api/storeService.ts): Has `getDetail()`, `getNearby()`, `getFavorites()`, `toggleFavorite()` — add `getPlacesDetail(storeId)` for enrichment
- `AppModal` (components/ui/): Existing modal component — may serve as the lightweight Places info card
- `SkeletonBox` (components/ui/): Skeleton loading for enrichment sections in StoreProfile
- `authStore` (store/authStore.ts): JWT token management — backend proxy call inherits standard auth flow

### Established Patterns
- Skeleton loading for async data (Phase 3 decision — project-wide)
- Toast notifications for transient errors (Phase 3 decision)
- `apiClient` Axios instance handles JWT + `{success, data}` unwrapping — backend proxy call uses same client
- Environment variables via `EXPO_PUBLIC_*` for client-side keys (Expo pattern)
- Redux-free: Zustand stores for shared state; local useState for ephemeral UI state

### Integration Points
- `MapScreen.tsx` → add `react-native-google-places-autocomplete` search bar at top; handle result selection (DB match vs. new place)
- `StoreProfileScreen.tsx` → call `storeService.getPlacesDetail(id)` on mount; conditionally render enrichment sections
- Backend: new view `StoreDetailPlacesView` at `GET /stores/{id}/places-detail/` — fetches Places API, caches in Redis, returns normalized fields
- Backend `config/settings/`: add `GOOGLE_PLACES_API_KEY` env var; frontend `.env`: add `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`

</code_context>

<deferred>
## Deferred Ideas

- Crowdsource store suggestion flow (user suggests a Places result as a new BargAIn store → admin moderation queue) — F5 or backlog
- "Buscar en Google Maps" for the web version of MapScreen — web map is DB-only by decision
- Favorites for Places-only stores with auto-creation of Store DB records — explicitly out of scope

</deferred>

---

*Phase: 04-frontend-advanced*
*Context gathered: 2026-03-21*
