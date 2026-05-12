## ADDED Requirements

### Requirement: Quality gate semantics must be explicit

The repository SHALL clearly distinguish reproducible package validation from optional local structure checks.

#### Scenario: the optional structure checker is unavailable

- **WHEN** `structure-checker` is not installed and `npm run quality:goal` is executed
- **THEN** deterministic package validation SHALL still run
- **AND** documentation SHALL state whether skipped the optional structure checker checks block publication or are advisory

#### Scenario: Release sign-off requires the optional structure checker

- **WHEN** maintainers decide the optional structure checker is mandatory for publication
- **THEN** release documentation SHALL include the exact the optional structure checker install/run prerequisite or CI step

### Requirement: Pre-publication parser surface must exclude unneeded legacy compatibility

Before first publication, the queue replay parser SHALL accept only the current queue state entry type unless a migration requirement is explicitly documented.

#### Scenario: Legacy queue event is present before publication

- **WHEN** a historical queue event uses the old goal state entry type
- **THEN** current queue replay SHALL ignore it unless a migration spec explicitly requires support

### Requirement: Release validation must include package installation smoke test

Pre-publication validation SHALL verify that the packed package can be installed and loaded by Pi from an installed package directory.

#### Scenario: Smoke test installs packed package

- **WHEN** a tarball produced by `npm pack` is installed into a fresh temporary project
- **THEN** `pi install -l ./node_modules/@atlas.labs/pi-goal` SHALL succeed
- **AND** a Pi offline load check SHALL complete without extension load errors
