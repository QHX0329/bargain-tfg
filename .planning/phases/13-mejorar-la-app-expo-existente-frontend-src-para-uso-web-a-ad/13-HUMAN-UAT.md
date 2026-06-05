---
status: partial
phase: 13-mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
source: [13-VERIFICATION.md]
started: 2026-06-05T00:00:00Z
updated: 2026-06-05T00:00:00Z
---

## Current Test

[awaiting human testing in a browser — run `cd frontend && npx expo start --web`]

## Tests

### 1. BottomTabBar desktop icon scale
expected: At width >=1024 the bottom tab bar centers (max 900px) and icons render ~1.083x larger (effective 26px); identical at mobile width.
result: [pending]

### 2. Drag-drop reorder (Lists)
expected: On web, ListDetailScreen items can be dragged to reorder; order updates immediately and resets on page refresh (session-only, no persistence).
result: [pending]

### 3. Export downloads (.txt)
expected: "Exportar lista" and "Exportar ruta" download `bargain-lista-YYYY-MM-DD.txt` / `bargain-ruta-YYYY-MM-DD.txt` with the expected content.
result: [pending]

### 4. CSV injection guard
expected: "Exportar comparativa" downloads a .csv; cells starting with = + - @ (or TAB/CR) are prefixed with a single quote when opened in a spreadsheet.
result: [pending]

### 5. ?q= URL share (Catalog)
expected: Visiting `/app/home/catalog?q=leche` restores the search filter on mount; typing updates the URL; share button copies the URL.
result: [pending]

### 6. AssistantScreen autofocus
expected: On web, the message input is focused automatically on screen mount; chat centered at 720px on desktop.
result: [pending]

### 7. Per-message / per-alert copy feedback
expected: Hovering an assistant message (and a price-alert row) reveals a copy button; pressing it copies the text and shows ~1.5s green feedback.
result: [pending]

### 8. MapScreen.web right-side panel
expected: At desktop width, MapScreen shows the store panel docked on the right (320px) with the map filling the rest; bottom-panel layout on mobile.
result: [pending]

### 9. Cmd+K / Ctrl+K search focus
expected: On web, pressing Cmd/Ctrl+K focuses the search input on HomeScreen and ProductsCatalogScreen.
result: [pending]

### 10. Mobile regression (<768px)
expected: All 15 in-scope screens render at mobile width exactly as before (no web affordances visible, no layout shifts).
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
