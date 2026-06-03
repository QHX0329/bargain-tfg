---
phase: 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
plan: 03
type: execute
wave: 1
depends_on: ["13-01", "13-02"]
decisions: [D-05, D-06, D-07, D-08, D-10]
files_modified:
  - frontend/src/screens/lists/ListsScreen.tsx
  - frontend/src/screens/lists/ListDetailScreen.tsx
  - frontend/src/screens/lists/ListDetailScreen.web.tsx
  - frontend/src/screens/lists/TemplatesScreen.tsx
  - frontend/src/screens/lists/OCRScreen.tsx
  - frontend/src/screens/lists/RouteScreen.tsx
autonomous: true

must_haves:
  truths:
    - "On desktop, ListsScreen shows a wider/centered layout and TemplatesScreen shows a 2-3 column grid"
    - "On web, list items in ListDetailScreen can be drag-reordered and the new order is reflected immediately in the current session (optimistic, no backend persistence in this phase)"
    - "On web, ListDetailScreen offers 'Exportar lista' (.txt download) and a share-URL button"
    - "On web, RouteScreen offers 'Exportar ruta' (.txt download)"
    - "Mobile layout (<768px) of all five Listas screens is unchanged"
  artifacts:
    - path: "frontend/src/screens/lists/ListDetailScreen.web.tsx"
      provides: "Drag-drop reorder variant via HTML5 DragEvents (optimistic, session-only — no API persistence)"
      contains: "onDragStart"
    - path: "frontend/src/screens/lists/RouteScreen.tsx"
      provides: "Web export-route button"
      contains: "Exportar ruta"
  key_links:
    - from: "frontend/src/screens/lists/ListDetailScreen.web.tsx"
      to: "local component item state (session-only reorder)"
      via: "onDrop -> optimistic reorder of local state (no API PATCH)"
      pattern: "onDrop"
    - from: "frontend/src/screens/lists/ListDetailScreen.tsx"
      to: "frontend/src/utils/webExport.ts"
      via: "downloadFile / copyToClipboard import"
      pattern: "downloadFile|copyToClipboard"
---

<objective>
Apply the four web-improvement categories (D-05 responsive, D-06 mouse/keyboard, D-07 conveniences,
D-08 deep-linking already wired in Plan 02) to the five Listas-cluster screens: ListsScreen,
ListDetailScreen (+ new `.web.tsx` drag-drop variant), TemplatesScreen, OCRScreen, RouteScreen.

Purpose: The Listas flow is the canonical master-detail + drag-drop showcase of the phase. This plan
delivers the structurally-large divergence (`ListDetailScreen.web.tsx`) per D-10 and the export/share
conveniences for lists and routes.

Output: 5 modified screens + 1 new `.web.tsx` file.
</objective>

<execution_context>
@C:/Users/xxnii/OneDrive/Documentos/TFG/bargain-tfg/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/xxnii/OneDrive/Documentos/TFG/bargain-tfg/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-RESEARCH.md
@.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-UI-SPEC.md

<interfaces>
<!-- From Wave 0. Import these. -->
'@/hooks/useBreakpoint' -> useBreakpoint(): 'mobile'|'tablet'|'desktop'; type Breakpoint.
'@/components/ui' -> { MasterDetailLayout, WebTooltip, ...existing }.
'@/utils/webExport' -> downloadFile(content,filename,mime), copyToClipboard(text):Promise<boolean>, buildCsv, todayStamp():'YYYY-MM-DD'.
Theme '@/theme': spacing.xs=4/sm=8/md=16/lg=24/xl=32, colors.primary=#E8541A, colors.primaryTint=#FCE7DD (hover),
colors.surface=#FDF6EC, colors.success=#3A7D44 (copy feedback), colors.error=#C0392B, shadows.elevated (drag lift).
ListDetail route params: { listId: string; listName: string }. window.location.href available on web.
Filename convention: bargain-lista-{todayStamp()}.txt , bargain-ruta-{todayStamp()}.txt
Existing .web.tsx precedent: frontend/src/screens/map/MapScreen.web.tsx (645 LOC) — mirror its structure/imports.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: ListsScreen + TemplatesScreen + OCRScreen responsive layout (D-05/D-06)</name>
  <files>frontend/src/screens/lists/ListsScreen.tsx, frontend/src/screens/lists/TemplatesScreen.tsx, frontend/src/screens/lists/OCRScreen.tsx</files>
  <read_first>
    - frontend/src/screens/lists/ListsScreen.tsx (FULL — 577 LOC, current structure & list rendering)
    - frontend/src/screens/lists/TemplatesScreen.tsx (FULL — grid/card rendering)
    - frontend/src/screens/lists/OCRScreen.tsx (FULL — current centered layout)
    - frontend/src/hooks/useBreakpoint.ts (Wave 0)
    - frontend/src/components/ui/WebTooltip.tsx (Wave 0)
    - 13-UI-SPEC.md "Interaction Contracts > D-05 Lists cluster" + "Screen-by-Screen Contract Summary" rows for ListsScreen/TemplatesScreen/OCRScreen
    - 13-RESEARCH.md Pattern 3 (hover) + Code Examples (FlatList numColumns + key)
  </read_first>
  <action>
ListsScreen.tsx: add `const breakpoint = useBreakpoint();`. On `breakpoint !== 'mobile'` constrain the
lists container to a centered column: `contentContainerStyle` / wrapper with
`{ maxWidth: 600, alignSelf: 'center', width: '100%' }` (tablet per UI-SPEC: "wider cards max-width 600
centered" — 600 IS a UI-SPEC binding value). Add hover tint on each list card: use
`onMouseEnter`/`onMouseLeave` state toggling `backgroundColor: colors.primaryTint` on web (Pattern 3,
Pattern B). Add `// @ts-ignore` above the web-only mouse props. Add a focus ring style on touchable
cards via `Platform.OS==='web' ? { outlineColor: colors.primary, outlineWidth: 2, outlineOffset: 2 } : {}`.
Keep "Nueva lista" CTA copy unchanged. Do NOT add the desktop split pane here (selecting a list still
navigates via push — full MasterDetailLayout split is reserved for the ListDetail web experience and is
optional polish; do not break mobile push navigation).

TemplatesScreen.tsx: add `const breakpoint = useBreakpoint();`. Make the template grid responsive via
FlatList `numColumns`: `const numColumns = breakpoint === 'desktop' ? 3 : breakpoint === 'tablet' ? 2 : 1;`
and add `key={numColumns}` to the FlatList (required — RN throws "Changing numColumns requires a key
change", see RESEARCH Code Examples). Center the grid with
`contentContainerStyle={breakpoint!=='mobile' ? { maxWidth: 1000, alignSelf:'center', width:'100%' } : undefined}`.
The `1000` maxWidth is planner discretion — a reasonable centred-content width (NOT a UI-SPEC binding
value); in the comment write "planner discretion — reasonable centred-content width" (do NOT cite UI-SPEC).
Add hover tint on template cards (same Pattern B).

OCRScreen.tsx: add `const breakpoint = useBreakpoint();`. On `breakpoint !== 'mobile'` center content
at `{ maxWidth: 560, alignSelf: 'center', width: '100%' }` per UI-SPEC ("Centered max-width 560px on >=768px"
— 560 IS a UI-SPEC binding value). Ensure the file picker remains keyboard-accessible (it already uses
expo-image-picker; just confirm the trigger button has `accessibilityRole="button"` and
`accessibilityLabel`). No structural change.

All three: use ONLY spacing.*/colors.* tokens; no new hex/magic numbers except the documented
maxWidth layout constants. Of these, 600 and 560 are UI-SPEC binding (cite UI-SPEC in their comments);
1000 is planner discretion (comment "planner discretion — reasonable centred-content width", do NOT cite
UI-SPEC). All web-only branches guarded by `Platform.OS==='web'` or the breakpoint check. Mobile branch
must reproduce the exact prior layout.
  </action>
  <verify>
    <automated>cd frontend && npx jest ListsScreen</automated>
  </verify>
  <acceptance_criteria>
    - ListsScreen.tsx contains `useBreakpoint` and `colors.primaryTint` (hover) and `maxWidth: 600`
    - TemplatesScreen.tsx contains `numColumns` and `key={numColumns}` and a responsive column ternary
    - TemplatesScreen.tsx maxWidth comment does NOT cite UI-SPEC (it is planner discretion); `grep -n "UI-SPEC" TemplatesScreen.tsx` shows no maxWidth=1000 provenance claim
    - OCRScreen.tsx contains `useBreakpoint` and `maxWidth: 560`
    - `cd frontend && npx jest ListsScreen` exits 0 (existing ListsScreen tests still pass — no mobile regression)
    - No raw hex literals added; `grep -nE "#[0-9A-Fa-f]{6}" ListsScreen.tsx TemplatesScreen.tsx OCRScreen.tsx` shows only pre-existing lines
  </acceptance_criteria>
  <done>Three screens responsive + hover/focus on web; mobile unchanged; ListsScreen tests green.</done>
</task>

<task type="auto">
  <name>Task 2: ListDetailScreen export/share/keyboard (in-screen) + ListDetailScreen.web.tsx drag-drop (D-07/D-06/D-10)</name>
  <files>frontend/src/screens/lists/ListDetailScreen.tsx, frontend/src/screens/lists/ListDetailScreen.web.tsx</files>
  <read_first>
    - frontend/src/screens/lists/ListDetailScreen.tsx (FULL — 978 LOC; item list rendering, add-item input, item API calls)
    - frontend/src/screens/map/MapScreen.web.tsx (FULL — canonical .web.tsx structure: same default export name, same props, imports)
    - frontend/src/utils/webExport.ts (Wave 0 — downloadFile, copyToClipboard, todayStamp)
    - frontend/src/components/ui/WebTooltip.tsx (Wave 0)
    - 13-RESEARCH.md Pattern 10 (HTML5 DragEvents) + Pitfall 6 (preventDefault on onDragOver)
    - 13-UI-SPEC.md "D-07 Drag-drop reorder", "Export/download", "Copy to clipboard", "D-06 keyboard (Enter to add, Esc to close)"
  </read_first>
  <action>
SCOPE NOTE (read first): Drag-drop reordering in this phase is **optimistic / session-only**. The new
order lives ONLY in local component state and is NOT persisted to the backend. API persistence of item
order is **OUT OF SCOPE for Phase 13** — it would require exposing the (already-existing) `ordering`
column in `backend/apps/shopping_lists/serializers.py` `ShoppingListItemSerializer` and adding a
reorder method to `frontend/src/api/listService.ts`; both are deferred. Therefore this task MUST NOT
touch `listService.ts` or any backend file, and MUST NOT add any `updateItemOrder` / order-PATCH call.

PART A — ListDetailScreen.tsx (shared, applies to both native & web):
1. Export list (D-07, web-only): add an "Exportar lista" button (Ionicons `download-outline`, 24px,
   `textStyles.button` label) rendered only when `Platform.OS==='web'`. On press, build a plain-text
   body of `{quantity}x {name}` per item joined by `\n`, then
   `downloadFile(body, \`bargain-lista-${todayStamp()}.txt\`, 'text/plain;charset=utf-8;')`.
   The button MUST have `accessibilityRole="button"` and `accessibilityLabel="Exportar lista"`.
2. Share URL (D-08, web-only): add a `share-social-outline` button that calls
   `copyToClipboard(window.location.href)` and flips the button color to `colors.success` for 1500ms
   (use a `shareSuccess` state + setTimeout) then reverts. Tooltip "Copiar enlace" via WebTooltip.
   The button MUST have `accessibilityRole="button"` and `accessibilityLabel="Compartir enlace"`.
3. Keyboard (D-06, web-only): on the add-item TextInput set `onSubmitEditing` to submit the add-item
   form (Enter to add). Show the hint "Pulsa Enter para añadir" below the input only on web.
   For Esc-to-close on any open modal, add a web-only `document.addEventListener('keydown', ...)` in a
   `useEffect` guarded by `Platform.OS==='web'` that calls the existing close handler on `e.key==='Escape'`
   (remove listener on cleanup — RESEARCH Pattern 5).
All web-only UI guarded by `Platform.OS==='web'`. Do not alter existing item CRUD or mobile rendering.

PART B — ListDetailScreen.web.tsx (NEW, drag-drop variant, D-10 trigger):
Create the file mirroring `MapScreen.web.tsx` conventions: SAME default/named export identity as
ListDetailScreen so the bundler picks `.web.tsx` on web. It should reuse as much logic as practical —
the recommended approach: keep ListDetailScreen.tsx as the source of item-rendering/CRUD logic and have
the `.web.tsx` import shared helpers, OR re-render the list rows with HTML5 drag handlers. Implement the
draggable list per RESEARCH Pattern 10:
- State `const [dragIndex, setDragIndex] = useState<number|null>(null);`
- Each row `View` gets (with `// @ts-ignore` for web-only props): `draggable`,
  `onDragStart={() => setDragIndex(index)}`,
  `onDragOver={(e) => { e.preventDefault(); }}` (preventDefault is MANDATORY or onDrop never fires —
  Pitfall 6), `onDrop={() => reorder(dragIndex, index)}`.
- Visual lift: dragged row gets `shadows.elevated` and `backgroundColor: colors.surface` (UI-SPEC).
- `reorder(from,to)`: reorder local item state ONLY (optimistic / session-only). Do NOT call any API,
  do NOT call listService, do NOT issue an order-PATCH. The reordered array is held in this screen's
  React state for the current session; it resets on remount. Document this session-only behaviour in
  the SUMMARY (and that backend order persistence is deferred per the SCOPE NOTE above).
- Drag handle tooltip "Arrastra para reordenar" via WebTooltip.
The `.web.tsx` must still render the export/share/keyboard affordances from PART A (import/reuse the same
handlers) so web users get both drag-drop AND export.
  </action>
  <verify>
    <automated>cd frontend && npx jest "ListDetail|ListsScreen"</automated>
  </verify>
  <acceptance_criteria>
    - ListDetailScreen.tsx contains `Exportar lista`, `downloadFile`, `bargain-lista-`, `onSubmitEditing`, and a `Platform.OS === 'web'` Escape keydown listener
    - ListDetailScreen.tsx "Exportar lista" button has `accessibilityRole="button"` and `accessibilityLabel="Exportar lista"`; share button has `accessibilityLabel="Compartir enlace"`
    - ListDetailScreen.web.tsx exists and contains `onDragStart`, `onDrop`, `e.preventDefault` (in onDragOver), `shadows.elevated`
    - ListDetailScreen.web.tsx default export name matches ListDetailScreen (bundler resolution)
    - Session-only reorder: `grep -nE "updateItemOrder|listService" ListDetailScreen.web.tsx ListDetailScreen.tsx` shows NO new order-persistence call (no `updateItemOrder`)
    - `cd frontend && npx jest "ListDetail|ListsScreen"` exits 0
    - `grep -c "frontend/web" ListDetailScreen.tsx ListDetailScreen.web.tsx` == 0
  </acceptance_criteria>
  <done>Web list export+share+Enter/Esc work; .web.tsx drag-reorders items optimistically in-session (no backend persistence — deferred); mobile ListDetail unchanged.</done>
</task>

<task type="auto">
  <name>Task 3: RouteScreen responsive + export route (D-05/D-07)</name>
  <files>frontend/src/screens/lists/RouteScreen.tsx</files>
  <read_first>
    - frontend/src/screens/lists/RouteScreen.tsx (FULL — 1568 LOC; stops list, map, route summary with cost/distance)
    - frontend/src/hooks/useBreakpoint.ts (Wave 0)
    - frontend/src/utils/webExport.ts (Wave 0 — downloadFile, todayStamp)
    - 13-UI-SPEC.md RouteScreen row: "Two-col (stops left, map right) on >=1024px" + "Exportar ruta (.txt)"
  </read_first>
  <action>
RouteScreen.tsx: add `const breakpoint = useBreakpoint();`.
1. Responsive (D-05): on `breakpoint === 'desktop'` render the ordered stops list and the route map in
   a two-column `flexDirection:'row'` layout — stops left (flex ~0.4 / fixed ~360px), map right (flex:1),
   column gap `spacing.xl` (32). On mobile/tablet keep the EXISTING stacked layout byte-for-byte.
   Guard the row layout strictly behind `breakpoint === 'desktop'`.
2. Export route (D-07, web-only): add an "Exportar ruta" button (Ionicons `download-outline` 24px,
   `textStyles.button` label) shown only when `Platform.OS==='web'`. On press, build a plain-text body
   listing the ordered stops (store name + items per stop) plus the route summary (total cost, total
   distance, estimated time), then
   `downloadFile(body, \`bargain-ruta-${todayStamp()}.txt\`, 'text/plain;charset=utf-8;')`.
   The button MUST have `accessibilityRole="button"` and `accessibilityLabel="Exportar ruta"`.
   Empty-route copy stays "Ruta vacía" per UI-SPEC.
3. Hover on stop rows: `colors.primaryTint` tint via onMouseEnter/onMouseLeave (web).
Tokens only; the only fixed number allowed is the documented 360px column width (stops column — planner
discretion sizing, comment accordingly). Mobile branch must reproduce prior layout exactly.
  </action>
  <verify>
    <automated>cd frontend && npx jest --passWithNoTests RouteScreen</automated>
  </verify>
  <acceptance_criteria>
    - RouteScreen.tsx contains `useBreakpoint`, `Exportar ruta`, `downloadFile`, `bargain-ruta-`
    - RouteScreen.tsx "Exportar ruta" button has `accessibilityRole="button"` and `accessibilityLabel="Exportar ruta"`
    - RouteScreen.tsx two-column block guarded by `breakpoint === 'desktop'`
    - Export button guarded by `Platform.OS === 'web'`
    - `cd frontend && npx jest --passWithNoTests RouteScreen` exits 0
    - `grep -c "frontend/web" RouteScreen.tsx` == 0
  </acceptance_criteria>
  <done>RouteScreen two-column on desktop, export-route .txt on web, hover on stops; mobile unchanged.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Exported list/route content -> .txt file | User list item names written into a downloaded text file |
| window.location.href -> clipboard | Current URL copied for sharing |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-13-05 | Tampering | List/route .txt export | accept | Plain-text MIME `text/plain`; not interpreted as formula by spreadsheets; item names rendered as-is |
| T-13-06 | Tampering | Drag-reorder (session-only) | accept | Reorder mutates local React state ONLY; no API call, no persisted writes, no server-side state changed in this phase; order resets on remount |
</threat_model>

<verification>
- `cd frontend && npx jest "ListDetail|ListsScreen|RouteScreen" --passWithNoTests` green
- `cd frontend && npx eslint src/screens/lists/` clean
- `grep -rc "frontend/web" frontend/src/screens/lists/` returns 0 across all files
- No backend file and no `frontend/src/api/listService.ts` modified by this plan (drag-drop is session-only)
- Mobile layout of all five screens verified visually <768px (manual smoke per VALIDATION.md)
- No new screen / navigation route added (D-11)
</verification>

<success_criteria>
- ListsScreen/TemplatesScreen/OCRScreen responsive + hover/focus on web, mobile intact
- ListDetailScreen exports .txt, shares URL, Enter-to-add/Esc-to-close on web
- ListDetailScreen.web.tsx drag-reorders with optimistic session-only order (D-10 divergence; backend persistence deferred)
- RouteScreen two-column desktop + export route .txt
</success_criteria>

<output>
After completion, create `.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-03-SUMMARY.md`
</output>
</content>
</invoke>
