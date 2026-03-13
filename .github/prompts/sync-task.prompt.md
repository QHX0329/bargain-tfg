---
description: "Sync a BargAIn task status across TASKS.md, local notes, and GitHub issue references with a concise status report."
name: "Sync BargAIn Task"
argument-hint: "Task ID and target status, e.g. F2-09 -> in-progress"
agent: "agent"
---
Run a task synchronization workflow for BargAIn.

Input to use:
- Task identifier and desired status: ${input:Task}

Required steps:
1. Read `TASKS.md` and locate the target row.
2. Update status according to the requested transition using project symbols:
- `⬜` pending
- `🔄` in progress
- `🔁` in review
- `✅` completed
- `❌` blocked
3. If status is `✅`, ensure real hours are filled when tracked.
4. Verify whether the task should reference a GitHub issue (critical/high priority).
5. Produce a sync summary with current state and any follow-up actions.

Output format:
- `Task status`
- `Tracker edits`
- `Issue linkage`
- `Notion/Mirror note`
- `Next actions`

Rules:
- Do not reorder or renumber tasks.
- Do not delete historical completed tasks.
- Preserve existing table formatting.
