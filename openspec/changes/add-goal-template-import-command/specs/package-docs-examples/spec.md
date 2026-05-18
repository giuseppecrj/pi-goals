## ADDED Requirements

### Requirement: Documentation must describe explicit bundled template import

The package documentation SHALL describe the `/goal templates` commands as an explicit way to copy bundled example goal templates into workspace-root `.pi-goals/`.

#### Scenario: User reads reusable template documentation

- **WHEN** a user reads package documentation about bundled `examples/pi-goals/` templates
- **THEN** the documentation SHALL explain that examples are not automatically discovered as runtime templates
- **AND** it SHALL document `/goal templates list` for viewing importable bundled templates
- **AND** it SHALL document `/goal templates copy <template-name-or-alias>` for copying one bundled template into the current project's `.pi-goals/` directory
- **AND** it SHALL mention `--force` overwrites existing project files

#### Scenario: Example requires helper scripts

- **WHEN** documentation describes importing a bundled template that references `.pi-goals/scripts/...`
- **THEN** it SHALL explain that the import command copies matching bundled helper scripts along with the template
- **AND** it SHALL still allow manual copy/adapt workflows for users who want to customize paths before use
