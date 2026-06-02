---
phase: 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
plan: 01
type: execute
wave: 0
depends_on: []
decisions: [D-05, D-06, D-09, D-10, D-12]
files_modified:
  - frontend/src/hooks/useBreakpoint.ts
  - frontend/src/components/ui/MasterDetailLayout.tsx
  - frontend/src/components/ui/WebTooltip.tsx
  - frontend/src/components/ui/index.ts
  - frontend/src/components/ui/BottomTabBar.tsx
  - frontend/src/__tests__/hooks/useBreakpoint.test.ts
  - frontend/src/__tests__/components/ui/MasterDetailLayout.test.tsx
  - frontend/src/__tests__/components/ui/WebTooltip.test.tsx
  - frontend/src/__tests__/components/ui/BottomTabBar.test.tsx
autonomous: true

must_haves:
  truths:
    - "On desktop (width>=1024) layout code can branch via a single useBreakpoint hook"
    - "MasterDetailLayout renders a split pane on desktop and a single pane on mobile/tablet"
    - "WebTooltip shows a hover label on web and renders children untouched on native"
    - "The bottom tab bar is centered with max-width 900px and 26px icons on desktop, unchanged on mobile"
  artifacts:
    - path: "frontend/src/hooks/useBreakpoint.ts"
      provides: "Breakpoint hook (mobile|tablet|desktop) from useWindowDimensions"
      contains: "export function useBreakpoint"
    - path: "frontend/src/components/ui/MasterDetailLayout.tsx"
      provides: "Split-pane desktop layout component"
      contains: "MasterDetailLayout"
    - path: "frontend/src/components/ui/WebTooltip.tsx"
      provides: "Web-only hover tooltip"
      contains: "WebTooltip"
  key_links:
    - from: "frontend/src/components/ui/BottomTabBar.tsx"
      to: "frontend/src/hooks/useBreakpoint.ts"
      via: "import { useBreakpoint }"
      pattern: "useBreakpoint"
---

<objective>
Create the three shared web-foundation primitives every in-scope screen depends on —
`useBreakpoint` hook (D-09), `MasterDetailLayout` (D-05) and `WebTooltip` (D-06) — plus the
desktop restyle of the existing `BottomTabBar` (D-12). Includes the Wave-0 Jest test files for
each from 13-VALIDATION.md.

Purpose: These artifacts are imported by all four Wave-1 flow plans. Without them the flow plans
cannot branch layout, show tooltips, or display the split-pane master-detail pattern.

Output: 3 new source files + 1 modified existing component + barrel export update + 4 test files.
</objective>

<execution_context>
@C:/Users/xxnii/OneDrive/Documentos/TFG/bargain-tfg/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/xxnii/OneDrive/Documentos/TFG/bargain-tfg/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-CONTEXT.md
@.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-RESEARCH.md
@.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-UI-SPEC.md
@.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-VALIDATION.md

<interfaces>
<!-- Exact token values confirmed from frontend/src/theme/. Use these directly. -->
Spacing (frontend/src/theme/spacing.ts): spacing.xs=4, spacing.sm=8, spacing.md=16, spacing.lg=24, spacing.xl=32.
borderRadius.sm=6, borderRadius.md=12.
Colors (frontend/src/theme/colors.ts): colors.primary=#E8541A, colors.primaryTint=#FCE7DD,
colors.surface=#FDF6EC, colors.surfaceVariant=#F2E3D1, colors.border=#E8E0D0,
colors.info=#1A6B8A, colors.white=#FFFFFF, colors.success=#3A7D44, colors.background=#FAFAF7,
colors.error=#C0392B, colors.errorBg=#FBEAEA, colors.text, colors.textMuted.
sizes (frontend/src/theme/spacing.ts): sizes.tabBarHeight=50, sizes.tabIconSize=24.
textStyles.caption (12px/400). All imports from '@/theme'. Path alias '@' = ./src (babel module-resolver + tsconfig).
Tests live under frontend/src/__tests__/; jest preset jest-expo; run with `cd frontend && npx jest`.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: useBreakpoint hook + test</name>
  <files>frontend/src/hooks/useBreakpoint.ts, frontend/src/__tests__/hooks/useBreakpoint.test.ts</files>
  <read_first>
    - frontend/src/theme/index.ts (confirm '@/theme' barrel exports)
    - frontend/package.json jest key (preset jest-expo, testPathIgnorePatterns web/)
    - frontend/__tests__/ListsScreen.test.tsx (existing test mock/import style to mirror)
    - 13-RESEARCH.md Pattern 1 + Code Examples `useBreakpoint.ts`
  </read_first>
  <behavior>
    - width 320 -> 'mobile'
    - width 767 -> 'mobile'
    - width 768 -> 'tablet'
    - width 1023 -> 'tablet'
    - width 1024 -> 'desktop'
    - width 0 -> 'mobile' (SSR/first-render guard)
  </behavior>
  <action>
Create `frontend/src/hooks/useBreakpoint.ts`. Create the `hooks/` directory (it does not exist yet).
Exact implementation (copy verbatim, thresholds are binding from UI-SPEC):

```typescript
import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width === 0) return 'mobile';
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
}
```

Then create `frontend/src/__tests__/hooks/useBreakpoint.test.ts`. Mock `useWindowDimensions` from
'react-native' to return a controlled `{ width }` and assert the return value for each width above.
Use `renderHook` from '@testing-library/react-native' OR a thin wrapper component; mirror the mock
style of existing tests (`jest.mock('react-native', ...)` with `requireActual` to keep other exports).
Cover all 6 widths in the behavior block (320, 767, 768, 1023, 1024, 0).
  </action>
  <verify>
    <automated>cd frontend && npx jest useBreakpoint</automated>
  </verify>
  <acceptance_criteria>
    - `useBreakpoint.ts` contains `export function useBreakpoint` and `export type Breakpoint`
    - File contains the literals `1024`, `768`, and the `width === 0` guard
    - `cd frontend && npx jest useBreakpoint` exits 0 with >=6 assertions passing
  </acceptance_criteria>
  <done>Hook returns mobile/tablet/desktop per thresholds; 0-width guard returns mobile; test green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: MasterDetailLayout + WebTooltip components + tests + barrel export</name>
  <files>frontend/src/components/ui/MasterDetailLayout.tsx, frontend/src/components/ui/WebTooltip.tsx, frontend/src/components/ui/index.ts, frontend/src/__tests__/components/ui/MasterDetailLayout.test.tsx, frontend/src/__tests__/components/ui/WebTooltip.test.tsx</files>
  <read_first>
    - frontend/src/components/ui/index.ts (current barrel exports — append, do not remove)
    - frontend/src/components/ui/BargainButton.tsx (existing component style/structure to mirror)
    - frontend/src/theme/spacing.ts and theme/colors.ts (token values)
    - 13-RESEARCH.md Pattern 2 (MasterDetailLayout) and Pattern 6 (WebTooltip)
    - 13-UI-SPEC.md "Component Inventory" + "Color" sections
  </read_first>
  <behavior>
    - MasterDetailLayout: breakpoint 'mobile' -> renders only masterPane (single View, no detail)
    - MasterDetailLayout: breakpoint 'tablet' -> renders only masterPane
    - MasterDetailLayout: breakpoint 'desktop' -> renders BOTH masterPane and detailPane (split row)
    - WebTooltip: Platform.OS='ios' -> renders children, NO tooltip wrapper, label text absent from tree
    - WebTooltip: Platform.OS='web' -> after onMouseEnter + 400ms timer, label text becomes visible
  </behavior>
  <action>
Create `frontend/src/components/ui/MasterDetailLayout.tsx` exactly per 13-RESEARCH.md Pattern 2:
Props `{ masterPane: React.ReactNode; detailPane: React.ReactNode | null; breakpoint: Breakpoint }`
(import `Breakpoint` type from '@/hooks/useBreakpoint'). When `breakpoint !== 'desktop'` return
`<View style={styles.fullWidth}>{masterPane}</View>`. On desktop return a `flexDirection:'row'`
container: master `View` width 360 (`backgroundColor: colors.surface`), a 1px divider
(`backgroundColor: colors.border`), detail `View` `flex:1` with `marginLeft: spacing.xl` (32px).
All tokens from '@/theme'. No magic numbers except the 360px master width and 1px divider (both are
UI-SPEC-binding fixed dimensions — add a code comment citing UI-SPEC).

Create `frontend/src/components/ui/WebTooltip.tsx` exactly per 13-RESEARCH.md Pattern 6:
Props `{ label: string; children: React.ReactNode }`. If `Platform.OS !== 'web'` return
`<>{children}</>`. On web wrap in a `View` with `onMouseEnter` (set a 400ms setTimeout that sets
`visible=true`) and `onMouseLeave` (clearTimeout + `visible=false`). When visible, render an
absolutely-positioned tooltip `View` (`pointerEvents="none"`) with `backgroundColor: colors.info`,
padding `spacing.xs` vertical / `spacing.sm` horizontal, `borderRadius: borderRadius.sm` (6),
and a `Text` using `textStyles.caption` with `color: colors.white` showing `label`. Add
`// @ts-ignore` above the `onMouseEnter`/`onMouseLeave` props (web-only, not in RN ViewProps —
see 13-RESEARCH Pitfall 1).

Append both to `frontend/src/components/ui/index.ts`:
`export { MasterDetailLayout } from './MasterDetailLayout';`
`export { WebTooltip } from './WebTooltip';`
Do NOT remove existing exports.

Create `frontend/src/__tests__/components/ui/MasterDetailLayout.test.tsx`: render with
`detailPane={<Text>DETAIL</Text>}` and `masterPane={<Text>MASTER</Text>}`. For `breakpoint='mobile'`
and `'tablet'`, assert MASTER present and DETAIL `queryByText('DETAIL')` is null. For
`breakpoint='desktop'`, assert both MASTER and DETAIL present. Use `render` from
'@testing-library/react-native'.

Create `frontend/src/__tests__/components/ui/WebTooltip.test.tsx`: (a) with `Platform.OS` mocked to
'ios', render `<WebTooltip label="TIP"><Text>CHILD</Text></WebTooltip>`, assert CHILD present and
`queryByText('TIP')` is null. (b) with `Platform.OS` mocked to 'web', fire `onMouseEnter` (via
`fireEvent` on the wrapper) and advance timers 400ms (`jest.useFakeTimers()` + `jest.advanceTimersByTime(400)`
wrapped in `act`), assert `getByText('TIP')` visible. Mock Platform with
`jest.spyOn(require('react-native').Platform, 'OS', 'get')` or `jest.mock` per existing test patterns.
  </action>
  <verify>
    <automated>cd frontend && npx jest "MasterDetailLayout|WebTooltip"</automated>
  </verify>
  <acceptance_criteria>
    - `MasterDetailLayout.tsx` contains `MasterDetailLayout`, `flexDirection: 'row'`, `width: 360`, `colors.surface`, `spacing.xl`
    - `WebTooltip.tsx` contains `Platform.OS !== 'web'`, `onMouseEnter`, `400`, `colors.info`, `textStyles.caption`
    - `components/ui/index.ts` contains `MasterDetailLayout` and `WebTooltip` exports
    - `cd frontend && npx jest "MasterDetailLayout|WebTooltip"` exits 0
    - No raw hex values or px magic numbers in styles except the documented 360px master width / 1px divider
  </acceptance_criteria>
  <done>Both components exported from barrel; split/single rendering and platform-guarded tooltip tests green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: BottomTabBar desktop restyle (D-12) + test</name>
  <files>frontend/src/components/ui/BottomTabBar.tsx, frontend/src/__tests__/components/ui/BottomTabBar.test.tsx</files>
  <read_first>
    - frontend/src/components/ui/BottomTabBar.tsx (FULL current file — 211 LOC, do not restructure)
    - frontend/src/hooks/useBreakpoint.ts (created in Task 1 — consume it)
    - 13-RESEARCH.md Pattern 11 + Pitfall 7
    - 13-UI-SPEC.md "Existing: BottomTabBar — web adaptation" (900px max-width, 24px padding, 26px icons)
  </read_first>
  <behavior>
    - Desktop (width>=1024): container has maxWidth 900, alignSelf 'center', width '100%'
    - Mobile (width<768): container has NO maxWidth constraint (unchanged from current behavior)
    - Tab structure, tabPress handlers, badges, and active-index logic are byte-for-byte preserved
  </behavior>
  <action>
Modify `frontend/src/components/ui/BottomTabBar.tsx`. Import `useBreakpoint` from '@/hooks/useBreakpoint'.
Inside the `BottomTabBar` component body add `const breakpoint = useBreakpoint();`. Apply a desktop
container style conditionally on the OUTER container `View` (the one with `styles.container`):
when `breakpoint === 'desktop'`, append `{ maxWidth: 900, alignSelf: 'center', width: '100%' }`
(per Pitfall 7 + UI-SPEC; 900 is a UI-SPEC-binding fixed value — add a comment). Add a new
StyleSheet entry `containerDesktop: { maxWidth: 900, alignSelf: 'center', width: '100%' }` and
compose `style={[styles.container, { paddingBottom: ... }, breakpoint === 'desktop' && styles.containerDesktop]}`.
For desktop icon enlargement (24->26) and padding (spacing.lg side padding per tab), pass the breakpoint
down to `TabItem` and add a `tabItemDesktop: { paddingHorizontal: spacing.lg }` style applied when desktop;
icon size is controlled by the parent (MainTabs passes `sizes.tabIconSize`), so for icons leave a
clear `// NOTE: icon size 24->26 on desktop is set by MainTabs via sizes; not changed here` comment —
do NOT change MainTabs (out of this plan's files). Restyle ONLY; preserve all existing props, handlers,
animations, badge logic, accessibility roles. Do NOT alter mobile rendering — verify no style change
applies when `breakpoint !== 'desktop'`.

Create `frontend/src/__tests__/components/ui/BottomTabBar.test.tsx`: mock `useWindowDimensions` to
width 1280, render `<BottomTabBar tabs={[...2 stub tabs...]} activeIndex={0} onTabPress={jest.fn()} />`
inside `SafeAreaProvider` (BottomTabBar uses `useSafeAreaInsets`). Use
`render(...).toJSON()` and assert a style object in the tree contains `maxWidth: 900`. Then re-render
at width 360 and assert NO style object contains `maxWidth: 900`. Mirror the SafeAreaProvider wrapper
used in existing tests if present; otherwise wrap manually with
`SafeAreaProvider` + `initialMetrics`.
  </action>
  <verify>
    <automated>cd frontend && npx jest BottomTabBar</automated>
  </verify>
  <acceptance_criteria>
    - `BottomTabBar.tsx` contains `useBreakpoint` and `maxWidth: 900` and `alignSelf: 'center'`
    - `BottomTabBar.tsx` still contains `accessibilityRole="tablist"` and `onTabPress` (handlers preserved)
    - `cd frontend && npx jest BottomTabBar` exits 0 asserting maxWidth:900 at desktop and absent at mobile
    - `cd frontend && npx jest ListsScreen` still passes (no regression in tab-dependent rendering)
  </acceptance_criteria>
  <done>Tab bar centers at 900px on desktop, identical on mobile; test verifies both; existing tests unaffected.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| none new | This plan adds layout-only UI primitives; no new input crosses a trust boundary |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-13-01 | Tampering | WebTooltip `label` prop | accept | Label is developer-supplied static copy, rendered via `<Text>` which auto-escapes; no user input reaches it |
</threat_model>

<verification>
- `cd frontend && npx jest "useBreakpoint|MasterDetailLayout|WebTooltip|BottomTabBar"` all green
- `cd frontend && npx eslint src/hooks/useBreakpoint.ts src/components/ui/MasterDetailLayout.tsx src/components/ui/WebTooltip.tsx src/components/ui/BottomTabBar.tsx` clean
- `grep -rc "frontend/web" frontend/src/hooks frontend/src/components/ui` returns 0 references to the Phase-12 web app
- Mobile rendering of BottomTabBar unchanged (test asserts no maxWidth at width 360)
</verification>

<success_criteria>
- useBreakpoint, MasterDetailLayout, WebTooltip exist and are exported from '@/hooks' / '@/components/ui'
- BottomTabBar centers at 900px on desktop, pixel-identical on mobile
- All 4 Wave-0 test files for this plan pass
- Zero references to or edits of frontend/web/
</success_criteria>

<output>
After completion, create `.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-01-SUMMARY.md`
</output>
