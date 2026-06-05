---
phase: 13
slug: mejorar-la-app-expo-existente-frontend-src-para-uso-web-a-ad
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-05
---

# Phase 13 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Phase 13 adds web affordances (responsive layout, mouse/keyboard, export/clipboard,
> deep-linking) to existing Expo screens. No backend, auth, or storage surface changed.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| URL / deep-link → app state | Untrusted path/query segments enter via the browser address bar (`:listId`, `:storeId`, `?q=`) | Path/query strings (low sensitivity) |
| Exported content → file (.txt/.csv) | User-derived list/route/price text written into downloaded files opened by spreadsheets/editors | List item names, store/price text |
| App data → clipboard | Store address, current URL, assistant messages, alert summaries copied on explicit user action | Server-sourced display text + own URL |

All boundaries are **client-side, web-only** and user-initiated. No new server endpoint, no auth change, no new persisted write (drag-drop reorder is session-only local state).

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-13-01 | Tampering | WebTooltip `label` prop | accept | Developer-supplied static copy, rendered via `<Text>` (auto-escaped); no user input reaches it | closed |
| T-13-02 | Tampering | CSV export (`buildCsv`/`escapeCsvCell`) | mitigate | `escapeCsvCell` prefixes cells starting with `= + - @` (and TAB/CR) with `'` — OWASP CSV-injection guard. Evidence: `webExport.ts:71` `/^[=+\-@\t\r]/`; unit-tested in `webUtils.test.ts` | closed |
| T-13-03 | Tampering | Deep-link path params (`:listId`, `:storeId`) | mitigate | React Navigation parses params as plain strings; used only for API id lookups + rendered via `<Text>`. No `dangerouslySetInnerHTML`/`eval`/`new Function` in `frontend/src`. Evidence: `linking.ts:43,52`; grep = 0 dangerous patterns | closed |
| T-13-04 | Information disclosure | Clipboard write | accept | Writes user-initiated only; no automatic clipboard reads anywhere in the phase | closed |
| T-13-05 | Tampering | List/route `.txt` export | accept | Plain-text MIME `text/plain`; not interpreted as formula by spreadsheets; names rendered as-is | closed |
| T-13-06 | Tampering | Drag-reorder (session-only) | accept | Reorder mutates local React state only; no API call, no persisted write; order resets on remount. Evidence: `ListDetailScreen.web.tsx` (no `listService`/`updateItemOrder` order call) | closed |
| T-13-07 | Tampering | Copy address / share URL (Map/Stores) | accept | Copies user-initiated; values are server-sourced store data + the app's own URL; rendered via `<Text>`; no clipboard reads | closed |
| T-13-08 | Tampering | StoreProfile `:storeId` deep-link param | mitigate | `storeId` parsed as a string, used only as an authenticated API id lookup; invalid ids hit the existing error state. Evidence: `linking.ts:52` | closed |
| T-13-09 | Tampering | `?q=` URL param (ProductsCatalog) | mitigate | Parsed via `URLSearchParams` as a plain string, used only to filter + rendered via `<Text>`; never eval'd or injected as HTML. Evidence: `ProductsCatalogScreen.tsx:475` `new URLSearchParams(...).get("q")` | closed |
| T-13-10 | Tampering | CSV export (PriceCompare) | mitigate | CSV built exclusively via Wave-0 `buildCsv` (OWASP guard), never hand-concatenated. Evidence: `PriceCompareScreen.tsx:298` `buildCsv(...)` | closed |
| T-13-11 | Information disclosure | Per-message / alert copy | accept | Writes user-initiated; no automatic clipboard reads; text already visible on screen | closed |
| T-13-12 | Tampering | Assistant message rendered text | accept | Messages rendered via `<Text>` (auto-escaped); copy affordance introduces no HTML-injection surface | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-13-01 | T-13-01 | Tooltip label is static developer copy, auto-escaped via `<Text>` | Nicolás Parrilla (autor TFG) | 2026-06-05 |
| AR-13-02 | T-13-04, T-13-11 | Clipboard writes are user-initiated; the app never reads the clipboard | Nicolás Parrilla (autor TFG) | 2026-06-05 |
| AR-13-03 | T-13-05 | `.txt` exports use `text/plain` (no formula interpretation by spreadsheets) | Nicolás Parrilla (autor TFG) | 2026-06-05 |
| AR-13-04 | T-13-06 | Drag-reorder is session-only local state; no persisted/server write in this phase | Nicolás Parrilla (autor TFG) | 2026-06-05 |
| AR-13-05 | T-13-07 | Copied values are server-sourced store data + the app's own URL; no clipboard reads | Nicolás Parrilla (autor TFG) | 2026-06-05 |
| AR-13-06 | T-13-12 | Assistant text rendered via auto-escaping `<Text>`; copy adds no injection surface | Nicolás Parrilla (autor TFG) | 2026-06-05 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-05 | 12 | 12 | 0 | gsd-secure-phase (State B, artifact-derived + code-evidence verification) |

Notes:
- 5 `mitigate` threats verified against the live `frontend/src` codebase (greps above).
- 7 `accept` threats documented in the Accepted Risks Log.
- Phase 13 introduces no backend/auth/storage change; ASVS L1 surface only.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-05
