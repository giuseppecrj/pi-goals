## Context

`pi-goals` already supports reusable prompt templates from workspace-root `.pi-goals/`, and the package ships copy/adapt examples under `examples/pi-goals/`. The repository also uses OpenSpec for change proposals, design/spec/tasks, validation, and archive lifecycle.

The integration should connect those workflows without turning OpenSpec into a runtime dependency of the extension.

## Goals / Non-Goals

**Goals:**

- Provide practical OpenSpec goal templates for propose, apply, and archive workflows.
- Make OpenSpec artifacts the source of truth for change scope and acceptance.
- Make pi-goals responsible for execution persistence, queueability, and completion discipline.
- Document copy/adapt usage through `.pi-goals/`.

**Non-Goals:**

- Add OpenSpec imports, dependencies, or runtime detection to `.pi/extensions/goal/`.
- Change goal state, queue state, commands, tools, or template parser behavior.
- Guarantee OpenSpec CLI availability for all package users.

## Decisions

1. **Ship integration as example templates**

   Add `examples/pi-goals/openspec-propose.md`, `openspec-apply-change.md`, and `openspec-archive-change.md`. Users opt in by copying them to `.pi-goals/`.

   Alternative considered: hardwire OpenSpec commands into the extension. Rejected because it would couple a generic goal package to one external workflow and create a hidden runtime prerequisite.

2. **Use explicit template inputs**

   The apply/archive templates accept `--change <change-id>`. The propose template accepts a trailing description and optionally `--change <change-id>`. Templates should ask for missing required inputs instead of guessing.

   Alternative considered: infer active change from `openspec list`. Rejected for initial examples because ambiguity can lead to modifying or archiving the wrong change.

3. **Completion is proof-based**

   Templates instruct the agent not to mark goals complete until OpenSpec validation and relevant project gates pass. Apply additionally requires completed `tasks.md`; archive requires successful archive and post-archive spec validation.

## Risks / Trade-offs

- **Risk:** Users assume examples are automatically discovered. → **Mitigation:** README and templates state copy/adapt into `.pi-goals/`.
- **Risk:** OpenSpec CLI is unavailable. → **Mitigation:** Templates treat CLI absence as a blocker to report, not a package failure.
- **Risk:** Goal templates drift from OpenSpec skill behavior. → **Mitigation:** Keep templates concise and focused on invariants rather than duplicating all skill instructions.
