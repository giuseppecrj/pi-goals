# prepublish-release-gates Specification

## Purpose
Define the reproducible validation and pre-publication checks required for the pi-goals package.

## Requirements

### Requirement: Quality gate semantics must be explicit

The repository SHALL define `npm run quality:goal` as the required reproducible package validation gate.

#### Scenario: Quality gate runs

- **WHEN** `npm run quality:goal` is executed
- **THEN** the command SHALL run the slop guard, security probe, TypeScript validation, and Pi extension load validation
- **AND** it SHALL NOT depend on optional local-only structure tools

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
