## Context

`pi-goals` is being prepared for initial publication as a Pi package. The `.ai` folder has been removed as a runtime/package requirement, examples were moved under `examples/pi-goals/`, and validation moved under `scripts/validation/`. A follow-up audit found that the package is close to publishable but still has a critical template allowlist bypass plus documentation and release-gate drift.

The extension's highest-risk surface is reusable goal template expansion. Template bodies may contain inline `!` command snippets. The hardened default is `PI_GOALS_TEMPLATE_COMMANDS=off`; `allowlist` mode is intended to permit limited read-only discovery commands. Any tool-specific option that invokes arbitrary commands breaks that promise.

## Goals / Non-Goals

**Goals:**

- Make `allowlist` command execution defensible for initial publication.
- Ensure shipped docs/examples do not imply that `.ai` is required by `pi-goals`.
- Make examples clear to copy/adapt, including helper script dependencies and optional issue-workflow conventions.
- Make the release gate story explicit and reproducible.
- Remove legacy parser compatibility that is not needed before first publication.

**Non-Goals:**

- Design a general sandbox for arbitrary template commands.
- Guarantee safety for `PI_GOALS_TEMPLATE_COMMANDS=on`; that mode remains trusted-template compatibility mode.
- Remove all optional `.ai` mentions from examples where they are explicitly framed as one possible user workflow convention.
- Add a new test framework; existing script probes are sufficient for this hardening pass.

## Decisions

### Decision 1: Prefer exact allowlisted command shapes over broad command names

For `rg`, either remove the command from the allowlist or validate a narrow read-only subset. The safer default is to remove `rg` unless a current example requires it in allowlist mode. If kept, deny all preprocessor/config/execution flags explicitly and add a regression probe.

Alternatives considered:
- Keep broad `rg` allowlisting: rejected because tool-specific flags can execute external programs.
- Shell sandboxing: rejected as too broad for this package and not portable.

### Decision 2: Keep `.pi-goals/` as the sole runtime template location

The extension should continue discovering only workspace-root `.pi-goals/`. Package examples remain under `examples/pi-goals/` and are documentation/examples only.

Alternatives considered:
- Restore `.ai/.pi-goals` compatibility: rejected because the project has not been published and the user explicitly does not care about backwards compatibility.

### Decision 3: Treat example issue workflows as optional conventions

Examples that use `.ai/issues` can remain if they are clearly labelled as optional conventions and if users are told what to copy. Shipped docs should not present `.ai` as a package requirement.

Alternatives considered:
- Rewrite all examples to neutral `issues/` paths: viable, but larger and risks breaking useful concrete examples.
- Delete issue workflow examples: reduces package usefulness.

### Decision 4: Make release gates explicit by role

`npm run quality:goal` remains the reproducible local gate and may skip the optional structure checker if unavailable. Release sign-off should either require the optional structure checker installation or explicitly state that the optional structure checker is optional and not a publication blocker.

Alternatives considered:
- Make `structure-checker` a package dependency: not viable while it is not available from the npm registry in this environment.

### Decision 5: Drop legacy queue state parsing before publication

Because there is no published version to migrate from, queue replay should only accept `QUEUE_STATE_ENTRY_TYPE` entries. This reduces parser surface and aligns with the no-backcompat constraint.

## Risks / Trade-offs

- **Risk:** Removing or narrowing `rg` may break templates that rely on allowlist-mode ripgrep. → **Mitigation:** Document supported commands and keep `PI_GOALS_TEMPLATE_COMMANDS=on` for reviewed trusted templates.
- **Risk:** Optional `.ai` examples may still confuse users. → **Mitigation:** Add explicit labels and copy/adapt instructions near examples and in the authoring guide.
- **Risk:** the optional structure checker remains inconsistent across machines. → **Mitigation:** Clarify release sign-off requirements and keep deterministic checks in `quality:goal`.
- **Risk:** Dropping legacy queue replay could lose state for local pre-release sessions. → **Mitigation:** Acceptable before publication per user direction; users can clear/recreate queues.

## Migration Plan

1. Implement critical allowlist hardening and regression tests.
2. Clean docs/examples and release-gate wording.
3. Remove legacy queue replay acceptance.
4. Run `npm run quality:goal`, `npm pack --dry-run`, and package installation smoke test.
5. If the optional structure checker is required for release sign-off, run `structure-checker gate .pi/extensions/goal && structure-checker check .pi/extensions/goal` on a machine with the optional structure checker installed.

## Open Questions

- Should `rg` be removed from the allowlist entirely, or preserved with strict argument validation?
- Should `.ai`-oriented examples remain as optional workflow examples, or be rewritten to neutral paths before publication?
- Is the optional structure checker mandatory for publication, or only a local advisory structure gate?
