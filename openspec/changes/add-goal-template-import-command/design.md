## Context

`pi-goals` currently discovers reusable goal templates only from the current workspace's `.pi-goals/` directory. The package also ships example templates under `examples/pi-goals/`, including optional OpenSpec workflows, but users must manually locate the installed package and copy files into each project before those templates are usable.

The extension command surface already routes `/goal <objective>`, `/goal queue`, `/goal pause/resume/clear`, and project-local template invocation through `.pi/extensions/goal/command.ts`. Template parsing/discovery for runtime templates lives in `.pi/extensions/goal/templates.ts` and intentionally only targets workspace-local `.pi-goals/`.

## Goals / Non-Goals

**Goals:**

- Provide a first-class command for listing bundled example goal templates shipped with the installed package.
- Provide an explicit, safe copy command that imports one bundled template into the current project's `.pi-goals/` directory.
- Preserve the existing model that only project-local `.pi-goals/` templates are runtime-discoverable by `/goal` and agent tools.
- Keep filesystem writes bounded to workspace-root `.pi-goals/` and `.pi-goals/scripts/`.
- Copy helper scripts referenced by imported templates so copied examples work without hidden manual steps.

**Non-Goals:**

- Auto-discover or auto-load templates from package `examples/` at runtime.
- Add OpenSpec-specific runtime behavior or dependencies.
- Support importing arbitrary user-provided paths or remote templates.
- Build a template package manager, update mechanism, or bulk sync flow in the initial version.
- Change goal state, queue state, tool schemas, or template interpolation semantics.

## Decisions

1. **Add a `/goal templates` command namespace**

   Add `templates` as a control subcommand in `command.ts`, with initial forms:

   - `/goal templates list`
   - `/goal templates copy <template-name-or-alias>`
   - `/goal templates copy <template-name-or-alias> --force`

   Alternative considered: add a standalone `/goal-import` command. Rejected because users already think of reusable prompts through `/goal`, and a subcommand keeps the feature discoverable near existing goal-template invocation.

2. **Keep bundled-library discovery separate from runtime template discovery**

   Introduce a small helper module, for example `template-library.ts`, that reads package-shipped examples from `examples/pi-goals/`. Runtime discovery in `templates.ts` remains workspace-root `.pi-goals/` only.

   The bundled library can reuse the same frontmatter parsing semantics by either sharing small parsing helpers or exposing a safe metadata reader from `templates.ts`. It should not make package examples valid runtime templates until they are copied into the project.

   Alternative considered: teach `discoverGoalTemplates()` to also include package examples. Rejected because that would undermine the explicit copy/adapt model and could make examples appear as ready-to-run project workflows unexpectedly.

3. **Resolve package example location relative to extension source**

   The installed package keeps `.pi/extensions/goal/*.ts` and `examples/**/*` in the npm package. The helper should locate the package root relative to the extension module path and then read `examples/pi-goals/`. This works both in this source repository and after package installation.

   Alternative considered: shell out to `npm root -g` or read package manager state. Rejected because Pi extensions can be installed locally or globally, and command behavior should not depend on npm CLI layout.

4. **Copy by canonical template or alias, preserving destination name**

   The copy command resolves a user-supplied name against bundled template canonical names and aliases. If exactly one bundled template matches, it copies to `.pi-goals/<canonical-name>.<ext>` or the corresponding relative path for nested examples. Aliases never determine destination filenames.

   Ambiguous aliases fail with a clear message and no writes.

5. **Preflight all writes before copying**

   The copy operation should compute every file it will write before writing anything:

   - the template file;
   - helper files referenced by `.pi-goals/scripts/...` paths in the template body.

   If any destination exists and `--force` is absent, the command fails before writing any files. If a referenced helper is missing from package examples, the command fails before writing the template.

6. **Use static helper-reference detection**

   Detect helper dependencies by scanning template text for literal `.pi-goals/scripts/<relative-path>` references. Only copy helper files from package `examples/pi-goals/scripts/`, and reject references that normalize outside that directory.

   Alternative considered: execute or resolve inline commands to discover dependencies. Rejected because importing templates must be a read/copy operation and must not run template commands.

## Risks / Trade-offs

- **Risk:** Users expect copied examples to be maintained automatically after package upgrades. → **Mitigation:** Document copy/adapt semantics and that re-running copy with `--force` overwrites local edits.
- **Risk:** Importing a template with helper scripts partially succeeds and leaves a broken project. → **Mitigation:** Preflight conflicts and missing helpers before writing.
- **Risk:** Path traversal through crafted example content. → **Mitigation:** Only resolve against templates discovered under bundled `examples/pi-goals/`; normalize helper paths and require they remain under bundled `scripts/` and project `.pi-goals/scripts/`.
- **Risk:** Command namespace conflicts with a user template named `templates`. → **Mitigation:** Treat `templates` as a control subcommand just like `queue`, `pause`, `resume`, and `clear`; document that such names are reserved at top-level `/goal` invocation.

## Migration Plan

No data migration is required. Existing users can continue manual copy/adapt workflows. After this change, users may run `/goal templates list` and `/goal templates copy <name>` in any project with the extension installed.

## Open Questions

- Should a future follow-up support `/goal templates copy all` or named template bundles? This proposal intentionally scopes to one-template imports.
