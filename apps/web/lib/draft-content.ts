import {
  collectStrongReferenceIds,
  hasSanityConfiguration,
  publishedDocumentId,
  validatePublicationBatch,
  type PublicationBatchCandidate,
  type SanityEnvironment,
} from "@portfolio/content";

const DRAFT_BATCH_QUERY = `{
  "batch": *[
    _type == "publicationBatch" &&
    validation.ready == true &&
    validation.revision == $revision
  ][0]{
    name,
    factualParityConfirmed,
    privacyReviewed,
    assetChecks,
    limits,
    validation,
    "documents": documents[]->
  },
  "contentDocuments": *[
    _type in [
      "siteSettings",
      "aboutMe",
      "contact",
      "privacyNotice",
      "profileMedia",
      "resumeSet",
      "experience",
      "education",
      "skill",
      "project"
    ]
  ]
}`;
const DRAFT_IDS_QUERY = `*[_id in $draftIds]{_id}`;

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type DraftFetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type DraftBatchScopeOptions = Readonly<{
  environment?: SanityEnvironment;
  fetcher?: DraftFetcher;
}>;

export type DraftBatchScope = Readonly<{
  documentIds: readonly string[];
  name: string;
  revision: string;
}>;

function sanityQueryUrl(
  projectId: string,
  dataset: string,
  query: string,
  perspective: "previewDrafts" | "raw",
  parameters: Readonly<Record<string, unknown>>,
) {
  const search = new URLSearchParams({ perspective, query });
  for (const [name, value] of Object.entries(parameters)) {
    search.set(`$${name}`, JSON.stringify(value));
  }
  return `https://${projectId}.api.sanity.io/v2025-02-19/data/query/${dataset}?${search}`;
}

function referenceClosure(
  documents: readonly UnknownRecord[],
  availableDocuments: readonly UnknownRecord[],
) {
  const selectedIds = new Set(
    documents
      .map(({ _id }) => nonEmptyString(_id))
      .filter((id): id is string => id !== null)
      .map(publishedDocumentId),
  );
  const availableById = new Map(
    availableDocuments
      .map((document) => {
        const id = nonEmptyString(document._id);
        return id ? ([publishedDocumentId(id), document] as const) : null;
      })
      .filter(
        (
          entry,
        ): entry is readonly [string, UnknownRecord] => entry !== null,
      ),
  );
  const references: UnknownRecord[] = [];
  const visitedIds = new Set(selectedIds);
  let pendingIds = [...collectStrongReferenceIds(documents)].filter(
    (id) => !visitedIds.has(id),
  );
  while (pendingIds.length > 0) {
    const referenced: UnknownRecord[] = [];
    for (const id of pendingIds) {
      visitedIds.add(id);
      const document = availableById.get(id);
      if (document) {
        references.push(document);
        referenced.push(document);
      }
    }
    pendingIds = [...collectStrongReferenceIds(referenced)].filter(
      (id) => !visitedIds.has(id),
    );
  }
  return { references, visitedIds };
}

export async function loadDraftBatchScope(
  revision: string,
  token: string,
  options: DraftBatchScopeOptions = {},
): Promise<DraftBatchScope | null> {
  if (!/^[a-f0-9]{64}$/u.test(revision) || !nonEmptyString(token)) {
    return null;
  }
  const environment = options.environment ?? process.env;
  if (!hasSanityConfiguration(environment)) {
    return null;
  }
  const projectId =
    environment.SANITY_PROJECT_ID ??
    environment.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) {
    return null;
  }
  const dataset =
    environment.SANITY_DATASET ??
    environment.NEXT_PUBLIC_SANITY_DATASET ??
    "production";
  const fetcher = options.fetcher ?? fetch;
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  const response = await fetcher(
    sanityQueryUrl(
      projectId,
      dataset,
      DRAFT_BATCH_QUERY,
      "previewDrafts",
      { revision },
    ),
    {
      cache: "no-store",
      headers,
    },
  );
  if (!response.ok) {
    return null;
  }
  const payload: unknown = await response.json();
  const result = record(record(payload)?.result);
  const batch = record(result?.batch);
  const name = nonEmptyString(batch?.name);
  const validation = record(batch?.validation);
  const documents = Array.isArray(batch?.documents)
    ? batch.documents
        .map((document) => record(document))
        .filter((document): document is UnknownRecord => document !== null)
    : [];
  const availableDocuments = Array.isArray(result?.contentDocuments)
    ? result.contentDocuments
        .map((document) => record(document))
        .filter((document): document is UnknownRecord => document !== null)
    : [];
  const validatedRevision = nonEmptyString(validation?.revision);
  if (
    !batch ||
    !name ||
    validation?.ready !== true ||
    validatedRevision !== revision ||
    documents.length === 0
  ) {
    return null;
  }
  const { references, visitedIds } = referenceClosure(
    documents,
    availableDocuments,
  );
  const draftIds = [...visitedIds].map((id) => `drafts.${id}`).sort();
  const draftResponse = await fetcher(
    sanityQueryUrl(
      projectId,
      dataset,
      DRAFT_IDS_QUERY,
      "raw",
      { draftIds },
    ),
    {
      cache: "no-store",
      headers,
    },
  );
  if (!draftResponse.ok) {
    return null;
  }
  const draftPayload: unknown = await draftResponse.json();
  const changedDocuments = Array.isArray(record(draftPayload)?.result)
    ? (record(draftPayload)?.result as unknown[])
        .map((document) => record(document))
        .filter((document): document is UnknownRecord => document !== null)
    : [];
  const limits = record(batch.limits);
  const candidate: PublicationBatchCandidate = {
    assetChecks: Array.isArray(batch.assetChecks)
      ? (batch.assetChecks as PublicationBatchCandidate["assetChecks"])
      : [],
    changedDocumentIds: changedDocuments
      .map(({ _id }) => nonEmptyString(_id))
      .filter((id): id is string => id !== null),
    documents,
    factualParityConfirmed: batch.factualParityConfirmed === true,
    limits: {
      compressedWorkerBytes:
        typeof limits?.compressedWorkerBytes === "number"
          ? limits.compressedWorkerBytes
          : Number.NaN,
      dynamicCpuMilliseconds:
        typeof limits?.dynamicCpuMilliseconds === "number"
          ? limits.dynamicCpuMilliseconds
          : Number.NaN,
      staticFileCount:
        typeof limits?.staticFileCount === "number"
          ? limits.staticFileCount
          : Number.NaN,
    },
    name,
    privacyReviewed: batch.privacyReviewed === true,
    referenceDocuments: references,
  };
  const report = validatePublicationBatch(candidate);
  if (!report.ready || report.revision !== revision) {
    return null;
  }
  const documentIds = documents
    .map((document) => nonEmptyString(document._id))
    .filter((id): id is string => id !== null)
    .map(publishedDocumentId)
    .sort();
  return documentIds.length === documents.length
    ? { documentIds, name, revision }
    : null;
}
