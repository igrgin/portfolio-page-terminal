import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  acknowledgePublicationPreview,
  beginFailedCandidateRecovery,
  beginPostReleaseRollback,
  capturePublicationRollback,
  confirmPreviousDeploymentReactivated,
  publicationWorkflowReadiness,
  publicationWorkflowVisibility,
  publishPublicationWorkflow,
  recordPublicationBuildOutcome,
  recordPublicationContentRestored,
  recordPublicationRecoveryBuildOutcome,
  invalidatePublicationWorkflow,
  validatePublicationBatch,
  validatedPublicationWorkflow,
  type PublicationBatchCandidate,
} from "../packages/content/src";
import {
  capturePublicationRollbackBundle,
  publicationWorkflowFromValue,
  publishAtomicPublicationBatch,
  publicationBuildWebhook,
  recoverPostReleasePublication,
  restorePublicationRollbackBundle,
  serializePublicationWorkflow,
  type AtomicPublicationTransaction,
  type PublicationRollbackBundle,
} from "../apps/studio/publication-release";
import {
  publicationRevisionWatchIds,
  publicationWorkflowRequiresRevalidation,
} from "../apps/studio/components/publication-readiness";
import { PublicationWorkflowSummary } from "../apps/studio/components/publication-workflow-controls";

const revision = "a".repeat(64);
const editedRevision = "b".repeat(64);
const previousRevision = "c".repeat(64);

test("English and Croatian preview acknowledgements are revision-bound and every edit clears both", () => {
  const validated = validatedPublicationWorkflow(revision);
  const englishReviewed = acknowledgePublicationPreview(
    validated,
    "en",
    revision,
    "2026-07-30T12:00:00.000Z",
  );
  const bothReviewed = acknowledgePublicationPreview(
    englishReviewed,
    "hr",
    revision,
    "2026-07-30T12:05:00.000Z",
  );

  assert.deepEqual(bothReviewed.acknowledgements, {
    en: {
      acknowledgedAt: "2026-07-30T12:00:00.000Z",
      revision,
    },
    hr: {
      acknowledgedAt: "2026-07-30T12:05:00.000Z",
      revision,
    },
  });

  const edited = invalidatePublicationWorkflow(bothReviewed, editedRevision);

  assert.equal(edited.validationRevision, null);
  assert.deepEqual(edited.acknowledgements, {});
  assert.equal(edited.rollback, null);
});

test("rollback evidence is accepted only for the exact revision after both localized previews", () => {
  const englishReviewed = acknowledgePublicationPreview(
    validatedPublicationWorkflow(revision),
    "en",
    revision,
    "2026-07-30T12:00:00.000Z",
  );

  assert.throws(
    () =>
      capturePublicationRollback(englishReviewed, {
        bundleId: "rollback.private.batch-31",
        capturedAt: "2026-07-30T12:10:00.000Z",
        revision,
      }),
    /both English and Croatian previews/,
  );

  const bothReviewed = acknowledgePublicationPreview(
    englishReviewed,
    "hr",
    revision,
    "2026-07-30T12:05:00.000Z",
  );
  const rollbackCaptured = capturePublicationRollback(bothReviewed, {
    bundleId: "rollback.private.batch-31",
    capturedAt: "2026-07-30T12:10:00.000Z",
    revision,
  });

  assert.equal(
    publicationWorkflowReadiness(rollbackCaptured, revision).readyToPublish,
    true,
  );
  assert.equal(
    publicationWorkflowReadiness(rollbackCaptured, editedRevision)
      .readyToPublish,
    false,
  );
});

test("published in Sanity remains visibly distinct from live on the portfolio", () => {
  const englishReviewed = acknowledgePublicationPreview(
    validatedPublicationWorkflow(revision),
    "en",
    revision,
    "2026-07-30T12:00:00.000Z",
  );
  const bothReviewed = acknowledgePublicationPreview(
    englishReviewed,
    "hr",
    revision,
    "2026-07-30T12:05:00.000Z",
  );
  const ready = capturePublicationRollback(bothReviewed, {
    bundleId: "rollback.private.batch-31",
    capturedAt: "2026-07-30T12:10:00.000Z",
    revision,
  });
  const published = publishPublicationWorkflow(ready, {
    buildRequestId: `publication-batch-31:${revision}`,
    publishedAt: "2026-07-30T12:15:00.000Z",
    revision,
  });

  assert.deepEqual(publicationWorkflowVisibility(published, revision), {
    portfolio: "buildPending",
    sanity: "published",
  });
  const pendingMarkup = renderToStaticMarkup(
    React.createElement(PublicationWorkflowSummary, {
      revision,
      workflow: published,
    }),
  );
  assert.match(pendingMarkup, /Published in Sanity/);
  assert.match(pendingMarkup, /Published/);
  assert.match(pendingMarkup, /Live on the portfolio/);
  assert.match(pendingMarkup, /Protected build pending/);

  const live = recordPublicationBuildOutcome(
    published,
    revision,
    "live",
    "2026-07-30T12:20:00.000Z",
  );
  assert.deepEqual(publicationWorkflowVisibility(live, revision), {
    portfolio: "live",
    sanity: "published",
  });
  assert.match(
    renderToStaticMarkup(
      React.createElement(PublicationWorkflowSummary, {
        revision,
        workflow: live,
      }),
    ),
    /<dd>Live<\/dd>/,
  );
});

test("failed candidates restore content before a confirming build while the previous deployment stays protected", () => {
  const ready = capturePublicationRollback(
    acknowledgePublicationPreview(
      acknowledgePublicationPreview(
        validatedPublicationWorkflow(revision),
        "en",
        revision,
        "2026-07-31T08:00:00.000Z",
      ),
      "hr",
      revision,
      "2026-07-31T08:05:00.000Z",
    ),
    {
      bundleId: "publicationRollbackBundle.publicationBatch.july",
      capturedAt: "2026-07-31T08:10:00.000Z",
      revision,
    },
  );
  const published = publishPublicationWorkflow(ready, {
    buildRequestId: `publication-batch-32:${revision}`,
    publishedAt: "2026-07-31T08:15:00.000Z",
    revision,
  });
  const failed = recordPublicationBuildOutcome(
    published,
    revision,
    "buildFailed",
    "2026-07-31T08:20:00.000Z",
  );

  const recovering = beginFailedCandidateRecovery(failed, {
    previousDeploymentId: "deployment-content-r7",
    previousRevision,
    startedAt: "2026-07-31T08:21:00.000Z",
  });

  assert.equal(recovering.recovery?.status, "contentRestoreRequired");
  assert.equal(recovering.deployment?.status, "buildFailed");

  const restored = recordPublicationContentRestored(recovering, {
    buildRequestId: `recovery-publication-batch-32:${revision}`,
    restoredAt: "2026-07-31T08:22:00.000Z",
  });
  assert.equal(restored.recovery?.status, "confirmingBuildPending");
  assert.equal(restored.deployment?.status, "buildFailed");

  const aligned = recordPublicationRecoveryBuildOutcome(
    restored,
    "live",
    "2026-07-31T08:30:00.000Z",
  );
  assert.equal(aligned.recovery?.status, "complete");
  assert.deepEqual(aligned.deployment, {
    revision: previousRevision,
    status: "live",
    updatedAt: "2026-07-31T08:30:00.000Z",
  });
  assert.deepEqual(
    publicationWorkflowVisibility(aligned, previousRevision),
    {
      portfolio: "live",
      sanity: "restored",
    },
  );
});

test("post-release rollback cannot restore Sanity before the previous deployment is reactivated", () => {
  const live = {
    ...validatedPublicationWorkflow(revision),
    deployment: {
      revision,
      status: "live" as const,
      updatedAt: "2026-07-31T09:00:00.000Z",
    },
    publication: {
      buildRequestId: `publication-batch-32:${revision}`,
      publishedAt: "2026-07-31T08:45:00.000Z",
      revision,
    },
    rollback: {
      bundleId: "publicationRollbackBundle.publicationBatch.july",
      capturedAt: "2026-07-31T08:40:00.000Z",
      revision,
    },
  };
  const recovery = beginPostReleaseRollback(live, {
    previousDeploymentId: "deployment-content-r7",
    previousRevision,
    startedAt: "2026-07-31T09:05:00.000Z",
  });

  assert.equal(recovery.recovery?.status, "deploymentReactivationRequired");
  assert.throws(
    () =>
      recordPublicationContentRestored(recovery, {
        buildRequestId: `recovery-publication-batch-32:${revision}`,
        restoredAt: "2026-07-31T09:06:00.000Z",
      }),
    /reactivate the previous successful deployment/i,
  );

  const reactivated = confirmPreviousDeploymentReactivated(
    recovery,
    "2026-07-31T09:07:00.000Z",
  );
  assert.equal(reactivated.recovery?.status, "contentRestoreRequired");
  assert.deepEqual(reactivated.deployment, {
    revision: previousRevision,
    status: "live",
    updatedAt: "2026-07-31T09:07:00.000Z",
  });
});

test("recovery progress survives the Studio workflow serialization boundary", () => {
  const recovering = beginPostReleaseRollback(
    {
      ...validatedPublicationWorkflow(revision),
      deployment: {
        revision,
        status: "live",
        updatedAt: "2026-07-31T09:00:00.000Z",
      },
      publication: {
        buildRequestId: `publication-batch-32:${revision}`,
        publishedAt: "2026-07-31T08:45:00.000Z",
        revision,
      },
      rollback: {
        bundleId: "publicationRollbackBundle.publicationBatch.july",
        capturedAt: "2026-07-31T08:40:00.000Z",
        revision,
      },
    },
    {
      previousDeploymentId: "deployment-content-r7",
      previousRevision,
      startedAt: "2026-07-31T09:05:00.000Z",
    },
  );
  const reactivated = confirmPreviousDeploymentReactivated(
    recovering,
    "2026-07-31T09:07:00.000Z",
  );

  assert.deepEqual(
    publicationWorkflowFromValue(serializePublicationWorkflow(reactivated)),
    reactivated,
  );
});

test("rollback capture stores current published versions and asset references only in a private dataset", async () => {
  const stored: PublicationRollbackBundle[] = [];
  const contentClient = {
    fetch: async () => [
      {
        _id: "project.platform",
        _rev: "published-r7",
        _type: "project",
        heroMedia: {
          image: {
            asset: {
              _ref: "image-hero-1200x800-jpg",
              _type: "reference",
            },
          },
        },
        resume: {
          asset: {
            _ref: "file-resume-en-pdf",
            _type: "reference",
          },
        },
      },
    ],
  };
  const rollbackClient = {
    createIfNotExists: async (bundle: PublicationRollbackBundle) => {
      stored.push(bundle);
      return bundle;
    },
  };

  const evidence = await capturePublicationRollbackBundle(
    contentClient,
    rollbackClient,
    {
      batchId: "publicationBatch.july",
      capturedAt: "2026-07-30T12:10:00.000Z",
      contentDataset: "production",
      documentIds: ["project.platform", "skill.new"],
      revision,
      rollbackDataset: "publication-recovery-private",
    },
  );

  assert.equal(evidence.revision, revision);
  assert.equal(stored.length, 1);
  assert.deepEqual(stored[0]?.documents, [
    {
      document: {
        _id: "project.platform",
        _rev: "published-r7",
        _type: "project",
        heroMedia: {
          image: {
            asset: {
              _ref: "image-hero-1200x800-jpg",
              _type: "reference",
            },
          },
        },
        resume: {
          asset: {
            _ref: "file-resume-en-pdf",
            _type: "reference",
          },
        },
      },
      documentId: "project.platform",
    },
    { document: null, documentId: "skill.new" },
  ]);
  assert.deepEqual(stored[0]?.assetReferences, [
    "file-resume-en-pdf",
    "image-hero-1200x800-jpg",
  ]);

  await assert.rejects(
    capturePublicationRollbackBundle(contentClient, rollbackClient, {
      batchId: "publicationBatch.july",
      capturedAt: "2026-07-30T12:10:00.000Z",
      contentDataset: "production",
      documentIds: ["project.platform"],
      revision,
      rollbackDataset: "production",
    }),
    /separate private dataset/,
  );
});

test("rollback restores every affected Sanity document in one revision-guarded transaction and requests one confirming build", async () => {
  const operations: unknown[] = [];
  let commitCount = 0;
  let commitOptions: Record<string, unknown> | undefined;
  const transaction: AtomicPublicationTransaction = {
    commit: async (options) => {
      commitCount += 1;
      commitOptions = options;
      return { transactionId: "sanity-recovery-32" };
    },
    create(document) {
      operations.push({ create: document });
      return this;
    },
    createOrReplace(document) {
      operations.push({ createOrReplace: document });
      return this;
    },
    delete(documentId) {
      operations.push({ delete: documentId });
      return this;
    },
    patch(documentId, buildPatch) {
      const patch: Record<string, unknown> = { id: documentId };
      buildPatch({
        ifRevisionId(expectedRevision) {
          patch.ifRevisionID = expectedRevision;
          return this;
        },
      });
      operations.push({ patch });
      return this;
    },
    transactionId(transactionId) {
      operations.push({ transactionId });
      return this;
    },
  };
  const failed = beginFailedCandidateRecovery(
    {
      ...validatedPublicationWorkflow(revision),
      deployment: {
        revision,
        status: "buildFailed",
        updatedAt: "2026-07-31T10:00:00.000Z",
      },
      publication: {
        buildRequestId: `publication-batch-32:${revision}`,
        publishedAt: "2026-07-31T09:50:00.000Z",
        revision,
      },
      rollback: {
        bundleId: "publicationRollbackBundle.publicationBatch.july",
        capturedAt: "2026-07-31T09:45:00.000Z",
        revision,
      },
    },
    {
      previousDeploymentId: "deployment-content-r7",
      previousRevision,
      startedAt: "2026-07-31T10:01:00.000Z",
    },
  );

  const result = await restorePublicationRollbackBundle(
    { transaction: () => transaction },
    {
      batchDocument: {
        _id: "publicationBatch.july",
        _rev: "batch-published-r5",
        _type: "publicationBatch",
        name: "July portfolio refresh",
        workflow: serializePublicationWorkflow(failed),
      },
      currentDocuments: [
        {
          _id: "project.platform",
          _rev: "project-r8",
          _type: "project",
          title: "Candidate",
        },
        {
          _id: "skill.kafka",
          _rev: "skill-r3",
          _type: "skill",
        },
      ],
      restoredAt: "2026-07-31T10:02:00.000Z",
      rollbackBundle: {
        _id: "publicationRollbackBundle.publicationBatch.july",
        _type: "publicationRollbackBundle",
        assetReferences: [],
        batchId: "publicationBatch.july",
        candidateRevision: revision,
        capturedAt: "2026-07-31T09:45:00.000Z",
        documents: [
          {
            document: {
              _createdAt: "2026-06-01T00:00:00.000Z",
              _id: "project.platform",
              _rev: "project-r7",
              _type: "project",
              _updatedAt: "2026-07-01T00:00:00.000Z",
              title: "Previous",
            },
            documentId: "project.platform",
          },
          { document: null, documentId: "skill.kafka" },
        ],
      },
      workflow: failed,
    },
  );

  assert.equal(commitCount, 1);
  assert.deepEqual(commitOptions, {
    tag: "portfolio.publication-recovery",
    visibility: "sync",
  });
  assert.equal(result.workflow.recovery?.status, "confirmingBuildPending");
  assert.deepEqual(
    operations.flatMap((operation) =>
      "patch" in (operation as Record<string, unknown>)
        ? [(operation as { patch: Record<string, unknown> }).patch]
        : [],
    ),
    [
      { id: "project.platform", ifRevisionID: "project-r8" },
      { id: "skill.kafka", ifRevisionID: "skill-r3" },
      { id: "publicationBatch.july", ifRevisionID: "batch-published-r5" },
    ],
  );
  assert.deepEqual(
    operations.flatMap((operation) =>
      "createOrReplace" in (operation as Record<string, unknown>)
        ? [
            (operation as { createOrReplace: Record<string, unknown> })
              .createOrReplace._id,
          ]
        : [],
    ),
    ["project.platform", "publicationBatch.july"],
  );
  assert.deepEqual(
    operations.flatMap((operation) =>
      "delete" in (operation as Record<string, unknown>)
        ? [(operation as { delete: string }).delete]
        : [],
    ),
    ["skill.kafka"],
  );
  assert.match(publicationBuildWebhook.filter, /recovery\.buildRequestId/);
  assert.match(publicationBuildWebhook.projection, /recovery\.buildRequestId/);
});

test("post-release recovery reactivates the previous deployment before mutating Sanity", async () => {
  const events: string[] = [];
  const transaction: AtomicPublicationTransaction = {
    commit: async () => {
      events.push("restore-sanity");
      return {};
    },
    create() {
      return this;
    },
    createOrReplace() {
      return this;
    },
    delete() {
      return this;
    },
    patch(_documentId, buildPatch) {
      buildPatch({
        ifRevisionId() {
          return this;
        },
      });
      return this;
    },
    transactionId() {
      return this;
    },
  };
  const live = {
    ...validatedPublicationWorkflow(revision),
    deployment: {
      revision,
      status: "live" as const,
      updatedAt: "2026-07-31T11:00:00.000Z",
    },
    publication: {
      buildRequestId: `publication-batch-32:${revision}`,
      publishedAt: "2026-07-31T10:50:00.000Z",
      revision,
    },
    rollback: {
      bundleId: "publicationRollbackBundle.publicationBatch.july",
      capturedAt: "2026-07-31T10:45:00.000Z",
      revision,
    },
  };
  const recoveryInput = {
    batchDocument: {
      _id: "publicationBatch.july",
      _rev: "batch-published-r5",
      _type: "publicationBatch",
    },
    currentDocuments: [
      {
        _id: "project.platform",
        _rev: "project-r8",
        _type: "project",
      },
    ],
    previousDeploymentId: "deployment-content-r7",
    previousRevision,
    reactivatedAt: "2026-07-31T11:02:00.000Z",
    restoredAt: "2026-07-31T11:03:00.000Z",
    rollbackBundle: {
      _id: "publicationRollbackBundle.publicationBatch.july",
      _type: "publicationRollbackBundle" as const,
      assetReferences: [],
      batchId: "publicationBatch.july",
      candidateRevision: revision,
      capturedAt: "2026-07-31T10:45:00.000Z",
      documents: [
        {
          document: {
            _id: "project.platform",
            _rev: "project-r7",
            _type: "project",
          },
          documentId: "project.platform",
        },
      ],
    },
    startedAt: "2026-07-31T11:01:00.000Z",
    workflow: live,
  };

  await recoverPostReleasePublication(
    {
      reactivate: async ({ deploymentId }) => {
        events.push(`reactivate-${deploymentId}`);
      },
    },
    { transaction: () => transaction },
    recoveryInput,
  );

  assert.deepEqual(events, [
    "reactivate-deployment-content-r7",
    "restore-sanity",
  ]);

  let transactionCreated = false;
  await assert.rejects(
    recoverPostReleasePublication(
      {
        reactivate: async () => {
          throw new Error("hosting rollback failed");
        },
      },
      {
        transaction: () => {
          transactionCreated = true;
          return transaction;
        },
      },
      recoveryInput,
    ),
    /hosting rollback failed/,
  );
  assert.equal(transactionCreated, false);
});

test("publication mutation watches cover the complete validated reference closure", () => {
  const report = validatePublicationBatch({
    assetChecks: [],
    changedDocumentIds: ["project.platform"],
    documents: [
      {
        _id: "drafts.project.platform",
        _rev: "project-r8",
        _type: "project",
        publishSafe: true,
        references: [{ _ref: "siteSettings" }],
        title: { en: "Platform", hr: "Platforma" },
      },
    ],
    factualParityConfirmed: true,
    limits: {
      compressedWorkerBytes: 2_000_000,
      dynamicCpuMilliseconds: 8,
      staticFileCount: 1_000,
    },
    name: "July portfolio refresh",
    privacyReviewed: true,
    referenceDocuments: [
      {
        _id: "siteSettings",
        _rev: "settings-r2",
        _type: "siteSettings",
      },
    ],
  });

  assert.deepEqual(report.closureDocumentIds, [
    "project.platform",
    "siteSettings",
  ]);
  assert.deepEqual(publicationRevisionWatchIds(report), [
    "drafts.project.platform",
    "drafts.siteSettings",
    "project.platform",
    "siteSettings",
  ]);
  assert.equal(
    publicationWorkflowRequiresRevalidation(
      validatedPublicationWorkflow(report.revision),
      report,
    ),
    true,
  );
});

test("the complete revision publishes in one transaction with exactly one protected-build marker", async () => {
  const operations: unknown[] = [];
  let commitCount = 0;
  let commitOptions: Record<string, unknown> | undefined;
  const currentRevisions = new Map<string, string>([
    ["drafts.project.platform", "project-r8"],
    ["drafts.publicationBatch.july", "batch-r4"],
    ["drafts.skill.kafka", "skill-r3"],
    ["project.platform", "project-r7"],
    ["siteSettings", "settings-r2"],
  ]);
  const transaction: AtomicPublicationTransaction = {
    commit: async (options) => {
      commitOptions = options;
      for (const operation of operations) {
        const patch = (
          operation as
            { patch?: { id?: unknown; ifRevisionID?: unknown } } | undefined
        )?.patch;
        if (
          patch &&
          currentRevisions.get(String(patch.id)) !== patch.ifRevisionID
        ) {
          throw new Error(`revision conflict for ${String(patch.id)}`);
        }
        const created = (
          operation as { create?: { _id?: unknown } } | undefined
        )?.create;
        if (created && currentRevisions.has(String(created._id))) {
          throw new Error(`${String(created._id)} already exists`);
        }
      }
      commitCount += 1;
      return { transactionId: "sanity-transaction-31" };
    },
    createOrReplace(document) {
      operations.push({ createOrReplace: document });
      return this;
    },
    create(document) {
      operations.push({ create: document });
      return this;
    },
    delete(documentId) {
      operations.push({ delete: documentId });
      return this;
    },
    patch(documentId, buildPatch) {
      const patch: Record<string, unknown> = { id: documentId };
      buildPatch({
        ifRevisionId(expectedRevision) {
          patch.ifRevisionID = expectedRevision;
          return this;
        },
      });
      operations.push({ patch });
      return this;
    },
    transactionId(transactionId) {
      operations.push({ transactionId });
      return this;
    },
  };
  const client = {
    transaction: () => transaction,
  };
  const atomicCandidate: PublicationBatchCandidate = {
    assetChecks: [],
    changedDocumentIds: ["project.platform", "skill.kafka"],
    documents: [
      {
        _id: "drafts.project.platform",
        _rev: "project-r8",
        _type: "project",
        _updatedAt: "2026-07-30T12:00:00.000Z",
        order: 1,
        publishSafe: true,
        title: { en: "Platform", hr: "Platforma" },
      },
      {
        _id: "drafts.skill.kafka",
        _rev: "skill-r3",
        _type: "skill",
        _updatedAt: "2026-07-30T12:00:00.000Z",
        capability: { en: "Streams", hr: "Tokovi" },
        order: 1,
      },
    ],
    factualParityConfirmed: true,
    limits: {
      compressedWorkerBytes: 2_000_000,
      dynamicCpuMilliseconds: 8,
      staticFileCount: 1_000,
    },
    name: "July portfolio refresh",
    privacyReviewed: true,
    referenceDocuments: [
      {
        _id: "siteSettings",
        _rev: "settings-r2",
        _type: "siteSettings",
      },
    ],
  };
  const atomicRevision = validatePublicationBatch(atomicCandidate).revision;
  const englishReviewed = acknowledgePublicationPreview(
    validatedPublicationWorkflow(atomicRevision),
    "en",
    atomicRevision,
    "2026-07-30T12:00:00.000Z",
  );
  const ready = capturePublicationRollback(
    acknowledgePublicationPreview(
      englishReviewed,
      "hr",
      atomicRevision,
      "2026-07-30T12:05:00.000Z",
    ),
    {
      bundleId: "publicationRollbackBundle.publicationBatch.july",
      capturedAt: "2026-07-30T12:10:00.000Z",
      revision: atomicRevision,
    },
  );

  const publicationInput: Parameters<typeof publishAtomicPublicationBatch>[1] =
    {
      batchDocument: {
        _id: "drafts.publicationBatch.july",
        _rev: "batch-r4",
        _type: "publicationBatch",
        name: "July portfolio refresh",
      },
      candidate: atomicCandidate,
      publishedAt: "2026-07-30T12:15:00.000Z",
      revision: atomicRevision,
      rollbackBundle: {
        _id: "publicationRollbackBundle.publicationBatch.july",
        _type: "publicationRollbackBundle",
        assetReferences: [],
        batchId: "publicationBatch.july",
        candidateRevision: atomicRevision,
        capturedAt: "2026-07-30T12:10:00.000Z",
        documents: [
          {
            documentId: "project.platform",
            document: {
              _id: "project.platform",
              _rev: "project-r7",
              _type: "project",
            },
          },
          { documentId: "skill.kafka", document: null },
        ],
      },
      workflow: ready,
    };
  const result = await publishAtomicPublicationBatch(client, publicationInput);

  assert.equal(commitCount, 1);
  assert.deepEqual(commitOptions, {
    tag: "portfolio.atomic-publication",
    visibility: "sync",
  });
  assert.equal(result.workflow.publication?.revision, atomicRevision);
  assert.equal(result.workflow.deployment?.status, "buildPending");
  const replacements = operations.flatMap((operation) =>
    "createOrReplace" in (operation as Record<string, unknown>)
      ? [
          (operation as { createOrReplace: Record<string, unknown> })
            .createOrReplace,
        ]
      : [],
  );
  assert.deepEqual(
    replacements.map(({ _id }) => _id),
    ["project.platform"],
  );
  const creations = operations.flatMap((operation) =>
    "create" in (operation as Record<string, unknown>)
      ? [(operation as { create: Record<string, unknown> }).create]
      : [],
  );
  assert.deepEqual(
    creations.map(({ _id }) => _id),
    ["skill.kafka", "publicationBatch.july"],
  );
  assert.equal(
    [...replacements, ...creations].filter(
      (document) =>
        typeof (
          document.workflow as
            { publication?: { buildRequestId?: unknown } } | undefined
        )?.publication?.buildRequestId === "string",
    ).length,
    1,
  );
  assert.equal(
    operations.filter(
      (operation) => "transactionId" in (operation as Record<string, unknown>),
    ).length,
    1,
  );
  assert.match(publicationBuildWebhook.filter, /_type == "publicationBatch"/);
  assert.match(publicationBuildWebhook.filter, /before\(\) == null/);
  assert.match(publicationBuildWebhook.projection, /buildRequestId/);
  assert.equal(publicationBuildWebhook.includeDrafts, false);
  assert.deepEqual(
    operations
      .flatMap((operation) =>
        "patch" in (operation as Record<string, unknown>)
          ? [(operation as { patch: Record<string, unknown> }).patch]
          : [],
      )
      .filter(({ id }) => !String(id).startsWith("drafts.")),
    [
      {
        id: "project.platform",
        ifRevisionID: "project-r7",
      },
      {
        id: "siteSettings",
        ifRevisionID: "settings-r2",
      },
    ],
  );

  currentRevisions.set("siteSettings", "settings-r3");
  await assert.rejects(
    publishAtomicPublicationBatch(client, {
      ...publicationInput,
      publishedAt: "2026-07-30T12:16:00.000Z",
    }),
    /revision conflict for siteSettings/,
  );

  currentRevisions.set("siteSettings", "settings-r2");
  currentRevisions.set("project.platform", "project-r8");
  await assert.rejects(
    publishAtomicPublicationBatch(client, {
      ...publicationInput,
      publishedAt: "2026-07-30T12:16:00.000Z",
    }),
    /revision conflict for project.platform/,
  );

  currentRevisions.set("project.platform", "project-r7");
  currentRevisions.set("skill.kafka", "skill-published-r1");
  await assert.rejects(
    publishAtomicPublicationBatch(client, {
      ...publicationInput,
      publishedAt: "2026-07-30T12:16:00.000Z",
    }),
    /skill.kafka already exists/,
  );

  await assert.rejects(
    publishAtomicPublicationBatch(client, {
      ...publicationInput,
      candidate: {
        ...atomicCandidate,
        changedDocumentIds: ["project.platform", "skill.kafka"],
        documents: [
          {
            _id: "drafts.project.platform",
            _rev: "project-r9",
            _type: "project",
            _updatedAt: "2026-07-30T12:15:30.000Z",
            order: 1,
            publishSafe: true,
            title: { en: "Edited platform", hr: "Uređena platforma" },
          },
          atomicCandidate.documents[1]!,
        ],
        name: "Edited after review",
      },
      publishedAt: "2026-07-30T12:16:00.000Z",
    }),
    /exact validated batch revision/,
  );
});
