---
phase: 05-optimizer-scraping
plan: "03"
subsystem: assistant
tags: [llm, anthropic, assistant, rate-limiting, guardrails]
dependency_graph:
  requires: []
  provides: [assistant-chat-endpoint, llm-proxy-service]
  affects: [frontend-assistant-screen]
tech_stack:
  added: [anthropic>=0.30]
  patterns: [scoped-rate-throttle, system-prompt-guardrail, history-truncation]
key_files:
  created:
    - backend/apps/assistant/services.py
    - backend/apps/assistant/serializers.py
    - backend/apps/assistant/views.py
    - backend/tests/unit/test_assistant.py
    - backend/tests/integration/test_assistant_api.py
  modified:
    - backend/apps/assistant/urls.py
    - backend/config/settings/base.py
decisions:
  - "Use claude-haiku-4-5-20251001 as LLM model for cost efficiency"
  - "Truncate history to messages[-20:] (10 turns) to control context window cost"
  - "SYSTEM_PROMPT enforces shopping-only domain in Spanish with polite off-topic rejection"
  - "ScopedRateThrottle with throttle_scope=assistant at 30/hour per user"
  - "AssistantError (503) wraps all Anthropic SDK exceptions for consistent API format"
metrics:
  duration_seconds: 317
  completed_date: "2026-03-25"
  tasks_total: 2
  tasks_completed: 2
  files_created: 5
  files_modified: 2
---

# Phase 05 Plan 03: LLM Assistant Endpoint Summary

**One-liner:** Anthropic Claude Haiku proxy endpoint with Spanish shopping-domain guardrails, 10-turn history truncation, and 30/hour scoped rate limiting.

## What Was Built

POST /api/v1/assistant/chat/ accepts a message history array and proxies it to the Claude Haiku API. The system prompt constrains the assistant strictly to shopping-related topics (price comparison, shopping list suggestions, economic recipes). Off-topic queries receive a polite Spanish rejection. The history is truncated to the last 20 messages (10 turns) before the API call. The endpoint is authenticated (JWT) and rate-limited via DRF ScopedRateThrottle at 30 requests per hour.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Assistant service + serializers + view + URL + settings | c5922b2 | services.py, serializers.py, views.py, urls.py, base.py |
| 2 | Assistant unit + integration tests | 0e6829b | test_assistant.py, test_assistant_api.py |

## Decisions Made

- **claude-haiku-4-5-20251001 selected:** Cost-efficient model appropriate for shopping assistant queries per D-15.
- **`messages[-20:]` truncation:** Limits context window to 10 conversation turns to control API cost and latency.
- **SYSTEM_PROMPT constant:** Centralises domain guardrail; tested via `test_system_prompt_mentions_compras` to ensure guardrail string is present.
- **ScopedRateThrottle at 30/hour:** Balances user experience vs API cost; `ocr` scope also added at 60/hour for future OCR plan.
- **`AssistantError` (existing 503 exception):** Reused from `apps.core.exceptions` to maintain consistent error format across the API.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Additional Tests Added

Added 3 extra integration tests beyond the plan's 5 minimum:
- `test_chat_rejects_missing_messages_field` — ensures missing field returns 400 (Rule 2: input validation)
- `test_chat_rejects_invalid_role` — ensures invalid role values rejected (Rule 2: input validation)
- `test_chat_with_multi_turn_history` — verifies multi-turn history is passed correctly to service

Added 2 extra unit tests:
- `test_chat_sends_all_when_under_limit` — verifies no truncation for short histories
- `test_chat_raises_assistant_unavailable_on_connection_error` / `_on_rate_limit` — covers all 3 Anthropic exception types

Total: 16 tests, all passing.

## Known Stubs

None — the service uses real Anthropic SDK calls (with mocked tests). The endpoint is production-ready pending a valid `ANTHROPIC_API_KEY` in the environment.

## Self-Check: PASSED

Files confirmed present:
- backend/apps/assistant/services.py: FOUND
- backend/apps/assistant/serializers.py: FOUND
- backend/apps/assistant/views.py: FOUND
- backend/apps/assistant/urls.py: FOUND
- backend/tests/unit/test_assistant.py: FOUND
- backend/tests/integration/test_assistant_api.py: FOUND

Commits confirmed:
- c5922b2: feat(05-03) FOUND
- 0e6829b: test(05-03) FOUND

Test result: 16/16 PASSED
