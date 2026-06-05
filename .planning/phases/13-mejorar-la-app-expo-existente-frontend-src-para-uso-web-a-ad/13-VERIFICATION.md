---
phase: 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
verified: 2026-06-05T00:00:00Z
status: human_needed
score: 18/18 must-haves verified
re_verification: false
human_verification:
  - test: "Open app on desktop browser (width >=1024px). Check BottomTabBar is centered and narrower than viewport. Confirm tab icons appear slightly larger than on mobile."
    expected: "Tab bar has max-width 900px, centered; icons scale to effective 26px (visible enlargement vs. 24px default)"
    why_human: "CSS transform scale 26/24=1.083 is subtle; cannot assert visual pixel size from code alone"
  - test: "On a list detail page on web, drag a list item to a different position. Refresh the page."
    expected: "Drag reorder works within the session. After refresh, items return to original server order (session-only, no persistence)"
    why_human: "HTML5 DragEvent behaviour and visual lift (shadows.elevated) require browser interaction to verify"
  - test: "Click 'Exportar lista' button on ListDetailScreen (web). Open the downloaded .txt in a text editor."
    expected: "File named bargain-lista-YYYY-MM-DD.txt contains one item per line in format '{qty}x {name}'"
    why_human: "Blob download and file content require real browser + file system interaction"
  - test: "Click 'Exportar comparativa' on PriceCompareScreen (web). Open the .csv in a spreadsheet app."
    expected: "File named bargain-comparativa-YYYY-MM-DD.csv with columns Producto, Tienda, Precio, Precio unitario. Any cell beginning with = or + is prefixed with a single quote."
    why_human: "CSV injection guard behaviour requires spreadsheet import to observe formula treatment"
  - test: "Navigate to /app/home/catalog?q=leche in the browser address bar."
    expected: "ProductsCatalogScreen loads with search field pre-filled with 'leche' and results filtered accordingly"
    why_human: "URL-seed behaviour on mount requires live navigation container + window.location.search"
  - test: "On AssistantScreen (web), confirm the message input is focused immediately on mount without clicking."
    expected: "Cursor is in the input field as soon as the screen appears"
    why_human: "Auto-focus on mount requires live browser rendering"
  - test: "Hover over an assistant message bubble on web. Confirm the 'Copiar' copy button appears."
    expected: "Copy icon-button appears on hover; pressing it turns green for 1500ms then reverts; text is copied to clipboard"
    why_human: "Hover-reveal UI and clipboard feedback require real browser mouse events"
  - test: "Open MapScreen on web at desktop width. Verify the store panel is on the right side of the map, not below."
    expected: "Map fills the left portion; store list panel (320px wide) is docked on the right"
    why_human: "Flexbox layout direction change requires visual inspection in a real browser"
  - test: "Press Cmd+K (Mac) or Ctrl+K (Windows) on HomeScreen or ProductsCatalogScreen (web)."
    expected: "The search input gains focus immediately"
    why_human: "Keyboard shortcut handling requires real key events in a live browser"
  - test: "On mobile viewport (<768px), check all 15 in-scope screens for layout regressions."
    expected: "Layouts are pixel-identical to pre-phase-13 state; no unexpected extra padding, columns, or web-only UI visible"
    why_human: "Mobile regression is a visual comparison requiring real device or narrow-viewport browser"
---

# Phase 13: Mejorar App Expo para Uso Web — Verification Report

**Phase Goal:** Mejorar la app Expo existente (frontend/src) para uso web — añadir funcionalidades web
(responsive D-05, ratón/teclado D-06, conveniencias web D-07, deep-linking D-08) dentro de las pantallas
ya existentes, sin crear nuevas pantallas ni tocar la navegación. Cobertura D-05..D-08 en las 15 pantallas
en alcance.
**Verified:** 2026-06-05T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Wave-0 primitives exist and are substantive | VERIFIED | `useBreakpoint.ts` (11 lines, correct thresholds 1024/768/0-guard), `MasterDetailLayout.tsx` (66 lines, flexDirection row + width:360 + colors.surface + spacing.xl), `WebTooltip.tsx` (76 lines, Platform.OS guard, onMouseEnter, 400ms timer, colors.info + textStyles.caption) |
| 2 | MasterDetailLayout and WebTooltip exported from @/components/ui | VERIFIED | `index.ts` lines 32-36 export both with types |
| 3 | BottomTabBar centers at max-width 900px on desktop, unchanged on mobile | VERIFIED | `BottomTabBar.tsx` line 185: `maxWidth: 900`, `alignSelf: "center"`, `width: "100%"` in `containerDesktop` style; applied conditionally via `isDesktop && styles.containerDesktop` |
| 4 | BottomTabBar desktop icon effectively 26px; MainTabs.tsx NOT modified | VERIFIED | `BottomTabBar.tsx` line 134: `const iconSize = isDesktop ? 26 : sizes.tabIconSize;` — scale applied via `transform: [{ scale: scale.value * iconScale }]`. `MainTabs.tsx` contains no `useBreakpoint`, `iconSize`, or `isDesktop` references |
| 5 | webExport.ts exports downloadFile, copyToClipboard, buildCsv, todayStamp with Platform guards | VERIFIED | Lines 22 and 38: both functions begin with `if (Platform.OS !== 'web') return`. Line 71: injection guard `/^[=+\-@\t\r]/`. All four functions exported |
| 6 | CSV injection guard covers =, +, -, @ (OWASP) | VERIFIED | `escapeCsvCell` regex `/^[=+\-@\t\r]/` prefixes with `'`; also handles RFC 4180 quoting |
| 7 | linking.ts registers all D-08 URLs and is wired into NavigationContainer | VERIFIED | `linking.ts` exports `linking` with correct hierarchy: ListDetail: `app/lists/:listId`, StoreProfile: `app/map/store/:storeId`, FavoriteStores under HomeTab (not MapTab — Pitfall 8 respected). `App.tsx` line 34 imports, line 81: `NavigationContainer linking={linking}` |
| 8 | ListDetailScreen.web.tsx exists with HTML5 drag (onDragStart/onDragOver+preventDefault/onDrop) | VERIFIED | Lines 332-338: `onDragStart`, `onDragOver` with `e.preventDefault()`, `onDrop`. Line 531: `shadows.elevated`. Comment on line 10 confirms session-only, no `updateItemOrder` call |
| 9 | ListDetailScreen.web.tsx drag reorder is session-only (no API persistence) | VERIFIED | `grep updateItemOrder/listService` in both files: only a comment on line 10 of `.web.tsx` confirming it is NOT called |
| 10 | ListDetailScreen.tsx has export (.txt), share-URL, Enter-to-add, Escape-to-close | VERIFIED | Line 44: imports `downloadFile, copyToClipboard, todayStamp`. Line 446: downloadFile call. Line 455: copyToClipboard(window.location.href). Line 466: Escape keydown handler. Line 625: `onSubmitEditing={handleQuickAdd}` |
| 11 | RouteScreen has 'Exportar ruta' download button (web-only) | VERIFIED | Lines 50-51: imports. Line 841: `downloadFile` call. Lines 1116-1123: button with `accessibilityLabel="Exportar ruta"` |
| 12 | All 5 Listas screens import useBreakpoint and apply responsive layout | VERIFIED | ListsScreen: maxWidth 600; TemplatesScreen: numColumns 1/2/3 + key={numColumns}; OCRScreen: maxWidth 560; ListDetailScreen.tsx and RouteScreen.tsx confirmed |
| 13 | MapScreen.web.tsx right-side 320px panel on desktop | VERIFIED | Line 404: `if (breakpoint === "desktop")` block. Line 664: `width: 320`. Line 457: comment "Panel derecho — UI-SPEC: 320px fijo". `borderLeftWidth` present |
| 14 | StoreProfileScreen has two-column desktop layout + copyToClipboard | VERIFIED | Lines 35+33: imports useBreakpoint and copyToClipboard. Line 616: `if (breakpoint === "desktop")` block. Lines 374+401: Platform.OS==='web' guarded buttons |
| 15 | FavoriteStoresScreen has responsive 1/2 column grid | VERIFIED | Lines 119-220: `numColumns = breakpoint === "mobile" ? 1 : 2`, `key={numColumns}`, `numColumns={numColumns}` |
| 16 | PriceCompareScreen exports injection-safe CSV via buildCsv | VERIFIED | Line 47: `import { buildCsv, downloadFile, todayStamp }`. Lines 298+: `buildCsv(...)` call (not hand-concatenated). Line 376: `position: "sticky"`. Line 445: accessibilityLabel="Exportar comparativa" |
| 17 | ProductsCatalogScreen 2-4 col grid + Cmd/Ctrl+K + ?q= URL sync | VERIFIED | Line 44: useBreakpoint import. Line 212: `(e.metaKey || e.ctrlKey) && e.key === "k"`. Lines 475+484: URLSearchParams read + window.history.replaceState. Line 922: numColumns |
| 18 | AssistantScreen centered at 720px + autofocus + per-message copyToClipboard | VERIFIED | Lines 58-59: imports. Line 224: `inputRef.current?.focus()` in Platform.OS==='web' useEffect. Line 308: maxWidth 720. Line 90: copyToClipboard(message.content) |

**Score:** 18/18 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `frontend/src/hooks/useBreakpoint.ts` | Breakpoint hook mobile/tablet/desktop | VERIFIED | 11 lines, thresholds 1024/768, 0-guard |
| `frontend/src/components/ui/MasterDetailLayout.tsx` | Split-pane desktop layout | VERIFIED | 66 lines, width:360, flexDirection:'row', colors.surface, spacing.xl |
| `frontend/src/components/ui/WebTooltip.tsx` | Web-only hover tooltip | VERIFIED | 76 lines, Platform.OS guard, 400ms, colors.info, textStyles.caption |
| `frontend/src/components/ui/index.ts` | Barrel exports both new components | VERIFIED | MasterDetailLayout and WebTooltip exported with types |
| `frontend/src/components/ui/BottomTabBar.tsx` | Desktop centering + effective 26px icons | VERIFIED | useBreakpoint imported, maxWidth:900 style, iconSize=isDesktop?26:tabIconSize |
| `frontend/src/utils/webExport.ts` | downloadFile, copyToClipboard, buildCsv, todayStamp | VERIFIED | All four exported, Platform guards, injection regex present |
| `frontend/src/navigation/linking.ts` | Deep-linking config for all 15 screens | VERIFIED | Full hierarchy including FavoriteStores under HomeTab (Pitfall 8) |
| `frontend/App.tsx` | NavigationContainer receives linking prop | VERIFIED | Line 34 import, line 81 `linking={linking}` |
| `frontend/src/screens/lists/ListDetailScreen.web.tsx` | Drag-drop reorder variant | VERIFIED | onDragStart, onDragOver+preventDefault, onDrop, shadows.elevated, session-only |
| `frontend/src/screens/lists/ListDetailScreen.tsx` | Export + share + keyboard | VERIFIED | downloadFile, copyToClipboard, onSubmitEditing, Escape listener |
| `frontend/src/screens/lists/RouteScreen.tsx` | Export route .txt button | VERIFIED | downloadFile + accessibilityLabel="Exportar ruta" |
| `frontend/src/screens/lists/ListsScreen.tsx` | Responsive + hover tint | VERIFIED | useBreakpoint, maxWidth:600, colors.primaryTint |
| `frontend/src/screens/lists/TemplatesScreen.tsx` | Responsive 1-3 col grid | VERIFIED | numColumns 1/2/3, key={numColumns} |
| `frontend/src/screens/lists/OCRScreen.tsx` | Centered at 560px | VERIFIED | useBreakpoint, maxWidth:560 |
| `frontend/src/screens/map/MapScreen.web.tsx` | Right-side 320px panel on desktop | VERIFIED | width:320, breakpoint==='desktop' block, borderLeftWidth |
| `frontend/src/screens/map/StoreProfileScreen.tsx` | Two-column + copy address + share URL | VERIFIED | useBreakpoint, copyToClipboard, Platform.OS==='web' guards, breakpoint==='desktop' block |
| `frontend/src/screens/home/FavoriteStoresScreen.tsx` | Responsive 1-2 col grid | VERIFIED | useBreakpoint, numColumns 1/2, key={numColumns} |
| `frontend/src/screens/home/HomeScreen.tsx` | Horizontal quick-actions + Cmd+K | VERIFIED | useBreakpoint, maxWidth:800, metaKey||ctrlKey + 'k' listener |
| `frontend/src/screens/home/ProductsCatalogScreen.tsx` | 2-4 col grid + Cmd+K + ?q= | VERIFIED | numColumns 2/3/4, URLSearchParams, replaceState, metaKey||ctrlKey |
| `frontend/src/screens/home/PriceCompareScreen.tsx` | Sticky-header table + CSV export | VERIFIED | buildCsv, downloadFile, position:'sticky', accessibilityLabel="Exportar comparativa" |
| `frontend/src/screens/home/ProductProposalScreen.tsx` | Centered form at 560px + hover/focus | VERIFIED | useBreakpoint, maxWidth:560, outlineColor |
| `frontend/src/screens/assistant/AssistantScreen.tsx` | Centered chat + autofocus + per-message copy | VERIFIED | maxWidth:720, focus() useEffect, copyToClipboard |
| `frontend/src/screens/home/NotificationScreen.tsx` | Centered list at 680px + hover | VERIFIED | useBreakpoint, maxWidth:680, colors.primaryTint |
| `frontend/src/screens/home/PriceAlertsScreen.tsx` | Centered list at 680px + copy summary | VERIFIED | useBreakpoint, maxWidth:680, copyToClipboard |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| BottomTabBar.tsx | useBreakpoint.ts | `import { useBreakpoint }` | WIRED | Line 29 import, line 131 `const breakpoint = useBreakpoint()` |
| App.tsx | linking.ts | `NavigationContainer linking={linking}` | WIRED | Line 34 import, line 81 prop |
| ListDetailScreen.web.tsx | local state only | `onDrop -> reorder()` | WIRED | No listService call; reorder mutates local state only |
| ListDetailScreen.tsx | webExport.ts | `downloadFile / copyToClipboard` | WIRED | Line 44 import, lines 446+455 call sites |
| StoreProfileScreen.tsx | webExport.ts | `copyToClipboard` | WIRED | Lines 33+35 imports, lines 119+127 call sites |
| PriceCompareScreen.tsx | webExport.ts | `buildCsv + downloadFile` | WIRED | Line 47 import, line 298 buildCsv call |
| AssistantScreen.tsx | webExport.ts | `copyToClipboard` | WIRED | Line 59 import, line 90 call site |
| ProductsCatalogScreen.tsx | window.history | `replaceState for ?q=` | WIRED | Line 484 `window.history.replaceState` |

### Data-Flow Trace (Level 4)

All artifacts that render dynamic data (screens) receive data from existing API hooks/services — no change introduced by this phase. The phase adds UI affordances around existing data; it does not add new data sources. CSV export maps existing `comparisons` state to buildCsv rows. Drag reorder mutates local `items` state (session-only by design). No hollow data connections introduced.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full Jest suite | `cd frontend && npx jest --passWithNoTests` | 111 passed, 0 failed, 16 suites | PASS |
| useBreakpoint thresholds correct | jest useBreakpoint | Included in 111 | PASS |
| MasterDetailLayout split/single render | jest MasterDetailLayout | Included in 111 | PASS |
| WebTooltip platform passthrough | jest WebTooltip | Included in 111 | PASS |
| BottomTabBar maxWidth:900 at desktop, absent at mobile | jest BottomTabBar | Included in 111 | PASS |
| webExport injection guard | jest webUtils | Included in 111 | PASS |
| linking resolves /app/lists/:listId | jest linking | Included in 111 | PASS |
| No frontend/web references in frontend/src | `grep -r "frontend/web" frontend/src/` | 0 matches | PASS |
| MainTabs.tsx not modified | `grep "useBreakpoint\|iconSize\|isDesktop" MainTabs.tsx` | 0 matches | PASS |
| No new Tab.Screen/Stack.Screen added | Count in MainTabs.tsx | 26 (unchanged) | PASS |
| Session-only reorder: no updateItemOrder call | grep in both ListDetail files | Only comment, no call | PASS |

### Requirements Coverage

All plans in this phase covered decisions D-05 (responsive), D-06 (mouse/keyboard), D-07 (web conveniences), D-08 (deep-linking). No REQUIREMENTS.md IDs were referenced in plan frontmatter (phase uses decision codes instead); requirements coverage is complete at the decision-coverage level per the ROADMAP.

### Anti-Patterns Found

No blocking anti-patterns found. The following are informational:

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| BottomTabBar.tsx | `// @ts-ignore` on icon scale (indirect — no @ts-ignore in file) | Info | Not present; scale done via numeric computation, no ts-ignore needed |
| Multiple screens | `// @ts-ignore` on onMouseEnter/onMouseLeave | Info | Correct and documented; these are web-only react-native-web props not in ViewProps |
| ListDetailScreen.web.tsx | `// @ts-ignore` on draggable/onDragStart/onDragOver/onDrop | Info | Correct and documented; HTML5 drag props not in RN ViewProps |
| PriceCompareScreen.tsx | `position: 'sticky'` | Info | Web-only CSS value; ignored on native (correct per plan) |

No `return null` / empty implementations, no TODO/FIXME in implementation code, no hardcoded empty arrays as final state, no hand-concatenated CSV.

### Human Verification Required

10 items need human verification in a real browser. All automated checks pass; the remaining items concern visual layout, browser interaction, and platform-specific behavior that cannot be verified from code alone.

1. **BottomTabBar visual icon scale on desktop**
   Test: Open app at >=1024px browser width. Compare icon size in the tab bar vs. a narrower viewport.
   Expected: Icons appear slightly larger (26px effective vs 24px at mobile).
   Why human: 1.083x scale transform difference is too subtle to assert from code structure.

2. **HTML5 drag-drop reorder in ListDetailScreen.web.tsx**
   Test: Drag a list item to a new position; verify instant visual reorder; refresh; verify order reset.
   Expected: Reorder works within session, reverts on reload.
   Why human: DragEvent sequence and visual lift (shadows.elevated) require real browser mouse.

3. **'Exportar lista' and 'Exportar ruta' file downloads**
   Test: Press each export button and open the downloaded file.
   Expected: Correct filename (bargain-lista-YYYY-MM-DD.txt / bargain-ruta-YYYY-MM-DD.txt), correct content format.
   Why human: Blob download and file content require real browser + OS file system.

4. **CSV injection guard in exported comparativa**
   Test: Add a price entry whose product name starts with '=' (if possible), export CSV, open in spreadsheet.
   Expected: The cell is prefixed with a single quote, not interpreted as a formula.
   Why human: Spreadsheet formula treatment requires import into a real spreadsheet app.

5. **?q= URL seed on ProductsCatalogScreen mount**
   Test: Navigate to /app/home/catalog?q=leche in the browser address bar.
   Expected: Search field shows 'leche', results are filtered.
   Why human: Requires live NavigationContainer + window.location.search to be read on mount.

6. **Autofocus on AssistantScreen mount (web)**
   Test: Navigate to AssistantScreen on web; confirm the text input has focus without clicking.
   Expected: Cursor is in input immediately.
   Why human: Focus state on mount requires live browser rendering.

7. **Per-message copy with hover reveal and 1500ms green feedback**
   Test: Hover over an assistant message; click the copy icon; observe color change and revert.
   Expected: Copy icon appears on hover; button turns colors.success for 1500ms then reverts.
   Why human: Hover-reveal UI and clipboard feedback require live browser mouse events.

8. **MapScreen.web.tsx right-side panel on desktop**
   Test: Open MapScreen on web at >=1024px; confirm store list panel is right-docked, not below.
   Expected: Map fills left portion; 320px panel on the right with a left border.
   Why human: FlexDirection layout requires visual inspection.

9. **Cmd+K / Ctrl+K search focus**
   Test: Press Cmd+K (Mac) or Ctrl+K (Windows) on HomeScreen or ProductsCatalogScreen.
   Expected: Search input gains focus.
   Why human: Real key events in a live browser.

10. **Mobile layout regression check (<768px)**
    Test: View all 15 in-scope screens at mobile viewport width.
    Expected: Layouts identical to pre-phase-13 state; no extra columns, web-only UI, or padding changes.
    Why human: Mobile regression is a visual comparison.

### Gaps Summary

No gaps — all automated must-haves pass. Status is `human_needed` because 10 visual/interactive/browser behaviors require human testing in a real browser environment. All 18 observable truths are VERIFIED at code level; 111 Jest tests pass across 16 suites; no frontend/web references exist in frontend/src; MainTabs.tsx is unmodified; session-only drag reorder correctly has no API persistence call.

---

_Verified: 2026-06-05T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
