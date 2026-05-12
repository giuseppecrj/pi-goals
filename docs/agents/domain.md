# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout

This repo uses a **single-context** layout:

- `CONTEXT.md` at the repo root for shared domain language, if present.
- `docs/adr/` at the repo root for architectural decisions, if present.
- OpenSpec changes under `openspec/changes/<change-name>/` for active change proposals, designs, specs, and task lists.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, if present.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in, if present.
- **Relevant OpenSpec artifacts** when the work references an active change:
  - `openspec/changes/<change-name>/proposal.md`
  - `openspec/changes/<change-name>/design.md`
  - `openspec/changes/<change-name>/tasks.md`
  - `openspec/changes/<change-name>/specs/**/spec.md`

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates domain docs lazily when terms or decisions actually get resolved.

## File structure

Single-context repo:

```text
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-example-decision.md
│   └── 0002-example-decision.md
├── openspec/
│   ├── specs/
│   └── changes/
│       └── <change-name>/
│           ├── proposal.md
│           ├── design.md
│           ├── tasks.md
│           └── specs/
└── .pi/extensions/goal/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR and OpenSpec conflicts

If your output contradicts an existing ADR or active OpenSpec artifact, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because..._

> _Contradicts `openspec/changes/<change-name>/proposal.md` scope — update the proposal before implementing this path._
