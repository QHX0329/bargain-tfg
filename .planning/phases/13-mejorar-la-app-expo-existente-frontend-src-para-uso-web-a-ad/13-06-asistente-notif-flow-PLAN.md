---
phase: 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
plan: 06
type: execute
wave: 1
depends_on: ["13-01", "13-02"]
decisions: [D-05, D-06, D-07, D-08]
files_modified:
  - frontend/src/screens/assistant/AssistantScreen.tsx
  - frontend/src/screens/home/NotificationScreen.tsx
  - frontend/src/screens/home/PriceAlertsScreen.tsx
autonomous: true

must_haves:
  truths:
    - "On desktop, AssistantScreen centers chat bubbles + input at max-width 720px and autofocuses input on web"
    - "On web, each assistant message shows a copy button on hover that copies the message text"
    - "On desktop, NotificationScreen and PriceAlertsScreen center their lists at max-width 680px"
    - "On web, PriceAlertsScreen can copy an alert summary to the clipboard with success feedback"
    - "Mobile layout (<768px) of all three screens is unchanged"
  artifacts:
    - path: "frontend/src/screens/assistant/AssistantScreen.tsx"
      provides: "Centered web chat + per-message copy + autofocus input"
      contains: "copyToClipboard"
    - path: "frontend/src/screens/home/PriceAlertsScreen.tsx"
      provides: "Centered list + copy alert summary"
      contains: "copyToClipboard"
  key_links:
    - from: "frontend/src/screens/assistant/AssistantScreen.tsx"
      to: "frontend/src/utils/webExport.ts"
      via: "copyToClipboard import"
      pattern: "copyToClipboard"
---

<objective>
Apply web improvements to the Asistente/Notificaciones cluster: AssistantScreen (centered chat +
per-message copy + autofocus, D-05/D-06/D-07), NotificationScreen (centered list + hover/focus,
D-05/D-06) and PriceAlertsScreen (centered list + copy alert summary, D-05/D-06/D-07).

Purpose: Completes uniform D-05..D-08 coverage across all 15 in-scope screens (D-13). Delivers the
chat-message copy convenience and the alert-summary copy.

Output: 3 modified screens.
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
'@/utils/webExport' -> copyToClipboard(text):Promise<boolean>.
Theme: spacing.md=16, spacing.lg=24, colors.primaryTint=#FCE7DD (hover), colors.surfaceVariant (icon-button hover),
colors.success=#3A7D44 (copy feedback), colors.primary (focus ring).
AssistantScreen is 567 LOC; uses reanimated. Autofocus the input on web on mount (Focal Points: "autofocused on screen mount on web").
Empty-state copy: notifications "Todo al día"/"No tienes notificaciones pendientes."; price alerts "Sin alertas activas"/"Configura alertas de precio desde la ficha de un producto."
Copy feedback contract: button -> colors.success for 1500ms then revert (no toast).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: AssistantScreen centered chat + per-message copy + autofocus (D-05/D-06/D-07)</name>
  <files>frontend/src/screens/assistant/AssistantScreen.tsx</files>
  <read_first>
    - frontend/src/screens/assistant/AssistantScreen.tsx (FULL — 567 LOC; message list, message bubble rendering, input bar, send button, inputRef if any)
    - frontend/src/hooks/useBreakpoint.ts (Wave 0)
    - frontend/src/utils/webExport.ts (Wave 0 — copyToClipboard)
    - frontend/src/components/ui/WebTooltip.tsx (Wave 0)
    - 13-UI-SPEC.md "Focal Points > AssistantScreen" + AssistantScreen row: "Messages max-width 720", "Copy message", "Hover on messages"
  </read_first>
  <action>
AssistantScreen.tsx: add `const breakpoint = useBreakpoint();`.
1. Responsive (D-05): on `breakpoint !== 'mobile'` constrain the chat-bubble column AND the input bar to
   `{ maxWidth: 720, alignSelf: 'center', width: '100%' }` (UI-SPEC binding 720). On mobile keep the
   EXISTING full-width layout byte-for-byte.
2. Autofocus input on web (D-06): add a `useEffect` guarded by `Platform.OS==='web'` that calls
   `inputRef.current?.focus()` on mount (add a `useRef` on the message TextInput if one does not exist).
3. Per-message copy (D-07, web-only): for each assistant message bubble, render a `copy-outline` Ionicon
   button that appears on hover (use the bubble's onMouseEnter/onMouseLeave hover state to toggle button
   visibility on web). On press call `copyToClipboard(messageText)` and flip the button to `colors.success`
   for 1500ms then revert. WebTooltip "Copiar". Icon-button hover background `colors.surfaceVariant`.
   Keep the "Enviar mensaje" send-button copy unchanged.
All web-only affordances guarded by `Platform.OS==='web'`. Tokens only; add `accessibilityRole="button"`
+ `accessibilityLabel` on the copy buttons. Do NOT alter send/streaming logic or mobile rendering.
  </action>
  <verify>
    <automated>cd frontend && npx jest --passWithNoTests AssistantScreen</automated>
  </verify>
  <acceptance_criteria>
    - AssistantScreen.tsx contains `useBreakpoint`, `maxWidth: 720`, `copyToClipboard`, `colors.success`, and a `Platform.OS === 'web'` autofocus useEffect
    - Copy + autofocus guarded by `Platform.OS === 'web'`
    - `cd frontend && npx jest --passWithNoTests AssistantScreen` exits 0
    - `grep -c "frontend/web" AssistantScreen.tsx` == 0
  </acceptance_criteria>
  <done>Desktop centers chat+input at 720px, autofocus on web, per-message copy with green feedback; mobile unchanged.</done>
</task>

<task type="auto">
  <name>Task 2: NotificationScreen centered list + hover/focus (D-05/D-06)</name>
  <files>frontend/src/screens/home/NotificationScreen.tsx</files>
  <read_first>
    - frontend/src/screens/home/NotificationScreen.tsx (FULL — notification rows, read/unread, delete)
    - frontend/src/hooks/useBreakpoint.ts (Wave 0)
    - 13-UI-SPEC.md NotificationScreen row: "List max-width 680", "Hover, focus"; empty-state copy "Todo al día"
    - frontend/__tests__/NotificationScreen.test.tsx (existing test — do not regress)
  </read_first>
  <action>
NotificationScreen.tsx: add `const breakpoint = useBreakpoint();`. On `breakpoint !== 'mobile'` center the
notifications list at `{ maxWidth: 680, alignSelf: 'center', width: '100%' }` (UI-SPEC). Add hover tint
(`colors.primaryTint`) on notification rows via onMouseEnter/onMouseLeave (web, `// @ts-ignore`) and a web
focus ring (`outlineColor: colors.primary, outlineWidth: 2, outlineOffset: 2` when `Platform.OS==='web'`).
Preserve empty-state copy "Todo al día" / "No tienes notificaciones pendientes." and the existing inline
delete (no modal, per UI-SPEC destructive contract). Tokens only; mobile branch unchanged.
  </action>
  <verify>
    <automated>cd frontend && npx jest NotificationScreen</automated>
  </verify>
  <acceptance_criteria>
    - NotificationScreen.tsx contains `useBreakpoint`, `maxWidth: 680`, `colors.primaryTint`
    - `cd frontend && npx jest NotificationScreen` exits 0 (existing tests pass — no regression)
    - `grep -c "frontend/web" NotificationScreen.tsx` == 0
  </acceptance_criteria>
  <done>Notifications list centered at 680px with hover/focus on web; empty state + inline delete preserved; mobile unchanged.</done>
</task>

<task type="auto">
  <name>Task 3: PriceAlertsScreen centered list + copy alert summary (D-05/D-06/D-07)</name>
  <files>frontend/src/screens/home/PriceAlertsScreen.tsx</files>
  <read_first>
    - frontend/src/screens/home/PriceAlertsScreen.tsx (FULL — alert rows with product name + threshold)
    - frontend/src/hooks/useBreakpoint.ts (Wave 0)
    - frontend/src/utils/webExport.ts (Wave 0 — copyToClipboard)
    - frontend/src/components/ui/WebTooltip.tsx (Wave 0)
    - 13-UI-SPEC.md PriceAlertsScreen row: "List max-width 680", "Copy alert summary"; empty-state "Sin alertas activas"
  </read_first>
  <action>
PriceAlertsScreen.tsx: add `const breakpoint = useBreakpoint();`.
1. Responsive (D-05): on `breakpoint !== 'mobile'` center the alerts list at
   `{ maxWidth: 680, alignSelf: 'center', width: '100%' }` (UI-SPEC). Hover tint (`colors.primaryTint`)
   on alert rows (web).
2. Copy alert summary (D-07, web-only): on each alert row render a `copy-outline` Ionicon button
   (WebTooltip "Copiar alerta"). On press build a summary string like
   `\`${productName} — umbral ${thresholdPct}%\`` and call `copyToClipboard(summary)`, then flip the
   button to `colors.success` for 1500ms then revert. Icon-button hover `colors.surfaceVariant`. Guard
   with `Platform.OS==='web'`; `accessibilityRole="button"` + `accessibilityLabel`.
Preserve empty-state copy "Sin alertas activas" / "Configura alertas de precio desde la ficha de un
producto." Tokens only; mobile branch unchanged.
  </action>
  <verify>
    <automated>cd frontend && npx jest --passWithNoTests PriceAlerts</automated>
  </verify>
  <acceptance_criteria>
    - PriceAlertsScreen.tsx contains `useBreakpoint`, `maxWidth: 680`, `copyToClipboard`, `colors.success`
    - Copy button guarded by `Platform.OS === 'web'` with `accessibilityLabel`
    - `cd frontend && npx jest --passWithNoTests PriceAlerts` exits 0
    - `grep -c "frontend/web" PriceAlertsScreen.tsx` == 0
  </acceptance_criteria>
  <done>Alerts list centered at 680px; copy-alert-summary with green feedback on web; empty state preserved; mobile unchanged.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| message / alert text -> clipboard | Assistant message text and alert summaries copied on explicit user action |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-13-11 | Information disclosure | Per-message / alert copy | accept | Writes are user-initiated only; no automatic clipboard reads; text already visible on screen |
| T-13-12 | Tampering | Assistant message rendered text | accept | Messages rendered via `<Text>` (auto-escaped); no HTML injection surface introduced by copy affordance |
</threat_model>

<verification>
- `cd frontend && npx jest "AssistantScreen|NotificationScreen|PriceAlerts" --passWithNoTests` green
- `cd frontend && npx eslint src/screens/assistant/AssistantScreen.tsx src/screens/home/NotificationScreen.tsx src/screens/home/PriceAlertsScreen.tsx` clean
- `grep -rc "frontend/web" frontend/src/screens/assistant/AssistantScreen.tsx frontend/src/screens/home/NotificationScreen.tsx frontend/src/screens/home/PriceAlertsScreen.tsx` returns 0
- Mobile layouts verified <768px (manual smoke per VALIDATION.md)
</verification>

<success_criteria>
- AssistantScreen centered chat at 720px + per-message copy + autofocus on web
- NotificationScreen + PriceAlertsScreen centered lists at 680px with hover/focus
- PriceAlertsScreen copy-alert-summary on web; all empty states + mobile layouts intact
- Completes D-05..D-08 coverage across all 15 in-scope screens
</success_criteria>

<output>
After completion, create `.planning/phases/13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad/13-06-SUMMARY.md`
</output>
