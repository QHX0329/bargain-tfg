# Phase 3: Frontend - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

All React Native screens connected to real backend data — no more hardcoded mock values. Covers the mobile app (React Native + Expo) and a separate React web app for the business PYME portal. OCR, optimizer screens, and LLM chat are Phase 4/5. This phase builds the full auth flow, shopping list UI, store/price views, profile, notification inbox, and the business web dashboard.

</domain>

<decisions>
## Implementation Decisions

### Home Screen
- **Purpose:** Dashboard with live API data — not a quick-action hub or optimizer teaser stub
- **Widgets shown:** (1) recent lists, (2) nearby stores count, (3) active price alerts, (4) notifications digest
  - Recent lists: show **2 most recently edited** lists with item count; tap navigates to Lists tab
  - Nearby stores: shows count of stores within the user's configured radius; tap navigates to Map tab
  - Price alerts: shows active alerts with current vs. target price; tap opens a dedicated alerts screen
  - Notifications digest: shows **2-3 most recent unread notifications** inline; tap opens full notification inbox
- **Personalized greeting:** Display user's first name at the top — "Hola, Nicolás 👋"
- **Quick search bar:** Prominent `SearchBar` component (already exists) at the top; tap navigates to the lists/search flow
- **Optimizer teaser:** Include a disabled/grayed-out "Optimizar ruta" card marked "Próximamente" — activates in Phase 4
- **Loading states:** Skeleton screens (not spinners) for all widgets while data loads
- **Location permission denied:** Show a prompt card inside the nearby-stores widget — "Activa la ubicación para ver tiendas cercanas" with CTA to open OS settings
- **Pull to refresh:** Yes — refreshes all widgets simultaneously
- **Widget navigation:** Tab-based — tapping a widget jumps to the corresponding tab or pushes a screen

### Notification Inbox
- **Placement:** Bell icon in the top-right of the home screen header; pushes a `NotificationScreen` onto the Home stack. Keeps the 4-tab navigation intact.
- **Badge:** Unread count (is_read=false), capped at 99+; disappears when all read
- **Inbox layout:** Grouped by day — "Hoy", "Ayer", "Esta semana" section headers
- **Tap behavior:** Navigate + mark as read in one action (PATCH /notifications/{id}/read/ + navigate to deep link target)
- **Navigation error handling:** If target no longer exists (deleted list, etc.), show toast "El contenido ya no está disponible" and stay on inbox
- **Swipe-to-delete:** Swipe left reveals "Eliminar" action → soft delete via DELETE /notifications/{id}/
- **Mark all as read:** "Marcar todo leído" text button in the screen header; bulk PATCH on all unread
- **Pagination:** Load 20 notifications initially; auto-fetch on scroll end (load-more pattern)
- **Empty state:** Simple centered text — "Sin notificaciones"

### Profile Screen
- **Layout:** Scrollable settings-style list (sections with headers), like iOS Settings
- **Sections:**
  1. **User info** — avatar placeholder (no upload), name, email, member since
  2. **Optimización** — three live sliders (Precio / Distancia / Tiempo) summing to 100%, plus radius slider (1–20km). Auto-save via PATCH /users/me/preferences/ with 500ms debounce
  3. **Notificaciones** — master toggle (push_notifications_enabled), then per-event toggles (notify_price_alerts, notify_new_promos, notify_shared_list_changes). Per-event toggles grayed out when master is off. If OS push permission denied, show banner: "Las notificaciones push están bloqueadas en tu dispositivo" + button to open OS settings
  4. **Cuenta** — "Cambiar contraseña" row (pushes a change-password form), "Eliminar cuenta" (grayed-out stub with "Próximamente"), "Cerrar sesión" with confirmation alert dialog
- **Optimization sliders:** max_search_radius_km as a 1–20km slider; max_stops as Claude's discretion
- **Logout confirmation:** Native Alert — "¿Cerrar sesión?" with "Cancelar" and "Cerrar sesión" buttons
- **Delete account stub:** Visible but grayed out; tap shows "Esta función estará disponible próximamente"
- **Change password:** Pushes a form with old password + new password + confirm fields; PATCH /users/me/

### Business PYME Web Portal
- **Platform:** Separate React web app — not React Native, not Expo web
- **Location in repo:** `frontend/web/` subdirectory
- **UI library:** Ant Design (for admin-ready tables, forms, modals)
- **Auth:** Own login page calling POST /api/v1/auth/token/; JWT stored in localStorage. No shared state with mobile app.
- **Screens (4):**
  1. **Dashboard overview** — summary stats: store name, active promotions count, recent price updates, competitor alerts (email-only per Phase 2 decision — no in-portal alert banner)
  2. **Prices management** — list of business price records; add/edit price supports **both** product name search (calls fuzzy products API) **and** barcode scanning (browser camera API)
  3. **Promotions management** — table of active/expired promos; create via modal form (product search, discount_type flat/%, discount_value, start_date, optional end_date, optional min_quantity, title, description); both business and admin can deactivate
  4. **Business profile** — view/edit business name, CIF, address; shows verification status badge
- **Unverified state:** Full-page status screen blocks all other routes:
  - Pending: "Tu solicitud está siendo revisada. Te notificaremos cuando sea aprobada."
  - Rejected: Shows rejection reason + "Editar perfil" button to re-submit
- **Competitor price alerts:** Email-only (Phase 2 decision) — no in-portal UI for this

### Loading & Error Patterns (applies to all mobile screens)
- **Loading:** Skeleton screens (animated grey placeholders) — established here as the project-wide pattern
- **Empty states:** Simple centered text describing the empty state (not illustrations)
- **API errors:** Toast notifications for transient errors; inline error message for form errors
- **Location not granted:** Prompt card with CTA to open OS settings (not hiding the widget entirely)

### Claude's Discretion
- Exact slider step increments for optimization weights
- max_stops slider range and presentation in profile
- Skeleton screen visual design (shape, animation speed)
- Exact Ant Design theme customization for the business web portal
- Order of widgets on the home dashboard (within the 4 decided widgets)
- Deep link routing implementation details (bargain:// scheme → React Navigation)

</decisions>

<specifics>
## Specific Ideas

- The home screen greeting + quick search + widgets layout mirrors modern shopping apps (Glovo, Mercadona app) — functional, not flashy
- Optimization sliders summing to 100% is a meaningful constraint — users understand they're trading off among the three criteria. Visual feedback when they sum to 100 (e.g., green indicator) would reinforce this.
- Business portal uses Ant Design specifically for its admin-grade Table, Form, Modal, and Drawer components — the PYME portal is a back-office tool, not a consumer-facing product, so the AntD aesthetic fits.
- Barcode scanning on the business web portal uses the browser's `getUserMedia` API (available in Chrome/Edge on HTTPS) — acceptable for a TFG demo context.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RootNavigator` (navigation/RootNavigator.tsx): Auth/Main split already implemented — Phase 3 only wires up real API calls, doesn't restructure navigation
- `MainTabs` (navigation/MainTabs.tsx): 4-tab layout (Home, Lists, Map, Profile) is established — notification bell goes in the Home header, not as a 5th tab
- `SearchBar` (components/ui/SearchBar.tsx): Already exists — reuse on home screen for quick product search
- `ProductCard` (components/ui/ProductCard.tsx): Already exists — reuse in list item search results
- `BargainButton` (components/ui/BargainButton.tsx): Already exists — reuse for CTAs
- `BottomTabBar` (components/ui/BottomTabBar.tsx): Custom tab bar, already wired
- `authStore` (store/authStore.ts): Zustand auth store exists — JWT state management already scaffolded
- `client.ts` (api/client.ts): Axios base client exists — needs interceptors for JWT refresh + API response unwrapping
- `colors`, `typography`, `spacing` (theme/): Theme tokens established — all new screens must use these

### Established Patterns
- Screens already exist as shells (`HomeScreen`, `LoginScreen`, `RegisterScreen`, `ListsScreen`, `ListDetailScreen`, `MapScreen`, `ProfileScreen`) — Phase 3 fills them with real data, doesn't create new files for these
- API response shape: `{success, data/error}` — Axios interceptor must unwrap `data` so screen code works with plain objects
- JWT 5min access / 30d refresh with rotation — interceptor must handle 401 → refresh → retry
- Zustand stores: `authStore` exists; new stores needed for lists, notifications, profile preferences

### Integration Points
- `client.ts` → add request interceptor (attach Bearer token) + response interceptor (unwrap {success, data}, handle 401 with refresh)
- `HomeScreen` → replace all `MOCK_*` data with API calls to: GET /users/me/, GET /shopping-lists/, GET /stores/nearby/, GET /notifications/
- `ProfileScreen` → connect to GET /users/me/ + PATCH /users/me/preferences/ (with debounce)
- `ListsScreen` / `ListDetailScreen` → connect to shopping lists API (already fully implemented in Phase 1)
- `MapScreen` → connect to GET /stores/nearby/ with user location from Expo Location
- New: `NotificationScreen` pushed from home header bell icon → GET /notifications/
- New: `frontend/web/` React app bootstrapped with Create React App or Vite + Ant Design

</code_context>

<deferred>
## Deferred Ideas

- Optimizer route map screen with polylines — Phase 4 (Plan 04-05)
- OCR camera/gallery capture screen — Phase 5
- LLM assistant chat screen — Phase 5
- Price alert creation UI (user sets target price) — was briefly considered for Phase 3 but the alert-checking result screen can be a stub; full creation flow belongs with Phase 4's price comparison screen
- Avatar upload — v2 (no object storage in TFG scope)
- Real-time shared list sync (WebSocket) — deferred from Phase 1, still out of scope
- Expo EAS build for distribution — v2 (Phase 6 uses Expo Go)

</deferred>

---

*Phase: 03-frontend*
*Context gathered: 2026-03-18*
