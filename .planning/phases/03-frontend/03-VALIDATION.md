---
phase: 3
slug: frontend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (jest-expo preset) + React Native Testing Library 13.3.3 |
| **Config file** | `jest` block in `frontend/package.json` |
| **Quick run command** | `cd frontend && npx jest App.test.tsx --bail` |
| **Full suite command** | `cd frontend && npx jest --coverage` |
| **Estimated runtime** | ~30 seconds (quick) / ~120 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx jest App.test.tsx --bail`
- **After every plan wave:** Run `cd frontend && npx jest --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 03-01 | 1 | NFR-03 | smoke | `cd frontend && npx jest App.test.tsx --bail` | ✅ | ⬜ pending |
| 3-01-02 | 03-01 | 1 | NFR-03 | unit | `cd frontend && npx jest __tests__/SkeletonBox.test.tsx` | ❌ W0 | ⬜ pending |
| 3-02-01 | 03-02 | 1 | NFR-03 | unit | `cd frontend && npx jest __tests__/apiClient.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-02 | 03-02 | 1 | NFR-03 | unit | `cd frontend && npx jest __tests__/LoginScreen.test.tsx` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03-03 | 2 | NFR-03 | unit | `cd frontend && npx jest __tests__/ListsScreen.test.tsx` | ❌ W0 | ⬜ pending |
| 3-04-01 | 03-04 | 2 | NFR-03 | manual | See Manual-Only Verifications | N/A | ⬜ pending |
| 3-05-01 | 03-05 | 3 | NFR-03 | unit | `cd frontend/web && npx vitest run` | ❌ W0 | ⬜ pending |
| 3-06-01 | 03-06 | 3 | NFR-03 | unit | `cd frontend && npx jest __tests__/NotificationScreen.test.tsx` | ❌ W0 | ⬜ pending |
| 3-06-02 | 03-06 | 3 | NFR-03 | unit | `cd frontend && npx jest __tests__/ProfileScreen.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/__tests__/apiClient.test.ts` — JWT interceptor refresh + retry queue (NFR-03)
- [ ] `frontend/__tests__/LoginScreen.test.tsx` — form submission + store update (NFR-03)
- [ ] `frontend/__tests__/ListsScreen.test.tsx` — list rendering from Zustand store (NFR-03)
- [ ] `frontend/__tests__/NotificationScreen.test.tsx` — badge, group by day, mark read (NFR-03)
- [ ] `frontend/__tests__/ProfileScreen.test.tsx` — slider constraint (sum=100), debounce (NFR-03)
- [ ] `frontend/__tests__/SkeletonBox.test.tsx` — renders loading placeholders (NFR-03)
- [ ] `frontend/web/` — vitest + @testing-library/react installed (Plan 03-05 Wave 0)

*All Wave 0 stubs must exist before Wave 1 tasks begin.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Map renders nearby stores on physical device / simulator | NFR-03 (success criterion 3) | Requires GPS or simulated location; react-native-maps cannot be rendered in Jest | Open Expo Go → navigate to Map tab → verify stores appear as markers within radius |
| iOS 15 / Android 10 compatibility via Expo Go | NFR-03 | Platform-specific rendering cannot be tested in Jest | Run `npx expo start` → open in Expo Go on iOS 15 device or Android 10 emulator → all tabs navigate correctly |
| PYME barcode scanner (camera) | NFR-03 (success criterion 4) | Requires real camera/MediaDevices; not available in jsdom | Open PYME web portal → Prices page → click scan barcode → camera permission requested → barcode detected or manual fallback shown |
| Push notification deep link routing | NFR-03 | Requires real push token and Expo notification service | Register push token via Profile screen → send test notification from backend → tap notification → navigates to correct screen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
