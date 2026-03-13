---
description: "Start a BargAIn task with project protocol: read tracker files, set task in progress, identify scope, and produce a short execution checklist."
name: "Start BargAIn Task"
argument-hint: "Task ID and goal, e.g. F3-02 implementar login JWT"
agent: "agent"
---
Prepare a clean task kickoff for BargAIn.

Input to use:
- Task identifier and objective: ${input:Task}

Required steps:
1. Read `TASKS.md` and `docs/ai-mistakes-log.md` completely.
2. Locate the target task in `TASKS.md` and set its status to `🔄` if it is a milestone or feature task.
3. Summarize constraints from `CLAUDE.md` and relevant `.github/instructions/*.instructions.md` files.
4. Inspect the affected module folders and identify likely files to edit and tests to update.
5. Return a concise kickoff report with:
- Task understanding
- Risks and assumptions
- File-level plan
- Validation command list

Output format:
- `Task`
- `Constraints`
- `Plan`
- `Validation`
- `Open questions`
