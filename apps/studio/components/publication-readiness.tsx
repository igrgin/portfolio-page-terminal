import type {
  PublicationAssetCheck,
  PublicationBatchCandidate,
  PublicationReadinessCategory,
  PublicationReadinessReport,
  PublicationReleaseLimits,
} from "@portfolio/content";
import {
  loadStrongReferenceClosure,
  validatePublicationBatch,
} from "@portfolio/content";
import React from "react";
import {
  type ObjectInputProps,
  PatchEvent,
  set,
  useClient,
  useFormValue,
} from "sanity";

const categoryLabels: Readonly<
  Record<PublicationReadinessCategory, string>
> = {
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
          The bilingual, reference, asset, accessibility, privacy, and
          free-tier gates all pass for this exact batch revision.
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
  assetChecks?: readonly PublicationAssetCheck[];
  documents?: readonly BatchReference[];
  factualParityConfirmed?: boolean;
  limits?: Partial<PublicationReleaseLimits>;
  name?: string;
  privacyReviewed?: boolean;
  validation?: PublicationReadinessReport;
}>;

export type ReadinessClient = Readonly<{
  fetch: <T>(
    query: string,
    parameters?: Record<string, unknown>,
  ) => Promise<T>;
  withConfig: (configuration: Record<string, unknown>) => ReadinessClient;
}>;

export async function runPublicationReadiness(
  client: ReadinessClient,
  value: PublicationBatchFormValue,
): Promise<PublicationReadinessReport> {
  const documentIds = (value.documents ?? [])
    .map(({ _ref }) => _ref?.replace(/^drafts\./, ""))
    .filter((id): id is string => Boolean(id));
  const previewClient = client.withConfig({ perspective: "previewDrafts" });
  const rawClient = client.withConfig({ perspective: "raw" });
  const documents = await previewClient.fetch<Record<string, unknown>[]>(
    `*[_id in $documentIds]`,
    { documentIds },
  );
  const {
    documentIds: closureDocumentIds,
    referenceDocuments,
  } = await loadStrongReferenceClosure(documents, (referencedIds) =>
    previewClient.fetch<Record<string, unknown>[]>(
      `*[_id in $documentIds]`,
      { documentIds: referencedIds },
    ),
  );
  const draftIds = closureDocumentIds.map((id) => `drafts.${id}`);
  const changedDocuments = await rawClient.fetch<
    ReadonlyArray<Readonly<{ _id: string }>>
  >(`*[_id in $draftIds]{_id}`, { draftIds });
  const limits = value.limits;
  const candidate: PublicationBatchCandidate = {
    assetChecks: value.assetChecks ?? [],
    changedDocumentIds: changedDocuments.map(({ _id }) => _id),
    documents,
    factualParityConfirmed: value.factualParityConfirmed === true,
    limits: {
      compressedWorkerBytes: limits?.compressedWorkerBytes ?? Number.NaN,
      dynamicCpuMilliseconds:
        limits?.dynamicCpuMilliseconds ?? Number.NaN,
      staticFileCount: limits?.staticFileCount ?? Number.NaN,
    },
    name: value.name ?? "",
    privacyReviewed: value.privacyReviewed === true,
    referenceDocuments,
  };
  return validatePublicationBatch(candidate);
}

export function PublicationBatchInput(props: ObjectInputProps) {
  const value = useFormValue([]) as PublicationBatchFormValue | undefined;
  const client = useClient({ apiVersion: "2025-02-19" }) as ReadinessClient;
  const [report, setReport] = React.useState<PublicationReadinessReport | null>(
    null,
  );
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const storedReport =
    value?.validation &&
    typeof value.validation.revision === "string" &&
    Array.isArray(value.validation.documentIds) &&
    Array.isArray(value.validation.issues) &&
    typeof value.validation.ready === "boolean"
      ? value.validation
      : null;

  async function runValidation() {
    setRunning(true);
    setError(null);
    try {
      const nextReport = await runPublicationReadiness(client, value ?? {});
      setReport(nextReport);
      props.onChange(
        PatchEvent.from(
          set(
            {
              documentIds: nextReport.documentIds,
              issues: nextReport.issues.map((issue, index) => ({
                _key: `${issue.code}-${index}`,
                _type: "publicationReadinessIssue",
                ...issue,
              })),
              ready: nextReport.ready,
              revision: nextReport.revision,
              validatedAt: new Date().toISOString(),
            },
            ["validation"],
          ),
        ),
      );
    } catch {
      setError(
        "Readiness validation could not complete. No prior result was accepted.",
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="publication-batch-input">
      <style>{`
        .publication-batch-input { display: grid; gap: 1rem; }
        .publication-readiness { border: 1px solid var(--card-border-color); border-radius: .25rem; padding: 1rem; }
        .publication-readiness > header { align-items: start; display: flex; gap: 1rem; justify-content: space-between; }
        .publication-readiness h2, .publication-readiness h3, .publication-readiness p { margin: 0; }
        .publication-readiness[data-ready="true"] > header > strong { color: var(--card-focus-ring-color); }
        .publication-readiness[data-ready="false"] > header > strong { color: var(--card-critical-fg-color); }
        .publication-readiness__issues { display: grid; gap: .75rem; margin-top: 1rem; }
        .publication-readiness__issues ul { margin: .4rem 0 0; padding-left: 1.25rem; }
        .publication-readiness__issues li { margin-block: .4rem; }
        .publication-readiness__issues li span { display: block; font-size: .8rem; opacity: .75; }
        .publication-batch-input__actions { align-items: center; display: flex; gap: .75rem; }
      `}</style>
      {props.renderDefault(props)}
      <div className="publication-batch-input__actions">
        <button disabled={running} onClick={runValidation} type="button">
          {running ? "Running complete validation…" : "Run batch readiness"}
        </button>
        <span>
          Validation covers this batch and its strong-reference closure. Any
          document or readiness-evidence edit makes it stale.
        </span>
      </div>
      {error && <p role="alert">{error}</p>}
      {(report ?? storedReport) && (
        <PublicationReadinessSummary report={(report ?? storedReport)!} />
      )}
    </div>
  );
}
