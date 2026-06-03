# Phase 13: Mejorar la app Expo para uso web — Research

**Researched:** 2026-06-01
**Domain:** React Native Web — responsive layout, mouse/keyboard interactions, drag-drop, deep-linking, file export, clipboard
**Confidence:** HIGH (core stack verified from codebase); MEDIUM (drag-drop fallback strategy); HIGH (deep-linking pattern)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- D-01: El esfuerzo web se concentra en la app Expo (`frontend/src`). Pasa a ser el foco de la experiencia web a mejorar.
- D-02: `frontend/web/` (Vite + Ant Design, Fase 12) se conserva intacto: no se toca, no se deprecia formalmente, queda como referencia/respaldo. NO debe modificarse en esta fase.
- D-03: Se mejoran los flujos funcionales completos de los clústeres `home/`, `lists/`, `map/` y `assistant/`. En total 15 screens.
- D-04: `auth/` y `profile/` quedan fuera del alcance de esta fase.
- D-05: Layout responsive ancho — aprovechar el espacio en escritorio: multi-columna, patrón master-detail, grids.
- D-06: Ratón y teclado — estados hover, foco visible, atajos de teclado, tooltips.
- D-07: Conveniencias web — drag-drop para reordenar ítems de lista, exportar/descargar, copiar al portapapeles, compartir por URL.
- D-08: URL / deep-linking — reflejar estado clave en la URL para soportar back/forward del navegador y enlaces compartibles.
- D-09: Divergencia web/móvil mediante breakpoints responsive (`useWindowDimensions` / hook de breakpoints) dentro de cada screen.
- D-10: Usar ficheros `.web.tsx` solo cuando la divergencia sea grande (siguiendo el patrón ya existente en `map/MapScreen.web.tsx`). Minimizar duplicación de código.
- D-11: Sin pantallas nuevas y sin tocar la navegación móvil: mismo árbol de navegación, las mejoras viven dentro de las screens existentes.
- D-12: Mantener la navegación por tabs existente, solo reestilada/ensanchada para web. NO se introduce un shell de navegación nuevo.
- D-13: Sin priorización explícita — el planner reparte las cuatro mejoras de forma uniforme por los flujos en alcance.

### Claude's Discretion

- Formatos concretos de exportación (PDF vs CSV) y qué datos exportar por flujo.
- Estrategia de pruebas (reuso de Playwright E2E existente vs Jest por screen vs validación manual).
- Detalles concretos de qué estado va a la URL por screen.

### Deferred Ideas (OUT OF SCOPE)

- Shell de navegación web (sidebar/topbar persistente): considerado y rechazado para esta fase (D-12).
- Migrar/deprecar `frontend/web/`: fuera de alcance.
- Mejoras web para `auth/` y `profile/`: excluidas de esta fase.
</user_constraints>

---

## Summary

Phase 13 enhances 15 existing Expo screens (`frontend/src/screens/`) for web use. The app already runs via `expo start --web` (react-native-web 0.21.x) and the pattern for web/native divergence is established via `MapScreen.web.tsx`. All improvements must preserve the existing mobile layout pixel-for-pixel below 768px.

The four categories of improvement (D-05 through D-08) each have a clear technical path: a `useBreakpoint` hook (thin wrapper over `useWindowDimensions`) drives layout branching; `MasterDetailLayout` and `WebTooltip` are the two new shared components; React Navigation's `linking` prop on `NavigationContainer` handles deep-linking without altering the navigator tree; export and clipboard use native browser APIs guarded by `Platform.OS === 'web'`.

The one critical finding: `react-native-draggable-flatlist` does NOT work on web (confirmed broken in its GitHub issues as of late 2025). The drag-drop feature for ListDetailScreen must be implemented as a `.web.tsx` variant using HTML5 `DragEvent` APIs directly — no additional npm package needed. This is the correct D-10 trigger (structurally large divergence).

**Primary recommendation:** Implement all four D-05..D-08 categories using only existing dependencies except one new optional package: `react-native-draggable-flatlist` can be skipped; use HTML5 drag events in a `.web.tsx` file instead.

---

## Project Constraints (from CLAUDE.md)

- TypeScript with ESLint flat config (`eslint.config.mjs`). Run: `npx eslint src/`
- Prettier: `npx prettier --check "src/**/*.{ts,tsx}"`
- Tests: Jest + React Native Testing Library (`jest-expo` preset). Run: `cd frontend && npx jest`
- Node >= 24.0.0 on host (confirmed in `package.json` engines field)
- Frontend runs natively on host — NOT in Docker
- Commits: Conventional Commits in Spanish with task ID
- Functional React components + hooks; PascalCase components, camelCase functions
- All `accessibilityRole` and `accessibilityLabel` required on interactive elements
- No magic numbers — use `spacing.*` and `colors.*` tokens exclusively

---

## Standard Stack

### Already Available (no new installs)

| Library | Installed Version | Purpose in Phase 13 | Source |
|---------|-------------------|---------------------|--------|
| `react-native-web` | `^0.21.0` (registry: 0.21.2) | Renders RN components on web; provides web-specific APIs | [VERIFIED: package.json + npm registry] |
| `react-native-reanimated` | `~4.1.1` | Existing animations in BottomTabBar, AssistantScreen; no new usage needed | [VERIFIED: package.json] |
| `react-native-gesture-handler` | `~2.28.0` | Existing swipe gestures on mobile; no new usage needed | [VERIFIED: package.json] |
| `@react-navigation/native` | `^7.0.0` (registry: 7.2.5) | Deep-linking via `linking` prop on `NavigationContainer` | [VERIFIED: package.json + npm registry] |
| `@react-navigation/material-top-tabs` | `^7.4.19` | Tab navigator that receives the `linking` config | [VERIFIED: package.json] |
| `@react-navigation/native-stack` | `^7.2.0` (registry: 7.16.0) | Stack navigators for each tab; already configured | [VERIFIED: package.json + npm registry] |
| `@expo/vector-icons` (Ionicons) | `^15.0.3` | Only icon set — `download-outline`, `copy-outline`, `share-social-outline`, etc. | [VERIFIED: package.json + UI-SPEC] |
| `expo-image-picker` | `~17.0.10` | OCRScreen file picker; web file input already available via this lib | [VERIFIED: package.json] |

### New Dependency Required

| Library | Required Version | Purpose | Justification |
|---------|-----------------|---------|---------------|
| **NONE** | — | All Phase 13 features can be implemented with existing stack | [VERIFIED: codebase audit] |

> **Drag-drop note (CRITICAL):** `react-native-draggable-flatlist` is NOT in `package.json` and is broken on web (confirmed: GitHub issue #612, November 2025). Do NOT add it. Instead, implement drag-drop in `ListDetailScreen.web.tsx` using native HTML5 `DragEvent` APIs (`draggable`, `onDragStart`, `onDragOver`, `onDrop`). This is zero-dependency and fully compatible with react-native-web because `.web.tsx` files render as real DOM. [VERIFIED: npm check `react-native-draggable-flatlist` not installed; issue confirmed via WebSearch]

### Installation

No new packages to install. All functionality is achievable with the existing `package.json`.

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
frontend/src/
├── hooks/
│   └── useBreakpoint.ts          # NEW — returns 'mobile'|'tablet'|'desktop'
├── components/ui/
│   ├── MasterDetailLayout.tsx    # NEW — split-pane layout for desktop
│   └── WebTooltip.tsx            # NEW — hover tooltip, web-only
├── screens/
│   ├── lists/
│   │   └── ListDetailScreen.web.tsx  # NEW — drag-drop variant (D-10 trigger)
│   ├── map/
│   │   └── MapScreen.web.tsx     # EXISTING — extend right-panel for desktop
│   └── (all other screens)      # MODIFIED in-place with useBreakpoint
└── navigation/
    └── RootNavigator.tsx         # MODIFIED — add `linking` prop
```

### Pattern 1: `useBreakpoint` Hook

**What:** Thin wrapper over `useWindowDimensions` that maps width to a named breakpoint.
**When to use:** Inside every screen to branch layout logic. Replaces direct `width < 768` comparisons everywhere.

```typescript
// Source: UI-SPEC + useWindowDimensions (React Native built-in)
// frontend/src/hooks/useBreakpoint.ts
import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
}
```

**Thresholds (from UI-SPEC, binding):**
- `mobile`: 0–767px — single column, unchanged mobile layout
- `tablet`: 768–1023px — two-column starts, wider cards
- `desktop`: ≥1024px — full master-detail, 3–4 column grids

[VERIFIED: UI-SPEC responsive breakpoints section]

### Pattern 2: `MasterDetailLayout` Component

**What:** Conditionally renders a split-pane view on desktop, falls back to `masterPane` only on mobile/tablet (detail is handled by navigation push on mobile).
**When to use:** ListsScreen, StoreProfileScreen, RouteScreen on desktop.

```typescript
// Source: UI-SPEC component inventory
// frontend/src/components/ui/MasterDetailLayout.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';
import type { Breakpoint } from '@/hooks/useBreakpoint';

interface Props {
  masterPane: React.ReactNode;
  detailPane: React.ReactNode | null;
  breakpoint: Breakpoint;
}

export const MasterDetailLayout: React.FC<Props> = ({
  masterPane,
  detailPane,
  breakpoint,
}) => {
  if (breakpoint !== 'desktop') {
    return <View style={styles.fullWidth}>{masterPane}</View>;
  }
  return (
    <View style={styles.splitContainer}>
      <View style={styles.master}>{masterPane}</View>
      <View style={styles.divider} />
      <View style={styles.detail}>{detailPane}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullWidth: { flex: 1 },
  splitContainer: { flex: 1, flexDirection: 'row' },
  master: {
    width: 360,
    backgroundColor: colors.surface,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
  },
  detail: {
    flex: 1,
    marginLeft: spacing.xl, // 32px column gap per UI-SPEC
  },
});
```

[VERIFIED: UI-SPEC — master 360px, divider 1px colors.border, gap spacing.xl]

### Pattern 3: Hover States in react-native-web

**What:** react-native-web's `Pressable` component exposes `hovered` in its children/style render prop. Alternatively, use `onMouseEnter`/`onMouseLeave` on any `View` or `TouchableOpacity` when stateful hover is needed. Both are `Platform.OS === 'web'` only but safe to include — on native, `onMouseEnter` is simply ignored.

```typescript
// Source: react-native-web Pressable docs + GitHub commit 7cbe160
// Pattern A — Pressable render prop (preferred for new components)
<Pressable
  style={({ hovered }) => [
    styles.row,
    hovered && { backgroundColor: colors.primaryTint },
  ]}
  onPress={onPress}
>
  {children}
</Pressable>

// Pattern B — onMouseEnter/onMouseLeave on TouchableOpacity (for existing screens)
const [isHovered, setIsHovered] = React.useState(false);
<TouchableOpacity
  style={[styles.row, isHovered && { backgroundColor: colors.primaryTint }]}
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
  onPress={onPress}
>
```

[VERIFIED: react-native-web GitHub — Pressable hovered state added in commit 7cbe160; onMouseEnter/onMouseLeave supported via WebSearch]

### Pattern 4: Focus Ring (Web Keyboard Navigation)

**What:** react-native-web passes through `outlineColor`, `outlineWidth`, `outlineOffset` as CSS on web. Apply via StyleSheet — they are silently ignored on native.

```typescript
// Source: UI-SPEC focus ring contract
// Apply to any focusable element:
const focusStyle = Platform.OS === 'web'
  ? { outlineColor: colors.primary, outlineWidth: 2, outlineOffset: 2 }
  : {};
// Never: { outline: 'none' } without a custom indicator
```

[VERIFIED: react-native-web supports outline* CSS props; UI-SPEC: 2px solid colors.primary (#E8541A), 2px offset]

### Pattern 5: Keyboard Shortcuts (Web Only)

**What:** Use `document.addEventListener('keydown', ...)` inside a `useEffect` with `Platform.OS === 'web'` guard. Fires globally; guard against `event.target` being an input field when needed.

```typescript
// Source: Web Platform APIs (standard)
useEffect(() => {
  if (Platform.OS !== 'web') return;
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
    if (e.key === 'Escape') {
      closeModal();
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [closeModal]);
```

**Shortcuts per UI-SPEC:**
- `Ctrl+K` / `Cmd+K` — focus search bar (HomeScreen, ProductsCatalogScreen)
- `Enter` — submit add-item form (ListDetailScreen) — handled via `onSubmitEditing` on TextInput
- `Escape` — close AppModal (global listener in modal component)

[ASSUMED — standard Web API; pattern verified against existing `webA11y.ts` utility in codebase which already uses `document.activeElement`]

### Pattern 6: `WebTooltip` Component

**What:** Renders children as-is on native; on web, wraps in a hover-triggered overlay.

```typescript
// Source: UI-SPEC WebTooltip spec
// frontend/src/components/ui/WebTooltip.tsx
import React, { useState } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, textStyles } from '@/theme';

interface Props {
  label: string;
  children: React.ReactNode;
}

export const WebTooltip: React.FC<Props> = ({ label, children }) => {
  if (Platform.OS !== 'web') return <>{children}</>;

  const [visible, setVisible] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>();

  return (
    <View
      style={styles.wrapper}
      // @ts-ignore — web-only props
      onMouseEnter={() => { timerRef.current = setTimeout(() => setVisible(true), 400); }}
      onMouseLeave={() => { clearTimeout(timerRef.current); setVisible(false); }}
    >
      {children}
      {visible && (
        <View style={styles.tooltip} pointerEvents="none">
          <Text style={styles.text}>{label}</Text>
        </View>
      )}
    </View>
  );
};
```

Colors: `colors.info` bg, `colors.white` text; padding `spacing.xs`/`spacing.sm`; radius `borderRadius.sm` (6px); delay 400ms.
[VERIFIED: UI-SPEC WebTooltip spec; platform guard confirmed by existing webA11y.ts pattern]

### Pattern 7: Deep-Linking with React Navigation `linking`

**What:** The `NavigationContainer` accepts a `linking` prop. The config `screens` must mirror the navigator hierarchy exactly: top-level is `Main` (RootStack), then `HomeTab`/`ListsTab`/`MapTab`/`AssistantTab` (MaterialTopTabNavigator), then stack screens inside each.

**Critical finding about existing navigator:** The app uses `createMaterialTopTabNavigator` for the tab bar (not `createBottomTabNavigator`). The `tabBarPosition="bottom"` prop puts it visually at the bottom. The `linking` config nesting must match: `Main > {HomeTab, ListsTab, MapTab, AssistantTab} > {stack screens}`.

```typescript
// Source: React Navigation docs (configuring-links) + codebase navigation/RootNavigator.tsx
// Modify: frontend/src/navigation/RootNavigator.tsx

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['http://localhost:19006', 'https://bargain.app'],
  config: {
    screens: {
      Main: {
        screens: {
          HomeTab: {
            screens: {
              Home: 'app/home',
              ProductsCatalog: 'app/home/catalog',
              PriceCompare: 'app/home/compare',
              PriceAlerts: 'app/home/alerts',
              Notifications: 'app/home/notifications',
              FavoriteStores: 'app/map/favorites',
              ProductProposal: 'app/home/propose',
            },
          },
          ListsTab: {
            screens: {
              Lists: 'app/lists',
              ListDetail: 'app/lists/:listId',
              Templates: 'app/lists/templates',
              OCR: 'app/lists/ocr',
              Route: 'app/lists/route',
            },
          },
          MapTab: {
            screens: {
              Map: 'app/map',
              StoreProfile: 'app/map/store/:storeId',
            },
          },
          AssistantTab: {
            screens: {
              Assistant: 'app/assistant',
            },
          },
        },
      },
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
        },
      },
    },
  },
};

// Add to NavigationContainer:
<NavigationContainer linking={linking} ...>
```

**Query params** (e.g., `?q=leche` for ProductsCatalogScreen): React Navigation does NOT natively parse query params into route params in v7. Use `getStateFromPath` override or read `window.location.search` directly in the screen with `Platform.OS === 'web'` guard.

[VERIFIED: React Navigation docs configuring-links; navigator structure verified from codebase RootNavigator.tsx + MainTabs.tsx]

### Pattern 8: Export / Download (Browser API)

**What:** Use `document.createElement('a')` with `href = URL.createObjectURL(blob)` and trigger `.click()`. Guard with `Platform.OS === 'web'`.

```typescript
// Source: Web Platform APIs (standard) — confirmed available in all modern browsers
export function downloadFile(content: string, filename: string, mimeType: string): void {
  if (Platform.OS !== 'web') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
// Usage:
// downloadFile(csvContent, 'bargain-comparativa-2026-06-01.csv', 'text/csv;charset=utf-8;')
// downloadFile(txtContent, 'bargain-lista-2026-06-01.txt', 'text/plain;charset=utf-8;')
```

**Naming convention (from UI-SPEC):** `bargain-{type}-{YYYY-MM-DD}.{ext}`
- RouteScreen: `bargain-ruta-{date}.txt`
- ListDetailScreen: `bargain-lista-{date}.txt`
- PriceCompareScreen: `bargain-comparativa-{date}.csv`

[ASSUMED — standard browser API, universally available. No library needed.]

### Pattern 9: Clipboard (Browser API)

**What:** Use `navigator.clipboard.writeText()`. Falls back to `document.execCommand('copy')` for older browsers. Guard with `Platform.OS === 'web'`.

```typescript
// Source: Web Platform APIs (Clipboard API)
export async function copyToClipboard(text: string): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for HTTP contexts (clipboard API requires HTTPS or localhost)
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}
```

Visual feedback per UI-SPEC: button color transitions to `colors.success` for 1500ms, then reverts. No toast needed.

[ASSUMED — standard browser API; execCommand fallback is widely documented]

### Pattern 10: Drag-Drop Reorder (HTML5 DragEvents in .web.tsx)

**What:** Since `react-native-draggable-flatlist` is broken on web (issue #612, confirmed broken Nov 2025), use HTML5 Drag and Drop API in a `ListDetailScreen.web.tsx` file. This is a structural divergence — exactly the D-10 trigger.

```typescript
// Source: HTML5 Drag and Drop API (Web Standard)
// In ListDetailScreen.web.tsx — render a <View> as a draggable list

// State:
const [dragIndex, setDragIndex] = useState<number | null>(null);

// On the drag container (View maps to <div> in RNW):
// @ts-ignore web-only drag props
<View
  draggable
  onDragStart={() => setDragIndex(index)}
  onDragOver={(e) => { e.preventDefault(); /* show indicator */ }}
  onDrop={() => reorderItems(dragIndex!, index)}
  style={[styles.row, dragIndex === index && { opacity: 0.5 }]}
>
```

**Visual indicator per UI-SPEC:** dragged item gets `shadows.elevated` and `backgroundColor: colors.surface` (semi-transparent lift).
**Persistence:** On `onDrop`, call `listService.updateItemOrder(listId, newOrderedIds)` via API PATCH. Use optimistic update.

[VERIFIED: react-native-draggable-flatlist web broken confirmed via WebSearch + npm check; HTML5 DragEvents work in react-native-web because .web.tsx files produce real DOM]

### Pattern 11: BottomTabBar Web Adaptation (D-12)

**What:** Add `useBreakpoint` to `BottomTabBar.tsx` and apply desktop-specific padding and icon size. No structural changes.

```typescript
// In BottomTabBar.tsx — add inside component:
const breakpoint = useBreakpoint();
const tabItemStyle = breakpoint === 'desktop'
  ? [styles.tabItem, styles.tabItemDesktop]
  : styles.tabItem;
// tabItemDesktop: paddingHorizontal: spacing.lg (24px), iconSize: 26

// Tab bar centering on desktop:
const containerStyle = breakpoint === 'desktop'
  ? [styles.container, { maxWidth: 900, alignSelf: 'center', width: '100%' }]
  : styles.container;
```

[VERIFIED: UI-SPEC BottomTabBar adaptation — 24px side padding, 26px icons, 900px max-width]

### Anti-Patterns to Avoid

- **Using `react-native-draggable-flatlist` on web:** It is not installed and broken on web. Use HTML5 DragEvents in a `.web.tsx` file.
- **Inline `outline: 'none'`:** Forbidden by UI-SPEC unless a custom focus indicator is present.
- **New hex values or magic numbers in styles:** All spacing must use `spacing.*` tokens; all colors use `colors.*` tokens (UI-SPEC non-negotiable constraint #1–2).
- **New icon library:** Only `@expo/vector-icons` Ionicons. No `lucide-react`, no `react-icons`.
- **Modifying `frontend/web/`:** Zero tolerance per D-02.
- **Creating new screens or navigation tree changes:** D-11 forbids this. Deep-linking only adds `linking` config, no new routes.
- **Query params as navigation params directly:** React Navigation v7 does not auto-parse query strings into route params. Read `window.location.search` in the screen or use `getStateFromPath`.
- **`Platform.OS` check at module level outside React:** Always call it inside components or hooks; at module top-level it is safe but may cause SSR issues if the project ever adds SSR.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Breakpoint detection | Custom resize listener | `useWindowDimensions` hook (built-in RN) | Already handles resize events, works cross-platform |
| File download | Fetch + binary manipulation | `URL.createObjectURL` + `<a>` click | Standard browser API, zero deps |
| Clipboard | Custom textarea hack first | `navigator.clipboard.writeText` + `execCommand` fallback | Works on HTTPS and localhost; execCommand covers HTTP fallback |
| CSS transitions for hover | Reanimated animations | `backgroundColor` state toggle (immediate) | 150ms hover transitions don't need Reanimated; simpler state |
| URL sharing | Custom URL builder | `window.location.href` copy via clipboard util | Already resolves the current deep link |
| Focus management | Custom focus trap | `accessibilityRole` + browser native focus | RNW forwards focus to DOM; native behavior is correct |

**Key insight:** This phase requires zero new runtime dependencies. Every feature maps to a built-in browser API or existing RN/Expo APIs, correctly guarded by `Platform.OS === 'web'`.

---

## Common Pitfalls

### Pitfall 1: `onMouseEnter`/`onMouseLeave` TypeScript errors

**What goes wrong:** TypeScript reports "Property 'onMouseEnter' does not exist on type 'ViewProps'" because React Native types don't include web-only props.
**Why it happens:** `@types/react-native` doesn't declare web-only event props.
**How to avoid:** Add `// @ts-ignore` on the line above the prop, or cast the component props to `any` locally. Do NOT add a global type declaration file — that pollutes native code.
**Warning signs:** TS error TS2339 on `onMouseEnter`, `onMouseLeave`, `draggable`, `onDragStart`.

### Pitfall 2: Material Top Tab Navigator and linking config

**What goes wrong:** Deep links to tab screens resolve incorrectly or navigate to the wrong tab.
**Why it happens:** The app uses `createMaterialTopTabNavigator` (not `createBottomTabNavigator`). The tab route names are `HomeTab`, `ListsTab`, `MapTab`, `AssistantTab`, `ProfileTab` (with "Tab" suffix). The linking config must use these exact names.
**How to avoid:** The linking `screens` structure must be: `Main > { HomeTab: { screens: {...} }, ListsTab: { screens: {...} }, ... }`. Use route names from `MainTabParamList` in `navigation/types.ts`.
**Warning signs:** Navigating to `/app/lists` sends to the wrong tab or throws a navigation error.

### Pitfall 3: `useWindowDimensions` causes layout flicker on first render

**What goes wrong:** On web, the first render happens with the SSR/default dimensions before the real window dimensions are available, causing a flash of mobile layout.
**Why it happens:** `useWindowDimensions` returns the initial window size which may be 0×0 in some Expo web build configurations.
**How to avoid:** Default to `'mobile'` when `width === 0` in `useBreakpoint`. This ensures mobile layout renders first, then switches to the correct breakpoint. This is acceptable UX — no visible flash because mobile is the narrower subset.
**Warning signs:** Brief flash of single-column layout on wide screens when navigating.

### Pitfall 4: Clipboard API requires HTTPS (or localhost)

**What goes wrong:** `navigator.clipboard.writeText()` throws `NotAllowedError` on HTTP URLs.
**Why it happens:** The Clipboard API requires a secure context (HTTPS or `localhost`).
**How to avoid:** Always include the `execCommand('copy')` fallback. In dev (`localhost`), both work. In production (HTTPS on Render), the primary path works.
**Warning signs:** Copy button shows "Copiado" but text is not on clipboard; check browser console for `NotAllowedError`.

### Pitfall 5: `react-native-web` `Pressable` `hovered` state type mismatch

**What goes wrong:** The `style` prop render function `({ hovered }) => [...]` may not type-check correctly with older `@types/react-native` versions.
**Why it happens:** `PressableStateCallbackType` in older types doesn't include `hovered`.
**How to avoid:** Use `onMouseEnter`/`onMouseLeave` pattern (Pattern B above) for TypeScript safety. If using render prop, cast: `({ hovered }: { pressed: boolean; hovered?: boolean }) => [...]`.

### Pitfall 6: HTML5 Drag Events and `preventDefault` on `onDragOver`

**What goes wrong:** Drop event never fires.
**Why it happens:** `onDragOver` must call `event.preventDefault()` for `onDrop` to work.
**How to avoid:** Always `e.preventDefault()` in `onDragOver` handler. In RNW, pass the event as-is; the handler receives a `React.DragEvent<HTMLDivElement>`.

### Pitfall 7: Tab bar does not center on desktop without explicit `alignSelf`

**What goes wrong:** Tab bar stretches full-width on a 1440px monitor.
**Why it happens:** `BottomTabBar` uses `flex: 1` for each tab item without a max-width container.
**How to avoid:** Wrap `styles.tabRow` in an outer container with `maxWidth: 900, alignSelf: 'center', width: '100%'` conditionally when `breakpoint === 'desktop'`.

### Pitfall 8: `FavoriteStoresScreen` is in `HomeStack`, not `MapStack`

**What goes wrong:** Developer tries to deep-link `FavoriteStoresScreen` under `/app/map/favorites` but it's registered in `HomeStackParamList`, not `MapStackParamList`.
**Why it happens:** Inspecting `MainTabs.tsx` shows `FavoriteStores` is inside `HomeStackNavigator`.
**How to avoid:** The linking config must place `FavoriteStores` under `HomeTab.screens`, not `MapTab.screens`. Use path `/app/map/favorites` but register it under `HomeTab`.

---

## Code Examples

### File: `useBreakpoint.ts`

```typescript
// frontend/src/hooks/useBreakpoint.ts
// [VERIFIED: UI-SPEC thresholds 768/1024]
import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width === 0) return 'mobile'; // Guard against SSR/first-render 0-width
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
}
```

### Screen-Level Inline Breakpoint Usage

```typescript
// In any in-scope screen (e.g., ProductsCatalogScreen.tsx)
const breakpoint = useBreakpoint();
const numColumns = breakpoint === 'desktop' ? 4 : breakpoint === 'tablet' ? 3 : 2;

return (
  <FlatList
    numColumns={numColumns}
    key={numColumns} // key must change when numColumns changes to force re-render
    data={products}
    renderItem={renderProductCard}
    contentContainerStyle={breakpoint !== 'mobile'
      ? { maxWidth: 1200, alignSelf: 'center', width: '100%' }
      : undefined
    }
  />
);
```

Note: `key` change forces FlatList to re-mount when column count changes; without this, RN throws a "Changing numColumns requires a key change" error.

### Share by URL

```typescript
// Shown on web only (Platform.OS === 'web')
const handleShareUrl = useCallback(async () => {
  if (Platform.OS !== 'web') return;
  await copyToClipboard(window.location.href);
  setShareButtonSuccess(true);
  setTimeout(() => setShareButtonSuccess(false), 1500);
}, []);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Navigation 5/6 linking with `path` string on each screen | v7 nested `screens` config object mirroring navigator hierarchy | RN v7 (2024) | Config must mirror exact navigator tree structure |
| `TouchableOpacity` for all interactive elements | `Pressable` with render prop for hover on web | RNW 0.18+ | Prefer `Pressable` for new web-interactive elements; existing `TouchableOpacity` can use `onMouseEnter`/`onMouseLeave` |
| `react-native-draggable-flatlist` for web drag-drop | HTML5 DragEvents in `.web.tsx` file | 2025 (lib broken on web) | No additional dependency; pure DOM API |

**Deprecated/outdated:**
- `react-native-draggable-flatlist` on web: broken since Reanimated 4.x / Gesture Handler 2.x integration issues. Do not use for web drag-drop.
- `document.execCommand('copy')`: deprecated by W3C but still works as fallback. Use `navigator.clipboard` as primary.

---

## Runtime State Inventory

> Not applicable — this is a greenfield enhancement phase, not a rename/refactor/migration phase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Frontend dev server | checked | >=24.0.0 (engines field) | — |
| Expo CLI | `expo start --web` | assumed present (project active) | ~54.0.0 | — |
| React Native Web | Web rendering | ✓ (in package.json) | ^0.21.0 | — |
| `navigator.clipboard` | Copy-to-clipboard | ✓ on HTTPS/localhost | Browser API | `execCommand('copy')` fallback |
| `URL.createObjectURL` | File export/download | ✓ all modern browsers | Browser API | — |
| HTML5 DragEvent API | Drag-drop reorder | ✓ all modern browsers | Browser API | — |
| React Navigation linking | Deep-linking | ✓ (@react-navigation/native ^7) | 7.2.5 (registry) | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- `navigator.clipboard` on HTTP (non-localhost): blocked; `execCommand` fallback covers this.

---

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest + jest-expo + @testing-library/react-native |
| Config location | `frontend/package.json` (`jest` key, `preset: jest-expo`) |
| Quick run command | `cd frontend && npx jest --testPathPattern="useBreakpoint\|MasterDetailLayout\|WebTooltip" --passWithNoTests` |
| Full suite command | `cd frontend && npx jest --coverage` |

### Phase Requirements to Test Map

Phase 13 has no formal REQ-XX identifiers. Validation is derived from D-05..D-08 decisions and UI-SPEC contracts.

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| `useBreakpoint` returns correct breakpoint for widths 320/768/1024 | unit | `npx jest useBreakpoint` | Wave 0 |
| `MasterDetailLayout` renders single pane on mobile/tablet | unit | `npx jest MasterDetailLayout` | Wave 0 |
| `MasterDetailLayout` renders split pane on desktop | unit | `npx jest MasterDetailLayout` | Wave 0 |
| `WebTooltip` renders children directly on native (Platform.OS='ios') | unit | `npx jest WebTooltip` | Wave 0 |
| `WebTooltip` shows tooltip text after hover on web | unit | `npx jest WebTooltip` | Wave 0 |
| `downloadFile` creates anchor element and triggers click (DOM mock) | unit | `npx jest downloadFile\|export` | Wave 0 |
| `copyToClipboard` calls `navigator.clipboard.writeText` | unit | `npx jest clipboard` | Wave 0 |
| Linking config resolves `/app/lists/:listId` to ListDetailScreen | unit/integration | `npx jest linking\|navigation` | Wave 0 |
| Tab bar max-width 900px applied at desktop breakpoint | unit | `npx jest BottomTabBar` | Wave 0 (modify existing) |
| Drag-drop in ListDetailScreen.web.tsx reorders items optimistically | integration | manual smoke test (see below) | Manual |
| Export button absent on native (`Platform.OS !== 'web'`) | unit | `npx jest RouteScreen\|ListDetail` | Wave 0 |

**Manual-only validations (no reliable automated path):**
- Hover state visual appearance (requires real browser rendering)
- Focus ring visibility during keyboard navigation (visual, requires browser + screen reader)
- Drag-drop visual feedback (requires browser gesture simulation)
- URL back/forward browser button behavior
- File download actually downloads (browser security layer)

### Sampling Rate

- **Per task commit:** `cd frontend && npx jest --passWithNoTests --testPathPattern="useBreakpoint|MasterDetailLayout|WebTooltip"`
- **Per wave merge:** `cd frontend && npx jest --coverage`
- **Phase gate:** Full suite green + manual browser smoke test before `/gsd-verify-work`

### Wave 0 Gaps

All test files must be created in Wave 0 (before implementation waves):

- [ ] `frontend/src/__tests__/hooks/useBreakpoint.test.ts` — covers breakpoint thresholds
- [ ] `frontend/src/__tests__/components/ui/MasterDetailLayout.test.tsx` — covers split/single rendering
- [ ] `frontend/src/__tests__/components/ui/WebTooltip.test.tsx` — covers platform guard + hover
- [ ] `frontend/src/__tests__/utils/webUtils.test.ts` — covers `downloadFile`, `copyToClipboard`
- [ ] `frontend/src/__tests__/navigation/linking.test.ts` — covers URL-to-state resolution

Note: `jest-expo` preset already handles web platform simulation via `Platform.OS` mocking. No new test infrastructure needed.

---

## Security Domain

> `security_enforcement` not explicitly `false` in config — section required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no — phase adds no auth flows | — |
| V3 Session Management | no — no session changes | — |
| V4 Access Control | no — no new endpoints or roles | — |
| V5 Input Validation | partial — export and clipboard accept user-derived data | Validate/escape content before passing to `Blob`; do not eval URL params |
| V6 Cryptography | no | — |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| URL parameter injection via deep link (e.g., `?q=<script>`) | Tampering | React Navigation parses params as strings; display with `<Text>` which auto-escapes. Do NOT use `dangerouslySetInnerHTML`. |
| Clipboard poisoning (modified text injected into UI state) | Tampering | Clipboard writes are user-initiated; reads are only triggered by explicit user action. No auto-read from clipboard. |
| CSV injection in export (formula injection `=CMD(...)`) | Tampering | Prefix user-supplied cell values containing `=`, `+`, `-`, `@` with a single quote when building CSV. |

[VERIFIED: CSV injection mitigation — standard security practice documented in OWASP; URL injection — React Navigation string params are safe with React `<Text>` rendering]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `onMouseEnter`/`onMouseLeave` on `TouchableOpacity` works in react-native-web 0.21 | Pattern 3 | Hover state won't work; use Pressable hovered prop instead |
| A2 | `navigator.clipboard.writeText` available in Expo web build (no sandboxing) | Pattern 9 | Fallback to `execCommand` covers this; low risk |
| A3 | `document.createElement('a').click()` triggers download in Expo web | Pattern 8 | If blocked, user gets URL in address bar instead; low risk |
| A4 | Keyboard `keydown` event listeners work globally in react-native-web web output | Pattern 5 | Keyboard shortcuts simply don't fire; graceful degradation |
| A5 | `FlatList` with changing `numColumns` and `key` prop re-renders correctly in RNW | Code Examples | Grid layout broken; use `ScrollView` with `flexWrap: 'wrap'` as fallback |

---

## Open Questions

1. **`ProductsCatalogScreen` appears in both `HomeStackParamList` and `ListsStackParamList`**
   - What we know: `MainTabs.tsx` registers `ProductsCatalogScreen` in both `HomeStackNavigator` and `ListsStackNavigator`. Same component, two different stack contexts.
   - What's unclear: The deep-link URL for the "catalog" context from lists flow — should it be `/app/lists/catalog` or reuse `/app/home/catalog`?
   - Recommendation: Use `/app/home/catalog` as the canonical URL; from the lists flow, navigation is a push that doesn't need a deep-link URL. The `linking` config only needs one path per screen component.

2. **`PriceCompareScreen` similarly appears in both stacks**
   - Same analysis as above. Use `/app/home/compare` as canonical. Lists-context pushes don't need deep-link support in Phase 13.

3. **`window.location.search` vs React Navigation route params for query params**
   - What we know: React Navigation v7 doesn't auto-parse query strings into route params; `getStateFromPath` can be overridden but is complex.
   - What's unclear: Whether the planner wants query params (`?q=`, `?product=`) to be fully navigable (bookmarkable with correct params) or just "best effort" (URL reflects screen but params not restored on hard refresh).
   - Recommendation: For Phase 13, use `window.location.search` in the screen on mount for param restoration — simpler, no `getStateFromPath` needed. Full param restoration can be a follow-up.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `frontend/src/navigation/MainTabs.tsx`, `RootNavigator.tsx`, `types.ts` — navigator structure, route names
- Codebase: `frontend/src/screens/map/MapScreen.web.tsx`, `MapScreen.tsx` — canonical `.web.tsx` divergence pattern
- Codebase: `frontend/src/theme/colors.ts`, `spacing.ts`, `index.ts` — all token values
- Codebase: `frontend/src/components/ui/BottomTabBar.tsx` — tab bar internals
- Codebase: `frontend/src/utils/webA11y.ts` — precedent for `Platform.OS === 'web'` + `document.*` usage
- `frontend/package.json` — all installed dependency versions
- `.planning/phases/13-.../13-UI-SPEC.md` — binding visual/interaction contract
- `.planning/phases/13-.../13-CONTEXT.md` — all locked decisions D-01..D-13

### Secondary (MEDIUM confidence)
- [react-navigation.org/docs/configuring-links](https://reactnavigation.org/docs/configuring-links/) — linking config structure verified
- [necolas.github.io/react-native-web/docs/interactions](https://necolas.github.io/react-native-web/docs/interactions/) — web interaction APIs
- npm registry: `react-native-web@0.21.2`, `@react-navigation/native@7.2.5`, `react-native-draggable-flatlist@4.0.3` (not installed, web-broken)

### Tertiary (LOW confidence)
- WebSearch: react-native-draggable-flatlist web broken (GitHub issue #612, Nov 2025) — flagged A1–A5 in Assumptions Log
- WebSearch: Pressable `hovered` prop via react-native-web — confirmed via GitHub commit reference but not tested in this project

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json + npm registry
- Architecture patterns (breakpoint, master-detail, tooltip): HIGH — derived from UI-SPEC + codebase
- Deep-linking config: HIGH — verified from navigator source + React Navigation docs
- Drag-drop strategy: HIGH (avoid draggable-flatlist) / MEDIUM (HTML5 DragEvents exact behavior)
- Export/clipboard: MEDIUM — standard browser APIs, minor fallback considerations
- Test strategy: HIGH — jest-expo already configured, gap list derived from decision list

**Research date:** 2026-06-01
**Valid until:** 2026-07-01 (stable stack; React Navigation 7.x and react-native-web 0.21.x are unlikely to change materially in 30 days)
