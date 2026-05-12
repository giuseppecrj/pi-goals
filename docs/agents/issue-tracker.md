# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for issue operations.

This is a solo-dev intake/backlog queue, not a replacement for OpenSpec. GitHub Issues answer "what work exists and what is ready for an agent?" OpenSpec answers "what exact change are we making, why, and how do we prove it is complete?"

## Solo-dev GitHub + OpenSpec flow

1. **Intake in GitHub Issues**
   - Capture bugs, ideas, PRDs, and small tasks as GitHub issues.
   - Use triage labels from `docs/agents/triage-labels.md` to mark state.
   - `ready-for-agent` means an agent can pick the issue up without extra human context.

2. **Decide whether OpenSpec is needed**
   - Trivial fixes, docs edits, or mechanical chores may be implemented directly from the issue.
   - Behavior changes, public API changes, architecture changes, or risky multi-file changes should create an OpenSpec change under `openspec/changes/<change-name>/`.

3. **Link issue and OpenSpec change**
   - When an OpenSpec change exists, include the GitHub issue reference in `proposal.md`, e.g. `Related issue: #123`.
   - From that point, OpenSpec artifacts are the source of truth for scope, design, specs, and tasks.

4. **Implement and report back**
   - Follow the issue directly for trivial work, or follow OpenSpec `tasks.md` for non-trivial work.
   - Run the repo quality gate before closing work.
   - Comment a concise summary and validation result on the GitHub issue.
   - Close the issue when the implementation is complete and validated.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, fetching labels as needed.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## When a skill says "publish to the issue tracker"

Create a GitHub issue unless the user explicitly asks for an OpenSpec change instead.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## When a skill starts implementation from an issue

- Read the issue body, comments, and labels.
- If the issue is underspecified, ask for clarification or mark it `needs-info`.
- If the issue is non-trivial, propose or create an OpenSpec change before implementation.
- If implementing directly, keep the issue as the source of task context and report validation back to it.
