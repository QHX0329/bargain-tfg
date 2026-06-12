status: resolved
trigger: "Investigate and fix iOS GitHub Actions workflow failure for archive export (ios-archive-not-found-export)."
created: 2026-04-10T08:50:11.1132057+02:00
updated: 2026-04-10T11:24:00.0000000+02:00
---

## Current Focus

hypothesis: Archive-path mismatch risk is now covered by unified ARCHIVE_PATH usage plus expanded diagnostics; remaining uncertainty is CI runtime behavior on macOS.
test: Validate YAML syntax and review scoped diff after adding pipefail and enhanced archive discovery logs.
expecting: Static checks pass, and any future archive-not-found failure surfaces concrete archive location evidence in CI logs.
next_action: Trigger CI run to confirm archive generation/export end-to-end on GitHub-hosted macOS.

## Symptoms

expected: Workflow should build and create .xcarchive, then export IPA successfully.
actual: Export step cannot find archive at expected path and exits 65.
errors: archive not found at /Users/runner/work/bargain-tfg/bargain-tfg/build/BarGAIN.xcarchive
reproduction: Trigger iOS deploy workflow in GitHub Actions (staging iOS deployment).
started: Current recurring CI failure; prior success unknown.

## Eliminated

## Evidence

- timestamp: 2026-04-10T08:50:29.3882782+02:00
	checked: .planning/debug/knowledge-base.md
	found: Knowledge base file does not exist yet.
	implication: No prior known-pattern shortcut is available; proceed with normal investigation.

- timestamp: 2026-04-10T08:51:42.3999965+02:00
	checked: .github/workflows/*.yml for xcarchive/export usage
	found: Only ios-build.yml uses xcodebuild archive/export, with archive step in frontend/ios using ../../build/BarGAIN.xcarchive and export step using build/BarGAIN.xcarchive.
	implication: Archive/export path handling is centralized in ios-build.yml and currently depends on relative-path assumptions across steps.

- timestamp: 2026-04-10T08:53:32.6992605+02:00
	checked: ios-build.yml build-to-export flow
	found: There is no guard step validating archive existence before export.
	implication: The pipeline reaches export with a hardcoded expected path and fails with an opaque exit 65 when the archive is absent there.

- timestamp: 2026-04-10T08:54:11.3208652+02:00
	checked: .github/workflows/ios-build.yml
	found: Added job-level ARCHIVE_PATH and EXPORT_PATH env vars, replaced relative archive/export paths, and inserted a Verify archive exists step before export.
	implication: Archive and export now use one absolute location and fail early with explicit diagnostics when archive output is missing.

- timestamp: 2026-04-10T08:55:13.9742273+02:00
	checked: Lightweight validation commands
	found: Built-in YAML parsers were unavailable in this shell, but npx js-yaml parsed .github/workflows/ios-build.yml successfully and git diff confirmed only scoped workflow edits.
	implication: The workflow file remains syntactically valid with changes limited to archive/export path handling and diagnostics.

- timestamp: 2026-04-10T09:10:00.0000000+02:00
	checked: .github/workflows/ios-build.yml full content and git diff
	found: Build and export now both use the same ARCHIVE_PATH/EXPORT_PATH env vars, with archive directory creation before build and explicit archive existence verification before export.
	implication: Path handling no longer depends on per-step relative working directory assumptions.

- timestamp: 2026-04-10T09:12:00.0000000+02:00
	checked: Additional static checks (Select-String path scan, git diff --check, npx js-yaml)
	found: No leftover ../../build or mixed archivePath/exportPath usage remains; YAML parse passes; no diff whitespace errors beyond pre-existing LF->CRLF notice.
	implication: No local/static regression indicators were found in workflow path handling.

- timestamp: 2026-04-10T09:18:00.0000000+02:00
	checked: Deterministic assertions over ios-build.yml path arguments
	found: Legacy ../../build/BarGAIN.xcarchive string is absent and all three -archivePath usages resolve to $ARCHIVE_PATH.
	implication: The original archive-path mismatch regression vector is statically eliminated in the current workflow file.

- timestamp: 2026-04-10T10:04:00.0000000+02:00
	checked: New symptom report provided by orchestrator/user
	found: CI still fails at "Verify archive exists" with archive-not-found even after unified ARCHIVE_PATH changes.
	implication: Prior path-unification fix was insufficient; investigate whether archive step is falsely passing or generating elsewhere.

- timestamp: 2026-04-10T10:06:00.0000000+02:00
	checked: Bash pipeline semantics experiment (`set -e; false | cat; false | cat || echo FALLBACK_TRIGGERED`)
	found: Pipeline exit status was 0 and OR fallback did not trigger.
	implication: The current `xcodebuild | xcpretty || xcodebuild` pattern can hide an upstream xcodebuild failure.

- timestamp: 2026-04-10T10:07:00.0000000+02:00
	checked: Bash pipeline semantics with `set -eo pipefail`
	found: OR fallback triggered when the first command in the pipeline failed.
	implication: Enabling pipefail is a minimal targeted fix to propagate xcodebuild failures correctly in the archive step.

- timestamp: 2026-04-10T10:11:00.0000000+02:00
	checked: .github/workflows/ios-build.yml archive build step
	found: Added `set -o pipefail` immediately before the xcodebuild pipeline.
	implication: xcodebuild non-zero status is no longer masked by xcpretty success.

- timestamp: 2026-04-10T10:12:00.0000000+02:00
	checked: Static validation commands (git diff; npx js-yaml; Select-String)
	found: YAML parsing succeeds, diff is scoped to the one-line pipefail addition, and the pipeline line remains in place.
	implication: Patch is syntactically safe and narrowly targeted; runtime verification now required on GitHub macOS runner.

- timestamp: 2026-04-10T11:10:00.0000000+02:00
	checked: Re-audit of archive/export path usage plus static path scan in ios-build.yml
	found: ARCHIVE_PATH and EXPORT_PATH are consistently used across build/verify/export, but verify diagnostics only search under $GITHUB_WORKSPACE.
	implication: If xcodebuild emits archives in default Xcode locations, current diagnostics may not reveal where the archive was produced.

- timestamp: 2026-04-10T11:18:00.0000000+02:00
	checked: .github/workflows/ios-build.yml diagnostic hardening patch
	found: Build step now logs expected archive path, verify step now logs workspace/export expectations and searches both workspace and $HOME/Library/Developer/Xcode/Archives for .xcarchive output.
	implication: Future archive-not-found failures should include actionable path evidence instead of opaque missing-archive errors.

- timestamp: 2026-04-10T11:20:00.0000000+02:00
	checked: Post-patch static validation
	found: YAML parser check passes (js-yaml), patch diff is scoped to archive pipeline and diagnostics, and actionlint is unavailable in local shell.
	implication: Change is syntactically valid and minimal; final behavioral confirmation must come from GitHub Actions runtime.

## Resolution

root_cause: The archive step piped xcodebuild output through xcpretty without pipefail, allowing xcodebuild failures to be masked and surfacing later as archive-not-found; additionally, archive diagnostics only searched the workspace, limiting path forensics.
fix: Added set -o pipefail to the archive build step and expanded archive-not-found diagnostics to log expected paths and search both workspace and default Xcode archive directories.
verification: Autonomous best-effort static verification completed (YAML parse pass + scoped diff review + path consistency audit). Runtime validation still required via a GitHub Actions macOS run.
files_changed: [.github/workflows/ios-build.yml]
