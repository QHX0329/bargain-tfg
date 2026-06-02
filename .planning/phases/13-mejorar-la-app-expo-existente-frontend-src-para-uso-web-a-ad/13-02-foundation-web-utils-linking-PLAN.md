---
phase: 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
plan: 02
type: execute
wave: 0
depends_on: []
decisions: [D-07, D-08]
files_modified:
  - frontend/src/utils/webExport.ts
  - frontend/src/navigation/linking.ts
  - frontend/App.tsx
  - frontend/src/__tests__/utils/webUtils.test.ts
  - frontend/src/__tests__/navigation/linking.test.ts
autonomous: true

must_haves:
  truths:
    - "Web code can download a generated file via downloadFile() guarded by Platform.OS==='web'"
    - "Web code can copy text to the clipboard via copyToClipboard() with an execCommand fallback"
    - "CSV export escapes formula-injection cells (= + - @) so spreadsheets cannot execute them"
    - "Visiting /app/lists/:listId resolves to ListDetailScreen via React Navigation linking config"
  artifacts:
    - path: "frontend/src/utils/webExport.ts"
      provides: "downloadFile, copyToClipboard, buildCsv (with injection escaping)"
      contains: "export function downloadFile"
    - path: "frontend/src/navigation/linking.ts"
      provides: "LinkingOptions config mirroring the Main > *Tab > stack hierarchy"
      contains: "linking"
  key_links:
    - from: "frontend/App.tsx"
      to: "frontend/src/navigation/linking.ts"
      via: "NavigationContainer linking prop"
      pattern: "linking="
---

<objective>
Build the two web-convenience/deep-linking foundations consumed by every Wave-1 flow plan:
(1) `webExport.ts` utility with `downloadFile`, `copyToClipboard` and a CSV-injection-safe `buildCsv`
helper (D-07), and (2) the React Navigation `linking` config wired onto the `NavigationContainer`
in `App.tsx` (D-08) — without adding any new screen or navigator route. Includes the two Wave-0
Jest test files from 13-VALIDATION.md.

Purpose: Flow plans call `downloadFile`/`copyToClipboard`/`buildCsv` for export & share, and rely on
the `linking` config to make their screens deep-linkable. This plan establishes both, plus the URL
contract for all 15 in-scope screens up front so flow plans never touch navigation wiring.

Output: 1 new util file + 1 new linking config file + App.tsx modification + 2 test files.
</objective>

<execution_context>
@C:/Users/xxnii/OneDrive/Documentos/TFG/bargain-tfg/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/xxnii/OneDrive/Documentos/TFG/bargain-tfg/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-RESEARCH.md
@.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-UI-SPEC.md
@.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-VALIDATION.md

<interfaces>
<!-- Navigator route names verified from frontend/src/navigation/MainTabs.tsx + types.ts. -->
Tab route names (with "Tab" suffix): HomeTab, ListsTab, MapTab, AssistantTab, ProfileTab.
HomeStack screens: Home, ProductsCatalog, Notifications, PriceAlerts, FavoriteStores, PriceCompare, ProductProposal.
ListsStack screens: Lists, ListDetail (params listId,listName), Templates, ProductsCatalog, PriceCompare, Route (listId,listName), OCR (listId?).
MapStack screens: Map, StoreProfile (storeId,storeName?,userLat,userLng).
AssistantStack screens: Assistant.
RootStack: Auth | Main. AuthStack: Login, Register.
CRITICAL (Pitfall 8): FavoriteStores lives in HomeStack, NOT MapStack — register it under HomeTab.
NavigationContainer is in frontend/App.tsx (NOT RootNavigator.tsx). linking goes on that container.
RootStackParamList = { Auth; Main } (frontend/src/navigation/types.ts).
Existing existing tests use jest-expo, @/ alias via babel module-resolver. Tests under frontend/src/__tests__/.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: webExport util (download, clipboard, CSV-safe) + test</name>
  <files>frontend/src/utils/webExport.ts, frontend/src/__tests__/utils/webUtils.test.ts</files>
  <read_first>
    - frontend/src/utils/webA11y.ts (existing Platform.OS==='web' + document guard precedent to mirror)
    - 13-RESEARCH.md Pattern 8 (download), Pattern 9 (clipboard), Security Domain (CSV injection)
    - 13-UI-SPEC.md "D-07 Web convenience features" (filename convention bargain-{type}-{YYYY-MM-DD}.{ext})
  </read_first>
  <behavior>
    - downloadFile(content,filename,mime) on Platform.OS!=='web' is a no-op (returns undefined, no DOM access)
    - downloadFile on web creates an <a> element with download=filename and calls .click()
    - copyToClipboard(text) on web calls navigator.clipboard.writeText(text) and resolves true
    - copyToClipboard falls back to document.execCommand('copy') when navigator.clipboard rejects
    - buildCsv prefixes a cell starting with = + - or @ with a single quote (formula-injection guard)
    - buildCsv quotes cells containing commas/quotes/newlines per RFC4180
  </behavior>
  <action>
Create `frontend/src/utils/webExport.ts` with these exports (copy 13-RESEARCH Patterns 8 & 9 verbatim,
all guarded by `Platform.OS !== 'web'`):

```typescript
import { Platform } from 'react-native';

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

export async function copyToClipboard(text: string): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
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

Add a CSV builder with formula-injection escaping (Security Domain, OWASP):

```typescript
function escapeCsvCell(value: string): string {
  let cell = value ?? '';
  if (/^[=+\-@]/.test(cell)) cell = `'${cell}`;          // formula-injection guard
  if (/[",\n]/.test(cell)) cell = `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

export function buildCsv(headers: string[], rows: string[][]): string {
  const head = headers.map(escapeCsvCell).join(',');
  const body = rows.map((r) => r.map(escapeCsvCell).join(',')).join('\n');
  return `${head}\n${body}`;
}
```

Also add a small helper `export function todayStamp(): string` returning `YYYY-MM-DD` (use
`new Date().toISOString().slice(0,10)`) so flow plans build the `bargain-{type}-{date}.{ext}` filenames.

Create `frontend/src/__tests__/utils/webUtils.test.ts`:
- Mock `Platform.OS='web'`. Mock `document.createElement` to return a stub anchor with a `click` jest.fn
  and assert `downloadFile('x','bargain-lista-2026-06-01.txt','text/plain')` sets `download` and calls click.
- Mock `Platform.OS='ios'` and assert `downloadFile` does NOT touch document (no throw, returns undefined).
- Mock `navigator.clipboard.writeText` resolving; assert `copyToClipboard('hi')` resolves true and called with 'hi'.
- Make `navigator.clipboard.writeText` reject; stub `document.execCommand` returning true; assert fallback path resolves true.
- `buildCsv(['p'],[['=2+2']])` output contains `'=2+2` (leading single quote) NOT a bare `=2+2`.
- `buildCsv(['p'],[['a,b']])` output contains `"a,b"` (quoted).
  </action>
  <verify>
    <automated>cd frontend && npx jest "webUtils|export"</automated>
  </verify>
  <acceptance_criteria>
    - `webExport.ts` contains `export function downloadFile`, `export async function copyToClipboard`, `export function buildCsv`
    - `webExport.ts` contains `Platform.OS !== 'web'` guard in both downloadFile and copyToClipboard
    - `webExport.ts` contains the regex `/^[=+\-@]/` (CSV injection guard)
    - `cd frontend && npx jest "webUtils|export"` exits 0
  </acceptance_criteria>
  <done>downloadFile/copyToClipboard/buildCsv work web-only; CSV cells with = + - @ are escaped; test green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Deep-linking config + wire onto NavigationContainer + test</name>
  <files>frontend/src/navigation/linking.ts, frontend/App.tsx, frontend/src/__tests__/navigation/linking.test.ts</files>
  <read_first>
    - frontend/App.tsx (FULL — NavigationContainer is here, line ~80; add linking prop)
    - frontend/src/navigation/MainTabs.tsx (exact stack/screen names + which stack each screen lives in)
    - frontend/src/navigation/types.ts (RootStackParamList = { Auth; Main })
    - 13-RESEARCH.md Pattern 7 (linking config) + Pitfalls 2 and 8
    - 13-UI-SPEC.md "D-08 URL / deep-linking" table (all 15 URL paths, binding)
  </read_first>
  <behavior>
    - getStateFromPath('/app/lists/abc') (via getStateFromPath with the linking.config) yields a state whose active route is ListDetail with params.listId='abc'
    - getStateFromPath('/app/map/store/42') yields StoreProfile with params.storeId='42'
    - getStateFromPath('/app/home/catalog') yields ProductsCatalog under HomeTab
    - getPathFromState for ListDetail listId='abc' yields a path containing '/app/lists/abc'
  </behavior>
  <action>
Create `frontend/src/navigation/linking.ts` exporting a `linking: LinkingOptions<RootStackParamList>`
object. Copy the config structure from 13-RESEARCH.md Pattern 7 VERBATIM (it is verified against the
navigator). Binding paths from UI-SPEC D-08 table:

```
prefixes: ['http://localhost:19006', 'http://localhost:8081', 'https://bargain.app']
config.screens.Main.screens:
  HomeTab.screens: { Home:'app/home', ProductsCatalog:'app/home/catalog', PriceCompare:'app/home/compare',
                     PriceAlerts:'app/home/alerts', Notifications:'app/home/notifications',
                     FavoriteStores:'app/map/favorites', ProductProposal:'app/home/propose' }
  ListsTab.screens: { Lists:'app/lists', ListDetail:'app/lists/:listId', Templates:'app/lists/templates',
                      OCR:'app/lists/ocr', Route:'app/lists/route' }
  MapTab.screens: { Map:'app/map', StoreProfile:'app/map/store/:storeId' }
  AssistantTab.screens: { Assistant:'app/assistant' }
config.screens.Auth.screens: { Login:'login', Register:'register' }
```

CRITICAL: `FavoriteStores` is registered under `HomeTab` (it lives in HomeStack — Pitfall 8), even
though its URL is `/app/map/favorites`. Do NOT place it under MapTab.
Import `LinkingOptions` from '@react-navigation/native' and `RootStackParamList` from './types'.

Modify `frontend/App.tsx`: import `{ linking }` from '@/navigation/linking' and pass it to the
existing `<NavigationContainer>` as `<NavigationContainer linking={linking}>`. Do NOT change anything
else in App.tsx (fonts, hydrate, providers untouched). Do NOT add screens or modify MainTabs/RootNavigator.

Create `frontend/src/__tests__/navigation/linking.test.ts`: import `{ linking }` and
`{ getStateFromPath, getPathFromState }` from '@react-navigation/native'. Assert:
- `getStateFromPath('/app/lists/abc', linking.config)` produces a state where the deepest active
  route name is 'ListDetail' and `params.listId === 'abc'`.
- `getStateFromPath('/app/map/store/42', linking.config)` -> route 'StoreProfile', `params.storeId === '42'`.
- `getStateFromPath('/app/home/catalog', linking.config)` resolves (non-null) with route 'ProductsCatalog'.
- `getPathFromState` round-trip for ListDetail includes 'app/lists/abc'.
(Traverse the returned state's nested `routes[...].state` chain to the leaf to read the route name/params.)
  </action>
  <verify>
    <automated>cd frontend && npx jest "linking|navigation"</automated>
  </verify>
  <acceptance_criteria>
    - `linking.ts` contains `linking` export, `ListDetail: 'app/lists/:listId'`, `StoreProfile: 'app/map/store/:storeId'`
    - `linking.ts` registers `FavoriteStores` under `HomeTab` (not MapTab)
    - `App.tsx` contains `linking={linking}` on the NavigationContainer and still contains `RootNavigator`
    - `App.tsx` import list includes `linking` from '@/navigation/linking'
    - `cd frontend && npx jest "linking|navigation"` exits 0 resolving /app/lists/:listId to ListDetail
  </acceptance_criteria>
  <done>linking config mirrors navigator tree; NavigationContainer wired; URL->state resolution test green; no new routes.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| URL/deep link -> app state | Untrusted path/query segments enter via the browser address bar |
| Exported file content -> spreadsheet | User-derived list/price text written into CSV opened by a spreadsheet app |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-13-02 | Tampering | CSV export (`buildCsv`) | mitigate | `escapeCsvCell` prefixes cells starting with `= + - @` with a single quote (OWASP CSV-injection guard) — unit-tested |
| T-13-03 | Tampering | Deep-link path params (`:listId`,`:storeId`) | mitigate | React Navigation parses params as plain strings; consumed only by API id lookups and rendered via `<Text>` (auto-escaped). No `dangerouslySetInnerHTML`, no eval |
| T-13-04 | Information disclosure | Clipboard write | accept | Writes are user-initiated only; no automatic clipboard reads anywhere in the phase |
</threat_model>

<verification>
- `cd frontend && npx jest "webUtils|export|linking|navigation"` all green
- `cd frontend && npx eslint src/utils/webExport.ts src/navigation/linking.ts App.tsx` clean
- `grep -c "Auth\|Main" frontend/src/navigation/linking.ts` confirms config mirrors RootStack (Auth+Main)
- `grep -rc "frontend/web" frontend/src/utils frontend/src/navigation/linking.ts frontend/App.tsx` returns 0
- No new `Tab.Screen` / `Stack.Screen` added anywhere (D-11) — only a `linking` object
</verification>

<success_criteria>
- downloadFile/copyToClipboard/buildCsv exported from '@/utils/webExport', web-guarded
- CSV injection cells escaped, unit-tested
- linking config resolves all UI-SPEC D-08 paths; ListDetail/StoreProfile params parsed
- NavigationContainer in App.tsx receives the linking prop with zero other navigation changes
</success_criteria>

<output>
After completion, create `.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-02-SUMMARY.md`
</output>
