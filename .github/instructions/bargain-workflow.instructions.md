---
description: "Use when working on BargAIn tasks, updating TASKS.md, writing TFG documentation, implementing Django backend or Expo/React frontend code, and preparing commits/PRs with task IDs."
name: "BargAIn Workflow Rules"
---

# BargAIn Workflow Rules

- Before starting implementation, read `TASKS.md` and `docs/ai-mistakes-log.md`.
- For milestone or feature tasks, mark the target task as `🔄` in `TASKS.md` when work begins.
- For milestone or feature tasks, mark the task as `✅`, update real hours if the table includes them, and refresh the sync note when relevant.

# Documentation Safety

- Read a documentation file completely before editing it.
- If a doc has substantial existing content, extend or edit in place; do not overwrite without explicit request.
- Do not deliver UI wireframes or screen designs as ASCII art.
- Preferred mockup outputs are renderable HTML/CSS/JS, SVG, or PNG.

# Code Conventions

- Backend: follow PEP 8, add type hints on public functions, and use concise Google-style docstrings for public classes/functions.
- Frontend: use functional components with hooks, `PascalCase` for components, and `camelCase` for variables/functions.
- Keep line length around 99 chars in Python and 100 chars in frontend files.

# Validation Commands

- Backend lint check: `make lint-backend`
- Backend lint autofix: `make lint-backend-fix`
- Backend tests: `make test-backend`
- Backend coverage: `make test-backend-cov`
- Frontend lint: `cd frontend && npx eslint src/`
- Frontend tests: `cd frontend && npx jest --coverage`

# Commit And PR Hygiene

- Use Conventional Commits and include task ID when available, for example `feat(users): implementar login JWT (F3-02)`.
- Keep commits atomic and scoped to one change intent.
- Prefer PRs targeting `develop`.
