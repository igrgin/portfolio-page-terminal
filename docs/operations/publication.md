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
  defined(after().workflow.publication.buildRequestId) &&
  (
    before() == null ||
    before().workflow.publication.buildRequestId !=
      after().workflow.publication.buildRequestId
  )
```

Use this projection:

```groq
{
  "batchId": after()._id,
  "buildRequestId": after().workflow.publication.buildRequestId,
  "revision": after().workflow.publication.revision
}
```

The atomic publication transaction creates or updates exactly one published
`publicationBatch` document with a new build request ID. The filter ignores all
content document mutations and later deployment-state updates. The receiver's
idempotency gate converts Sanity's at-least-once delivery into one queued build
for that request.

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
