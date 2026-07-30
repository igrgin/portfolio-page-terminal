import type {
  PublicationAssetCheck,
  PublicationBatchCandidate,
  PublicationReadinessCategory,
  PublicationReadinessReport,
  PublicationReleaseLimits,
} from "@portfolio/content";
import {
  loadStrongReferenceClosure,
  publishedDocumentId,
  validatePublicationBatch,
} from "@portfolio/content";
import React from "react";

const categoryLabels: Readonly<Record<PublicationReadinessCategory, string>> = {
  accessibility: "Accessibility",
  asset: "Assets",
  batch: "Batch",
  bilingual: "Bilingual",
  date: "Dates",
  diagram: "Diagrams",
  freeTier: "Free tier",
  ordering: "Ordering",
  privacy: "Privacy",
  reference: "References",
  slug: "Slugs",
  url: "URLs",
};

export function PublicationReadinessSummary({
  report,
}: Readonly<{ report: PublicationReadinessReport }>) {
  const issuesByCategory = new Map<
    PublicationReadinessCategory,
    PublicationReadinessReport["issues"][number][]
  >();
  for (const issue of report.issues) {
    const issues = issuesByCategory.get(issue.category) ?? [];
    issues.push(issue);
    issuesByCategory.set(issue.category, issues);
  }
  const grouped = [...issuesByCategory];

  return (
    <section
      aria-labelledby="publication-readiness-heading"
      className="publication-readiness"
      data-ready={report.ready}
    >
      <header>
        <div>
          <h2 id="publication-readiness-heading">Publication readiness</h2>
          <p>
            Revision <code>{report.revision.slice(0, 12)}</code> ·{" "}
            {report.documentIds.length} changed document
            {report.documentIds.length === 1 ? "" : "s"}
          </p>
        </div>
        <strong role="status">{report.ready ? "Ready" : "Not ready"}</strong>
      </header>
      {report.ready ? (
        <p>
          The bilingual, reference, asset, accessibility, privacy, and free-tier
          gates all pass for this exact batch revision.
        </p>
      ) : (
        <div className="publication-readiness__issues">
          {grouped.map(([category, issues]) => (
            <section key={category}>
              <h3>
                {categoryLabels[category]} ({issues?.length ?? 0})
              </h3>
              <ul>
                {issues?.map((issue, index) => (
                  <li key={`${issue.code}:${issue.path}:${index}`}>
                    <strong>{issue.message}</strong>
                    <span>
                      {issue.documentId ? `${issue.documentId} · ` : ""}
                      {issue.path}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

type BatchReference = Readonly<{ _ref?: string }>;

export type PublicationBatchFormValue = Readonly<{
  _id?: string;
  _rev?: string;
  _type?: string;
  assetChecks?: readonly PublicationAssetCheck[];
  documents?: readonly BatchReference[];
  factualParityConfirmed?: boolean;
  limits?: Partial<PublicationReleaseLimits>;
  name?: string;
  privacyReviewed?: boolean;
  validation?: PublicationReadinessReport;
  workflow?: unknown;
}>;

export type ReadinessClient = Readonly<{
  fetch: <T>(query: string, parameters?: Record<string, unknown>) => Promise<T>;
  withConfig: (configuration: Record<string, unknown>) => ReadinessClient;
}>;

export async function runPublicationReadiness(
  client: ReadinessClient,
  value: PublicationBatchFormValue,
): Promise<PublicationReadinessReport> {
  return (await loadPublicationCandidate(client, value)).report;
}

export async function loadPublicationCandidate(
  client: ReadinessClient,
  value: PublicationBatchFormValue,
): Promise<
  Readonly<{
    candidate: PublicationBatchCandidate;
    report: PublicationReadinessReport;
  }>
> {
  const documentIds = (value.documents ?? [])
    .map(({ _ref }) => _ref?.replace(/^drafts\./, ""))
    .filter((id): id is string => Boolean(id));
  const previewClient = client.withConfig({ perspective: "previewDrafts" });
  const rawClient = client.withConfig({ perspective: "raw" });
  const documents = await previewClient.fetch<Record<string, unknown>[]>(
    `*[_id in $documentIds]`,
    { documentIds },
  );
  const { documentIds: closureDocumentIds, referenceDocuments } =
    await loadStrongReferenceClosure(documents, (referencedIds) =>
      previewClient.fetch<Record<string, unknown>[]>(`*[_id in $documentIds]`, {
        documentIds: referencedIds,
      }),
    );
  const draftIds = closureDocumentIds.map((id) => `drafts.${id}`);
  const changedDocuments = await rawClient.fetch<Record<string, unknown>[]>(
    `*[_id in $draftIds]`,
    { draftIds },
  );
  const changedById = new Map(
    changedDocuments
      .filter(
        (document) =>
          typeof document._id === "string" && document._id.length > 0,
      )
      .map((document) => [
        publishedDocumentId(document._id as string),
        document,
      ]),
  );
  const exactDocuments = documents.map(
    (document) =>
      changedById.get(
        publishedDocumentId(
          typeof document._id === "string" ? document._id : "",
        ),
      ) ?? document,
  );
  const limits = value.limits;
  const candidate: PublicationBatchCandidate = {
    assetChecks: value.assetChecks ?? [],
    changedDocumentIds: changedDocuments
      .map(({ _id }) => (typeof _id === "string" ? _id : ""))
      .filter(Boolean),
    documents: exactDocuments,
    factualParityConfirmed: value.factualParityConfirmed === true,
    limits: {
      compressedWorkerBytes: limits?.compressedWorkerBytes ?? Number.NaN,
      dynamicCpuMilliseconds: limits?.dynamicCpuMilliseconds ?? Number.NaN,
      staticFileCount: limits?.staticFileCount ?? Number.NaN,
    },
    name: value.name ?? "",
    privacyReviewed: value.privacyReviewed === true,
    referenceDocuments,
  };
  return {
    candidate,
    report: validatePublicationBatch(candidate),
  };
}
