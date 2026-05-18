## Why

Users can only use bundled `pi-goals` example templates after manually finding the installed package path and copying files into the current project's `.pi-goals/` directory. A first-class import command makes reusable examples discoverable and safely copyable while preserving the current explicit opt-in model.

## What Changes

- Add a `/goal templates` control command namespace for bundled template-library operations.
- Add `/goal templates list` to show bundled `examples/pi-goals/*.md` templates shipped with the installed package, including aliases/descriptions and whether the template is already present in the current project.
- Add `/goal templates copy <template-name-or-alias> [--force]` to copy one bundled template into workspace-root `.pi-goals/`.
- When a copied template references bundled helper scripts under `.pi-goals/scripts/...`, copy the matching helper files from `examples/pi-goals/scripts/` into project `.pi-goals/scripts/` as part of the same import.
- Refuse to overwrite existing project templates or helper scripts unless `--force` is provided.
- Document the import command as the supported alternative to manual copy/adapt.

## Capabilities

### New Capabilities

- `bundled-template-imports`: Supports listing and explicitly copying package-shipped example goal templates into the current project's `.pi-goals/` directory.

### Modified Capabilities

- `package-docs-examples`: Documents the new import command while preserving that bundled examples are not auto-discovered runtime templates.

## Impact

- Affected extension code: `.pi/extensions/goal/command.ts` plus a new or existing template-library helper module under `.pi/extensions/goal/`.
- Affected docs/examples: `README.md`, possibly `docs/prompt-template-authoring.md`.
- Affected package behavior: new `/goal templates` subcommands write files into the user's current project only after explicit command invocation.
- No new runtime dependencies, state schema changes, tool schema changes, or automatic template discovery outside workspace-root `.pi-goals/`.
