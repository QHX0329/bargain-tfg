# Phase 12 Research: Consumer Web App

**Date:** 2026-05-27
**Scope:** Implement all consumer-facing mobile features as web pages in `frontend/web/`

---

## 1. Current State

### Web portal (`frontend/web/`) — already exists
- **Stack:** Vite + React + TypeScript + Ant Design + Tailwind CSS
- **Routing:** React Router DOM v6 (`BrowserRouter` in `App.tsx`)
- **API:** `frontend/web/src/api/client.ts` — Axios with JWT interceptor + token refresh queue
  - Base URL: `https://bargain-api-8yr0.onrender.com/api/v1` (env override via `VITE_API_URL`)
  - Auto-unwraps `{ success: true, data: ... }` envelope
  - Handles 401 → refresh → retry loop
- **State:** Zustand via `businessStore.ts` (token, profile, business-related state)
- **Auth:** `localStorage` (`access_token`, `refresh_token`)
- **Pages implemented (PYME-focused):**
  - `LandingPage`, `LoginPage`, `RegisterPage`
  - `DashboardPage`, `BusinessProfilePage`, `MerchantOnboardingPage`
  - `PricesPage`, `ProductsUploadPage`, `PromotionsPage`
  - `AdminApprovalPage`, `DocsPage`

### Mobile app (`frontend/src/`) — reference implementation
- **Stack:** React Native + Expo
- **Services (all usable as reference):**
  - `authService.ts`, `listService.ts`, `optimizerService.ts`
  - `ocrService.ts`, `assistantService.ts`
  - `productService.ts`, `priceService.ts`, `storeService.ts`
  - `notificationService.ts`
- **Screens (to port to web):**
  - `home/`: HomeScreen, ProductsCatalogScreen, PriceCompareScreen, FavoriteStoresScreen, NotificationScreen, PriceAlertsScreen, ProductProposalScreen
  - `lists/`: ListsScreen, ListDetailScreen, OCRScreen, TemplatesScreen, RouteScreen
  - `map/`: MapScreen, MapScreen.web.tsx, StoreProfileScreen
  - `profile/`: ProfileScreen, EditProfileScreen, ChangePasswordScreen, OptimizerConfigScreen
  - `assistant/`: AssistantScreen

---

## 2. Architecture Decision: New Consumer Section

The user wants a **separate section** from the PYME portal, but within the same `frontend/web/` Vite app. The approach:

- Consumer routes under `/app/*` (separate from PYME `/dashboard/*`)
- New `ConsumerLayout` component with sidebar/tab navigation (lists, catalog, map, assistant, profile)
- Shared `apiClient` from `frontend/web/src/api/client.ts` (already has JWT + refresh)
- New consumer-specific Zustand stores:
  - `consumerAuthStore.ts` (user info, preferences)
  - `listStore.ts` (shopping lists)
  - `notificationStore.ts`
- New service files under `frontend/web/src/api/` (porting mobile services):
  - `listService.ts`, `optimizerService.ts`, `ocrService.ts`
  - `assistantService.ts`, `productService.ts`, `storeService.ts`
  - `notificationService.ts`

---

## 3. Key Technical Decisions

### Map: React Leaflet
- Install: `react-leaflet` + `leaflet` + `@types/leaflet`
- Replace React Native Maps with `MapContainer`, `TileLayer`, `Marker`, `Popup`
- Use OpenStreetMap tiles (no API key required)
- `MapScreen.web.tsx` already exists in mobile as a partial reference

### OCR: File Upload
- Mobile uses camera (`expo-camera`), web uses `<input type="file" accept="image/*">`
- Ant Design `Upload` component wraps file selection
- POST to `POST /api/v1/ocr/process/` with `multipart/form-data`

### Navigation
- React Router DOM v6 nested routes
- `ConsumerLayout` with `<Outlet />` pattern
- Sidebar for desktop, bottom-tab behavior on mobile viewport

### Auth separation
- PYME users go to `/login` → `/dashboard`
- Consumer users go to `/login` → `/app/lists` (same login page, route by role or keep shared)
- Role detection from `access_token` JWT payload or from `/api/v1/auth/me/` response

---

## 4. Backend API Endpoints (consumer-facing, already implemented)

| Feature | Endpoint |
|---------|----------|
| Auth | `POST /api/v1/auth/token/` · `/token/refresh/` · `/register/` |
| Lists | `GET/POST /api/v1/lists/` · `GET/PATCH/DELETE /api/v1/lists/{id}/` |
| Items | `GET/POST /api/v1/lists/{id}/items/` · `PATCH/DELETE /api/v1/lists/{id}/items/{item_id}/` |
| Optimizer | `POST /api/v1/optimizer/optimize/` |
| OCR | `POST /api/v1/ocr/process/` |
| Assistant | `POST /api/v1/assistant/chat/` |
| Products | `GET /api/v1/products/` · `GET /api/v1/products/{id}/` |
| Prices | `GET /api/v1/prices/?product={id}` |
| Stores | `GET /api/v1/stores/` · `GET /api/v1/stores/{id}/` |
| Favorites | `GET/POST /api/v1/stores/favorites/` · `DELETE /api/v1/stores/favorites/{id}/` |
| Notifications | `GET /api/v1/notifications/` · `PATCH /api/v1/notifications/{id}/mark_read/` |
| Price alerts | `GET/POST /api/v1/prices/alerts/` |
| Profile | `GET/PATCH /api/v1/users/profile/` · `POST /api/v1/auth/change-password/` |
| Optimizer config | `GET/PATCH /api/v1/optimizer/config/` |

---

## 5. Plan Breakdown

### Wave 1
- **12-01**: Consumer section scaffold (layout, routing, shared stores/services, auth)
- **12-02**: Shopping lists + List detail (CRUD lists + items)

### Wave 2
- **12-03**: Route optimizer + Product catalog + Price comparison
- **12-04**: Map (React Leaflet) + Store profile + Favorites

### Wave 3
- **12-05**: AI Assistant + OCR (file upload)
- **12-06**: Profile + Optimizer config + Notifications + Price alerts

---

## 6. Packages to Install

```bash
# In frontend/web/
npm install react-leaflet leaflet @types/leaflet
npm install zustand  # already likely installed via antd workspace — verify
```

---

## 7. Files to Create

### New directories
- `frontend/web/src/pages/consumer/` — consumer page components
- `frontend/web/src/components/consumer/` — consumer-specific UI components
- `frontend/web/src/store/consumer/` — consumer Zustand stores

### New service files
- `frontend/web/src/api/listService.ts`
- `frontend/web/src/api/optimizerService.ts`
- `frontend/web/src/api/ocrService.ts`
- `frontend/web/src/api/assistantService.ts`
- `frontend/web/src/api/productService.ts`
- `frontend/web/src/api/storeService.ts`
- `frontend/web/src/api/notificationService.ts`

### New page files
- `consumer/ConsumerLayout.tsx` (layout + navigation)
- `consumer/ListsPage.tsx`
- `consumer/ListDetailPage.tsx`
- `consumer/RoutePage.tsx`
- `consumer/ProductsCatalogPage.tsx`
- `consumer/PriceComparePage.tsx`
- `consumer/MapPage.tsx`
- `consumer/StoreProfilePage.tsx`
- `consumer/FavoritesPage.tsx`
- `consumer/AssistantPage.tsx`
- `consumer/OCRPage.tsx`
- `consumer/ProfilePage.tsx`
- `consumer/EditProfilePage.tsx`
- `consumer/ChangePasswordPage.tsx`
- `consumer/OptimizerConfigPage.tsx`
- `consumer/NotificationsPage.tsx`
- `consumer/PriceAlertsPage.tsx`

---

*Research date: 2026-05-27*
