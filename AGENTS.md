# AGENTS — pi-goals

Project: Pi package implementing the `pi-goal` extension.

Primary code: `.pi/extensions/goal/`.
Package docs/examples:
- `README.md`
- `docs/`
- `examples/pi-goals/`
- `scripts/validation/`

## Extension architecture

Keep the extension modular. Preserve separation between entrypoint, command/tools, lifecycle/runtime, state/telemetry, prompts, UI/widget, monitor, and shared domain helpers.

## Required quality gate

After implementation, run the single required gate:

```bash
npm run quality:goal
```

This runs the slop guard, security probe, TypeScript validation, and Pi extension load validation.

Rules:
- Do not use TypeScript escape-hatch casts in `.pi/extensions/goal`, especially `as unknown as` or `as any`.
- Keep changes scoped and preserve extension module boundaries.

## Goal template routing

Reusable goal templates live in workspace-root `.pi-goals/`. The package examples live in `examples/pi-goals/` for users to import with `/goal templates copy <name>` or manually copy/adapt.

When handling queued pi-goal prose, treat `.pi-goals/*` as reusable workflows. Before `start_queued_goal` for an abstract/task-type queue item, call `list_goal_templates` and match by name, aliases, description, and placeholders. If exactly one template fits and inputs are available, use `create_goal_from_template`; dequeue the prose item only after that concrete goal is satisfied. Use `start_queued_goal` only for direct one-off goals.

Inline template commands are disabled by default. For reviewed templates that need inline commands, pass `/goal <template> --template-commands=allowlist -- ...` for allowlisted commands or `/goal <template> --template-commands=on -- ...` only when shell features are required and trusted.

Never discard queued work. Do not call `dequeue_goal` unless the queue head is actually satisfied or the user explicitly authorizes removing that specific queued item. If uncertain, leave it queued and report the blocker.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues as a solo-dev intake/backlog queue; OpenSpec remains the source of truth once a non-trivial change exists. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label triage vocabulary for agent-ready issue flow. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: root `CONTEXT.md` plus root `docs/adr/`. See `docs/agents/domain.md`.
