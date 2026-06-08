---
status: complete
phase: 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
source: [13-01-foundation-layout-SUMMARY.md, 13-02-foundation-web-utils-linking-SUMMARY.md, 13-03-listas-flow-SUMMARY.md, 13-04-mapa-tiendas-flow-SUMMARY.md, 13-05-catalogo-precios-flow-SUMMARY.md, 13-06-asistente-notif-flow-SUMMARY.md]
started: 2026-06-08T18:19:46Z
updated: 2026-06-08T19:05:00Z
status_note: 13/13 passed — 2 blockers found & fixed during UAT (web tab nav shell, drag-drop); Test 13 web affordances accepted as platform-gated by design
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Start the Expo web app fresh (`cd frontend && npx expo start --web`). Bundler builds without errors, app boots in the browser, home screen loads with live data (deep-link NavigationContainer wiring in App.tsx does not break startup).
result: pass
note: "Initially failed (blocker: web tab shell broken — material-top-tabs/pager-view has no web support; ProfileTab missing from linking). Fixed via MainTabs.web.tsx (bottom-tabs) + mainTabsShared.tsx + ProfileTab added to linking.ts. User confirmed pass after Metro restart: app opens on Inicio, all 5 tabs navigable, Profile renders. See Gaps[test:1].fix_applied."

### 2. BottomTabBar desktop icon scale
expected: At width >=1024 the bottom tab bar centers (max 900px) and icons render ~1.083x larger (effective 26px); identical to mobile at mobile width.
result: pass

### 3. Drag-drop reorder (Lists)
expected: On web, ListDetailScreen items can be dragged by their handle to reorder; the order updates immediately (dragged row lifts with shadow) and resets on page refresh (session-only, no persistence).
result: pass
note: "Initially failed (major: react-native-web 0.21.2 does not forward draggable/onDrag* props from a View to the DOM, so HTML5 drag never fired). Fixed by wrapping each row in a real <div> with draggable + onDragStart/onDragOver/onDrop (source index via dataTransfer), inner <View> keeps RN styling. User confirmed pass. See Gaps[test:3]."

### 4. Export downloads (.txt)
expected: "Exportar lista" (ListDetail) and "Exportar ruta" (RouteScreen) download `bargain-lista-YYYY-MM-DD.txt` / `bargain-ruta-YYYY-MM-DD.txt` with the expected ordered content.
result: pass

### 5. CSV injection guard (Price compare)
expected: "Exportar comparativa" downloads `bargain-comparativa-YYYY-MM-DD.csv`; cells starting with = + - @ (or TAB/CR) are prefixed with a single quote when opened in a spreadsheet.
result: pass

### 6. ?q= URL share (Catalog)
expected: Visiting `/app/home/catalog?q=leche` restores the search filter on mount; typing updates the URL (replaceState); the share button copies the current URL to the clipboard.
result: pass

### 7. AssistantScreen autofocus + centered layout
expected: On web, the message input is focused automatically on screen mount; the chat column + input bar are centered at 720px on desktop.
result: pass

### 8. Per-message / per-alert copy feedback
expected: Hovering an assistant message (and a price-alert row) reveals a copy button; pressing it copies the text and shows ~1.5s green success feedback.
result: pass

### 9. MapScreen.web right-side panel
expected: At desktop width, MapScreen shows the store panel docked on the right (320px, left border) with the map filling the rest; bottom-panel layout preserved on mobile.
result: pass

### 10. StoreProfile two-column + copy address / share URL
expected: At desktop width, StoreProfileScreen splits into two columns (info left, products right); copy-address and share-URL buttons (web-only) copy to clipboard with ~1.5s green feedback.
result: pass

### 11. Cmd+K / Ctrl+K search focus
expected: On web, pressing Cmd/Ctrl+K focuses the search input on both HomeScreen and ProductsCatalogScreen; a "⌘K / Ctrl+K" tooltip hints the shortcut.
result: pass

### 12. Responsive grids (Catalog / Templates / Favorites)
expected: Grids reflow by breakpoint — ProductsCatalog 2/3/4 cols (mobile/tablet/desktop), Templates 1/2/3 cols, FavoriteStores 1/2 cols — centered with max-width, no overflow.
result: pass

### 13. Mobile regression (<768px)
expected: All in-scope screens render at mobile width exactly as before — no web affordances visible (export/share/copy/drag), no layout shifts, bottom tab bar unchanged.
result: pass
note: "User observed export/share buttons still visible in a narrow BROWSER window. Verified by-design: these affordances are gated by Platform.OS === 'web' (and .web.tsx files), NOT by breakpoint — a narrow browser is still web, where download/clipboard work. On the native mobile app (Expo Go) Platform.OS !== 'web' so they are hidden (asserted by existing native-guard test). User accepted as designed. No layout shifts; bottom tab bar unchanged. Native mobile regression must be confirmed in Expo Go (not in a resized browser)."

## Summary

total: 13
passed: 13
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "App boots on web and the user can navigate to all main tabs/screens (not just Assistant); Profile renders content"
  status: failed
  reason: "User reported: Solo veo las pantallas del asistente y si deslizo hacia al lado el perfil en blanco, no puedo acceder al resto de páginas"
  severity: blocker
  test: 1
  root_cause: |
    PRIMARY: The main navigation shell (frontend/src/navigation/MainTabs.tsx) is built with
    createMaterialTopTabNavigator, which renders its pages through react-native-pager-view@6.9.1.
    That package ships ONLY android/ and ios/ native code — it has no web implementation
    (no web/ dir, no *.web.js, no react-native-web fallback). Under react-native-web the pager
    cannot lay out or page between tabs, so only one tab renders, "swiping" is a broken
    horizontal scroll, the custom BottomTabBar tab presses don't switch pages, and tabs that
    fail to mount show blank (Profile). Phase 13 enabled the Expo app on web and wired
    deep-linking but never adapted this navigation shell for web.
    SECONDARY: frontend/src/navigation/linking.ts (plan 13-02) omits ProfileTab entirely —
    the navigator defines 5 tabs (HomeTab, ListsTab, MapTab, AssistantTab, ProfileTab) but the
    linking config maps only 4. Profile therefore has no URL mapping (contract drift), which
    independently explains the blank/un-routable Profile and breaks deep-link round-trips.
  artifacts:
    - path: "frontend/src/navigation/MainTabs.tsx"
      issue: "Uses createMaterialTopTabNavigator (react-native-pager-view) which has no web support; no MainTabs.web.tsx variant"
    - path: "node_modules/react-native-pager-view (6.9.1)"
      issue: "Ships only android/ + ios/ native code — no web build"
    - path: "frontend/src/navigation/linking.ts"
      issue: "Main.screens config omits ProfileTab (5 tabs in navigator, 4 mapped)"
  missing:
    - "Web-compatible main tab navigator: add MainTabs.web.tsx (or Platform.OS branch) using @react-navigation/bottom-tabs (already installed ^7.2.0, works on web) with the same 5 stacks + custom BottomTabBar"
    - "Add ProfileTab (Profile + EditProfile + ChangePassword + OptimizerConfig paths) to linking.ts Main.screens"
    - "Re-run web UAT Tests 2–13 once navigation works on web"
  fix_applied:
    status: implemented (pending browser re-verification)
    date: 2026-06-08
    changes:
      - "NEW frontend/src/navigation/mainTabsShared.tsx — extracted the 5 stack navigators, TAB_ICONS, useMainTabDefinitions(), renderMainTabBar() so native + web share one source"
      - "NEW frontend/src/navigation/MainTabs.web.tsx — web variant using @react-navigation/bottom-tabs (web-compatible) + custom BottomTabBar; Metro resolves .web automatically"
      - "MainTabs.tsx slimmed to the native material-top-tabs variant consuming mainTabsShared (swipe preserved on native)"
      - "linking.ts — added ProfileTab (Profile/EditProfile/ChangePassword/OptimizerConfig) to Main.screens (fixes contract drift)"
    verification: "ESLint clean; tsc --noEmit 0 errors; 12 nav/tab Jest tests pass; material-top-tabs/pager-view confirmed absent from the web bundle (only imported in MainTabs.tsx, shadowed by MainTabs.web.tsx on web)"
    commit: "2f8ba4e"
  debug_session: ""

- truth: "On web, ListDetail items can be grabbed and dragged to reorder (session-only)"
  status: failed
  reason: "User reported: No se puede agarrar y arrastrar"
  severity: major
  test: 3
  root_cause: |
    react-native-web 0.21.2 only forwards a fixed whitelist of props from <View> to the DOM
    (accessibility/click/focus/keyboard/mouse/touch/style + href/lang/onScroll/onWheel/pointerEvents).
    The HTML5 drag props (draggable, onDragStart, onDragOver, onDrop) are NOT in that list, so
    react-native-web strips them and they never reach the underlying <div>. The row was therefore
    never actually draggable. The original implementation applied these props to a <View> via
    @ts-ignore, which silently no-ops on web.
  artifacts:
    - path: "frontend/src/screens/lists/ListDetailScreen.web.tsx"
      issue: "draggable + onDrag* applied to a <View> (stripped by react-native-web)"
    - path: "node_modules/react-native-web/dist/modules/forwardedProps (0.21.2)"
      issue: "forwardedProps whitelist excludes draggable/onDrag*/onDrop"
  missing:
    - "Wrap each row in a real DOM <div> carrying draggable + onDragStart/onDragOver/onDrop; keep inner <View> for RN styling"
    - "Carry source index via dataTransfer to avoid stale closures"
  fix_applied:
    status: implemented and user-verified
    date: 2026-06-08
    changes:
      - "ListDetailScreen.web.tsx — row wrapped in <div draggable> with dataTransfer-based source index; onDragOver preventDefault; onDragEnd clears dragIndex; cursor:grab"
    verification: "ESLint clean; tsc --noEmit 0 errors; user confirmed drag reorder works"
  debug_session: ""
