## ADDED Requirements

### Requirement: Bundled template library must be listable from the goal command

The extension SHALL provide a `/goal templates list` command that lists package-shipped example goal templates available for explicit import into the current project.

#### Scenario: User lists bundled templates

- **WHEN** a user runs `/goal templates list`
- **THEN** the command SHALL list templates from the installed package's `examples/pi-goals/` directory
- **AND** each listed template SHALL include its canonical template name
- **AND** each listed template SHALL include available aliases and description when present
- **AND** the command SHALL NOT include templates from the current project's `.pi-goals/` directory as bundled templates

#### Scenario: Bundled examples are absent

- **WHEN** a user runs `/goal templates list` and the installed package has no readable bundled template directory
- **THEN** the command SHALL report that no bundled templates are available
- **AND** it SHALL NOT create a `.pi-goals/` directory

### Requirement: Bundled template import must copy an explicitly selected template

The extension SHALL provide a `/goal templates copy <template-name-or-alias>` command that copies exactly one bundled example template into workspace-root `.pi-goals/`.

#### Scenario: User copies a bundled template by name

- **WHEN** a user runs `/goal templates copy openspec-propose`
- **THEN** the command SHALL resolve `openspec-propose` against bundled example template names
- **AND** it SHALL create `.pi-goals/` if needed
- **AND** it SHALL copy the bundled template file to `.pi-goals/openspec-propose.md`
- **AND** it SHALL report the copied file path
- **AND** it SHALL show a usable next `/goal` invocation for the copied template

#### Scenario: User copies a bundled template by alias

- **WHEN** a user runs `/goal templates copy openspec-apply`
- **THEN** the command SHALL resolve `openspec-apply` against bundled example template aliases
- **AND** it SHALL copy the canonical bundled template to `.pi-goals/openspec-apply-change.md`

#### Scenario: Requested bundled template is unknown

- **WHEN** a user runs `/goal templates copy does-not-exist`
- **THEN** the command SHALL fail with a clear unknown-template message
- **AND** it SHALL NOT create or modify project template files

#### Scenario: Requested bundled template alias is ambiguous

- **WHEN** a user runs `/goal templates copy <alias>` and more than one bundled template matches that alias or name
- **THEN** the command SHALL fail with a clear ambiguity message listing matching canonical names
- **AND** it SHALL NOT create or modify project template files

### Requirement: Bundled template import must protect existing project files

The copy command SHALL refuse to overwrite existing project template or helper files unless the user explicitly passes `--force`.

#### Scenario: Destination template already exists without force

- **WHEN** `.pi-goals/openspec-propose.md` already exists
- **AND** a user runs `/goal templates copy openspec-propose`
- **THEN** the command SHALL fail with an overwrite warning
- **AND** it SHALL leave the existing file unchanged

#### Scenario: Destination template already exists with force

- **WHEN** `.pi-goals/openspec-propose.md` already exists
- **AND** a user runs `/goal templates copy openspec-propose --force`
- **THEN** the command SHALL overwrite `.pi-goals/openspec-propose.md` with the bundled template content
- **AND** it SHALL report that the file was overwritten

### Requirement: Bundled helper scripts must be copied with dependent templates

When a bundled template references helper scripts using literal `.pi-goals/scripts/...` paths, the copy command SHALL copy the matching bundled helper files from `examples/pi-goals/scripts/` into project `.pi-goals/scripts/`.

#### Scenario: Template references a bundled helper script

- **WHEN** a bundled template contains a reference to `.pi-goals/scripts/resolve_issue_docs.py`
- **AND** a user copies that template
- **THEN** the command SHALL also copy `examples/pi-goals/scripts/resolve_issue_docs.py` to `.pi-goals/scripts/resolve_issue_docs.py`
- **AND** it SHALL report the helper script path in the copy result

#### Scenario: Helper destination exists without force

- **WHEN** `.pi-goals/scripts/resolve_issue_docs.py` already exists
- **AND** a user copies a bundled template that depends on that helper without `--force`
- **THEN** the command SHALL fail before copying the template
- **AND** it SHALL leave both the existing helper and template destination unchanged

#### Scenario: Referenced bundled helper is missing

- **WHEN** a bundled template references `.pi-goals/scripts/missing.py`
- **AND** the installed package does not contain `examples/pi-goals/scripts/missing.py`
- **THEN** the copy command SHALL fail before copying the template
- **AND** it SHALL report the missing bundled helper

### Requirement: Bundled template import must not execute template commands

Listing or copying bundled templates SHALL read and copy files only, without resolving template placeholders or executing inline template shell commands.

#### Scenario: Imported template contains inline command syntax

- **WHEN** a bundled template contains an inline ``!`command` `` snippet
- **AND** a user runs `/goal templates copy <template>`
- **THEN** the command SHALL copy the template text without executing the inline command
- **AND** the existing `PI_GOALS_TEMPLATE_COMMANDS` policy SHALL only apply later when the copied template is resolved as a goal template
