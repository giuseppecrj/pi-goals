## 1. Bundled Template Library

- [x] 1.1 Add a bounded helper module for discovering package-shipped templates under `examples/pi-goals/` without changing runtime `.pi-goals/` discovery.
- [x] 1.2 Parse bundled template metadata using the same name, alias, description, and extension conventions as runtime goal templates.
- [x] 1.3 Implement safe template-name-or-alias resolution with clear unknown and ambiguous match errors.
- [x] 1.4 Implement helper script dependency detection for literal `.pi-goals/scripts/...` references, with path traversal protection.

## 2. Copy Operation

- [x] 2.1 Implement copy planning that includes the selected template and any referenced bundled helper scripts.
- [x] 2.2 Preflight all destination conflicts and missing helper sources before writing any files.
- [x] 2.3 Copy files into workspace-root `.pi-goals/` and `.pi-goals/scripts/`, creating directories as needed.
- [x] 2.4 Support `--force` for explicit overwrite and report copied versus overwritten files.

## 3. Command Integration

- [x] 3.1 Add `templates` to `/goal` control subcommands and autocomplete where appropriate.
- [x] 3.2 Implement `/goal templates list` output with canonical names, aliases, descriptions, and project-installed status.
- [x] 3.3 Implement `/goal templates copy <template-name-or-alias> [--force]` output with copied paths and next `/goal` invocation guidance.
- [x] 3.4 Ensure `/goal templates` errors are clear and do not fall through to ordinary goal creation.

## 4. Documentation

- [x] 4.1 Update `README.md` reusable template documentation with `/goal templates list` and `/goal templates copy` usage.
- [x] 4.2 Update OpenSpec-template documentation to mention import as the preferred convenience path while preserving manual copy/adapt guidance.
- [x] 4.3 Update prompt-template authoring guidance if needed to distinguish bundled imports from runtime `.pi-goals/` discovery.

## 5. Validation

- [x] 5.1 Add deterministic validation coverage for bundled-template listing/copy behavior, overwrite protection, helper copying, and no inline-command execution during import.
- [x] 5.2 Run `openspec validate add-goal-template-import-command --strict`.
- [x] 5.3 Run `npm run quality:goal`.
