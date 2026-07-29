# Bilingual editorial release workflow prototype

> **THROWAWAY:** This branch exists only to settle the workflow in
> “Prototype the bilingual editorial and release workflow.” It is not production
> Sanity Studio code and must not be merged as-is.

Run the interactive prototype from the repository root:

```sh
node prototypes/bilingual-editorial-release-workflow/cli.mjs
```

## Question

Does a **publication batch** give one owner a safe, understandable way to move
paired English/Croatian changes—including cross-document edits—from Sanity
drafts through validation, localized preview, atomic publication, static
deployment, rollback, and export?

“Publication batch” is deliberately not called a Sanity Content Release. The
selected Sanity Free plan does not include Content Releases. This prototype
tests whether a small Studio action can instead assemble a dependency-complete
set of drafts, validate it, capture a rollback bundle, publish it in one Sanity
transaction, and trigger one application build.

The batch starts with representative failures:

- Croatian copy is behind the English edit;
- localized image/diagram accessibility text is incomplete;
- a changed referenced Skill is outside the batch;
- a résumé/diagram asset check has failed;
- an internal client name violates the publish-safe-content rule;
- neither localized application preview has been reviewed; and
- no pre-publication rollback bundle has been captured.

The state model keeps three revisions separate:

- the draft candidate in Studio;
- the version currently published in Sanity; and
- the version served by the public application.

That distinction is what makes a failed build and a post-deployment rollback
visible instead of pretending “published in Sanity” always means “live.”

## Suggested runs

Use the single-key commands shown in the prototype. These sequences exercise
the main paths:

```text
Successful release:
h a r m p v 1 2 x u d

Failed deployment, then content restore:
h a r m p v 1 2 x u f o d

Successful deployment, then two-phase rollback:
h a r m p v 1 2 x u d b o d
```

For a quick non-interactive state dump:

```sh
node prototypes/bilingual-editorial-release-workflow/cli.mjs --scenario success
node prototypes/bilingual-editorial-release-workflow/cli.mjs --scenario failed-deploy
node prototypes/bilingual-editorial-release-workflow/cli.mjs --scenario post-deploy-rollback
```

