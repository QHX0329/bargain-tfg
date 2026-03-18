---
phase: 03-frontend
plan: "05"
subsystem: frontend-screens
tags: [map, profile, react-native-maps, sliders, notifications, change-password, expo-location]
dependency_graph:
  requires:
    - 03-01  # authStore, profileStore, authService, storeService
    - 03-02  # HomeScreen patterns (NearbyStoreCard visual style)
  provides:
    - MapScreen with react-native-maps and real API stores
    - ProfileScreen with live sliders, debounce, toggles
    - ChangePasswordScreen validated form
  affects:
    - frontend/src/navigation/MainTabs.tsx  # ChangePasswordScreen added to ProfileStack
    - frontend/src/types/domain.ts  # Store.location GeoJSON field added
    - frontend/src/components/ui/BargainButton.tsx  # testID prop added
tech_stack:
  added:
    - react-native-maps@1.27.2 (already in deps, now used)
    - expo-location (already in deps, now used in MapScreen)
    - "@react-native-community/slider@^5.1.2"
  patterns:
    - useRef debounce pattern (NOT useState for timer)
    - adjustWeights() proportional redistribution algorithm
    - GeoJSON coordinates extraction [lng, lat] → {latitude, longitude}
    - Jest moduleNameMapper for native-only packages (react-native-maps, slider)
key_files:
  created:
    - frontend/src/screens/profile/ChangePasswordScreen.tsx
    - frontend/__tests__/ProfileScreen.test.tsx
    - frontend/__mocks__/react-native-maps.js
    - frontend/__mocks__/@react-native-community/slider.js
  modified:
    - frontend/src/screens/map/MapScreen.tsx
    - frontend/src/screens/profile/ProfileScreen.tsx
    - frontend/src/navigation/MainTabs.tsx
    - frontend/src/types/domain.ts
    - frontend/src/components/ui/BargainButton.tsx
    - frontend/package.json
decisions:
  - "Slider from react-native removed in RN 0.83 — use @react-native-community/slider"
  - "react-native-maps NativeAirMapsModule TurboModule not available in Jest — use moduleNameMapper mock"
  - "adjustWeights() uses proportional redistribution (not equal split) — preserves user preference ratios"
  - "Slider coord fallback uses Math.random offset when store.location absent — only for dev/missing data"
  - "Delete account row uses comingSoon prop (not disabled) so fireEvent.press works in tests"
metrics:
  duration_minutes: 10
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_changed: 10
---

# Phase 3 Plan 5: MapScreen and ProfileScreen Summary

**One-liner:** Interactive map with expo-location + react-native-maps Markers for real nearby stores, and settings-style ProfileScreen with proportional weight sliders (500ms debounce), push notification toggles, logout confirmation, and validated ChangePasswordScreen.

## What Was Built

### Task 1 — MapScreen (commit: 693a6fe)

Replaced the MapScreen placeholder with a fully functional screen:

- **Location permission flow:** `Location.requestForegroundPermissionsAsync()` on mount. If denied → centered card "Activa la ubicación para ver tiendas cercanas" + "Abrir configuración" button via `Linking.openSettings()`. Dev fallback: Seville coords (37.3886, -5.9823).
- **MapView:** `react-native-maps` with `showsUserLocation`, `showsMyLocationButton`, `initialRegion` centered on user.
- **Store markers:** `storeService.getNearby(lat, lng, 10)` after permission granted. GeoJSON coordinates extracted as `[lng, lat]` → `{latitude, longitude}`.
- **Loading overlay:** `ActivityIndicator` floating chip while fetching stores.
- **Bottom panel:** Horizontal `FlatList` of store cards (same visual style as HomeScreen NearbyStoreCard). Tapping a card animates the map to that store via `mapRef.current.animateToRegion()`.
- **Jest fix:** Added `moduleNameMapper` for `react-native-maps` → `__mocks__/react-native-maps.js` to unblock App.test.tsx smoke test.

### Task 2 — ProfileScreen + ChangePasswordScreen (commits: ab51b9d RED, 51679cc GREEN)

**ProfileScreen** (iOS Settings style with ScrollView, 4 sections):

Section 1 — User info: Avatar circle with name initial (from `useAuthStore().user.name`), name, email, "Miembro desde {MMMM YYYY}" from `memberSince`.

Section 2 — Optimization:
- `adjustWeights(changed, newValue, current)` proportional redistribution — when price slider moves to 60, remaining 40 distributed to distance/time keeping their ratio.
- 5 sliders: weightPrice, weightDistance, weightTime (0-100 step 5), searchRadiusKm (1-20 km), maxStops (2-5).
- Sum indicator: green when = 100, red otherwise.
- 500ms debounce via `useRef<ReturnType<typeof setTimeout>>` (not useState). `schedulePreferencesSave()` clears and resets the timer on each change.

Section 3 — Notifications:
- Master `push_notifications_enabled` Switch (saved immediately, no debounce).
- 3 per-event Switches: `notify_price_alerts`, `notify_new_promos`, `notify_shared_list_changes`.
- When master OFF: per-event switches have `disabled={true}` + `opacity: 0.4` style.

Section 4 — Cuenta:
- "Cambiar contraseña" → `navigation.navigate('ChangePassword')`.
- "Eliminar cuenta" → `Alert.alert('Esta función estará disponible próximamente')`.
- "Cerrar sesión" → confirmation alert → `authStore.logout()`.

**ChangePasswordScreen:**
- 3 secureTextEntry inputs with inline error text below each.
- Validation: confirm === new, min length 8.
- On success: `authService.changePassword(old, new)` → Alert "Contraseña actualizada" → `navigation.goBack()`.
- `BargainButton` with `loading` prop for submit.

**Supporting changes:**
- `@react-native-community/slider` installed (Slider removed from react-native core in RN 0.83).
- Jest mock added for slider native module.
- `BargainButton` updated with optional `testID` prop.
- `Store.location?: { type: string; coordinates: [number, number] }` added to domain.ts.
- `ChangePasswordScreen` registered in ProfileStack in MainTabs.tsx.

## Test Results

```
ProfileScreen tests: 8/8 PASS
  - Test 1: user name and email rendered from authStore
  - Test 2: weight_price=60 redistributes 40 proportionally, sum=100
  - Test 3: 500ms debounce coalesces rapid changes to 1 PATCH call
  - Test 4: master toggle OFF → per-event toggles disabled=true
  - Test 5: logout confirmation alert → authStore.logout() called
  - Test 6: delete account shows "próximamente" alert, no API call
  - Test 7: mismatched passwords → inline error, no API call
  - Test 8: valid form → authService.changePassword(old, new)

App.test.tsx smoke test: PASS
ESLint src/screens/map/ src/screens/profile/: 0 warnings
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Slider removed from react-native core in RN 0.83**
- **Found during:** Task 2 implementation (test run)
- **Issue:** `import { Slider } from 'react-native'` throws `Invariant Violation: Slider has been removed from react-native core`
- **Fix:** Installed `@react-native-community/slider@^5.1.2`; updated import in ProfileScreen.tsx; added Jest mock at `__mocks__/@react-native-community/slider.js`
- **Commit:** 51679cc

**2. [Rule 3 - Blocking] react-native-maps NativeAirMapsModule breaks App.test.tsx**
- **Found during:** Task 1 verification
- **Issue:** `require('react-native-maps')` triggers TurboModuleRegistry.getEnforcing for NativeAirMapsModule which throws in Jest Node environment
- **Fix:** Added `moduleNameMapper` in package.json jest config; created `__mocks__/react-native-maps.js` with forwardRef MapView and Marker stubs
- **Commit:** 693a6fe

**3. [Rule 2 - Missing critical] BargainButton missing testID prop**
- **Found during:** Task 2 (ChangePasswordScreen submit button needed testID for Test 8)
- **Fix:** Added optional `testID?: string` to `BargainButtonProps` and passed it to `AnimatedTouchable`
- **Commit:** 51679cc

**4. [Rule 1 - Bug] Delete account button disabled prop blocked fireEvent.press in tests**
- **Found during:** Task 2 RED→GREEN
- **Issue:** Using `disabled` on the TouchableOpacity caused `fireEvent.press` to silently no-op in RNTL
- **Fix:** Replaced `disabled` with `comingSoon` prop that only applies visual opacity but doesn't block press events
- **Commit:** 51679cc

## Self-Check: PASSED

All 7 files found. All 3 commits verified in git history.
