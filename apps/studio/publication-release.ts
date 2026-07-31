import {
  beginFailedCandidateRecovery,
  beginPostReleaseRollback,
  confirmPreviousDeploymentReactivated,
  publishPublicationWorkflow,
  publishedDocumentId,
  recordPublicationContentRestored,
  validatePublicationBatch,
  type PublicationBatchCandidate,
  type PublicationRollbackEvidence,
  type PublicationWorkflowState,
} from "@portfolio/content";

type UnknownRecord = Record<string, unknown>;

export type PublicationRollbackDocument = Readonly<{
  document: UnknownRecord | null;
  documentId: string;
}>;

export type PublicationRollbackBundle = Readonly<{
  _id: string;
  _type: "publicationRollbackBundle";
  assetReferences: readonly string[];
  batchId: string;
  candidateRevision: string;
  capturedAt: string;
  documents: readonly PublicationRollbackDocument[];
}>;

export type PublicationContentClient = Readonly<{
  fetch: <T>(query: string, parameters?: Record<string, unknown>) => Promise<T>;
}>;

export type PublicationRollbackClient = Readonly<{
  createIfNotExists: (
    bundle: PublicationRollbackBundle,
  ) => Promise<PublicationRollbackBundle>;
}>;

export type AtomicPublicationPatch = {
  ifRevisionId: (revision: string) => AtomicPublicationPatch;
};

export type AtomicPublicationTransaction = {
  commit: (options?: Record<string, unknown>) => Promise<unknown>;
  create: (document: UnknownRecord) => AtomicPublicationTransaction;
  createOrReplace: (document: UnknownRecord) => AtomicPublicationTransaction;
  delete: (documentId: string) => AtomicPublicationTransaction;
  patch: (
    documentId: string,
    buildPatch: (patch: AtomicPublicationPatch) => AtomicPublicationPatch,
  ) => AtomicPublicationTransaction;
  transactionId: (transactionId: string) => AtomicPublicationTransaction;
};

export type AtomicPublicationClient = Readonly<{
  transaction: () => AtomicPublicationTransaction;
}>;

export type PublicationDeploymentRollbackClient = Readonly<{
  reactivate: (input: Readonly<{
    deploymentId: string;
    revision: string;
  }>) => Promise<void>;
}>;

const PUBLISHED_DOCUMENTS_QUERY = `*[
  _id in $documentIds &&
  !(_id in path("drafts.**"))
]`;

export const publicationBuildWebhook = {
  apiVersion: "v2025-02-19",
  filter: `_type == "publicationBatch" &&
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
    )`,
  includeDrafts: false,
  on: ["create", "update"],
  projection: `{
    "batchId": after()._id,
    "buildRequestId": coalesce(
      after().workflow.recovery.buildRequestId,
      after().workflow.publication.buildRequestId
    ),
    "revision": coalesce(
      after().workflow.recovery.previousRevision,
      after().workflow.publication.revision
    )
  }`,
} as const;

function record(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function publicationWorkflowFromValue(
  value: unknown,
): PublicationWorkflowState | null {
  const workflow = record(value);
  const candidateRevision = stringValue(workflow?.candidateRevision);
  if (!workflow || !candidateRevision) {
    return null;
  }
  const acknowledgements = record(workflow.acknowledgements);
  const readEvidence = (input: unknown) => {
    const evidence = record(input);
    const revision = stringValue(evidence?.revision);
    const acknowledgedAt = stringValue(evidence?.acknowledgedAt);
    return evidence && revision && acknowledgedAt
      ? { acknowledgedAt, revision }
      : undefined;
  };
  const rollbackValue = record(workflow.rollback);
  const rollback =
    rollbackValue &&
    stringValue(rollbackValue.bundleId) &&
    stringValue(rollbackValue.capturedAt) &&
    stringValue(rollbackValue.revision)
      ? {
          bundleId: stringValue(rollbackValue.bundleId)!,
          capturedAt: stringValue(rollbackValue.capturedAt)!,
          revision: stringValue(rollbackValue.revision)!,
        }
      : null;
  const publicationValue = record(workflow.publication);
  const publication =
    publicationValue &&
    stringValue(publicationValue.buildRequestId) &&
    stringValue(publicationValue.publishedAt) &&
    stringValue(publicationValue.revision)
      ? {
          buildRequestId: stringValue(publicationValue.buildRequestId)!,
          publishedAt: stringValue(publicationValue.publishedAt)!,
          revision: stringValue(publicationValue.revision)!,
        }
      : null;
  const deploymentValue = record(workflow.deployment);
  const deploymentStatus = stringValue(deploymentValue?.status);
  const deployment: PublicationWorkflowState["deployment"] =
    deploymentValue &&
    stringValue(deploymentValue.revision) &&
    stringValue(deploymentValue.updatedAt) &&
    (deploymentStatus === "buildFailed" ||
      deploymentStatus === "buildPending" ||
      deploymentStatus === "live")
      ? {
          revision: stringValue(deploymentValue.revision)!,
          status: deploymentStatus,
          updatedAt: stringValue(deploymentValue.updatedAt)!,
        }
      : null;
  const recoveryValue = record(workflow.recovery);
  const recoveryKind = stringValue(recoveryValue?.kind);
  const recoveryStatus = stringValue(recoveryValue?.status);
  const previousDeploymentId = stringValue(
    recoveryValue?.previousDeploymentId,
  );
  const previousRevision = stringValue(recoveryValue?.previousRevision);
  const startedAt = stringValue(recoveryValue?.startedAt);
  const recovery: PublicationWorkflowState["recovery"] =
    recoveryValue &&
    (recoveryKind === "failedCandidate" ||
      recoveryKind === "postRelease") &&
    (recoveryStatus === "deploymentReactivationRequired" ||
      recoveryStatus === "contentRestoreRequired" ||
      recoveryStatus === "confirmingBuildPending" ||
      recoveryStatus === "confirmingBuildFailed" ||
      recoveryStatus === "complete") &&
    previousDeploymentId &&
    previousRevision &&
    startedAt
      ? {
          ...(stringValue(recoveryValue.buildRequestId)
            ? { buildRequestId: stringValue(recoveryValue.buildRequestId)! }
            : {}),
          ...(stringValue(recoveryValue.completedAt)
            ? { completedAt: stringValue(recoveryValue.completedAt)! }
            : {}),
          kind: recoveryKind,
          previousDeploymentId,
          previousRevision,
          ...(stringValue(recoveryValue.reactivatedAt)
            ? { reactivatedAt: stringValue(recoveryValue.reactivatedAt)! }
            : {}),
          ...(stringValue(recoveryValue.restoredAt)
            ? { restoredAt: stringValue(recoveryValue.restoredAt)! }
            : {}),
          startedAt,
          status: recoveryStatus,
        }
      : null;

  return {
    acknowledgements: {
      ...(readEvidence(acknowledgements?.en)
        ? { en: readEvidence(acknowledgements?.en)! }
        : {}),
      ...(readEvidence(acknowledgements?.hr)
        ? { hr: readEvidence(acknowledgements?.hr)! }
        : {}),
    },
    candidateRevision,
    deployment,
    publication,
    recovery,
    rollback,
    validationRevision: stringValue(workflow.validationRevision),
  };
}

export function serializePublicationWorkflow(
  workflow: PublicationWorkflowState,
): UnknownRecord {
  const revisionEvidence = (
    evidence: PublicationWorkflowState["acknowledgements"]["en"],
  ) =>
    evidence
      ? { _type: "publicationRevisionEvidence", ...evidence }
      : undefined;

  return {
    _type: "publicationWorkflow",
    acknowledgements: {
      _type: "publicationPreviewAcknowledgements",
      ...(revisionEvidence(workflow.acknowledgements.en)
        ? { en: revisionEvidence(workflow.acknowledgements.en) }
        : {}),
      ...(revisionEvidence(workflow.acknowledgements.hr)
        ? { hr: revisionEvidence(workflow.acknowledgements.hr) }
        : {}),
    },
    candidateRevision: workflow.candidateRevision,
    ...(workflow.deployment
      ? {
          deployment: {
            _type: "publicationDeployment",
            ...workflow.deployment,
          },
        }
      : {}),
    ...(workflow.publication
      ? {
          publication: {
            _type: "publicationRecord",
            ...workflow.publication,
          },
        }
      : {}),
    ...(workflow.recovery
      ? {
          recovery: {
            _type: "publicationRecovery",
            ...workflow.recovery,
          },
        }
      : {}),
    ...(workflow.rollback
      ? {
          rollback: {
            _type: "publicationRollbackEvidence",
            ...workflow.rollback,
          },
        }
      : {}),
    ...(workflow.validationRevision
      ? { validationRevision: workflow.validationRevision }
      : {}),
  };
}

function collectAssetReferences(
  value: unknown,
  references = new Set<string>(),
): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectAssetReferences(entry, references));
    return references;
  }
  if (typeof value !== "object" || value === null) {
    return references;
  }

  const record = value as UnknownRecord;
  if (
    typeof record._ref === "string" &&
    (record._ref.startsWith("image-") || record._ref.startsWith("file-"))
  ) {
    references.add(record._ref);
  }
  Object.values(record).forEach((entry) =>
    collectAssetReferences(entry, references),
  );
  return references;
}

function rollbackBundleId(batchId: string, revision: string): string {
  const normalizedBatchId = publishedDocumentId(batchId).replace(
    /[^A-Za-z0-9_.-]/gu,
    "-",
  );
  return `publicationRollbackBundle.${normalizedBatchId}.${revision}`;
}

export async function capturePublicationRollbackBundle(
  contentClient: PublicationContentClient,
  rollbackClient: PublicationRollbackClient,
  input: Readonly<{
    batchId: string;
    capturedAt: string;
    contentDataset: string;
    documentIds: readonly string[];
    revision: string;
    rollbackDataset: string;
  }>,
): Promise<PublicationRollbackEvidence> {
  if (
    !input.rollbackDataset.trim() ||
    input.rollbackDataset === input.contentDataset
  ) {
    throw new Error(
      "Rollback bundles require a separate private dataset from published content.",
    );
  }

  const documentIds = [...new Set(input.documentIds.map(publishedDocumentId))]
    .filter(Boolean)
    .sort();
  const publishedDocuments = await contentClient.fetch<UnknownRecord[]>(
    PUBLISHED_DOCUMENTS_QUERY,
    { documentIds },
  );
  const publishedById = new Map(
    publishedDocuments
      .filter(
        (document) =>
          typeof document._id === "string" && document._id.length > 0,
      )
      .map((document) => [
        publishedDocumentId(document._id as string),
        document,
      ]),
  );
  const documents = documentIds.map((documentId) => ({
    document: publishedById.get(documentId) ?? null,
    documentId,
  }));
  const bundle: PublicationRollbackBundle = {
    _id: rollbackBundleId(input.batchId, input.revision),
    _type: "publicationRollbackBundle",
    assetReferences: [
      ...collectAssetReferences(
        documents.flatMap(({ document }) => (document ? [document] : [])),
      ),
    ].sort(),
    batchId: publishedDocumentId(input.batchId),
    candidateRevision: input.revision,
    capturedAt: input.capturedAt,
    documents,
  };

  const storedBundle = await rollbackClient.createIfNotExists(bundle);
  if (
    storedBundle.candidateRevision !== input.revision ||
    storedBundle.batchId !== publishedDocumentId(input.batchId)
  ) {
    throw new Error(
      "The private rollback bundle does not match the current batch revision.",
    );
  }

  return {
    bundleId: storedBundle._id,
    capturedAt: storedBundle.capturedAt,
    revision: storedBundle.candidateRevision,
  };
}

export async function loadPublicationRollbackBundle(
  client: PublicationContentClient,
  bundleId: string,
): Promise<PublicationRollbackBundle> {
  const bundle = await client.fetch<PublicationRollbackBundle | null>(
    `*[_id == $bundleId && _type == "publicationRollbackBundle"][0]`,
    { bundleId },
  );
  if (!bundle || bundle._id !== bundleId) {
    throw new Error("The private rollback bundle could not be loaded.");
  }
  return bundle;
}

function publishedSnapshot(draft: UnknownRecord): UnknownRecord {
  const { _createdAt, _rev, _system, _updatedAt, ...content } = draft;
  void _createdAt;
  void _rev;
  void _system;
  void _updatedAt;
  const draftId = typeof draft._id === "string" ? draft._id : "";
  const type = typeof draft._type === "string" ? draft._type : "";
  if (!draftId.startsWith("drafts.") || !type) {
    throw new Error(
      "Atomic publication accepts only typed Sanity draft documents.",
    );
  }
  return {
    ...content,
    _id: publishedDocumentId(draftId),
    _type: type,
  };
}

function restorablePublishedSnapshot(document: UnknownRecord): UnknownRecord {
  const { _createdAt, _rev, _system, _updatedAt, ...content } = document;
  void _createdAt;
  void _rev;
  void _system;
  void _updatedAt;
  const documentId =
    typeof document._id === "string"
      ? publishedDocumentId(document._id)
      : "";
  const type = typeof document._type === "string" ? document._type : "";
  if (!documentId || documentId !== document._id || !type) {
    throw new Error(
      "Rollback pre-images must be typed published Sanity documents.",
    );
  }
  return {
    ...content,
    _id: documentId,
    _type: type,
  };
}

function revisionLockedDraft(
  transaction: AtomicPublicationTransaction,
  draft: UnknownRecord,
) {
  const draftId = typeof draft._id === "string" ? draft._id : "";
  const draftRevision = typeof draft._rev === "string" ? draft._rev : "";
  if (!draftId.startsWith("drafts.") || !draftRevision) {
    throw new Error(
      "Every published draft must have an exact Sanity revision.",
    );
  }
  transaction.patch(draftId, (patch) => patch.ifRevisionId(draftRevision));
}

function revisionLockedPublishedDocument(
  transaction: AtomicPublicationTransaction,
  document: UnknownRecord,
) {
  const documentId =
    typeof document._id === "string" ? publishedDocumentId(document._id) : "";
  const documentRevision =
    typeof document._rev === "string" ? document._rev : "";
  if (
    !documentId ||
    documentId !== document._id ||
    !documentRevision ||
    typeof document._type !== "string"
  ) {
    throw new Error(
      "Every reviewed published dependency must have an exact Sanity revision.",
    );
  }
  transaction.patch(documentId, (patch) =>
    patch.ifRevisionId(documentRevision),
  );
}

function publicationTransactionId(batchId: string, revision: string): string {
  return `publication-${publishedDocumentId(batchId).replace(
    /[^A-Za-z0-9_-]/gu,
    "-",
  )}-${revision.slice(0, 20)}`;
}

export async function publishAtomicPublicationBatch(
  client: AtomicPublicationClient,
  input: Readonly<{
    batchDocument: UnknownRecord;
    candidate: PublicationBatchCandidate;
    publishedAt: string;
    revision: string;
    rollbackBundle: PublicationRollbackBundle;
    workflow: PublicationWorkflowState;
  }>,
) {
  const verifiedReport = validatePublicationBatch(input.candidate);
  if (
    !verifiedReport.ready ||
    verifiedReport.revision !== input.revision ||
    input.workflow.candidateRevision !== verifiedReport.revision
  ) {
    throw new Error(
      "Atomic publication requires the exact validated batch revision.",
    );
  }
  const rollback = input.workflow.rollback;
  const publishedBatchId = publishedDocumentId(
    typeof input.batchDocument._id === "string" ? input.batchDocument._id : "",
  );
  if (
    !rollback ||
    input.rollbackBundle._id !== rollback.bundleId ||
    input.rollbackBundle.batchId !== publishedBatchId ||
    input.rollbackBundle.candidateRevision !== input.revision ||
    input.rollbackBundle.capturedAt !== rollback.capturedAt
  ) {
    throw new Error(
      "Atomic publication requires the exact private rollback bundle.",
    );
  }
  const rollbackDocuments = new Map(
    input.rollbackBundle.documents.map((entry) => [
      publishedDocumentId(entry.documentId),
      entry.document,
    ]),
  );
  const candidateDocumentIds = input.candidate.documents.map((document) =>
    publishedDocumentId(typeof document._id === "string" ? document._id : ""),
  );
  if (
    rollbackDocuments.size !== candidateDocumentIds.length ||
    candidateDocumentIds.some(
      (documentId) => !rollbackDocuments.has(documentId),
    )
  ) {
    throw new Error(
      "The private rollback bundle must cover every changed document exactly once.",
    );
  }
  const publication = {
    buildRequestId: `${publishedBatchId}:${input.revision}`,
    publishedAt: input.publishedAt,
    revision: input.revision,
  };
  const workflow = publishPublicationWorkflow(input.workflow, publication);
  const transaction = client
    .transaction()
    .transactionId(publicationTransactionId(publishedBatchId, input.revision));

  for (const draft of input.candidate.documents) {
    revisionLockedDraft(transaction, draft);
    const documentId = publishedDocumentId(draft._id as string);
    const previousPublishedDocument = rollbackDocuments.get(documentId);
    const snapshot = publishedSnapshot(draft);
    if (previousPublishedDocument === null) {
      transaction.create(snapshot);
    } else if (previousPublishedDocument) {
      if (
        publishedDocumentId(
          typeof previousPublishedDocument._id === "string"
            ? previousPublishedDocument._id
            : "",
        ) !== documentId
      ) {
        throw new Error(
          `The private rollback pre-image does not match ${documentId}.`,
        );
      }
      revisionLockedPublishedDocument(transaction, previousPublishedDocument);
      transaction.createOrReplace(snapshot);
    } else {
      throw new Error(`The private rollback bundle is missing ${documentId}.`);
    }
    transaction.delete(draft._id as string);
  }

  const selectedDocumentIds = new Set(candidateDocumentIds);
  for (const dependency of input.candidate.referenceDocuments ?? []) {
    const documentId = publishedDocumentId(
      typeof dependency._id === "string" ? dependency._id : "",
    );
    if (!selectedDocumentIds.has(documentId)) {
      revisionLockedPublishedDocument(transaction, dependency);
    }
  }

  revisionLockedDraft(transaction, input.batchDocument);
  transaction.create({
    ...publishedSnapshot(input.batchDocument),
    workflow: serializePublicationWorkflow(workflow),
  });
  transaction.delete(input.batchDocument._id as string);

  await transaction.commit({
    tag: "portfolio.atomic-publication",
    visibility: "sync",
  });

  return { workflow };
}

export async function restorePublicationRollbackBundle(
  client: AtomicPublicationClient,
  input: Readonly<{
    batchDocument: UnknownRecord;
    currentDocuments: readonly UnknownRecord[];
    restoredAt: string;
    rollbackBundle: PublicationRollbackBundle;
    workflow: PublicationWorkflowState;
  }>,
) {
  const recovery = input.workflow.recovery;
  const rollback = input.workflow.rollback;
  const batchId =
    typeof input.batchDocument._id === "string"
      ? publishedDocumentId(input.batchDocument._id)
      : "";
  if (
    !recovery ||
    recovery.status !== "contentRestoreRequired" ||
    !rollback ||
    input.rollbackBundle._id !== rollback.bundleId ||
    input.rollbackBundle.batchId !== batchId ||
    input.rollbackBundle.candidateRevision !==
      input.workflow.candidateRevision ||
    input.rollbackBundle.candidateRevision !== rollback.revision
  ) {
    throw new Error(
      "Publication recovery requires the exact active rollback bundle.",
    );
  }
  if (!input.restoredAt.trim()) {
    throw new Error("Publication recovery requires a restore timestamp.");
  }

  const rollbackDocuments = new Map(
    input.rollbackBundle.documents.map((entry) => [
      publishedDocumentId(entry.documentId),
      entry.document,
    ]),
  );
  const currentDocuments = new Map(
    input.currentDocuments.map((document) => [
      publishedDocumentId(
        typeof document._id === "string" ? document._id : "",
      ),
      document,
    ]),
  );
  if (
    rollbackDocuments.size !== input.rollbackBundle.documents.length ||
    currentDocuments.size !== rollbackDocuments.size ||
    [...rollbackDocuments].some(
      ([documentId]) => !currentDocuments.has(documentId),
    )
  ) {
    throw new Error(
      "Publication recovery requires every affected current document exactly once.",
    );
  }

  const buildRequestId = `recovery:${batchId}:${input.workflow.candidateRevision}:${input.restoredAt}`;
  const workflow = recordPublicationContentRestored(input.workflow, {
    buildRequestId,
    restoredAt: input.restoredAt,
  });
  const transaction = client
    .transaction()
    .transactionId(
      `recovery-${batchId.replace(/[^A-Za-z0-9_-]/gu, "-")}-${input.workflow.candidateRevision.slice(0, 20)}`,
    );

  for (const [documentId, previousDocument] of rollbackDocuments) {
    const currentDocument = currentDocuments.get(documentId);
    if (!currentDocument) {
      throw new Error(
        `Publication recovery is missing current document ${documentId}.`,
      );
    }
    revisionLockedPublishedDocument(transaction, currentDocument);
    if (previousDocument === null) {
      transaction.delete(documentId);
      continue;
    }
    if (
      publishedDocumentId(
        typeof previousDocument._id === "string"
          ? previousDocument._id
          : "",
      ) !== documentId
    ) {
      throw new Error(
        `The private rollback pre-image does not match ${documentId}.`,
      );
    }
    transaction.createOrReplace(
      restorablePublishedSnapshot(previousDocument),
    );
  }

  revisionLockedPublishedDocument(transaction, input.batchDocument);
  transaction.createOrReplace({
    ...restorablePublishedSnapshot(input.batchDocument),
    workflow: serializePublicationWorkflow(workflow),
  });
  await transaction.commit({
    tag: "portfolio.publication-recovery",
    visibility: "sync",
  });

  return { workflow };
}

export async function recoverPostReleasePublication(
  deploymentClient: PublicationDeploymentRollbackClient,
  contentClient: AtomicPublicationClient,
  input: Readonly<{
    batchDocument: UnknownRecord;
    currentDocuments: readonly UnknownRecord[];
    previousDeploymentId: string;
    previousRevision: string;
    reactivatedAt: string;
    restoredAt: string;
    rollbackBundle: PublicationRollbackBundle;
    startedAt: string;
    workflow: PublicationWorkflowState;
  }>,
) {
  const recovery = beginPostReleaseRollback(input.workflow, {
    previousDeploymentId: input.previousDeploymentId,
    previousRevision: input.previousRevision,
    startedAt: input.startedAt,
  });
  await deploymentClient.reactivate({
    deploymentId: input.previousDeploymentId,
    revision: input.previousRevision,
  });
  const reactivated = confirmPreviousDeploymentReactivated(
    recovery,
    input.reactivatedAt,
  );

  return restorePublicationRollbackBundle(contentClient, {
    batchDocument: input.batchDocument,
    currentDocuments: input.currentDocuments,
    restoredAt: input.restoredAt,
    rollbackBundle: input.rollbackBundle,
    workflow: reactivated,
  });
}

export async function recoverFailedCandidatePublication(
  contentClient: AtomicPublicationClient,
  input: Readonly<{
    batchDocument: UnknownRecord;
    currentDocuments: readonly UnknownRecord[];
    previousDeploymentId: string;
    previousRevision: string;
    restoredAt: string;
    rollbackBundle: PublicationRollbackBundle;
    startedAt: string;
    workflow: PublicationWorkflowState;
  }>,
) {
  const recovery = beginFailedCandidateRecovery(input.workflow, {
    previousDeploymentId: input.previousDeploymentId,
    previousRevision: input.previousRevision,
    startedAt: input.startedAt,
  });
  return restorePublicationRollbackBundle(contentClient, {
    batchDocument: input.batchDocument,
    currentDocuments: input.currentDocuments,
    restoredAt: input.restoredAt,
    rollbackBundle: input.rollbackBundle,
    workflow: recovery,
  });
}
