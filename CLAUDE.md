@AGENTS.md

# Claude Code Session Rules — GenTradr

## Project Mission

GenTradr (formerly OPTIMA / "Road to Funded Account") is a personal trading
discipline and proof system: paper trading only, with an options scanner +
human approval workflow. The long-term goal is to build a clean, auditable
record of disciplined paper trades before any consideration of a funded
futures account. Every change should serve that mission — correctness and
safety first, polish second.

## Safety Rules (session-level, in addition to AGENTS.md)

- Live trading stays **disabled**. Broker mode stays SANDBOX / LIVE LOCKED.
- Broker submit stays **locked**. Never flip `approved_for_sandbox_order`,
  `approved_for_live_order`, or `submitted_to_broker` defaults/behavior.
- **No order behavior changes** (preview, sandbox-broker-preview,
  sandbox-submit, human-review) without Matthew's explicit approval for that
  specific change.
- No Supabase schema changes unless explicitly approved.
- No Risk Guard, approval workflow, broker route, or payload-shape changes
  unless explicitly approved.

## Green-Zone Work (safe to implement after a short report)

- Presentational UI changes: layout, spacing, badges, colors, copy, empty
  states, loading states, "last checked" timestamps, auto-refresh timers.
- Changes that only read **existing** fields already present in a loaded row
  (e.g. via `.select("*")` or an existing `.select(...)` list) and display
  them — no new columns, no new queries.
- Changes confined to a single component file with no shared-type or
  shared-helper signature changes.

## Red-Zone Work (requires explicit approval before any edit)

- Supabase schema changes (new columns, tables, migrations).
- Any change to `lib/tradierOrderSafety.ts` or the three paper order routes
  (`/preview`, `/sandbox-broker-preview`, `/sandbox-submit`).
- Risk Guard logic, contract quality grading, approval/HOLD/REJECT/WATCH
  decision logic.
- Broker routes, order submission behavior, sandbox/live lock fields.
- Payload/data-shape changes to `paper_order_previews`, `phone_alert_events`,
  or any other Supabase table.
- New npm packages or dependency changes.

## Required Workflow

1. **Inspect and report first.** For any non-trivial change, read the
   relevant files and report: current behavior, proposed change, exact file(s)
   and JSX/code location, and a safety confirmation against the rules above.
   Stop and wait for approval before editing.
2. **One focused change at a time.** Scope edits to the smallest set of files
   that accomplishes the approved task. No drive-by refactors.
3. **Build after every edit.** Run `npm run build` and confirm it passes
   clean before reporting the change as ready.
4. **Diff before commit.** Run `git diff -- <file(s)>` and show it. Stop here
   unless the user has explicitly approved committing.
5. **Commit only the intended files.** Stage only the file(s) that were
   approved for this change — never `git add -A` or `git add .`.
6. **Never stage or commit `dev-output.log`.** This file is local dev-server
   output and must remain untracked.

## Code Patterns

- Always import the shared Supabase client:
  `import { supabase } from "../lib/supabaseClient"` (adjust relative path
  per file location). Never create a new/inline Supabase client.
- Match existing helper-function and badge/color patterns already present in
  sibling components (e.g. `PaperOrderPreviewHistoryPanel.tsx`) instead of
  inventing new conventions.
- UI-only changes are fine to implement directly once scoped and the build
  passes — they don't require the full red-zone approval gate, but still
  follow the report → build → diff → stop-before-commit workflow above.
