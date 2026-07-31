# Atomic Publication batch operations

This runbook configures the provider boundaries used by the Studio Publication
batch workflow. It does not authorize a production release.

## Private rollback dataset

Create a private dataset in the same Sanity project for rollback bundles and set
`SANITY_STUDIO_ROLLBACK_DATASET` to its name in the Studio deployment. It must
not equal `SANITY_STUDIO_DATASET`.

Grant access only to the owner and the narrowly scoped recovery identity. Do not
make this dataset public and do not expose a read token to the Web application.
The public batch document stores only the bundle ID, capture time, and candidate
revision. The private bundle stores the prior published document values,
explicit absence markers for newly published documents, and referenced Sanity
asset IDs.

## Protected build webhook

Configure one Sanity document webhook on the content dataset:

- Trigger on `create` and `update`.
- Do not include drafts or versions.
- Use API version `v2025-02-19`.
- Store the protected build endpoint credential and webhook signing secret in
  Sanity's webhook configuration, never in Studio environment variables.
- The receiver must verify the webhook signature or authorization header and
  deduplicate both Sanity's `idempotency-key` header and the projected
  `buildRequestId` before it queues a build.

Use this filter:

```groq
_type == "publicationBatch" &&
  defined(coalesce(
    after().workflow.recovery.buildRequestId,
    after().workflow.publication.buildRequestId
  )) &&
  (
    before() == null ||
    coalesce(
      before().workflow.recovery.buildRequestId,
      before().workflow.publication.buildRequestId
    ) != coalesce(
      after().workflow.recovery.buildRequestId,
      after().workflow.publication.buildRequestId
    )
  )
```

Use this projection:

```groq
{
  "batchId": after()._id,
  "buildRequestId": coalesce(
    after().workflow.recovery.buildRequestId,
    after().workflow.publication.buildRequestId
  ),
  "revision": coalesce(
    after().workflow.recovery.previousRevision,
    after().workflow.publication.revision
  )
}
```

The atomic publication transaction creates or updates exactly one published
`publicationBatch` document with a new build request ID. The filter ignores all
content document mutations and deployment-state-only updates. A recovery
transaction changes the separate recovery build request ID on that same batch.
The receiver's idempotency gate converts Sanity's at-least-once delivery into one
queued build for either request.

Immediately before commit, the Studio reloads the private rollback bundle. The
transaction revision-guards every captured published pre-image and every
published document in the validated strong-reference closure. A newly published
document uses a create-only mutation, so an unexpected published version also
aborts the whole transaction.

The transaction uses synchronous visibility so the published documents are
queryable before the Studio reports success. The protected build must still
validate the requested batch revision before promotion. A successful build is
not the same as a live deployment: update `workflow.deployment` to `live` only
after the hosting platform has promoted that exact revision. On failure, record
`buildFailed`; the previous deployment remains live and issue #32 owns the
transactional recovery path.

## Owner sequence

1. Run complete readiness for the saved batch.
2. Open and review the authenticated English Draft Mode application, then
   acknowledge English.
3. Open and review the authenticated Croatian Draft Mode application, then
   acknowledge Croatian.
4. Capture the private rollback bundle.
5. Select **Publish atomically**.
6. Confirm the Studio says **Published in Sanity** while the portfolio remains
   **Protected build pending**.
7. Verify the webhook receiver accepted one idempotent build request. Promotion
   and rollback drills are exercised by issues #39 and #32 respectively.

## Failed candidate recovery

The delivery controller records the exact candidate as `buildFailed`. It then
calls `recoverFailedCandidatePublication` with the published batch, current
affected documents, private bundle, and a deployment-history adapter. The
adapter, rather than an operator-supplied ID, resolves the distinct previous
successful deployment.

1. Do not change hosting: the previous successful deployment is still live.
2. Load every current affected document from the content dataset with the raw
   perspective and `useCdn: false`.
3. Load the exact private bundle referenced by the batch workflow.
4. Run failed-candidate recovery. It revision-guards the batch and every current
   affected document, restores previous documents, deletes documents whose
   pre-image was absent, and writes the recovery build request in one synchronous
   Sanity transaction.
5. Accept the one protected confirming build request. Do not promote a different
   revision.
6. When that build succeeds, record the recovery outcome as `live`. The workflow
   accepts the outcome only when both the confirming `buildRequestId` and built
   revision match the pending recovery. It then reports the previous revision as
   restored in Sanity and live on the portfolio.

If any revision guard fails, the transaction makes no changes. Reload the batch,
current documents, and private bundle and investigate the concurrent mutation
before retrying.

## Post-release rollback

The delivery controller supplies the issue #39 hosting adapter through
`PublicationDeploymentRollbackClient` and calls
`recoverPostReleasePublication`.

1. Validate that the defective candidate is the matching live publication and
   that its exact private bundle is available.
2. Ask the hosting adapter for the previous successful deployment. Reject the
   current candidate or incomplete provider evidence.
3. Reactivate that exact deployment. The coordinator requires the adapter to
   return the same deployment ID and revision, and aborts without a Sanity
   transaction if reactivation fails or returns different evidence.
4. Only after successful reactivation, restore Sanity through the same
   revision-guarded transaction used for failed candidates.
5. Accept the one confirming build request. The previous deployment remains live
   while it runs.
6. Record a successful recovery build only when its request ID and built Sanity
   revision match the pending recovery and already-reactivated deployment.

This ordering permits a temporary state where the safe previous application is
live while Sanity still contains the defective candidate. It forbids the more
dangerous inverse ordering.

## Automated off-platform export

The `Encrypted Sanity export` GitHub workflow runs weekly and can be dispatched
manually. Configure:

- repository variables `SANITY_EXPORT_PROJECT_ID` and
  `SANITY_EXPORT_DATASET`;
- secret `SANITY_EXPORT_TOKEN`, scoped only to read the export dataset;
- secret `SANITY_ROLLBACK_DATASET`, used as a deny-list guard;
- secret `SANITY_EXPORT_ENCRYPTION_PASSPHRASE`, stored separately from
  downloaded backup artifacts.

The full Sanity CLI export uses stream mode and leaves both `--no-drafts` and
`--no-assets` unset. The private rollback dataset is a separate source and is
rejected explicitly. After export, the command inspects `data.ndjson`, records
document and draft counts, verifies that every rewritten asset reference has a
matching archive file, and rejects Sanity warnings about inaccessible assets.
The archive and evidence are bundled, encrypted with GPG AES-256, and only the
encrypted file is uploaded. Plaintext files exist only in the ephemeral runner
directory and are removed before upload.

Treat a missing asset, failed strict asset verification, failed encryption, or
missing artifact as a failed backup. Do not weaken the export with
`--no-strict-asset-verification`.

## Dated non-production restore drill

Download an encrypted artifact to an access-controlled workstation, decrypt it
without putting the passphrase on the command line, and extract the archive plus
its `.export.json` evidence. Set a token for the dedicated recovery-test project
in `SANITY_IMPORT_TOKEN`.

First inspect the immutable plan with `npm run content:restore -- ... --dry-run`.
The command verifies the archive SHA-256, re-inspects document, draft, and asset
counts against the export evidence, and refuses the production project ID. Then
remove `--dry-run` and import with replacement into a newly created private,
dated dataset such as `restore-2026-07-31`.

After import:

1. Compare published and `drafts.` document counts with the export source.
2. Query every restored image and file asset document and fetch a sample of each
   asset kind.
3. Build the Web application against the recovery-test project and dated
   dataset.
4. Record the `.restore.json` evidence path, GitHub export run, operator, count
   comparison, asset checks, and build result in the private operational log.
5. Delete the dated dataset only after the evidence has been reviewed and the
   next drill date has been scheduled.

Never use the rollback dataset as an export source or restore target. Never
commit decrypted archives, tokens, passphrases, or private restore evidence.
