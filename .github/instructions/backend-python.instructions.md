---
description: "Use when editing Django backend code in backend/**/*.py, including models, serializers, viewsets, services, tasks, and tests. Enforces BargAIn backend quality and validation flow."
name: "BargAIn Backend Python Rules"
applyTo: "backend/**/*.py"
---

# Backend Scope

- Follow Django 5 patterns already used in `backend/apps/*` and `backend/config/*`.
- Keep public functions and methods type-annotated.
- Add concise Google-style docstrings for public classes/functions when behavior is not obvious.

# Style And Structure

- Follow PEP 8 and project line-length expectations (around 99 chars).
- Prefer small, testable service functions over large view logic blocks.
- Reuse project exceptions and API error format from `backend/apps/core/exceptions.py`.
- Keep imports organized and avoid unused imports.

# Data And API Safety

- Validate inputs explicitly in serializers/forms before business logic.
- Preserve response consistency for errors and success payloads.
- Avoid hardcoded secrets and environment-specific values.

# Tests And Validation

- Add or update tests close to the changed behavior in `backend/tests/unit`, `backend/tests/integration`, or `backend/tests/e2e`.
- Run relevant checks before finishing:
- `make lint-backend`
- `make test-backend`
- For broader changes, also run `make test-backend-cov`.

# Task Tracking For Features

- For milestone or feature work, update `TASKS.md` status (`🔄` then `✅`) and reflect real hours when tracked.
