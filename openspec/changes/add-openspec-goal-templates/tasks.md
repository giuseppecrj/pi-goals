## 1. Example Templates

- [x] 1.1 Add `examples/pi-goals/openspec-propose.md` for creating and validating OpenSpec change artifacts through a pi-goal.
- [x] 1.2 Add `examples/pi-goals/openspec-apply-change.md` for implementing a named OpenSpec change through a pi-goal.
- [x] 1.3 Add `examples/pi-goals/openspec-archive-change.md` for archiving a completed OpenSpec change through a pi-goal.

## 2. Documentation

- [x] 2.1 Update `README.md` to describe the optional OpenSpec integration pattern and copy/adapt usage.
- [x] 2.2 Ensure templates clearly state that OpenSpec CLI availability is required only when using those examples.

## 3. Validation

- [x] 3.1 Validate the OpenSpec change with `openspec validate add-openspec-goal-templates --strict`.
- [x] 3.2 Run package quality validation with `npm run quality:goal`.
- [x] 3.3 Inspect package dry-run contents with `npm pack --dry-run`.
