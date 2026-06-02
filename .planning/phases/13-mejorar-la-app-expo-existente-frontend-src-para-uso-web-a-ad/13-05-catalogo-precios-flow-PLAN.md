---
phase: 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
plan: 05
type: execute
wave: 1
depends_on: ["13-01", "13-02"]
decisions: [D-05, D-06, D-07, D-08]
files_modified:
  - frontend/src/screens/home/HomeScreen.tsx
  - frontend/src/screens/home/ProductsCatalogScreen.tsx
  - frontend/src/screens/home/PriceCompareScreen.tsx
  - frontend/src/screens/home/ProductProposalScreen.tsx
autonomous: true

must_haves:
  truths:
    - "On desktop, HomeScreen shows quick-actions in a centered horizontal row (max-width 800px)"
    - "ProductsCatalogScreen shows a 2-4 column product grid by breakpoint and supports Cmd/Ctrl+K to focus search"
    - "ProductsCatalogScreen reflects its search query in the URL (?q=) and can be shared"
    - "On web, PriceCompareScreen offers 'Exportar comparativa' downloading a CSV with injection-safe cells"
    - "Mobile layout (<768px) of all four screens is unchanged"
  artifacts:
    - path: "frontend/src/screens/home/ProductsCatalogScreen.tsx"
      provides: "Responsive grid + Cmd+K search focus + ?q= URL sync"
      contains: "numColumns"
    - path: "frontend/src/screens/home/PriceCompareScreen.tsx"
      provides: "CSV export of the comparison"
      contains: "Exportar comparativa"
  key_links:
    - from: "frontend/src/screens/home/PriceCompareScreen.tsx"
      to: "frontend/src/utils/webExport.ts"
      via: "buildCsv + downloadFile import"
      pattern: "buildCsv|downloadFile"
---

<objective>
Apply web improvements to the Catálogo/Precios cluster: HomeScreen (horizontal quick-actions +
Cmd+K, D-05/D-06), ProductsCatalogScreen (2-4 col grid + Cmd+K search + ?q= URL share, D-05/D-06/D-08),
PriceCompareScreen (sticky-header table + CSV export, D-05/D-07), ProductProposalScreen (centered
form + hover/focus, D-05/D-06).

Purpose: This cluster carries the phase's CSV export showcase (PriceCompare) and the query-param
deep-linking showcase (ProductsCatalog ?q=). Delivers wide-grid browsing and keyboard search.

Output: 4 modified screens.
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
'@/components/ui' -> { WebTooltip }.
'@/utils/webExport' -> buildCsv(headers:string[], rows:string[][]):string, downloadFile(content,filename,mime), copyToClipboard, todayStamp():'YYYY-MM-DD'.
Theme: spacing.xl=32, colors.primaryTint=#FCE7DD (hover), colors.surface, colors.primary (focus ring), colors.success.
PriceCompare route params: { productId, productName, product? }. URL: /app/home/compare (?product=).
ProductsCatalog URL: /app/home/catalog (?q=). window.location.search / window.location.href on web.
Filename: bargain-comparativa-{todayStamp()}.csv  (mime 'text/csv;charset=utf-8;').
Cmd/Ctrl+K pattern: 13-RESEARCH Pattern 5 (document.addEventListener('keydown') in useEffect, Platform.OS==='web' guard, e.preventDefault).
FlatList numColumns requires key={numColumns} (RESEARCH Code Examples).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: HomeScreen horizontal quick-actions + Cmd+K (D-05/D-06)</name>
  <files>frontend/src/screens/home/HomeScreen.tsx</files>
  <read_first>
    - frontend/src/screens/home/HomeScreen.tsx (FULL — 1166 LOC; hero section, quick-action buttons, search bar)
    - frontend/src/hooks/useBreakpoint.ts (Wave 0)
    - frontend/src/components/ui/WebTooltip.tsx (Wave 0)
    - 13-UI-SPEC.md "Focal Points > HomeScreen" + HomeScreen row: "Horizontal quick-actions on >=1024px", "Cmd+K focus search"
    - 13-RESEARCH.md Pattern 5 (keyboard shortcuts)
  </read_first>
  <action>
HomeScreen.tsx: add `const breakpoint = useBreakpoint();` and a `searchInputRef` (useRef) on the search
input.
1. Responsive (D-05): on `breakpoint === 'desktop'` render the hero/quick-action buttons in a centered
   horizontal row (`flexDirection:'row'`, `maxWidth: 800, alignSelf:'center', width:'100%'`, gap
   `spacing.md`) instead of the existing vertical stack. On mobile/tablet keep the EXISTING stacked
   layout byte-for-byte. (UI-SPEC: "hero section max-width 800px, centered; quick-action buttons in a
   horizontal row on desktop instead of vertical stack".)
2. Cmd/Ctrl+K (D-06, web-only): add a `useEffect` guarded by `Platform.OS==='web'` that registers a
   `keydown` listener: on `(e.metaKey || e.ctrlKey) && e.key === 'k'` call `e.preventDefault()` and
   `searchInputRef.current?.focus()`. Remove the listener on cleanup. Show the hint "⌘K / Ctrl+K" via a
   WebTooltip on the search bar (or as a placeholder suffix) on web only.
3. Hover tint on quick-action buttons (`colors.primaryTint`) via onMouseEnter/onMouseLeave (web).
Tokens only; mobile branch unchanged.
  </action>
  <verify>
    <automated>cd frontend && npx jest --passWithNoTests HomeScreen</automated>
  </verify>
  <acceptance_criteria>
    - HomeScreen.tsx contains `useBreakpoint`, `maxWidth: 800`, a `breakpoint === 'desktop'` row block, and a `keydown` listener with `metaKey || e.ctrlKey` and `'k'`
    - Cmd+K useEffect guarded by `Platform.OS === 'web'` with cleanup (removeEventListener)
    - `cd frontend && npx jest --passWithNoTests HomeScreen` exits 0
    - `grep -c "frontend/web" HomeScreen.tsx` == 0
  </acceptance_criteria>
  <done>Desktop horizontal quick-actions centered at 800px; Cmd/Ctrl+K focuses search on web; mobile unchanged.</done>
</task>

<task type="auto">
  <name>Task 2: ProductsCatalogScreen 2-4 col grid + Cmd+K + ?q= URL sync/share (D-05/D-06/D-08)</name>
  <files>frontend/src/screens/home/ProductsCatalogScreen.tsx</files>
  <read_first>
    - frontend/src/screens/home/ProductsCatalogScreen.tsx (FULL — 1363 LOC; product grid/list, search input + query state)
    - frontend/src/hooks/useBreakpoint.ts (Wave 0)
    - frontend/src/utils/webExport.ts (Wave 0 — copyToClipboard)
    - frontend/src/components/ui/WebTooltip.tsx (Wave 0)
    - 13-UI-SPEC.md ProductsCatalogScreen row: "2-4 col grid", "Cmd+K search focus", "Share URL with ?q="
    - 13-RESEARCH.md Pattern 5 + Open Question 3 (window.location.search for query params; React Navigation v7 does NOT auto-parse query)
  </read_first>
  <action>
ProductsCatalogScreen.tsx: add `const breakpoint = useBreakpoint();` and a `searchInputRef`.
1. Responsive grid (D-05): `const numColumns = breakpoint === 'desktop' ? 4 : breakpoint === 'tablet' ? 3 : 2;`
   set FlatList `numColumns={numColumns}` + `key={numColumns}` (RN requirement). Center the grid on wide
   screens with `contentContainerStyle={breakpoint!=='mobile' ? { maxWidth: 1200, alignSelf:'center', width:'100%' } : undefined}`.
2. Cmd/Ctrl+K (D-06, web-only): same keydown pattern as Task 1 to focus `searchInputRef`. Cleanup on unmount.
   Hover tint on product cards (`colors.primaryTint`).
3. ?q= URL sync + share (D-08, web-only):
   - On mount (useEffect, `Platform.OS==='web'`), read `new URLSearchParams(window.location.search).get('q')`
     and if present seed the search query state with it (so a shared `/app/home/catalog?q=leche` restores
     the filter). Per RESEARCH Open Question 3, use `window.location.search` directly — do NOT attempt
     getStateFromPath query parsing.
   - When the user changes the search query, on web update the URL without a navigation push using
     `window.history.replaceState(null, '', \`?q=${encodeURIComponent(query)}\`)` (or clear the param when
     empty). Guard with `Platform.OS==='web'`.
   - Add a `share-social-outline` button (shown on web when a search query is active) that calls
     `copyToClipboard(window.location.href)` with green-1500ms feedback. WebTooltip "Copiar enlace".
Tokens only; empty-state copy "Sin resultados" / "No hay productos que coincidan con tu búsqueda. Prueba
con otro término." preserved. Mobile branch (2-col, no keyboard/URL affordances) unchanged.
  </action>
  <verify>
    <automated>cd frontend && npx jest --passWithNoTests ProductsCatalog</automated>
  </verify>
  <acceptance_criteria>
    - ProductsCatalogScreen.tsx contains `useBreakpoint`, `numColumns`, `key={numColumns}`, a `metaKey || e.ctrlKey` + `'k'` listener, `URLSearchParams`, and `window.history.replaceState`
    - URL/keyboard/share code guarded by `Platform.OS === 'web'`
    - `cd frontend && npx jest --passWithNoTests ProductsCatalog` exits 0
    - `grep -c "frontend/web" ProductsCatalogScreen.tsx` == 0
  </acceptance_criteria>
  <done>2/3/4-col grid by breakpoint; Cmd+K focus; ?q= restores on load + updates on search + shareable URL; mobile unchanged.</done>
</task>

<task type="auto">
  <name>Task 3: PriceCompareScreen sticky-header table + CSV export (D-05/D-07)</name>
  <files>frontend/src/screens/home/PriceCompareScreen.tsx</files>
  <read_first>
    - frontend/src/screens/home/PriceCompareScreen.tsx (FULL — 777 LOC; comparison table rows: product, store, price, unit price)
    - frontend/src/hooks/useBreakpoint.ts (Wave 0)
    - frontend/src/utils/webExport.ts (Wave 0 — buildCsv, downloadFile, todayStamp)
    - 13-UI-SPEC.md PriceCompareScreen row: "Full-width sticky-header table", "Exportar comparativa (.csv)"; Security Domain CSV injection
  </read_first>
  <action>
PriceCompareScreen.tsx: add `const breakpoint = useBreakpoint();`.
1. Responsive (D-05): on web/non-mobile, keep the comparison table full-width but make the header row
   sticky. On web apply `position: 'sticky', top: 0, zIndex: 1, backgroundColor: colors.surface` to the
   header row container (via `Platform.OS==='web'` style — `position:'sticky'` is web-only CSS, ignored on
   native). Add hover tint (`colors.primaryTint`) on table rows.
2. Export comparativa (D-07, web-only): add an "Exportar comparativa" button (Ionicons `download-outline`
   24px, `textStyles.button` label) shown only when `Platform.OS==='web'`. On press build the CSV via
   `buildCsv(['Producto','Tienda','Precio','Precio unitario'], rows)` where `rows` maps each comparison
   entry to `[productName, storeName, priceString, unitPriceString]` (all coerced to string). Then
   `downloadFile(csv, \`bargain-comparativa-${todayStamp()}.csv\`, 'text/csv;charset=utf-8;')`.
   IMPORTANT: do NOT build the CSV by hand — use `buildCsv` so the formula-injection escaping from Wave 0
   applies. Empty state copy unchanged.
Tokens only; mobile table layout unchanged.
  </action>
  <verify>
    <automated>cd frontend && npx jest --passWithNoTests PriceCompare</automated>
  </verify>
  <acceptance_criteria>
    - PriceCompareScreen.tsx contains `useBreakpoint`, `Exportar comparativa`, `buildCsv`, `bargain-comparativa-`, `position: 'sticky'`
    - Export button guarded by `Platform.OS === 'web'`; CSV built via `buildCsv` (not hand-concatenated)
    - `cd frontend && npx jest --passWithNoTests PriceCompare` exits 0
    - `grep -c "frontend/web" PriceCompareScreen.tsx` == 0
  </acceptance_criteria>
  <done>Sticky-header table on web; "Exportar comparativa" downloads injection-safe CSV; mobile unchanged.</done>
</task>

<task type="auto">
  <name>Task 4: ProductProposalScreen centered form + hover/focus (D-05/D-06)</name>
  <files>frontend/src/screens/home/ProductProposalScreen.tsx</files>
  <read_first>
    - frontend/src/screens/home/ProductProposalScreen.tsx (FULL — proposal form fields + submit button)
    - frontend/src/hooks/useBreakpoint.ts (Wave 0)
    - 13-UI-SPEC.md ProductProposalScreen row: "Centered max-width 560", "Hover, focus"
  </read_first>
  <action>
ProductProposalScreen.tsx: add `const breakpoint = useBreakpoint();`. On `breakpoint !== 'mobile'` center
the form content at `{ maxWidth: 560, alignSelf: 'center', width: '100%' }` (UI-SPEC). Add a web focus ring
on inputs and the submit button (`outlineColor: colors.primary, outlineWidth: 2, outlineOffset: 2` when
`Platform.OS==='web'`) and hover tint (`colors.primaryTint`) on the submit button via
onMouseEnter/onMouseLeave. No structural form change; tokens only; mobile branch unchanged.
  </action>
  <verify>
    <automated>cd frontend && npx jest --passWithNoTests ProductProposal</automated>
  </verify>
  <acceptance_criteria>
    - ProductProposalScreen.tsx contains `useBreakpoint`, `maxWidth: 560`, and a web focus-ring style (`outlineColor`)
    - `cd frontend && npx jest --passWithNoTests ProductProposal` exits 0
    - `grep -c "frontend/web" ProductProposalScreen.tsx` == 0
  </acceptance_criteria>
  <done>Proposal form centered at 560px with hover/focus on web; mobile unchanged.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| ?q= query param -> search state | Untrusted query string read from the address bar on web |
| comparison data -> CSV file | Product/store/price text written into a downloaded CSV opened by spreadsheets |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-13-09 | Tampering | `?q=` URL param | mitigate | Parsed via `URLSearchParams` as a plain string, used only to filter results and rendered via `<Text>` (auto-escaped); never eval'd or injected as HTML |
| T-13-10 | Tampering | CSV export | mitigate | CSV built exclusively via Wave-0 `buildCsv` which escapes `= + - @` formula-injection cells (OWASP) |
</threat_model>

<verification>
- `cd frontend && npx jest "HomeScreen|ProductsCatalog|PriceCompare|ProductProposal" --passWithNoTests` green
- `cd frontend && npx eslint src/screens/home/HomeScreen.tsx src/screens/home/ProductsCatalogScreen.tsx src/screens/home/PriceCompareScreen.tsx src/screens/home/ProductProposalScreen.tsx` clean
- `grep -rc "frontend/web" frontend/src/screens/home/HomeScreen.tsx frontend/src/screens/home/ProductsCatalogScreen.tsx frontend/src/screens/home/PriceCompareScreen.tsx frontend/src/screens/home/ProductProposalScreen.tsx` returns 0
- CSV export uses buildCsv (injection-safe), not manual string concatenation
- Mobile layouts verified <768px (manual smoke per VALIDATION.md)
</verification>

<success_criteria>
- HomeScreen horizontal quick-actions + Cmd+K on web
- ProductsCatalog 2-4 col grid + Cmd+K + ?q= restore/update/share
- PriceCompare sticky-header table + injection-safe CSV export
- ProductProposal centered form + hover/focus; all mobile layouts intact
</success_criteria>

<output>
After completion, create `.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-05-SUMMARY.md`
</output>
