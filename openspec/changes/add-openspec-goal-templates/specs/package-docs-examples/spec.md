## ADDED Requirements

### Requirement: OpenSpec workflow examples must remain optional and source-of-truth aligned

The package SHALL include optional example goal templates that demonstrate how to use pi-goals with OpenSpec while preserving OpenSpec artifacts as the source of truth for change scope, tasks, validation, and archive state.

#### Scenario: User wants to use OpenSpec goal templates

- **WHEN** a user reads the OpenSpec integration documentation or an OpenSpec example template
- **THEN** the package SHALL instruct the user to copy/adapt the example template into workspace-root `.pi-goals/`
- **AND** the documentation SHALL NOT imply that OpenSpec is a required runtime dependency of the core pi-goals extension

#### Scenario: Agent executes an OpenSpec apply template

- **WHEN** an OpenSpec apply goal template is used for a change
- **THEN** the template SHALL require the agent to read the change artifacts before implementation
- **AND** it SHALL require OpenSpec validation and relevant project validation before goal completion

#### Scenario: Agent executes an OpenSpec archive template

- **WHEN** an OpenSpec archive goal template is used for a change
- **THEN** the template SHALL require verification that tasks are complete before archiving
- **AND** it SHALL require post-archive spec validation before goal completion
