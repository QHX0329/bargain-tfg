---
description: "Close a BargAIn task by validating changes, updating TASKS.md, checking docs impact, and generating a PR-ready summary."
name: "Close BargAIn Task"
argument-hint: "Task ID and completion note, e.g. F3-02 login JWT completado"
agent: "agent"
---
Run a task closure workflow for BargAIn.

Input to use:
- Task identifier and completion note: ${input:Task}

Required steps:
1. Verify code quality by running relevant lint/tests for changed backend/frontend areas.
2. Update `TASKS.md` for milestone/feature tasks:
- Change status to `✅`
- Fill real hours if tracked
- Refresh top sync note when needed
3. Check if any documentation must be updated (`docs/memoria/*`, API docs, diagrams, or ADR references).
4. If an agent mistake occurred during the task, add an entry to `docs/ai-mistakes-log.md` before finalizing.
5. Produce a PR-ready summary with changed files, behavior impact, and verification results.

Output format:
- `Verification`
- `Tracker updates`
- `Documentation updates`
- `PR summary`
- `Follow-ups`
