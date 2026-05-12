## 1. Template Command Security

- [x] 1.1 Decide whether `rg` should be removed from allowlist or preserved with strict safe-argument validation.
- [x] 1.2 Implement the chosen `rg` allowlist hardening in `.pi/extensions/goal/templates.ts`.
- [x] 1.3 Add a regression test to `scripts/validation/security-hardening-probe.mjs` that fails if `rg --pre` or equivalent command-execution bypasses are allowed.
- [x] 1.4 Run `npm run security:goal` and verify the probe passes.

## 2. Documentation and Examples

- [x] 2.1 Remove or replace the dead `.ai/docs/pi-goals-live-probe-testing.md` reference in `docs/prompt-template-authoring.md`.
- [x] 2.2 Add clear documentation that `examples/pi-goals/` templates must be copied/adapted into workspace-root `.pi-goals/` before use.
- [x] 2.3 Label `.ai/issues` and `.ai/docs/issue-workflow` references in shipped examples as optional conventions, or rewrite them to neutral configurable paths.
- [x] 2.4 Add copy instructions for helper scripts used by example templates, especially `.pi-goals/scripts/resolve_issue_docs.py` and `.pi-goals/scripts/render_issue_stack_prompt.py`.
- [x] 2.5 Verify `README.md`, `docs/prompt-template-authoring.md`, and `examples/pi-goals/**` no longer imply that `.ai` is required by `pi-goals`.

## 3. Prepublish Release Gates and Parser Cleanup

- [x] 3.1 Decide whether the optional structure checker is mandatory for release sign-off or advisory/local-only.
- [x] 3.2 Update `AGENTS.md`, `README.md`, and/or package scripts so the optional structure checker's role is explicit and non-contradictory.
- [x] 3.3 Remove pre-publication legacy queue replay support for `STATE_ENTRY_TYPE` in `.pi/extensions/goal/queue-state.ts`, unless a migration requirement is added.
- [x] 3.4 Run `npm run quality:goal`.
- [x] 3.5 Run `npm pack --dry-run` and verify no `.ai` paths appear in the tarball.
- [x] 3.6 Run the package installation smoke test: install the packed tarball into a temporary project, `pi install -l ./node_modules/@atlas.labs/pi-goal`, and run an offline Pi load check.

## 4. OpenSpec Validation

- [x] 4.1 Run `openspec validate harden-production-audit-findings`.
- [x] 4.2 Resolve any proposal/spec/task validation failures before implementation begins.
