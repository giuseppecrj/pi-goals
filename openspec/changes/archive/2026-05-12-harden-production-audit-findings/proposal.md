## Why

The production audit found one critical template-command allowlist bypass and several medium/low packaging and documentation inconsistencies introduced while preparing `pi-goals` as a Pi package. These findings should be resolved before publication so the package's security posture, examples, and release gates match the documented production story.

## What Changes

- Harden inline template command allowlist behavior so allowlisted tools cannot execute arbitrary commands through tool-specific escape hatches.
- Clarify and repair shipped documentation/examples after removing `.ai` as a runtime/package requirement.
- Make example templates self-contained enough to copy/adapt, or label script/path dependencies explicitly.
- Decide and document whether the optional structure checker is mandatory for release sign-off or optional local structure checking.
- Remove pre-publication legacy queue replay compatibility that is no longer needed before the first release.

## Audit Findings Covered

1. **Critical — `rg` allowlist command execution bypass**
   - Evidence: `.pi/extensions/goal/templates.ts:255-260`, `.pi/extensions/goal/templates.ts:311-317`
   - Current allowlist validates command name only for `rg`; ripgrep supports command-executing preprocessor options such as `--pre`.
2. **Medium — dead shipped docs path after `.ai` deletion**
   - Evidence: `docs/prompt-template-authoring.md:45`
   - The guide references `.ai/docs/pi-goals-live-probe-testing.md`, which no longer exists.
3. **Medium — examples still imply `.ai` issue workflow conventions**
   - Evidence: `docs/prompt-template-authoring.md:97`, `examples/pi-goals/create-issue-doc.md:32-89`, `examples/pi-goals/implementation-ready-issue.md:22-61`
   - Shipped examples still assume `.ai/issues` and `.ai/docs/issue-workflow` despite `.ai` being removed as a package requirement.
4. **Medium — copied examples have implicit helper-script dependencies**
   - Evidence: `examples/pi-goals/implementation-ready-issue.md:22`, `docs/prompt-template-authoring.md:186-199`
   - Templates call `.pi-goals/scripts/...`, while helpers ship under `examples/pi-goals/scripts/...`.
5. **Low — the optional structure checker release-gate ambiguity**
   - Evidence: `package.json:19-20`, `AGENTS.md:18-30`
   - Scripts skip the optional structure checker when missing while guidance still describes it as a quality-gate component.
6. **Low — legacy queue replay parser surface remains pre-publication**
   - Evidence: `.pi/extensions/goal/queue-state.ts:132`
   - Queue replay still accepts old queue events from `STATE_ENTRY_TYPE` even though backward compatibility is not required before publication.

## Capabilities

### New Capabilities

- `template-command-security`: Secure inline template command execution policy, including safe allowlist behavior and regression probes.
- `package-docs-examples`: Production-ready package documentation and examples that do not require `.ai` and clearly state any optional conventions or copy requirements.
- `prepublish-release-gates`: Reproducible pre-publication validation and cleanup requirements, including the optional structure checker positioning and removal of unneeded legacy parser compatibility.

### Modified Capabilities

None; no archived base specs exist yet.

## Impact

- Affected source: `.pi/extensions/goal/templates.ts`, `.pi/extensions/goal/queue-state.ts`.
- Affected validation: `scripts/validation/security-hardening-probe.mjs`, `npm run quality:goal`, `npm pack --dry-run`.
- Affected docs/examples: `README.md`, `AGENTS.md`, `docs/prompt-template-authoring.md`, `examples/pi-goals/**`.
- No new runtime dependencies are expected.
