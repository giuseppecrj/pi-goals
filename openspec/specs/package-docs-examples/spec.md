# package-docs-examples Specification

## Purpose
TBD - created by archiving change harden-production-audit-findings. Update Purpose after archive.
## Requirements
### Requirement: Runtime template documentation must name only supported discovery locations

The package documentation SHALL describe workspace-root `.pi-goals/` as the supported runtime reusable goal template location.

#### Scenario: User reads README template location

- **WHEN** a user reads the reusable goal templates section in `README.md`
- **THEN** the documented runtime discovery location SHALL be `.pi-goals/`
- **AND** the documentation SHALL NOT imply that `.ai/.pi-goals/` is required or supported by the current pre-publication package

### Requirement: Shipped examples must be framed as examples, not runtime requirements

The package SHALL present `examples/pi-goals/` content as copy/adapt examples and not as automatically discovered runtime templates.

#### Scenario: User copies an example template

- **WHEN** a user wants to use a template from `examples/pi-goals/`
- **THEN** documentation SHALL tell the user to copy/adapt it into their workspace-root `.pi-goals/` directory

### Requirement: Example helper script dependencies must be explicit

Any example template that invokes helper scripts SHALL state which helper files must be copied and where they must be placed.

#### Scenario: Example template uses `.pi-goals/scripts/resolve_issue_docs.py`

- **WHEN** an example template contains an inline command that calls `.pi-goals/scripts/resolve_issue_docs.py`
- **THEN** the template or adjacent documentation SHALL state that `examples/pi-goals/scripts/resolve_issue_docs.py` must be copied to `.pi-goals/scripts/resolve_issue_docs.py`

### Requirement: Optional issue workflow conventions must be labelled optional

Examples that use `.ai/issues` or `.ai/docs/issue-workflow` SHALL label those paths as optional user workflow conventions, not `pi-goals` package requirements.

#### Scenario: User reads an issue workflow example

- **WHEN** a shipped example references `.ai/issues` or `.ai/docs/issue-workflow`
- **THEN** the example SHALL explain that those paths are an optional convention and may be adapted to the user's own issue/documentation paths

### Requirement: Shipped package must not include `.ai`

The npm package SHALL NOT include `.ai` files or directories.

#### Scenario: Package dry run is inspected

- **WHEN** `npm pack --dry-run` is executed
- **THEN** the tarball contents SHALL contain no `.ai/` paths

