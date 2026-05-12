---
description: Archive a completed OpenSpec change after verifying tasks and specs
aliases: opsx-archive,openspec-archive
usage: /goal openspec-archive-change --change <change-id>
examples: /goal openspec-archive --change add-user-export
---
Archive this completed OpenSpec change:

<change_id>
{{change}}
</change_id>

OpenSpec is optional for `pi-goals`; this template requires the `openspec` CLI only because this specific workflow uses it. This example is not auto-discovered from `examples/`; copy/adapt it into workspace-root `.pi-goals/` before use.

Workflow:
1. Read `AGENTS.md` and all change artifacts for `{{change}}`.
2. Verify `openspec/changes/{{change}}/tasks.md` has no unchecked tasks. If tasks remain unchecked, stop and report the blocker instead of archiving.
3. Run `openspec validate {{change}} --strict` before archive.
4. Run relevant project validation if the change touched code or package docs. For this repo, use `npm run quality:goal` when `.pi/extensions/goal`, scripts, package metadata, README, docs, or examples changed.
5. Archive the change with the project-standard OpenSpec archive command.
6. Run post-archive validation for specs, such as `openspec validate --specs` or `openspec validate --all --no-interactive`.
7. Report archive path, commands run, validation results, and any follow-up risks.

Completion standard:
- The change was already implemented and all tasks were checked before archiving.
- Pre-archive OpenSpec validation passes.
- The archive command succeeds.
- Post-archive spec validation passes.
- The goal is not marked complete if tasks are incomplete, archive fails, validation fails, or the change id is ambiguous/missing.
