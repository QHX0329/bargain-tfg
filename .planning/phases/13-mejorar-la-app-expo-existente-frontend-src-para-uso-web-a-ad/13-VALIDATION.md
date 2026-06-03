---
phase: 13
slug: mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-01
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

| Behavior | Wave | Decision | Test Type | Automated Command | File Exists | Status |
|----------|------|----------|-----------|-------------------|-------------|--------|
| `useBreakpoint` returns mobile/tablet/desktop for widths 320/768/1024 | 0 | D-09 | unit | `npx jest useBreakpoint` | ❌ W0 | ⬜ pending |
| `useBreakpoint` defaults to mobile when width === 0 | 0 | D-09 | unit | `npx jest useBreakpoint` | ❌ W0 | ⬜ pending |
| `MasterDetailLayout` renders single pane on mobile/tablet | 0 | D-05 | unit | `npx jest MasterDetailLayout` | ❌ W0 | ⬜ pending |
| `MasterDetailLayout` renders split pane on desktop | 0 | D-05 | unit | `npx jest MasterDetailLayout` | ❌ W0 | ⬜ pending |
| `WebTooltip` renders children directly on native (Platform.OS='ios') | 0 | D-06 | unit | `npx jest WebTooltip` | ❌ W0 | ⬜ pending |
| `WebTooltip` shows tooltip label after hover on web | 0 | D-06 | unit | `npx jest WebTooltip` | ❌ W0 | ⬜ pending |
| `downloadFile` creates anchor + triggers click (DOM mock) | 0 | D-07 | unit | `npx jest webUtils\|export` | ❌ W0 | ⬜ pending |
| `copyToClipboard` calls `navigator.clipboard.writeText` (+ fallback) | 0 | D-07 | unit | `npx jest webUtils\|clipboard` | ❌ W0 | ⬜ pending |
| CSV export prefixes `= + - @` cells to prevent formula injection | 0 | D-07 | unit | `npx jest webUtils\|export` | ❌ W0 | ⬜ pending |
| Linking config resolves `/app/lists/:listId` to ListDetailScreen | 0 | D-08 | unit/integration | `npx jest linking\|navigation` | ❌ W0 | ⬜ pending |
| Tab bar max-width 900px applied at desktop breakpoint | impl | D-12 | unit | `npx jest BottomTabBar` | ✅ (modify) | ⬜ pending |
| Export/web-convenience buttons absent on native (Platform.OS !== 'web') | impl | D-07 | unit | `npx jest RouteScreen\|ListDetail` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test files to create before implementation waves:

- [ ] `frontend/src/__tests__/hooks/useBreakpoint.test.ts` — breakpoint thresholds + 0-width guard
- [ ] `frontend/src/__tests__/components/ui/MasterDetailLayout.test.tsx` — split/single rendering
- [ ] `frontend/src/__tests__/components/ui/WebTooltip.test.tsx` — platform guard + hover label
- [ ] `frontend/src/__tests__/utils/webUtils.test.ts` — `downloadFile`, `copyToClipboard`, CSV-injection escaping
- [ ] `frontend/src/__tests__/navigation/linking.test.ts` — URL ↔ state resolution

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

- [ ] All Wave-0 behaviors have `<automated>` verify or are listed Manual-Only
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING test references (useBreakpoint, MasterDetailLayout, WebTooltip, webUtils, linking)
- [ ] No watch-mode flags
- [ ] Feedback latency < 25s
- [ ] `nyquist_compliant: true` set in frontmatter (after planner wires tasks to these tests)

**Approval:** pending
