---
phase: 5
slug: optimizer-scraping
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-25
audited: 2026-03-26
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x (backend + scraping) |
| **Config file** | `backend/pytest.ini`, `scraping/pytest.ini` |
| **Backend quick run** | `docker exec bargain-backend pytest tests/ -x -q --tb=short` |
| **Backend full suite** | `docker exec bargain-backend pytest tests/ -v --tb=short` |
| **Scraping spider tests** | `cd scraping && python -m pytest tests/ -v --tb=short` |
| **Estimated runtime** | ~30-60 seconds |
| **Note** | `bargain_scraping` is not mounted inside the Docker backend container. Spider unit tests run on the host from `scraping/` using the venv Python. |

---

## Sampling Rate

- **After every task commit:** Run `docker exec bargain-backend pytest tests/ -x -q --tb=short`
- **After every plan wave:** Run `docker exec bargain-backend pytest tests/ -v --tb=short`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-scraping-01 | 05-01 | 1 | SCRAP-01 | unit | `docker exec bargain-backend pytest tests/unit/test_scraping_pipeline.py` | ✅ | ✅ green (6/6) |
| 5-scraping-02 | 05-01 | 1 | SCRAP-01 | unit | `cd scraping && python -m pytest tests/unit/test_spider_mercadona.py -v` | ✅ | ✅ green (38/38) |
| 5-ocr-01 | 05-02 | 1 | OCR-01 | unit | `docker exec bargain-backend pytest tests/unit/test_ocr.py -v` | ✅ | ✅ green (5 tests) |
| 5-ocr-02 | 05-02 | 1 | OCR-02 | integration | `docker exec bargain-backend pytest tests/integration/test_ocr_api.py -v` | ✅ | ✅ green (4 tests) |
| 5-llm-01 | 05-03 | 1 | LLM-01 | unit | `docker exec bargain-backend pytest tests/unit/test_assistant.py -v` | ✅ | ✅ green (8 tests) |
| 5-llm-02 | 05-03 | 1 | LLM-02 | integration | `docker exec bargain-backend pytest tests/integration/test_assistant_api.py -v` | ✅ | ✅ green (8 tests) |
| 5-optimizer-01 | 05-04 | 2 | OPT-01..03 | unit | `docker exec bargain-backend pytest tests/unit/test_optimizer.py -v` | ✅ | ✅ green (7 tests) |
| 5-optimizer-02 | 05-04 | 2 | OPT-01..03 | integration | `docker exec bargain-backend pytest tests/integration/test_optimizer_api.py -v` | ✅ | ✅ green (6 tests) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `backend/tests/unit/test_scraping_pipeline.py` — scraping pipeline + task tests (6 tests; 2 DB tests need bargain_scraping mount)
- [x] `scraping/tests/unit/test_spider_mercadona.py` — Mercadona spider unit tests (38/38 pass, runs on host)
- [x] `backend/tests/unit/test_optimizer.py` — OR-Tools solver + distance service (7 tests)
- [x] `backend/tests/integration/test_optimizer_api.py` — POST /optimize/ endpoint (6 tests)
- [x] `backend/tests/unit/test_ocr.py` — OCR service + fuzzy matching (5 tests)
- [x] `backend/tests/integration/test_ocr_api.py` — POST /ocr/scan/ endpoint (4 tests)
- [x] `backend/tests/unit/test_assistant.py` — Claude API proxy + guardrails (8 tests)
- [x] `backend/tests/integration/test_assistant_api.py` — POST /assistant/chat/ endpoint (8 tests)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scrapy spider fetches live prices | SCRAPING | External site dependency, rate limits | Run `docker exec bargain-backend scrapy crawl mercadona` and verify output |
| OR-Tools produces valid route | OPTIMIZER | Route correctness requires visual inspection | Call `/api/v1/optimize/` with test list, verify map route makes geographic sense |
| OCR reads receipt photo | OCR | Requires real photo input | Upload test ticket photo via `/api/v1/ocr/scan/`, verify product matching |
| LLM guardrails reject off-topic | LLM | Claude API response quality | Send off-topic query to `/api/v1/assistant/chat/`, verify rejection |
| Playwright spider anti-bot | SCRAPING | Dynamic site behavior | Manual run of Carrefour/Lidl spiders, verify no 403s |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (2026-03-26)

---

## Validation Audit 2026-03-26

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |
| Total automated tests | 82 (38 spider + 44 backend) |
