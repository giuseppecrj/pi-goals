---
description: Implement a named OpenSpec change using pi-goal execution discipline
aliases: opsx-apply,openspec-apply
usage: /goal openspec-apply-change --change <change-id>
examples: /goal openspec-apply --change add-user-export
---
Implement this OpenSpec change:

<change_id>
{{change}}
</change_id>

OpenSpec is optional for `pi-goals`; this template requires the `openspec` CLI only because this specific workflow uses it. This example is not auto-discovered from `examples/`; copy/adapt it into workspace-root `.pi-goals/` before use.

Workflow:
1. Read `AGENTS.md` and the change artifacts before editing code:
   - `openspec/changes/{{change}}/proposal.md`
   - `openspec/changes/{{change}}/design.md` if present
   - `openspec/changes/{{change}}/tasks.md`
   - `openspec/changes/{{change}}/specs/**/spec.md`
2. Run `openspec status --change {{change}} --json` and confirm the change is apply-ready.
3. Implement tasks in dependency order, making the smallest coherent changes that satisfy the spec deltas.
4. Check off each `tasks.md` item only after verifying that task is actually complete.
5. Run `openspec validate {{change}} --strict`.
6. Run the project validation gate. For this repo, use `npm run quality:goal`.
7. If validation fails, fix the underlying implementation/spec mismatch instead of weakening checks.
8. Report files changed, tasks completed, commands run, validation results, and any remaining risks.

Completion standard:
- Every task in `openspec/changes/{{change}}/tasks.md` is checked off.
- `openspec validate {{change}} --strict` passes.
- Relevant project validation passes.
- Implementation matches proposal/design/spec intent.
- The goal is not marked complete if tasks remain unchecked, OpenSpec validation fails, project validation fails, or the change id is ambiguous/missing.
