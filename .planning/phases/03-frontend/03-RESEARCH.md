# Phase 3: Frontend - Research

**Researched:** 2026-03-18
**Domain:** React Native + Expo (mobile), React + Ant Design (web PYME portal)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Home Screen**
- Dashboard with live API data — not a quick-action hub or optimizer teaser stub
- Widgets: (1) recent lists (2 most recently edited, item count), (2) nearby stores count (within configured radius), (3) active price alerts (current vs. target price), (4) notifications digest (2-3 most recent unread)
- Personalized greeting with user's first name: "Hola, Nicolás"
- Quick search bar (SearchBar component, already exists) at the top
- Optimizer teaser: disabled/grayed-out "Optimizar ruta" card marked "Proximamente"
- Loading states: skeleton screens (not spinners) for all widgets
- Location permission denied: prompt card inside nearby-stores widget with CTA to OS settings
- Pull to refresh: yes, refreshes all widgets simultaneously
- Widget navigation: tab-based, tapping jumps to corresponding tab or pushes screen

**Notification Inbox**
- Bell icon in home header; pushes NotificationScreen onto Home stack
- Badge: unread count capped at 99+, disappears when all read
- Inbox grouped by day: "Hoy", "Ayer", "Esta semana"
- Tap: navigate + mark as read (PATCH /notifications/{id}/read/ + navigate deep link)
- Navigation error: toast "El contenido ya no esta disponible" + stay on inbox
- Swipe-to-delete: swipe left reveals "Eliminar" → soft delete via DELETE /notifications/{id}/
- Mark all as read: "Marcar todo leido" header button; bulk PATCH on all unread
- Pagination: 20 notifications initially; load-more on scroll end
- Empty state: centered text "Sin notificaciones"

**Profile Screen**
- Layout: scrollable settings-style list (iOS Settings style)
- Sections: (1) User info (avatar placeholder, name, email, member since), (2) Optimizacion (3 sliders Precio/Distancia/Tiempo summing to 100%, radius slider 1-20km; auto-save via PATCH /users/me/preferences/ with 500ms debounce), (3) Notificaciones (master toggle + per-event toggles grayed when master off; OS push permission denied banner), (4) Cuenta (change password row, delete account stub, logout with confirm dialog)
- Logout confirmation: native Alert with Cancelar / Cerrar sesion
- Delete account: visible but grayed out; shows "Esta funcion estara disponible proximamente"
- Change password: pushes form with old + new + confirm fields; PATCH /users/me/

**Business PYME Web Portal**
- Separate React web app — NOT React Native, NOT Expo web
- Location: frontend/web/ subdirectory
- UI library: Ant Design (admin-grade Table, Form, Modal, Drawer)
- Auth: own login page calling POST /api/v1/auth/token/; JWT in localStorage (no shared state with mobile)
- 4 screens: Dashboard overview, Prices management (add/edit: product name search + barcode via browser camera), Promotions management (table + create modal), Business profile (view/edit + verification status badge)
- Unverified state: full-page status screen blocks all other routes (Pending / Rejected with rejection reason)
- Competitor price alerts: email-only — no in-portal UI

**Loading and Error Patterns (all mobile screens)**
- Loading: skeleton screens (animated grey placeholders) — project-wide pattern
- Empty states: simple centered text (not illustrations)
- API errors: toast for transient errors; inline error for form errors
- Location not granted: prompt card with CTA to OS settings

### Claude's Discretion
- Exact slider step increments for optimization weights
- max_stops slider range and presentation in profile
- Skeleton screen visual design (shape, animation speed)
- Exact Ant Design theme customization for the business web portal
- Order of widgets on the home dashboard (within the 4 decided widgets)
- Deep link routing implementation details (bargain:// scheme -> React Navigation)

### Deferred Ideas (OUT OF SCOPE)
- Optimizer route map screen with polylines — Phase 4
- OCR camera/gallery capture screen — Phase 5
- LLM assistant chat screen — Phase 5
- Price alert creation UI — Phase 4
- Avatar upload — v2
- Real-time shared list sync (WebSocket) — out of scope
- Expo EAS build for distribution — v2 / Phase 6
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NFR-03 | App movil funciona en iOS 15+ y Android 10+ (RNF-007) | Expo SDK 55 targets iOS 15.1+ and Android 5.0+ (API 21+); package.json already on expo@^55.0.6; React Native 0.83.2 supports both platforms. No additional config needed for iOS 15 / Android 10 support in Expo Go. |
</phase_requirements>

---

## Summary

Phase 3 connects an already-scaffolded React Native + Expo frontend to a fully-implemented Django REST backend. The mobile app already has screen shells (HomeScreen, LoginScreen, RegisterScreen, ListsScreen, ListDetailScreen, MapScreen, ProfileScreen), navigation structure (4-tab MainTabs + nested stacks via RootNavigator), a Zustand authStore, an Axios client with a partial JWT interceptor, and a complete design system (colors, typography, spacing tokens). The task is wiring real API calls into these shells — replacing MOCK_* data with live data — plus building a new React web portal for PYME business accounts under `frontend/web/`.

The mobile stack is: Expo 55 + React Native 0.83.2 + React Navigation 7 + Zustand 5 + Axios 1.7 + react-native-reanimated 3.17. None of these require installation — they are already in `package.json`. Missing packages that MUST be added before screens can be built: `expo-location` (map + nearby stores), `react-native-maps` (map screen), `react-native-gesture-handler` (swipe-to-delete in notification inbox). The business web portal requires a Vite project bootstrapped at `frontend/web/` with antd 5.x.

The most critical implementation work is the Axios JWT interceptor upgrade (currently stubs to logout on 401; needs 401 → refresh → retry logic with a queue to prevent multiple concurrent refreshes), four new Zustand stores (lists, notifications, profile preferences, business), and ~10 API service modules matching the backend's URL structure.

**Primary recommendation:** Implement in this order — (1) upgrade apiClient interceptor with refresh + retry queue, (2) new Zustand stores, (3) API service modules, (4) wire screens plan-by-plan following the 6-plan order defined in CONTEXT.md, (5) bootstrap frontend/web/ and implement PYME portal, (6) write tests.

---

## Standard Stack

### Core (already installed — do NOT re-install)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| expo | ^55.0.6 | Expo SDK — build tooling, native APIs | Installed |
| react-native | 0.83.2 | Core mobile framework | Installed |
| @react-navigation/native | ^7.0.0 | Navigation container | Installed |
| @react-navigation/native-stack | ^7.2.0 | Native stack navigator | Installed |
| @react-navigation/bottom-tabs | ^7.2.0 | Bottom tab navigator | Installed |
| zustand | ^5.0.0 | Global state management | Installed |
| axios | ^1.7.9 | HTTP client | Installed |
| react-native-reanimated | ~3.17.4 | Animations (GPU-accelerated) | Installed |
| react-native-safe-area-context | ~5.6.2 | Safe area insets | Installed |
| react-native-screens | ~4.23.0 | Native screen primitives | Installed |
| expo-secure-store | ~55.0.8 | Encrypted token storage | Installed |
| @expo/vector-icons | ^15.0.2 | Ionicons icon set | Installed |

### Must Install (not yet in package.json)

| Library | Version | Purpose | Install Command |
|---------|---------|---------|-----------------|
| expo-location | ~18.1.5 | GPS coordinates for nearby stores + map | `npx expo install expo-location` |
| react-native-maps | ~1.20.1 | Interactive map in MapScreen | `npx expo install react-native-maps` |
| react-native-gesture-handler | ~2.24.0 | Swipe-to-delete gestures (notification inbox) | `npx expo install react-native-gesture-handler` |

> NOTE: Use `npx expo install` (not `npm install`) so Expo picks the version compatible with SDK 55.

### Business Web Portal (new project at frontend/web/)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite | ^6.x | Build tool for React web | Faster than CRA; standard for 2025 |
| react | 19.x | Web UI framework | Matches mobile React version |
| antd | ^5.x | Admin UI component library | Explicitly decided for PYME portal |
| axios | ^1.7.9 | Same HTTP client as mobile | Consistency; JWT interceptor pattern reusable |

**Business web portal installation:**
```bash
cd frontend
npm create vite@latest web -- --template react-ts
cd web
npm install antd axios
```

### Supporting Libraries (already available via Expo SDK 55)

| Library | Purpose |
|---------|---------|
| expo-status-bar | Status bar control |
| react-native-web | Web rendering (via metro) |

---

## Architecture Patterns

### Existing Project Structure (do not change)
```
frontend/
├── App.tsx                   # Root component with NavigationContainer
├── App.test.tsx              # Single smoke test
├── src/
│   ├── api/
│   │   └── client.ts         # Axios instance — MUST UPGRADE interceptor
│   ├── components/
│   │   └── ui/               # BargainButton, BottomTabBar, PriceTag, ProductCard, SearchBar
│   ├── navigation/
│   │   ├── RootNavigator.tsx # Auth/Main split (do not change structure)
│   │   ├── MainTabs.tsx      # 4-tab layout (do not add 5th tab)
│   │   └── types.ts          # Typed param lists — ADD notification routes here
│   ├── screens/
│   │   ├── auth/             # LoginScreen, RegisterScreen — fill with real API calls
│   │   ├── home/             # HomeScreen — replace MOCK_* data
│   │   ├── lists/            # ListsScreen, ListDetailScreen — connect to API
│   │   ├── map/              # MapScreen — implement with react-native-maps
│   │   └── profile/          # ProfileScreen — connect to API
│   ├── store/
│   │   └── authStore.ts      # Zustand auth — ADD refresh token field
│   ├── theme/                # colors, typography, spacing — DO NOT CHANGE
│   ├── types/
│   │   └── domain.ts         # Domain types
│   └── utils/
└── web/                      # NEW: React+Vite PYME business portal
    ├── src/
    │   ├── api/client.ts
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── DashboardPage.tsx
    │   │   ├── PricesPage.tsx
    │   │   ├── PromotionsPage.tsx
    │   │   └── BusinessProfilePage.tsx
    │   ├── components/
    │   └── store/            # auth state (localStorage-backed)
    └── main.tsx
```

### Pattern 1: JWT Interceptor with Refresh + Retry Queue

The current `client.ts` stubs `logout()` on any 401. Phase 3 requires proper refresh-before-retry. The key challenge: multiple concurrent requests can all 401 simultaneously — a naive implementation calls refresh multiple times.

**What:** Queue pending requests while refresh is in-flight; replay them once new token is obtained.

```typescript
// Source: Axios interceptor documentation + community pattern (axios-auth-refresh pattern)
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  (response) => response.data, // unwrap {success, data} shape
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request — resolve when refresh completes
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        const { data } = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });
        const newToken = data.access;
        useAuthStore.getState().setToken(newToken);
        await SecureStore.setItemAsync('access_token', newToken);

        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);
```

**CRITICAL:** The response success interceptor must also unwrap `{success: true, data: {...}}` so screen code receives plain objects, not nested `response.data.data`.

### Pattern 2: Zustand Store with Persistence

`authStore.ts` currently holds only in-memory state — tokens are lost on app restart. Phase 3 must persist tokens using `expo-secure-store`.

```typescript
// Pattern: Zustand with manual SecureStore persistence
// On app start: load tokens from SecureStore, call setToken + setUser
// On login: write to SecureStore + update store
// On logout: clear SecureStore + clear store

// authStore must add: refreshToken field + persist actions
interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  // ... actions
  setRefreshToken: (token: string) => void;
  hydrate: () => Promise<void>; // called in App.tsx on mount
}
```

> Note: Zustand 5 does not include built-in persist middleware that works with SecureStore. Manual hydration pattern is required (load from SecureStore in App.tsx useEffect, then call store.hydrate()).

### Pattern 3: Skeleton Screen Loading

Locked decision: skeleton screens replace all loading spinners. React Native has no built-in skeleton. The pattern uses Reanimated's `withRepeat` + `withTiming` to animate opacity between 0.3 and 1.0.

```typescript
// Source: react-native-reanimated docs — withRepeat
import Animated, { useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

const SkeletonBox: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 800 }),
      -1, // infinite
      true, // reverse
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, backgroundColor: colors.border, borderRadius: 8 }, style]}
    />
  );
};
```

Create a `SkeletonBox` component in `src/components/ui/` — used across ALL screens as the project-wide loading pattern.

### Pattern 4: API Service Modules

Each backend domain gets its own service file in `src/api/`. Screen code imports from these services, never calls `apiClient` directly.

```typescript
// src/api/authService.ts
import { apiClient } from './client';

export const authService = {
  login: (email: string, password: string) =>
    apiClient.post<AuthTokenResponse>('/auth/token/', { email, password }),

  register: (data: RegisterPayload) =>
    apiClient.post<RegisterResponse>('/auth/register/', data),

  refreshToken: (refresh: string) =>
    apiClient.post<RefreshResponse>('/auth/token/refresh/', { refresh }),

  getProfile: () =>
    apiClient.get<UserProfile>('/auth/profile/me/'),

  updatePreferences: (prefs: Partial<UserPreferences>) =>
    apiClient.patch<UserProfile>('/auth/profile/me/', prefs),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiClient.patch('/auth/profile/me/', { old_password: oldPassword, new_password: newPassword }),
};
```

Service files to create:
- `src/api/authService.ts` — auth endpoints (register, login, refresh, profile)
- `src/api/listService.ts` — shopping lists CRUD + items
- `src/api/productService.ts` — search, autocomplete
- `src/api/storeService.ts` — nearby stores
- `src/api/notificationService.ts` — inbox, mark read, delete, push token registration
- `src/api/priceService.ts` — price comparison (for ListDetail screen)

### Pattern 5: Business Web Portal Auth Guard

The PYME portal must block all routes until verified. React Router DOM handles this with a layout wrapper.

```tsx
// UnverifiedGuard.tsx — wraps all authenticated routes
const UnverifiedGuard: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useBusinessStore();

  if (!profile) return <LoadingSpinner />;

  if (profile.verification_status === 'pending') {
    return <PendingApprovalPage />;
  }
  if (profile.verification_status === 'rejected') {
    return <RejectedPage reason={profile.rejection_reason} />;
  }

  return <>{children}</>;
};
```

### Anti-Patterns to Avoid

- **Direct apiClient calls in screen components:** Always go through service modules — makes mocking in tests trivial.
- **Animating layout properties (width/height/top):** Only animate `transform` and `opacity` — GPU-accelerated via Reanimated rule `animation-gpu-properties`.
- **FlatList/ScrollView for long lists:** Use virtualization (FlatList with proper `keyExtractor` + `getItemLayout` for fixed-height items; notification inbox and list items qualify). Project does not yet have FlashList installed; FlatList with `keyExtractor` and `estimatedItemSize` is the correct choice within the current stack.
- **Inline style objects in list items:** Extract StyleSheet.create outside component or use `useMemo` — per `list-performance-inline-objects` skill rule.
- **Multiple Zustand stores for same domain:** One store per domain (auth, lists, notifications, profile) — not one store per screen.
- **JWT stored in AsyncStorage (unencrypted):** Always use `expo-secure-store` — tokens are sensitive credentials.
- **Calling refresh endpoint directly from screen 401 handlers:** Centralize all refresh logic in the Axios interceptor only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skeleton loading animation | Custom animated View with opacity loop | `SkeletonBox` component using Reanimated `withRepeat` | Complex timing, needs to respect `prefers-reduced-motion` |
| JWT token refresh with queue | Ad-hoc refresh in each screen | Centralized Axios interceptor with isRefreshing flag + refreshQueue | Race condition on concurrent 401s is a notorious bug |
| Debounced preference save | Manual setTimeout management | `useDebounce` custom hook (500ms) calling PATCH | Cleanup on unmount, stale closure issues |
| Deep link URL parsing | Manual URL string parsing | React Navigation linking config with `bargain://` scheme | Handles nested navigators, Android back stack |
| Location permission flow | Custom permission state machine | `expo-location` `requestForegroundPermissionsAsync()` | Platform differences between iOS/Android permission APIs |
| Map clustering | Custom marker grouping | react-native-maps built-in `Clusterer` (or defer to Phase 4) | Complex viewport-dependent math |
| Admin tables, forms, modals (web) | Custom HTML table + form | Ant Design Table + Form + Modal | PYME portal is admin UI — AntD is decision-locked |
| Pull-to-refresh | Manual gesture tracking | React Native core `RefreshControl` on ScrollView | Built-in, handles iOS rubber-band physics correctly |
| Toast notifications | Custom overlay management | `Alert` (confirmations) + a simple custom Toast (error messages) | No toast lib decided yet; hand-rolled is acceptable for a small TFG project — keep it simple |

**Key insight:** The three biggest hand-rolling traps in this phase are the JWT refresh race condition, location permission state management, and the notification swipe-to-delete gesture. All three have well-established solutions in the existing stack.

---

## Common Pitfalls

### Pitfall 1: Double-Calling Refresh on Concurrent 401s

**What goes wrong:** Two API calls fire simultaneously; both get 401; both try to refresh; the second refresh call fails because the first already rotated the refresh token (backend returns new token pair on every refresh per Phase 1 decision: 30-day rotation).

**Why it happens:** No coordination between interceptor invocations.

**How to avoid:** The `isRefreshing` flag + `refreshQueue` pattern (Pattern 1 above). The flag is module-level (not component-level) so it persists across invocations.

**Warning signs:** User gets randomly logged out despite valid session; Sentry shows 401 errors immediately after login.

### Pitfall 2: expo-location Requires Explicit Permission on First Use

**What goes wrong:** Calling `getCurrentPositionAsync()` without requesting permission first throws an error on iOS; on Android it silently returns null.

**Why it happens:** iOS requires `NSLocationWhenInUseUsageDescription` in app.json; Expo SDK 55 adds this via `expo-location` config plugin, but only if added to `plugins` in `app.json`.

**How to avoid:**
```json
// app.json — add to "expo" section:
{
  "plugins": [
    ["expo-location", {
      "locationAlwaysAndWhenInUsePermission": "BargAIn necesita tu ubicación para mostrar tiendas cercanas."
    }]
  ]
}
```
Always call `requestForegroundPermissionsAsync()` first; check `status === 'granted'` before calling `getCurrentPositionAsync()`.

**Warning signs:** Map screen shows empty; HomeScreen nearby-stores widget never loads; iOS simulator shows no permission dialog.

### Pitfall 3: react-native-maps Requires Google Maps API Key

**What goes wrong:** MapView renders blank on Android without `GOOGLE_MAPS_API_KEY` in `app.json`; on iOS Simulator it works without a key (uses Apple Maps), masking the issue.

**Why it happens:** `react-native-maps` uses Google Maps on Android and Apple Maps on iOS by default. Google Maps requires an API key with Maps SDK for Android enabled.

**How to avoid:**
```json
// app.json:
{
  "android": {
    "config": {
      "googleMaps": {
        "apiKey": "EXPO_PUBLIC_GOOGLE_MAPS_KEY"
      }
    }
  }
}
```
Store key in `.env` as `EXPO_PUBLIC_GOOGLE_MAPS_KEY`. For a TFG demo, a development-restricted key is sufficient.

**Warning signs:** Android map shows grey tiles; no error thrown (silent failure with wrong key).

### Pitfall 4: Zustand Store State Lost on App Restart

**What goes wrong:** User logs in, closes app, reopens — is logged out again. `authStore` is in-memory only.

**Why it happens:** Current `authStore.ts` has no persistence. `expo-secure-store` is installed but not used.

**How to avoid:** On app mount (App.tsx), call a `hydrate()` action that reads tokens from SecureStore and populates the store. Do this BEFORE rendering the NavigationContainer to avoid auth-flicker.

**Warning signs:** Users report being logged out on every app restart; access token always null on first render.

### Pitfall 5: Response Interceptor Breaks on Non-`{success, data}` Responses

**What goes wrong:** The response interceptor tries to unwrap `response.data.data` but some endpoints (e.g., token/refresh/) return a flat object `{access, refresh}`, not the standard `{success, data}` envelope.

**Why it happens:** JWT endpoints from `djangorestframework-simplejwt` do not use the project's custom response format.

**How to avoid:** Check in the response interceptor whether `response.data.success` exists before unwrapping:
```typescript
(response) => {
  // djangorestframework-simplejwt endpoints return flat objects
  if (response.data?.success !== undefined) {
    return response.data.data;
  }
  return response.data;
}
```

**Warning signs:** `login()` crashes with "Cannot read property of undefined"; token fields are nested unexpectedly.

### Pitfall 6: Navigation type.ts Missing Notification Route

**What goes wrong:** TypeScript error when pushing `NotificationScreen` from Home header; navigation.navigate() call fails at compile time.

**Why it happens:** `HomeStackParamList` in `types.ts` only declares `Home: undefined`. New screen must be registered.

**How to avoid:** Add `Notifications: undefined` to `HomeStackParamList` in `src/navigation/types.ts` before implementing the notification screen.

### Pitfall 7: Vite + Ant Design HMR on Windows with Long Paths

**What goes wrong:** Vite dev server throws `ENOENT` or `EPERM` errors on Windows when the project path contains spaces or Unicode characters (OneDrive paths).

**Why it happens:** The project lives in `C:\Users\xxnii\OneDrive\Documentos\TFG\bargain-tfg\frontend\web\` — path length + OneDrive sync can cause issues.

**How to avoid:** Run `npm run dev` from inside the `frontend/web/` directory. If OneDrive causes EPERM, temporarily pause sync while developing. In `vite.config.ts`, set `server.watch.usePolling: true` for Windows filesystem compatibility.

---

## Code Examples

### Existing API Client (what exists — upgrading required)

```typescript
// Current src/api/client.ts state (partial — needs upgrade):
// - request interceptor: attaches Bearer token (DONE)
// - response interceptor: only calls logout() on 401 (MUST UPGRADE)
// - response unwrapping: NOT YET IMPLEMENTED (add to success interceptor)
// - token persistence: NOT YET IMPLEMENTED (add hydration pattern)
```

### Existing Navigation Type Registration Pattern

```typescript
// src/navigation/types.ts — current HomeStackParamList:
export type HomeStackParamList = {
  Home: undefined;
  // ADD: Notifications: undefined;
  // ADD: PriceAlerts: undefined; (stub for Phase 4)
};
```

### Notification Screen Deep Link Handling

```typescript
// When notification has action_url like "bargain://lists/list-123":
const handleNotificationTap = async (notification: Notification) => {
  await notificationService.markAsRead(notification.id);
  if (notification.action_url) {
    try {
      await navigateToDeepLink(notification.action_url, navigation);
    } catch {
      showToast('El contenido ya no esta disponible');
    }
  }
};
```

### Optimization Sliders with 100% Constraint

```typescript
// Profile sliders: weight_price + weight_distance + weight_time must sum to 100
// Pattern: changing one slider redistributes remainder proportionally to others
const adjustWeights = (changed: keyof Weights, value: number) => {
  const remaining = 100 - value;
  const others = Object.keys(weights).filter(k => k !== changed) as (keyof Weights)[];
  const total = others.reduce((sum, k) => sum + weights[k], 0);

  const newWeights = { ...weights, [changed]: value };
  if (total > 0) {
    others.forEach(k => {
      newWeights[k] = Math.round((weights[k] / total) * remaining);
    });
    // Fix rounding to ensure exact 100
    const diff = 100 - Object.values(newWeights).reduce((s, v) => s + v, 0);
    newWeights[others[0]] += diff;
  }
  return newWeights;
};
```

### Business Portal Barcode Scan (Browser Camera API)

```typescript
// frontend/web — barcode scanning uses browser MediaDevices API
// Only available on HTTPS or localhost; TFG demo context is acceptable
const startBarcodeScanner = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  // Feed stream to <video> element; use BarcodeDetector API (Chrome/Edge 83+)
  // Fallback: manual barcode text input if BarcodeDetector not available
};
```

---

## Existing Code Inventory (Phase 3 Starts From Here)

### What Exists and Is Reusable (no changes needed)

| Asset | Location | Status |
|-------|----------|--------|
| RootNavigator (Auth/Main split) | navigation/RootNavigator.tsx | DONE — wire only |
| MainTabs (4-tab layout) | navigation/MainTabs.tsx | DONE — wire only |
| SearchBar component | components/ui/SearchBar.tsx | DONE — reuse |
| ProductCard component | components/ui/ProductCard.tsx | DONE — reuse |
| BargainButton component | components/ui/BargainButton.tsx | DONE — reuse |
| BottomTabBar component | components/ui/BottomTabBar.tsx | DONE — wired |
| authStore (JWT state) | store/authStore.ts | PARTIAL — add refreshToken + hydrate |
| Axios client | api/client.ts | PARTIAL — upgrade interceptors |
| Theme system | theme/ | DONE — all new screens must use these |
| Screen shells | screens/*/*.tsx | ALL exist as shells — fill with data |

### What Does NOT Exist Yet (must create)

| Asset | Location | Plan |
|-------|----------|------|
| expo-location + react-native-maps + gesture-handler | package.json | 03-01 |
| SkeletonBox component | components/ui/SkeletonBox.tsx | 03-01 |
| API service modules (6 files) | api/*.ts | 03-02 |
| Zustand stores (3 new) | store/listStore.ts, notificationStore.ts, profileStore.ts | 03-02 |
| NotificationScreen | screens/home/NotificationScreen.tsx | 03-02 |
| frontend/web/ Vite project | frontend/web/ | 03-05 |

---

## Backend API Reference

All endpoints are at `http://localhost:8000/api/v1/` in development.

| Endpoint | Method | Screen |
|----------|--------|--------|
| /auth/token/ | POST | LoginScreen |
| /auth/register/ | POST | RegisterScreen |
| /auth/token/refresh/ | POST | Axios interceptor |
| /auth/password-reset/ | POST | (future — Phase 3 stub) |
| /auth/profile/me/ | GET, PATCH | ProfileScreen |
| /auth/profile/me/preferences/ | PATCH | ProfileScreen sliders (debounced) |
| /lists/ | GET, POST | ListsScreen |
| /lists/{id}/ | GET, PATCH, DELETE | ListDetailScreen |
| /lists/{id}/items/ | POST, PATCH, DELETE | ListDetailScreen |
| /products/?search=q | GET | Product search in ListDetail |
| /products/autocomplete/?q=q | GET | Autocomplete in search |
| /stores/?lat=x&lng=y&radius=r | GET | HomeScreen widget + MapScreen |
| /notifications/ | GET | NotificationScreen |
| /notifications/{id}/read/ | PATCH | Notification tap |
| /notifications/ (bulk) | PATCH | Mark all as read |
| /notifications/{id}/ | DELETE | Swipe-to-delete |
| /notifications/push-token/ | POST | Register Expo push token |
| /business/profiles/ | GET, POST | PYME Dashboard |
| /business/profiles/{id}/ | GET, PATCH | Business profile page |
| /business/prices/ | GET, POST, PATCH | PYME prices management |
| /business/promotions/ | GET, POST, PATCH, DELETE | PYME promotions |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (via jest-expo preset) + React Native Testing Library 13.3.3 |
| Config file | `jest` block in `frontend/package.json` |
| Quick run command | `cd frontend && npx jest --testPathPattern="__tests__" --bail` |
| Full suite command | `cd frontend && npx jest --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NFR-03 | App renders on iOS 15+ / Android 10+ (Expo Go) | Smoke | `cd frontend && npx jest App.test.tsx` | Yes (App.test.tsx) |
| NFR-03 | LoginScreen submits credentials and calls auth API | Unit | `cd frontend && npx jest __tests__/LoginScreen.test.tsx` | No — Wave 0 |
| NFR-03 | JWT interceptor: 401 triggers refresh then retry | Unit | `cd frontend && npx jest __tests__/apiClient.test.ts` | No — Wave 0 |
| NFR-03 | ListsScreen renders list items from store | Unit | `cd frontend && npx jest __tests__/ListsScreen.test.tsx` | No — Wave 0 |
| NFR-03 | NotificationScreen: badge count, mark read | Unit | `cd frontend && npx jest __tests__/NotificationScreen.test.tsx` | No — Wave 0 |
| NFR-03 | ProfileScreen: sliders sum to 100, debounce fires PATCH | Unit | `cd frontend && npx jest __tests__/ProfileScreen.test.tsx` | No — Wave 0 |
| NFR-03 | PYME portal: renders dashboard with mocked API | Unit | `cd frontend/web && npx jest` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `cd frontend && npx jest App.test.tsx --bail`
- **Per wave merge:** `cd frontend && npx jest --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `frontend/__tests__/apiClient.test.ts` — JWT interceptor refresh + retry queue
- [ ] `frontend/__tests__/LoginScreen.test.tsx` — form submission + store update
- [ ] `frontend/__tests__/ListsScreen.test.tsx` — list rendering from Zustand store
- [ ] `frontend/__tests__/NotificationScreen.test.tsx` — badge, group by day, mark read
- [ ] `frontend/__tests__/ProfileScreen.test.tsx` — slider constraint (sum=100), debounce
- [ ] `frontend/__tests__/SkeletonBox.test.tsx` — renders loading placeholders

> Note: Business web portal tests use Vite's vitest (not jest-expo). Add `vitest` + `@testing-library/react` to `frontend/web/package.json` in the Plan 03-05 Wave 0.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| AsyncStorage for tokens | expo-secure-store | Encrypted storage — required for JWT tokens on mobile |
| axios-auth-refresh package | Manual interceptor queue | No extra dependency; same result; fewer version conflicts |
| ScrollView for lists | FlatList with keyExtractor | Memory-efficient for long lists (shopping items, notifications) |
| Spinner (ActivityIndicator) | Skeleton screens (Reanimated) | Decision-locked per CONTEXT.md; better perceived performance |
| CRA for web | Vite | CRA is unmaintained; Vite is the 2024-2026 standard for new React projects |

---

## Open Questions

1. **Google Maps API key availability**
   - What we know: react-native-maps requires API key for Android; iOS works without
   - What's unclear: Does the user have a Google Cloud project with Maps SDK enabled?
   - Recommendation: Use Expo's built-in MapView without API key for iOS simulator testing; document Android key requirement in plan; create map screen with conditional rendering that degrades gracefully if key absent

2. **Expo-location on Windows dev machine**
   - What we know: expo-location uses device GPS; Expo Go on physical device or simulator is needed
   - What's unclear: Whether the developer tests primarily on simulator (no GPS) or physical device
   - Recommendation: Implement location with a mock fallback for development (hardcoded Seville coordinates: lat 37.3886, lng -5.9823) controlled by `__DEV__` flag

3. **Ant Design version 5.x SSR warnings in Vite**
   - What we know: Ant Design 5.x uses CSS-in-JS and occasionally triggers server-side rendering warnings in Vite dev mode
   - What's unclear: Whether this is resolved in latest antd 5.x patch releases
   - Recommendation: Use `antd@^5.x` latest stable; add `{ "mode": "browser" }` to App entry point if warnings appear

---

## Sources

### Primary (HIGH confidence)
- Expo SDK 55 documentation — version compatibility for expo-location, react-native-maps, react-native-gesture-handler
- React Navigation 7 docs — `createNativeStackNavigator`, nested navigators, type safety
- `frontend/package.json` — exact installed versions confirmed by direct file inspection
- `frontend/src/` — complete codebase survey (navigation, screens, stores, API client, theme)
- `backend/config/urls.py` + `apps/*/urls.py` — all API endpoints verified by direct file inspection

### Secondary (MEDIUM confidence)
- Zustand 5.x documentation — store creation pattern, `getState()` usage in interceptors
- Ant Design 5.x official docs — Table, Form, Modal, Drawer component APIs
- Axios interceptor documentation — `_retry` flag pattern, request queue for concurrent 401s

### Tertiary (LOW confidence)
- BarcodeDetector Web API (Chrome 83+ / Edge) — availability in TFG demo context; fallback to manual input recommended

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all installed packages verified in package.json; missing packages identified
- Architecture: HIGH — all screen shells, navigation structure, and existing code verified by direct inspection
- Pitfalls: HIGH — JWT refresh race condition and expo-location/maps patterns are well-documented; Windows/Vite pitfall is MEDIUM (environment-specific)
- Business web portal: MEDIUM — Vite + AntD are standard choices; specific version interactions unverified

**Research date:** 2026-03-18
**Valid until:** 2026-04-17 (30 days — stable stack)
