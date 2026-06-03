---
phase: 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
plan: 04
type: execute
wave: 1
depends_on: ["13-01", "13-02"]
decisions: [D-05, D-06, D-07, D-08]
files_modified:
  - frontend/src/screens/map/MapScreen.web.tsx
  - frontend/src/screens/map/StoreProfileScreen.tsx
  - frontend/src/screens/home/FavoriteStoresScreen.tsx
autonomous: true

must_haves:
  truths:
    - "On desktop, MapScreen.web.tsx shows the store panel on the right side instead of the bottom"
    - "On desktop, StoreProfileScreen shows a two-column layout (info left, prices/products right)"
    - "On web, users can copy a store's address to the clipboard with visual success feedback"
    - "On web, StoreProfileScreen offers a share-URL button reflecting /app/map/store/:storeId"
    - "On desktop/tablet, FavoriteStoresScreen shows a 2-column grid; mobile is single-column unchanged"
  artifacts:
    - path: "frontend/src/screens/map/StoreProfileScreen.tsx"
      provides: "Two-column desktop layout + copy address + share URL"
      contains: "copyToClipboard"
    - path: "frontend/src/screens/home/FavoriteStoresScreen.tsx"
      provides: "Responsive favorites grid"
      contains: "numColumns"
  key_links:
    - from: "frontend/src/screens/map/StoreProfileScreen.tsx"
      to: "frontend/src/utils/webExport.ts"
      via: "copyToClipboard import"
      pattern: "copyToClipboard"
---

<objective>
Apply web improvements to the Mapa/Tiendas cluster: MapScreen.web.tsx (right-side panel on desktop,
D-05), StoreProfileScreen (two-column desktop + copy address + share URL, D-05/D-07/D-08) and
FavoriteStoresScreen (responsive grid + hover, D-05/D-06).

Purpose: Make the store-discovery flow feel like a real web app on wide screens while keeping the
existing mobile map UX pixel-identical. MapScreen native (`MapScreen.tsx`) is NOT touched — only its
`.web.tsx` variant.

Output: 3 modified screens (one of which is the existing `.web.tsx`).
</objective>

<execution_context>
@C:/Users/xxnii/OneDrive/Documentos/TFG/bargain-tfg/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/xxnii/OneDrive/Documentos/TFG/bargain-tfg/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-RESEARCH.md
@.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-UI-SPEC.md

<interfaces>
'@/hooks/useBreakpoint' -> useBreakpoint(): 'mobile'|'tablet'|'desktop'.
'@/components/ui' -> { MasterDetailLayout, WebTooltip }.
'@/utils/webExport' -> copyToClipboard(text):Promise<boolean>.
Theme: spacing.xl=32 (column gap), colors.primaryTint=#FCE7DD (hover), colors.success=#3A7D44 (copy feedback),
colors.surface=#FDF6EC, colors.surfaceVariant=#F2E3D1 (icon-button hover), colors.primary (focus ring), colors.border.
StoreProfile route params: { storeId: string; storeName?: string; userLat: number; userLng: number }.
URL: /app/map/store/:storeId. window.location.href on web.
MapScreen.web.tsx already exists (645 LOC) and currently uses a BOTTOM panel — convert to right-side on desktop.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: MapScreen.web.tsx right-side panel on desktop (D-05)</name>
  <files>frontend/src/screens/map/MapScreen.web.tsx</files>
  <read_first>
    - frontend/src/screens/map/MapScreen.web.tsx (FULL — 645 LOC; locate the bottom-panel container + map container)
    - frontend/src/hooks/useBreakpoint.ts (Wave 0)
    - frontend/src/components/ui/WebTooltip.tsx (Wave 0)
    - 13-UI-SPEC.md "D-05 Map cluster": "Desktop: convert bottom panel to a right-side panel (320px wide, full height). Map fills remaining width."
  </read_first>
  <action>
In MapScreen.web.tsx add `const breakpoint = useBreakpoint();`. Find the outer container that holds the
map and the existing bottom panel. On `breakpoint === 'desktop'`:
- Switch the outer layout to `flexDirection: 'row'` so the map fills the remaining width (`flex: 1`)
  and the store panel docks on the RIGHT with a fixed `width: 320` and `height: '100%'` (UI-SPEC binding
  320px — add a comment). The panel keeps `backgroundColor: colors.surface` and a 1px left divider
  (`borderLeftWidth: 1, borderLeftColor: colors.border`).
- On mobile/tablet keep the EXISTING bottom-panel layout byte-for-byte (do not alter the current
  `flexDirection: 'column'` / bottom-docked structure).
Add hover tint (`colors.primaryTint`) on store cards in the panel via onMouseEnter/onMouseLeave (web,
`// @ts-ignore`). Preserve all existing map markers, "Buscar en esta zona" pill, error state copy
("Error al cargar el mapa. Recarga la página."), and data-fetch logic untouched. Tokens only; the only
fixed number is the 320px panel width (UI-SPEC binding).
  </action>
  <verify>
    <automated>cd frontend && npx jest MapScreen</automated>
  </verify>
  <acceptance_criteria>
    - MapScreen.web.tsx contains `useBreakpoint`, `width: 320`, and a `flexDirection: 'row'` block guarded by `breakpoint === 'desktop'`
    - MapScreen.web.tsx still contains the existing "Buscar en esta zona" / map error copy (unchanged)
    - `cd frontend && npx jest MapScreen` exits 0 (existing MapScreen test passes — no regression)
    - `grep -c "frontend/web" MapScreen.web.tsx` == 0
  </acceptance_criteria>
  <done>Desktop shows right-side 320px panel + map fills width; mobile bottom-panel unchanged; MapScreen test green.</done>
</task>

<task type="auto">
  <name>Task 2: StoreProfileScreen two-column + copy address + share URL (D-05/D-07/D-08)</name>
  <files>frontend/src/screens/map/StoreProfileScreen.tsx</files>
  <read_first>
    - frontend/src/screens/map/StoreProfileScreen.tsx (FULL — current single-column info + prices/products sections + address field)
    - frontend/src/hooks/useBreakpoint.ts (Wave 0)
    - frontend/src/utils/webExport.ts (Wave 0 — copyToClipboard)
    - frontend/src/components/ui/WebTooltip.tsx (Wave 0)
    - 13-UI-SPEC.md StoreProfileScreen row: "Two-col on >=1024px", "Copy address, share URL"; "Copy to clipboard" feedback contract (green 1500ms)
  </read_first>
  <action>
StoreProfileScreen.tsx: add `const breakpoint = useBreakpoint();`.
1. Responsive (D-05): on `breakpoint === 'desktop'` lay out the two main sections in a `flexDirection:'row'`
   split — store info left (`flex: 1`, ~50%), price history / products right (`flex: 1`, ~50%), column gap
   `spacing.xl` (32). On mobile/tablet keep the EXISTING stacked single-column layout byte-for-byte.
2. Copy address (D-07, web-only): after the address field render a `copy-outline` Ionicon button
   (icon-only, with WebTooltip label = its accessibilityLabel, e.g. "Copiar dirección"). On press call
   `copyToClipboard(addressString)` and flip the button color to `colors.success` for 1500ms then revert
   (use a `copied` state + setTimeout). Icon-button hover uses `colors.surfaceVariant`. Guard with
   `Platform.OS==='web'`.
3. Share URL (D-08, web-only): add a `share-social-outline` button that calls
   `copyToClipboard(window.location.href)` with the same green-1500ms feedback. WebTooltip "Copiar enlace".
All web-only affordances guarded by `Platform.OS==='web'`. Tokens only; mobile branch reproduces prior
layout exactly. Add `accessibilityRole="button"` + `accessibilityLabel` on the new buttons.
  </action>
  <verify>
    <automated>cd frontend && npx jest --passWithNoTests StoreProfile</automated>
  </verify>
  <acceptance_criteria>
    - StoreProfileScreen.tsx contains `useBreakpoint`, `copyToClipboard`, `colors.success`, and a `flexDirection: 'row'` block guarded by `breakpoint === 'desktop'`
    - Copy-address and share buttons guarded by `Platform.OS === 'web'` with `accessibilityLabel`
    - `cd frontend && npx jest --passWithNoTests StoreProfile` exits 0
    - `grep -c "frontend/web" StoreProfileScreen.tsx` == 0
  </acceptance_criteria>
  <done>Desktop two-column store profile; copy-address + share-URL with green feedback on web; mobile unchanged.</done>
</task>

<task type="auto">
  <name>Task 3: FavoriteStoresScreen responsive grid + hover (D-05/D-06)</name>
  <files>frontend/src/screens/home/FavoriteStoresScreen.tsx</files>
  <read_first>
    - frontend/src/screens/home/FavoriteStoresScreen.tsx (FULL — current list/grid of favorite store cards)
    - frontend/src/hooks/useBreakpoint.ts (Wave 0)
    - 13-UI-SPEC.md FavoriteStoresScreen row: "2-col grid on >=768px", empty-state copy "Sin tiendas favoritas"
    - 13-RESEARCH.md Code Examples (FlatList numColumns + key)
  </read_first>
  <action>
FavoriteStoresScreen.tsx: add `const breakpoint = useBreakpoint();`. Make the favorites grid responsive:
`const numColumns = breakpoint === 'mobile' ? 1 : 2;` (UI-SPEC: 2-col on >=768px), set FlatList
`numColumns={numColumns}` and add `key={numColumns}` (RN requires a key change when numColumns changes).
Center the grid on wide screens with
`contentContainerStyle={breakpoint!=='mobile' ? { maxWidth: 900, alignSelf:'center', width:'100%' } : undefined}`.
The `900` maxWidth is planner discretion — a reasonable centred-content width (NOT a UI-SPEC binding
value); in the comment write "planner discretion — reasonable centred-content width" (do NOT cite UI-SPEC).
Add hover tint (`colors.primaryTint`) on store cards via onMouseEnter/onMouseLeave (web, `// @ts-ignore`)
and a web focus ring (`outlineColor: colors.primary, outlineWidth: 2, outlineOffset: 2` when
`Platform.OS==='web'`). Preserve the empty-state copy "Sin tiendas favoritas" / "Marca tiendas como
favoritas desde el mapa para verlas aquí." Tokens only; mobile single-column branch unchanged.
  </action>
  <verify>
    <automated>cd frontend && npx jest --passWithNoTests FavoriteStores</automated>
  </verify>
  <acceptance_criteria>
    - FavoriteStoresScreen.tsx contains `useBreakpoint`, `numColumns`, `key={numColumns}`, `colors.primaryTint`
    - FavoriteStoresScreen.tsx maxWidth comment does NOT cite UI-SPEC (it is planner discretion); `grep -n "UI-SPEC" FavoriteStoresScreen.tsx` shows no maxWidth=900 provenance claim
    - Mobile path keeps `numColumns === 1`
    - `cd frontend && npx jest --passWithNoTests FavoriteStores` exits 0
    - `grep -c "frontend/web" FavoriteStoresScreen.tsx` == 0
  </acceptance_criteria>
  <done>Favorites grid 1-col mobile / 2-col tablet+desktop with hover+focus; empty state preserved.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| store address / URL -> clipboard | Store-derived text and current URL copied on user action |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-13-07 | Tampering | Copy address / share URL | accept | Copies are user-initiated only; values are server-sourced store data and the app's own URL; rendered via `<Text>` (auto-escaped); no clipboard reads |
| T-13-08 | Tampering | StoreProfile `:storeId` deep-link param | mitigate | storeId parsed as a string by React Navigation, used only as an authenticated API id lookup; invalid ids yield the existing error state |
</threat_model>

<verification>
- `cd frontend && npx jest "MapScreen|StoreProfile|FavoriteStores" --passWithNoTests` green
- `cd frontend && npx eslint src/screens/map/StoreProfileScreen.tsx src/screens/map/MapScreen.web.tsx src/screens/home/FavoriteStoresScreen.tsx` clean
- `grep -rc "frontend/web" frontend/src/screens/map/StoreProfileScreen.tsx frontend/src/screens/map/MapScreen.web.tsx frontend/src/screens/home/FavoriteStoresScreen.tsx` returns 0
- `frontend/src/screens/map/MapScreen.tsx` (native) NOT modified by this plan
- Mobile layouts verified <768px (manual smoke per VALIDATION.md)
</verification>

<success_criteria>
- MapScreen.web.tsx right-side panel on desktop, bottom panel on mobile
- StoreProfileScreen two-column desktop + copy address + share URL on web
- FavoriteStoresScreen responsive grid + hover/focus
- MapScreen.tsx native untouched; no frontend/web/ references; no new screens
</success_criteria>

<output>
After completion, create `.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-04-SUMMARY.md`
</output>
</content>
