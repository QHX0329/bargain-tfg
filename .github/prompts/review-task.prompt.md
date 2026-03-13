---
description: "Review a BargAIn task implementation with a strict bug-first checklist: regressions, risks, tests, docs, and release readiness."
name: "Review BargAIn Task"
argument-hint: "Task ID and scope, e.g. F3-10 API tiendas geoespacial"
agent: "agent"
---
Run a strict code review workflow for BargAIn.

Input to use:
- Task identifier and review scope: ${input:Task}

Review objectives:
1. Identify functional bugs, behavioral regressions, and risky assumptions first.
2. Verify if new or changed logic has adequate tests and edge-case coverage.
3. Check contract consistency (API responses, validations, error handling format).
4. Flag architecture/style deviations against active instructions and project conventions.
5. Assess documentation impact (`docs/memoria/*`, API docs, diagrams, ADR references).

Required output format:
- `Findings (by severity)`
- `Open questions / assumptions`
- `Missing tests`
- `Documentation gaps`
- `Merge readiness`

Rules:
- Findings must include file references.
- Prioritize correctness and risk over style nits.
- If no findings exist, state that explicitly and list residual risks.
