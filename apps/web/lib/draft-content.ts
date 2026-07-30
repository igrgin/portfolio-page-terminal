import {
  hasSanityConfiguration,
  publicationBatchRevision,
  publishedDocumentId,
  type SanityEnvironment,
} from "@portfolio/content";

const DRAFT_BATCH_QUERY = `*[
  _type == "publicationBatch" &&
  validation.ready == true &&
  validation.revision == $revision
][0]{
  name,
  validation,
  "documents": documents[]->{_id, _rev, _updatedAt}
}`;

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
  const dataset =
    environment.SANITY_DATASET ??
    environment.NEXT_PUBLIC_SANITY_DATASET ??
    "production";
  const search = new URLSearchParams({
    $revision: JSON.stringify(revision),
    perspective: "previewDrafts",
    query: DRAFT_BATCH_QUERY,
  });
  const endpoint = `https://${projectId}.api.sanity.io/v2025-02-19/data/query/${dataset}?${search}`;
  const response = await (options.fetcher ?? fetch)(endpoint, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    return null;
  }
  const payload: unknown = await response.json();
  const result = record(record(payload)?.result);
  const name = nonEmptyString(result?.name);
  const validation = record(result?.validation);
  const documents = Array.isArray(result?.documents)
    ? result.documents
        .map((document) => record(document))
        .filter((document): document is UnknownRecord => document !== null)
    : [];
  const validatedRevision = nonEmptyString(validation?.revision);
  if (
    !name ||
    validation?.ready !== true ||
    validatedRevision !== revision ||
    documents.length === 0 ||
    publicationBatchRevision(documents) !== revision
  ) {
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
