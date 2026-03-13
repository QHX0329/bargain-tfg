---
description: "Use when editing Expo/React Native frontend files in frontend/src/**/*.{ts,tsx}, including screens, components, navigation, hooks, state, and API clients."
name: "BargAIn Frontend RN Rules"
applyTo: "frontend/src/**/*.{ts,tsx}"
---

# Frontend Scope

- Use functional React components and hooks.
- Use `PascalCase` for components and `camelCase` for variables, functions, and hooks.
- Keep TypeScript types/interfaces explicit for props and API contracts.

# UI And Architecture

- Preserve existing app navigation and store patterns (React Navigation + Zustand).
- Keep screens thin; move reusable UI and logic to `components/` and `hooks/`.
- Prefer centralized API access through `src/api/` clients rather than ad-hoc fetch calls.

# Style And Consistency

- Keep formatting aligned with project ESLint/Prettier defaults (print width around 100, single quotes).
- Reuse theme tokens from `src/theme/` instead of hardcoded visual values.
- Avoid introducing one-off patterns when an existing component or utility covers the need.

# Validation

- Run frontend lint and tests for changed areas:
- `cd frontend && npx eslint src/`
- `cd frontend && npx jest --coverage`

# Design Deliverables

- Do not provide UI wireframes as ASCII art.
- Use renderable HTML/CSS/JS, SVG, or PNG for visual mockups.
