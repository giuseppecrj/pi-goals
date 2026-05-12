## ADDED Requirements

### Requirement: Allowlist mode must not permit command execution bypasses

The template resolver SHALL prevent allowlisted commands from invoking arbitrary external commands through command-specific escape hatches.

#### Scenario: Ripgrep preprocessor is rejected

- **WHEN** a template inline command uses `rg` with a command-executing preprocessor option such as `--pre`
- **THEN** template resolution SHALL reject the command before executing it

#### Scenario: Git alias execution remains rejected

- **WHEN** a template inline command uses `git` options that configure or invoke aliases or external helpers
- **THEN** template resolution SHALL reject the command before executing it

### Requirement: Allowlist command execution must avoid shell evaluation

The template resolver SHALL execute commands in allowlist mode without shell evaluation.

#### Scenario: Allowlisted command runs without shell metacharacter interpretation

- **WHEN** `PI_GOALS_TEMPLATE_COMMANDS=allowlist` and an inline command passes allowlist validation
- **THEN** the command SHALL execute via direct executable/argument invocation rather than `/bin/bash -lc`

### Requirement: Security probes cover allowlist bypasses

The package validation SHALL include deterministic probes for known template command allowlist bypass classes.

#### Scenario: Security hardening probe fails on bypass regression

- **WHEN** a known command-execution bypass such as git alias configuration or ripgrep preprocessing is reintroduced
- **THEN** `npm run security:goal` SHALL fail
