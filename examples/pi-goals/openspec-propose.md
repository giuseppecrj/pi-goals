---
description: Create an OpenSpec change proposal/design/spec/tasks from a natural-language request
aliases: opsx-propose,openspec-new-change
usage: /goal openspec-propose -- describe the change to propose
examples: /goal openspec-propose -- add OpenSpec goal templates for propose/apply/archive workflows
---
Create an OpenSpec change from this request:

<request>
{{args}}
</request>

OpenSpec is optional for `pi-goals`; this template requires the `openspec` CLI only because this specific workflow uses it. This example is not auto-discovered from `examples/`; copy/adapt it into workspace-root `.pi-goals/` before use.

Workflow:
1. Read `AGENTS.md` and existing OpenSpec context:
   - `openspec list --json`
   - `find openspec/specs -maxdepth 2 -type f -name spec.md -print`
2. Derive a concise kebab-case change id from the request unless the user explicitly provided one.
3. Create the change with `openspec new change <change-id>`.
4. Use `openspec status --change <change-id> --json` and `openspec instructions <artifact> --change <change-id> --json` to create every artifact required before apply.
5. Create proposal, design, spec delta, and tasks artifacts according to OpenSpec instructions.
6. Run `openspec validate <change-id> --strict`.
7. Report the change id, artifacts created, validation result, and recommended next goal invocation.

Completion standard:
- The change directory exists under `openspec/changes/<change-id>/`.
- All artifacts required by `openspec status --change <change-id>` before apply are present.
- `openspec validate <change-id> --strict` passes.
- The goal is not marked complete if OpenSpec CLI is unavailable, artifacts are incomplete, or validation fails.
