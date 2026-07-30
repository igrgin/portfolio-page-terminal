import type { Locale } from "./index";

export type PublicationRevisionEvidence = Readonly<{
  acknowledgedAt: string;
  revision: string;
}>;

export type PublicationRollbackEvidence = Readonly<{
  bundleId: string;
  capturedAt: string;
  revision: string;
}>;

export type PublicationRecord = Readonly<{
  buildRequestId: string;
  publishedAt: string;
  revision: string;
}>;

export type PublicationDeployment = Readonly<{
  revision: string;
  status: "buildFailed" | "buildPending" | "live";
  updatedAt: string;
}>;

export type PublicationWorkflowState = Readonly<{
  acknowledgements: Readonly<
    Partial<Record<Locale, PublicationRevisionEvidence>>
  >;
  candidateRevision: string;
  deployment: PublicationDeployment | null;
  publication: PublicationRecord | null;
  rollback: PublicationRollbackEvidence | null;
  validationRevision: string | null;
}>;

export type PublicationWorkflowReadiness = Readonly<{
  bothPreviewsAcknowledged: boolean;
  rollbackCaptured: boolean;
  readyToPublish: boolean;
  validationCurrent: boolean;
}>;

export function validatedPublicationWorkflow(
  revision: string,
): PublicationWorkflowState {
  return {
    acknowledgements: {},
    candidateRevision: revision,
    deployment: null,
    publication: null,
    rollback: null,
    validationRevision: revision,
  };
}

export function acknowledgePublicationPreview(
  state: PublicationWorkflowState,
  locale: Locale,
  revision: string,
  acknowledgedAt: string,
): PublicationWorkflowState {
  if (
    state.candidateRevision !== revision ||
    state.validationRevision !== revision
  ) {
    throw new Error(
      "Preview acknowledgement requires the current validated batch revision.",
    );
  }

  return {
    ...state,
    acknowledgements: {
      ...state.acknowledgements,
      [locale]: { acknowledgedAt, revision },
    },
  };
}

export function invalidatePublicationWorkflow(
  state: PublicationWorkflowState,
  candidateRevision: string,
): PublicationWorkflowState {
  return {
    ...state,
    acknowledgements: {},
    candidateRevision,
    rollback: null,
    validationRevision: null,
  };
}

export function publicationWorkflowReadiness(
  state: PublicationWorkflowState,
  revision: string,
): PublicationWorkflowReadiness {
  const validationCurrent =
    state.candidateRevision === revision &&
    state.validationRevision === revision;
  const bothPreviewsAcknowledged =
    validationCurrent &&
    state.acknowledgements.en?.revision === revision &&
    state.acknowledgements.hr?.revision === revision;
  const rollbackCaptured =
    bothPreviewsAcknowledged && state.rollback?.revision === revision;

  return {
    bothPreviewsAcknowledged,
    rollbackCaptured,
    readyToPublish: rollbackCaptured,
    validationCurrent,
  };
}

export function capturePublicationRollback(
  state: PublicationWorkflowState,
  rollback: PublicationRollbackEvidence,
): PublicationWorkflowState {
  if (rollback.revision !== state.candidateRevision) {
    throw new Error(
      "Rollback evidence must be captured for the current batch revision.",
    );
  }
  if (
    !publicationWorkflowReadiness(state, rollback.revision)
      .bothPreviewsAcknowledged
  ) {
    throw new Error(
      "Rollback capture requires both English and Croatian previews to be acknowledged.",
    );
  }

  return { ...state, rollback };
}

export function publishPublicationWorkflow(
  state: PublicationWorkflowState,
  publication: PublicationRecord,
): PublicationWorkflowState {
  if (
    !publicationWorkflowReadiness(state, publication.revision).readyToPublish
  ) {
    throw new Error(
      "Publication requires current validation, both preview acknowledgements, and a rollback bundle.",
    );
  }
  if (state.publication?.revision === publication.revision) {
    throw new Error("This exact batch revision has already been published.");
  }

  return {
    ...state,
    deployment: {
      revision: publication.revision,
      status: "buildPending",
      updatedAt: publication.publishedAt,
    },
    publication,
  };
}

export function recordPublicationBuildOutcome(
  state: PublicationWorkflowState,
  revision: string,
  outcome: "buildFailed" | "live",
  updatedAt: string,
): PublicationWorkflowState {
  if (
    state.publication?.revision !== revision ||
    state.deployment?.revision !== revision ||
    state.deployment.status !== "buildPending"
  ) {
    throw new Error(
      "A build outcome requires the matching published batch revision.",
    );
  }

  return {
    ...state,
    deployment: { revision, status: outcome, updatedAt },
  };
}

export function publicationWorkflowVisibility(
  state: PublicationWorkflowState,
  revision: string,
): Readonly<{
  portfolio: "buildFailed" | "buildPending" | "live" | "notLive";
  sanity: "notPublished" | "published";
}> {
  return {
    portfolio:
      state.deployment?.revision === revision
        ? state.deployment.status
        : "notLive",
    sanity:
      state.publication?.revision === revision ? "published" : "notPublished",
  };
}
