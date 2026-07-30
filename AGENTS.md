## Agent skills

### GitHub tooling

Do not use GitHub app or connector tools. Use the local `gh` CLI for all GitHub operations and the local `git` CLI for repository operations.

### Issue tracker

Issues and PRDs are tracked in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Branch naming

When an agent creates a branch, use a flat, descriptive kebab-case name that does not contain `/`. Do not add namespaces or prefixes such as `codex/`, `issue/`, `feature/`, or a username.

Only create a slash-containing branch when the user or GitHub issue explicitly requires that exact branch name.

This rule applies to branch creation. Do not rename or delete an existing slash-containing branch solely to enforce it. An agent may work on an existing slash-containing branch when explicitly directed to use it.

### Issue implementation branches

Before implementing a GitHub issue, create and switch to a dedicated branch from `main`, unless the issue specifies another base branch.

Name the branch `<issue-number>-<short-kebab-case-title>`, for example `42-add-contact-form`.

If the correctly named branch already exists, reuse it instead of creating a suffixed duplicate. If unrelated uncommitted changes prevent switching safely, stop and report the conflict before implementation.

### Pull requests for issue implementations

After completing and verifying a GitHub issue implementation, push the committed issue branch and open a draft pull request against the issue's base branch.

### Triage labels

The default Matt Pocock triage-label vocabulary is used. See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses a single-context domain-doc layout. See `docs/agents/domain.md`.
