# Scripts Guide

This folder is for operational scripts that are safe and reusable.

## What belongs in `scripts/`

- Repeatable admin or maintenance tasks.
- Migrations/backfills that may be needed again.
- Diagnostics that are useful across incidents.

## What does not belong in `scripts/`

- One-time debugging helpers for a single user/account.
- Scratch scripts created during incident response.
- Local experiments that are not maintained.

Put those in `scripts/archive/` (or keep them untracked locally).

## Safety rules

- Never hardcode secrets, tokens, or personal account identifiers.
- Default to read-only behavior unless a write is explicitly intended.
- For write scripts, print a clear summary before executing changes.
- Add a short header comment with purpose and expected inputs.

## Naming conventions

- Reusable: `verb-object.ts` (example: `migrate-position-keys.ts`)
- One-off/scratch: `tmp-*`, `debug-*`, `check-*`, `test-*` (these should be archived or untracked)

## Public repo policy

- If a script is not safe + reusable + maintainable, do not keep it in top-level `scripts/`.
- Use CI secret scanning to catch accidental leaks before merge.
