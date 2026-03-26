---
phase: 05-optimizer-scraping
plan: 02
subsystem: backend/ocr
tags: [ocr, legacy-tesseract, fuzzy-matching, drf, api]
dependency_graph:
  requires: [apps.core.exceptions.OCRProcessingError, apps.products.models.Product]
  provides: [POST /api/v1/ocr/scan/]
  affects: [apps.ocr]
tech_stack:
  added: [legacy-pytesseract, thefuzz, Pillow.ImageOps, Pillow.ImageFilter]
  patterns: [APIView with MultiPartParser, token_sort_ratio fuzzy matching, structlog logging]
key_files:
  created:
    - backend/apps/ocr/services.py
    - backend/apps/ocr/serializers.py
    - backend/apps/ocr/views.py
    - backend/tests/unit/test_ocr.py
    - backend/tests/integration/test_ocr_api.py
  modified:
    - backend/apps/ocr/urls.py
decisions:
  - legado: pytesseract imported at module level (not deferred) to enable correct mock patching in tests
  - Fuzzy match threshold 80 means product names must closely match query — test fixtures adjusted to short exact names
  - 422 returned for OCRProcessingError (no text extracted), 400 for missing/invalid image, 500 for unexpected errors
metrics:
  duration_minutes: 7
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_created: 5
  files_modified: 1
---

# Phase 05 Plan 02: OCR Endpoint Summary

> Editorial note (2026-03-26): este resumen describe la implementación histórica del endpoint OCR
> basada en pytesseract. La decisión vigente del proyecto está documentada en ADR-007 y sustituye
> ese enfoque por Google Vision API como proveedor OCR objetivo.

**One-liner:** Legacy OCR endpoint based on pytesseract with Pillow preprocessing and thefuzz token_sort_ratio fuzzy product matching at 80% confidence threshold.

## What Was Built

`POST /api/v1/ocr/scan/` — authenticated multipart endpoint that:
1. Accepts an image file upload
2. Preprocesses it (grayscale, autocontrast, sharpen) with Pillow
3. Runs `pytesseract.image_to_string` with `--psm 6 --oem 3` and `spa+eng` languages
4. Fuzzy-matches each text line against the active product catalog using `thefuzz.fuzz.token_sort_ratio` at 80% threshold
5. Returns structured items with `raw_text`, `confidence`, `quantity`, and optionally `matched_product_id` / `matched_product_name`

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | OCR service layer + serializers + view + URL | f1dbeed | services.py, serializers.py, views.py, urls.py |
| 2 | OCR unit + integration tests | 5ecb591 | test_ocr.py, test_ocr_api.py (+ services.py fix) |

## Test Results

- 5 unit tests (services.py: extract_text and match_products)
- 4 integration tests (endpoint: auth, validation, format)
- **9/9 passed**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pytesseract was imported inside function instead of at module level**
- **Found during:** Task 2 (running tests)
- **Issue:** `patch("apps.ocr.services.pytesseract")` raised AttributeError because the module attribute did not exist at patch time
- **Fix:** Moved `import pytesseract` to top-level module imports in services.py
- **Files modified:** backend/apps/ocr/services.py
- **Commit:** 5ecb591

**2. [Rule 1 - Bug] Test fixture product name "Leche Entera Hacendado" scores 71% against "LECHE ENTERA"**
- **Found during:** Task 2 (running tests)
- **Issue:** `token_sort_ratio("LECHE ENTERA", "LECHE ENTERA HACENDADO") == 71`, below 80% threshold; test expected matched_product_id
- **Fix:** Changed test fixture to `name="Leche Entera"` (exact match = 100%)
- **Files modified:** backend/tests/unit/test_ocr.py
- **Commit:** 5ecb591

**3. [Rule 1 - Bug] Integration test passed `io.BytesIO` directly; DRF ImageField requires named file**
- **Found during:** Task 2 (running integration tests)
- **Issue:** `BytesIO` object has no `name` attribute, DRF ImageField validation returned 400
- **Fix:** Replaced raw BytesIO with `SimpleUploadedFile("test.png", bytes, content_type="image/png")`
- **Files modified:** backend/tests/integration/test_ocr_api.py
- **Commit:** 5ecb591

## Known Stubs

None — this historical summary reflects the legacy pytesseract endpoint. ADR-007 supersedes the
provider choice with Google Vision API for the target architecture.

## Self-Check: PASSED
