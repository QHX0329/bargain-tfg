---
phase: 13
slug: mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-01
updated: 2026-06-05
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x + `jest-expo` preset + @testing-library/react-native |
| **Config file** | `frontend/package.json` (`jest` key, `preset: jest-expo`) |
| **Quick run command** | `cd frontend && npx jest --passWithNoTests --testPathPattern="useBreakpoint\|MasterDetailLayout\|WebTooltip\|webUtils\|linking"` |
| **Full suite command** | `cd frontend && npx jest --coverage` |
| **Estimated runtime** | ~25 seconds (quick) / ~90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green + manual browser smoke test
- **Max feedback latency:** 25 seconds

---

## Per-Task Verification Map

> Phase 13 has no formal REQ-XX identifiers. Validation derives from decisions D-05..D-08 and the binding UI-SPEC. Task IDs are placeholders until plans are written — the planner MUST keep these behaviors covered.

| Behavior | Wave | Decision | Test Type | Automated Command | Test File | Status |
|----------|------|----------|-----------|-------------------|-----------|--------|
| `useBreakpoint` returns mobile/tablet/desktop for widths 320/768/1024 | 0 | D-09 | unit | `npx jest useBreakpoint` | `src/__tests__/hooks/useBreakpoint.test.ts` | ✅ green |
| `useBreakpoint` defaults to mobile when width === 0 | 0 | D-09 | unit | `npx jest useBreakpoint` | `src/__tests__/hooks/useBreakpoint.test.ts` | ✅ green |
| `MasterDetailLayout` renders single pane on mobile/tablet | 0 | D-05 | unit | `npx jest MasterDetailLayout` | `src/__tests__/components/ui/MasterDetailLayout.test.tsx` | ✅ green |
| `MasterDetailLayout` renders split pane on desktop | 0 | D-05 | unit | `npx jest MasterDetailLayout` | `src/__tests__/components/ui/MasterDetailLayout.test.tsx` | ✅ green |
| `WebTooltip` renders children directly on native (Platform.OS='ios') | 0 | D-06 | unit | `npx jest WebTooltip` | `src/__tests__/components/ui/WebTooltip.test.tsx` | ✅ green |
| `WebTooltip` shows tooltip label after hover on web | 0 | D-06 | unit | `npx jest WebTooltip` | `src/__tests__/components/ui/WebTooltip.test.tsx` | ✅ green |
| `downloadFile` creates anchor + triggers click (DOM mock) | 0 | D-07 | unit | `npx jest webUtils` | `src/__tests__/utils/webUtils.test.ts` | ✅ green |
| `copyToClipboard` calls `navigator.clipboard.writeText` (+ fallback) | 0 | D-07 | unit | `npx jest webUtils` | `src/__tests__/utils/webUtils.test.ts` | ✅ green |
| CSV export prefixes `= + - @` (+ TAB/CR) cells to prevent formula injection | 0 | D-07 | unit | `npx jest webUtils` | `src/__tests__/utils/webUtils.test.ts` | ✅ green |
| Linking config resolves `/app/lists/:listId` to ListDetailScreen | 0 | D-08 | unit/integration | `npx jest linking` | `src/__tests__/navigation/linking.test.ts` | ✅ green |
| Tab bar max-width 900px applied at desktop breakpoint | impl | D-12 | unit | `npx jest BottomTabBar` | `src/__tests__/components/ui/BottomTabBar.test.tsx` | ✅ green |
| Export/web-convenience buttons absent on native (Platform.OS !== 'web') | impl | D-07 | unit | `npx jest ListsScreen` | `__tests__/ListsScreen.test.tsx` (Test 8b) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test files created before implementation waves:

- [x] `frontend/src/__tests__/hooks/useBreakpoint.test.ts` — breakpoint thresholds + 0-width guard
- [x] `frontend/src/__tests__/components/ui/MasterDetailLayout.test.tsx` — split/single rendering
- [x] `frontend/src/__tests__/components/ui/WebTooltip.test.tsx` — platform guard + hover label
- [x] `frontend/src/__tests__/utils/webUtils.test.ts` — `downloadFile`, `copyToClipboard`, CSV-injection escaping (incl. TAB/CR)
- [x] `frontend/src/__tests__/navigation/linking.test.ts` — URL ↔ state resolution
- [x] `frontend/src/__tests__/components/ui/BottomTabBar.test.tsx` — desktop maxWidth 900 (D-12)
- [x] `frontend/__tests__/ListsScreen.test.tsx` (Test 8b) — web export/share toolbar absent on native (D-07)

Note: `jest-expo` preset already handles web platform simulation via `Platform.OS` mocking. No new test infrastructure needed.

---

## Manual-Only Verifications

| Behavior | Decision | Why Manual | Test Instructions |
|----------|----------|------------|-------------------|
| Hover state visual appearance | D-06 | Requires real browser rendering | Run `expo start --web`, point mouse at list rows/buttons; confirm background tint changes |
| Focus ring visibility (keyboard nav) | D-06 | Visual + browser/AT behavior | Tab through interactive elements; confirm 2px `colors.primary` outline with 2px offset |
| Drag-drop reorder + visual lift | D-07 | Browser gesture simulation | On desktop web, drag a list item to a new position; confirm reorder persists after refresh |
| URL back/forward browser buttons | D-08 | Browser history layer | Navigate list→detail, press browser Back/Forward; confirm correct screen restored |
| File download actually downloads | D-07 | Browser security layer | Click export on RouteScreen/PriceCompareScreen; confirm `bargain-*-YYYY-MM-DD.{ext}` file lands |
| Mobile layout unchanged below 768px | D-09/D-11 | Visual regression | Resize browser < 768px; confirm single-column mobile layout identical to before |

---

## Validation Sign-Off

- [x] All Wave-0 behaviors have `<automated>` verify or are listed Manual-Only
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING test references (useBreakpoint, MasterDetailLayout, WebTooltip, webUtils, linking)
- [x] No watch-mode flags
- [x] Feedback latency < 25s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated (2026-06-05)

---

## Validation Audit 2026-06-05

| Metric | Count |
|--------|-------|
| Behaviors in map | 12 |
| Gaps found | 1 |
| Resolved (new test) | 1 |
| Escalated to manual-only | 0 |

- Audited State A against the executed codebase. 11/12 behaviors were already COVERED by green Wave-0 tests (full suite: 112 passed / 16 suites).
- 1 MISSING gap — "export/web-convenience buttons absent on native" — was filled by adding `Test 8b` to `frontend/__tests__/ListsScreen.test.tsx` (renders `ListDetailScreen` under the native platform and asserts the "Exportar lista"/"Compartir" toolbar is absent). Committed in `55f4739`.
- Phase 13 is now **Nyquist-compliant**: every behavior in the Per-Task Map has an automated verify; the 6 visual/interactive checks remain in `13-HUMAN-UAT.md` (browser-only, correctly out of automation scope).
