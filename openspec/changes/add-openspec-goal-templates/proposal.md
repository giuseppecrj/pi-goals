## Why

`pi-goals` can orchestrate long-running agent execution, while OpenSpec defines change intent, acceptance criteria, and lifecycle state. Providing OpenSpec-focused goal templates gives users a concrete, copy/adapt path to combine both without coupling the core package to the OpenSpec CLI.

## What Changes

- Add example reusable goal templates for OpenSpec propose, apply, and archive workflows under `examples/pi-goals/`.
- Document how users copy those templates into workspace-root `.pi-goals/` and invoke them with `/goal`.
- Keep OpenSpec integration optional and example-driven; no runtime dependency or hardwired OpenSpec behavior is added to the core extension.
- Ensure templates make OpenSpec artifacts the source of truth and use pi-goal completion discipline for validation, task tracking, and archive readiness.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `package-docs-examples`: Documented and shipped examples now include optional OpenSpec workflow templates that must remain copy/adapt examples, not runtime dependencies.

## Impact

- Affected docs/examples: `README.md`, `examples/pi-goals/`.
- Affected package contents: npm package includes the new example templates through existing `files` configuration.
- No runtime API, state schema, dependency, or Pi extension behavior changes.
