import type {
  PublicationReadinessReport,
  PublicationWorkflowState,
} from "@portfolio/content";
import {
  acknowledgePublicationPreview,
  capturePublicationRollback,
  publicationWorkflowReadiness,
  publicationWorkflowVisibility,
  publishedDocumentId,
  validatedPublicationWorkflow,
} from "@portfolio/content";
import React from "react";
import {
  type ObjectInputProps,
  PatchEvent,
  set,
  unset,
  useClient,
  useFormValue,
} from "sanity";

import { studioPreviewOrigin, studioRollbackDataset } from "../environment";
import {
  capturePublicationRollbackBundle,
  loadPublicationRollbackBundle,
  publicationWorkflowFromValue,
  publishAtomicPublicationBatch,
  serializePublicationWorkflow,
  type AtomicPublicationClient,
  type PublicationRollbackClient,
} from "../publication-release";
import {
  loadPublicationCandidate,
  publicationRevisionWatchIds,
  publicationWorkflowRequiresRevalidation,
  PublicationReadinessSummary,
  runPublicationReadiness,
  type PublicationBatchFormValue,
} from "./publication-readiness";

function clearReleaseEvidencePatches() {
  return [
    unset(["validation"]),
    unset(["workflow", "validationRevision"]),
    unset(["workflow", "acknowledgements"]),
    unset(["workflow", "rollback"]),
  ];
}

export function PublicationWorkflowSummary({
  revision,
  workflow,
}: Readonly<{
  revision: string;
  workflow: PublicationWorkflowState;
}>) {
  const readiness = publicationWorkflowReadiness(workflow, revision);
  const visibility = publicationWorkflowVisibility(workflow, revision);
  const gate = (passed: boolean) => (passed ? "Complete" : "Required");

  return (
    <section
      aria-labelledby="publication-workflow-heading"
      className="publication-workflow"
    >
      <h2 id="publication-workflow-heading">Release state</h2>
      <dl>
        <div>
          <dt>English preview</dt>
          <dd>{gate(workflow.acknowledgements.en?.revision === revision)}</dd>
        </div>
        <div>
          <dt>Croatian preview</dt>
          <dd>{gate(workflow.acknowledgements.hr?.revision === revision)}</dd>
        </div>
        <div>
          <dt>Private rollback bundle</dt>
          <dd>{gate(readiness.rollbackCaptured)}</dd>
        </div>
        <div>
          <dt>Published in Sanity</dt>
          <dd>
            {visibility.sanity === "published" ? "Published" : "Not published"}
          </dd>
        </div>
        <div>
          <dt>Live on the portfolio</dt>
          <dd>
            {visibility.portfolio === "live"
              ? "Live"
              : visibility.portfolio === "buildPending"
                ? "Protected build pending"
                : visibility.portfolio === "buildFailed"
                  ? "Build failed — previous deployment remains live"
                  : "Not live"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function PublicationBatchInput(props: ObjectInputProps) {
  const value = useFormValue([]) as PublicationBatchFormValue | undefined;
  const client = useClient({ apiVersion: "2025-02-19" });
  const [report, setReport] = React.useState<PublicationReadinessReport | null>(
    null,
  );
  const [running, setRunning] = React.useState(false);
  const [releaseAction, setReleaseAction] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const storedReport =
    value?.validation &&
    typeof value.validation.revision === "string" &&
    Array.isArray(value.validation.closureDocumentIds) &&
    Array.isArray(value.validation.documentIds) &&
    Array.isArray(value.validation.issues) &&
    typeof value.validation.ready === "boolean"
      ? value.validation
      : null;
  const storedWorkflow = publicationWorkflowFromValue(value?.workflow);
  const publishedCurrentRevision = Boolean(
    storedWorkflow &&
    storedWorkflow.publication?.revision === storedWorkflow.candidateRevision,
  );
  const acknowledgementKey = [
    storedWorkflow?.acknowledgements.en?.revision,
    storedWorkflow?.acknowledgements.en?.acknowledgedAt,
    storedWorkflow?.acknowledgements.hr?.revision,
    storedWorkflow?.acknowledgements.hr?.acknowledgedAt,
  ].join("\u0000");
  const rollbackKey = [
    storedWorkflow?.rollback?.revision,
    storedWorkflow?.rollback?.bundleId,
    storedWorkflow?.rollback?.capturedAt,
  ].join("\u0000");
  const activeReport = report ?? storedReport;
  const activeRevision = activeReport?.revision;
  const selectedDocumentIds = (value?.documents ?? [])
    .map(({ _ref }) => _ref && publishedDocumentId(_ref))
    .filter((documentId): documentId is string => Boolean(documentId))
    .sort();
  const selectedDocumentKey = selectedDocumentIds.join("\u0000");
  const watchedDocumentIds = storedReport
    ? publicationRevisionWatchIds(storedReport)
    : [];
  const watchedDocumentKey = watchedDocumentIds.join("\u0000");

  React.useEffect(() => {
    if (
      releaseAction !== null ||
      publishedCurrentRevision ||
      !storedWorkflow ||
      !storedWorkflow.validationRevision
    ) {
      return;
    }
    if (watchedDocumentIds.length === 0) {
      return;
    }
    const subscription = client
      .listen(
        `*[_id in $documentIds]`,
        { documentIds: watchedDocumentIds },
        {
          events: ["mutation"],
          includeResult: false,
          visibility: "query",
        },
      )
      .subscribe(() => {
        setReport(null);
        setNotice(
          "A selected document changed. Validation, preview acknowledgements, and rollback evidence were cleared.",
        );
        props.onChange(PatchEvent.from(clearReleaseEvidencePatches()));
      });

    return () => subscription.unsubscribe();
  }, [
    client,
    props.onChange,
    releaseAction,
    publishedCurrentRevision,
    watchedDocumentKey,
    acknowledgementKey,
    rollbackKey,
  ]);

  React.useEffect(() => {
    if (
      releaseAction !== null ||
      publishedCurrentRevision ||
      !storedReport ||
      !storedWorkflow ||
      !publicationWorkflowRequiresRevalidation(storedWorkflow, storedReport)
    ) {
      return;
    }
    let active = true;
    void runPublicationReadiness(client, value ?? {})
      .then((currentReport) => {
        if (
          active &&
          (currentReport.revision !== storedReport.revision ||
            !currentReport.ready)
        ) {
          setReport(null);
          setNotice(
            "The saved candidate revision changed. Validation, preview acknowledgements, and rollback evidence were cleared.",
          );
          props.onChange(PatchEvent.from(clearReleaseEvidencePatches()));
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "The saved release evidence could not be revalidated and is not eligible for publication.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [
    client,
    props.onChange,
    releaseAction,
    publishedCurrentRevision,
    selectedDocumentKey,
    storedReport?.revision,
    storedWorkflow?.candidateRevision,
  ]);

  function persistWorkflow(workflow: PublicationWorkflowState) {
    props.onChange(
      PatchEvent.from(
        set(serializePublicationWorkflow(workflow), ["workflow"]),
      ),
    );
  }

  async function requireCurrentReadyWorkflow() {
    const currentReport = await runPublicationReadiness(client, value ?? {});
    const workflow = publicationWorkflowFromValue(value?.workflow);
    if (
      !currentReport.ready ||
      value?.validation?.ready !== true ||
      value.validation.revision !== currentReport.revision ||
      workflow?.validationRevision !== currentReport.revision
    ) {
      throw new Error(
        "The candidate changed or is blocked. Run batch readiness again.",
      );
    }
    return { report: currentReport, workflow };
  }

  async function runValidation() {
    setRunning(true);
    setError(null);
    setNotice(null);
    try {
      const nextReport = await runPublicationReadiness(client, value ?? {});
      setReport(nextReport);
      const nextWorkflow = nextReport.ready
        ? validatedPublicationWorkflow(nextReport.revision)
        : {
            ...validatedPublicationWorkflow(nextReport.revision),
            validationRevision: null,
          };
      props.onChange(
        PatchEvent.from(
          set(
            {
              documentIds: nextReport.documentIds,
              closureDocumentIds: nextReport.closureDocumentIds,
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
        ).append(set(serializePublicationWorkflow(nextWorkflow), ["workflow"])),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Readiness validation could not complete. No prior result was accepted.",
      );
    } finally {
      setRunning(false);
    }
  }

  async function acknowledgePreview(locale: "en" | "hr") {
    setReleaseAction(`acknowledge-${locale}`);
    setError(null);
    setNotice(null);
    try {
      const current = await requireCurrentReadyWorkflow();
      persistWorkflow(
        acknowledgePublicationPreview(
          current.workflow,
          locale,
          current.report.revision,
          new Date().toISOString(),
        ),
      );
      setNotice(
        `${locale === "en" ? "English" : "Croatian"} preview acknowledged for this revision.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Preview acknowledgement failed.",
      );
    } finally {
      setReleaseAction(null);
    }
  }

  async function captureRollback() {
    setReleaseAction("rollback");
    setError(null);
    setNotice(null);
    try {
      const current = await requireCurrentReadyWorkflow();
      const batchId = value?._id;
      if (!batchId) {
        throw new Error(
          "Save the Publication batch before capturing rollback.",
        );
      }
      const contentDataset = client.config().dataset;
      if (!contentDataset) {
        throw new Error("The Studio content dataset is not configured.");
      }
      const capturedAt = new Date().toISOString();
      const evidence = await capturePublicationRollbackBundle(
        client.withConfig({
          perspective: "published",
          useCdn: false,
        }),
        client.withConfig({
          dataset: studioRollbackDataset,
          perspective: "raw",
          useCdn: false,
        }) as unknown as PublicationRollbackClient,
        {
          batchId,
          capturedAt,
          contentDataset,
          documentIds: current.report.documentIds,
          revision: current.report.revision,
          rollbackDataset: studioRollbackDataset,
        },
      );
      persistWorkflow(capturePublicationRollback(current.workflow, evidence));
      setNotice(
        "Current published documents and asset references were captured in the private rollback dataset.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Rollback capture failed.",
      );
    } finally {
      setReleaseAction(null);
    }
  }

  async function publishBatch() {
    setReleaseAction("publish");
    setError(null);
    setNotice(null);
    try {
      const current = await requireCurrentReadyWorkflow();
      if (
        !publicationWorkflowReadiness(current.workflow, current.report.revision)
          .readyToPublish
      ) {
        throw new Error(
          "Acknowledge both previews and capture the private rollback bundle first.",
        );
      }
      const batchId = value?._id;
      if (!batchId) {
        throw new Error("Save the Publication batch before publication.");
      }
      const publishedBatchId = publishedDocumentId(batchId);
      const draftBatchId = `drafts.${publishedBatchId}`;
      const rawClient = client.withConfig({
        perspective: "raw",
        useCdn: false,
      });
      const batchDocument = await rawClient.fetch<Record<
        string,
        unknown
      > | null>(`*[_id == $batchId][0]`, { batchId: draftBatchId });
      if (!batchDocument) {
        throw new Error(
          "The exact saved batch could not be loaded. Wait for Studio to finish saving and re-run readiness.",
        );
      }
      const loaded = await loadPublicationCandidate(
        client,
        batchDocument as PublicationBatchFormValue,
      );
      const savedWorkflow = publicationWorkflowFromValue(
        batchDocument.workflow,
      );
      if (
        !savedWorkflow ||
        !savedWorkflow.rollback ||
        !loaded.report.ready ||
        loaded.report.revision !== current.report.revision ||
        !publicationWorkflowReadiness(savedWorkflow, current.report.revision)
          .readyToPublish
      ) {
        throw new Error(
          "The release evidence has not finished saving. Wait for Studio and try again.",
        );
      }
      const rollbackBundle = await loadPublicationRollbackBundle(
        client.withConfig({
          dataset: studioRollbackDataset,
          perspective: "raw",
          useCdn: false,
        }),
        savedWorkflow.rollback.bundleId,
      );
      await publishAtomicPublicationBatch(
        client as unknown as AtomicPublicationClient,
        {
          batchDocument,
          candidate: loaded.candidate,
          publishedAt: new Date().toISOString(),
          revision: current.report.revision,
          rollbackBundle,
          workflow: savedWorkflow,
        },
      );
      setNotice(
        "Published in Sanity atomically. Exactly one protected production build is now pending.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Atomic publication failed.",
      );
    } finally {
      setReleaseAction(null);
    }
  }

  const defaultInputProps: ObjectInputProps = {
    ...props,
    readOnly: props.readOnly || publishedCurrentRevision,
    onChange: (event: Parameters<ObjectInputProps["onChange"]>[0]) => {
      setReport(null);
      props.onChange(
        PatchEvent.from(event).append(...clearReleaseEvidencePatches()),
      );
    },
  };

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
        .publication-batch-input__actions { align-items: center; display: flex; flex-wrap: wrap; gap: .75rem; }
        .publication-workflow { border: 1px solid var(--card-border-color); border-radius: .25rem; padding: 1rem; }
        .publication-workflow h2 { margin: 0 0 .75rem; }
        .publication-workflow dl { display: grid; gap: .5rem; margin: 0; }
        .publication-workflow dl > div { display: flex; gap: 1rem; justify-content: space-between; }
        .publication-workflow dd { font-weight: 600; margin: 0; text-align: right; }
        .publication-batch-input__preview-links { display: flex; flex-wrap: wrap; gap: .75rem; }
      `}</style>
      {props.renderDefault(defaultInputProps)}
      <div className="publication-batch-input__actions">
        <button
          disabled={running || publishedCurrentRevision}
          onClick={runValidation}
          type="button"
        >
          {publishedCurrentRevision
            ? "Published batch is immutable"
            : running
              ? "Running complete validation…"
              : "Run batch readiness"}
        </button>
        <span>
          Validation covers this batch and its strong-reference closure. Any
          document or readiness-evidence edit makes it stale.
        </span>
      </div>
      {activeReport?.ready && activeRevision && storedWorkflow && (
        <>
          {!publishedCurrentRevision && (
            <>
              <div className="publication-batch-input__preview-links">
                <a
                  href={new URL("/draft/en/about", studioPreviewOrigin).href}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open English batch preview
                </a>
                <a
                  href={new URL("/draft/hr/o-meni", studioPreviewOrigin).href}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open Croatian batch preview
                </a>
              </div>
              <div className="publication-batch-input__actions">
                <button
                  disabled={releaseAction !== null}
                  onClick={() => acknowledgePreview("en")}
                  type="button"
                >
                  Acknowledge English preview
                </button>
                <button
                  disabled={releaseAction !== null}
                  onClick={() => acknowledgePreview("hr")}
                  type="button"
                >
                  Acknowledge Croatian preview
                </button>
                <button
                  disabled={releaseAction !== null}
                  onClick={captureRollback}
                  type="button"
                >
                  Capture private rollback bundle
                </button>
                <button
                  disabled={releaseAction !== null}
                  onClick={publishBatch}
                  type="button"
                >
                  Publish atomically
                </button>
              </div>
            </>
          )}
          <PublicationWorkflowSummary
            revision={activeRevision}
            workflow={storedWorkflow}
          />
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {activeReport && <PublicationReadinessSummary report={activeReport} />}
    </div>
  );
}
