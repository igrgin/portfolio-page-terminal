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

export type PublicationRecoveryStatus =
  | "deploymentReactivationRequired"
  | "contentRestoreRequired"
  | "confirmingBuildPending"
  | "confirmingBuildFailed"
  | "complete";

export type PublicationRecovery = Readonly<{
  buildRequestId?: string;
  completedAt?: string;
  kind: "failedCandidate" | "postRelease";
  previousDeploymentId: string;
  previousRevision: string;
  reactivatedAt?: string;
  restoredAt?: string;
  startedAt: string;
  status: PublicationRecoveryStatus;
}>;

export type PublicationWorkflowState = Readonly<{
  acknowledgements: Readonly<
    Partial<Record<Locale, PublicationRevisionEvidence>>
  >;
  candidateRevision: string;
  deployment: PublicationDeployment | null;
  publication: PublicationRecord | null;
  recovery: PublicationRecovery | null;
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
    recovery: null,
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

type BeginPublicationRecoveryInput = Readonly<{
  previousDeploymentId: string;
  previousRevision: string;
  startedAt: string;
}>;

function requireRecoveryInput(input: BeginPublicationRecoveryInput): void {
  if (
    !input.previousDeploymentId.trim() ||
    !input.previousRevision.trim() ||
    !input.startedAt.trim()
  ) {
    throw new Error(
      "Recovery requires the previous deployment, revision, and start time.",
    );
  }
}

export function beginFailedCandidateRecovery(
  state: PublicationWorkflowState,
  input: BeginPublicationRecoveryInput,
): PublicationWorkflowState {
  requireRecoveryInput(input);
  if (
    state.deployment?.status !== "buildFailed" ||
    state.deployment.revision !== state.candidateRevision ||
    state.publication?.revision !== state.candidateRevision
  ) {
    throw new Error(
      "Failed-candidate recovery requires the matching failed publication build.",
    );
  }
  if (!state.rollback || state.rollback.revision !== state.candidateRevision) {
    throw new Error(
      "Failed-candidate recovery requires the matching private rollback bundle.",
    );
  }

  return {
    ...state,
    recovery: {
      ...input,
      kind: "failedCandidate",
      status: "contentRestoreRequired",
    },
  };
}

export function beginPostReleaseRollback(
  state: PublicationWorkflowState,
  input: BeginPublicationRecoveryInput,
): PublicationWorkflowState {
  requireRecoveryInput(input);
  if (
    state.deployment?.status !== "live" ||
    state.deployment.revision !== state.candidateRevision ||
    state.publication?.revision !== state.candidateRevision
  ) {
    throw new Error(
      "Post-release rollback requires the matching live publication.",
    );
  }
  if (!state.rollback || state.rollback.revision !== state.candidateRevision) {
    throw new Error(
      "Post-release rollback requires the matching private rollback bundle.",
    );
  }

  return {
    ...state,
    recovery: {
      ...input,
      kind: "postRelease",
      status: "deploymentReactivationRequired",
    },
  };
}

export function confirmPreviousDeploymentReactivated(
  state: PublicationWorkflowState,
  reactivatedAt: string,
): PublicationWorkflowState {
  const recovery = state.recovery;
  if (
    !reactivatedAt.trim() ||
    recovery?.kind !== "postRelease" ||
    recovery.status !== "deploymentReactivationRequired"
  ) {
    throw new Error(
      "Only a post-release rollback awaiting deployment reactivation can be confirmed.",
    );
  }

  return {
    ...state,
    deployment: {
      revision: recovery.previousRevision,
      status: "live",
      updatedAt: reactivatedAt,
    },
    recovery: {
      ...recovery,
      reactivatedAt,
      status: "contentRestoreRequired",
    },
  };
}

export function recordPublicationContentRestored(
  state: PublicationWorkflowState,
  evidence: Readonly<{ buildRequestId: string; restoredAt: string }>,
): PublicationWorkflowState {
  const recovery = state.recovery;
  if (recovery?.status === "deploymentReactivationRequired") {
    throw new Error(
      "Post-release rollback must reactivate the previous successful deployment before restoring Sanity.",
    );
  }
  if (
    recovery?.status !== "contentRestoreRequired" ||
    !evidence.buildRequestId.trim() ||
    !evidence.restoredAt.trim()
  ) {
    throw new Error(
      "Content restoration requires an active recovery and confirming build request.",
    );
  }

  return {
    ...state,
    recovery: {
      ...recovery,
      ...evidence,
      status: "confirmingBuildPending",
    },
  };
}

export function recordPublicationRecoveryBuildOutcome(
  state: PublicationWorkflowState,
  outcome: "buildFailed" | "live",
  completedAt: string,
): PublicationWorkflowState {
  const recovery = state.recovery;
  if (
    recovery?.status !== "confirmingBuildPending" ||
    !completedAt.trim()
  ) {
    throw new Error(
      "A recovery build outcome requires the matching pending confirming build.",
    );
  }

  return {
    ...state,
    ...(outcome === "live"
      ? {
          deployment: {
            revision: recovery.previousRevision,
            status: "live" as const,
            updatedAt: completedAt,
          },
        }
      : {}),
    recovery: {
      ...recovery,
      completedAt,
      status: outcome === "live" ? "complete" : "confirmingBuildFailed",
    },
  };
}

export function publicationWorkflowVisibility(
  state: PublicationWorkflowState,
  revision: string,
): Readonly<{
  portfolio: "buildFailed" | "buildPending" | "live" | "notLive";
  sanity: "notPublished" | "published" | "restored";
}> {
  const restoredRevision =
    state.recovery?.previousRevision === revision &&
    (state.recovery.status === "confirmingBuildPending" ||
      state.recovery.status === "confirmingBuildFailed" ||
      state.recovery.status === "complete");
  return {
    portfolio:
      state.deployment?.revision === revision
        ? state.deployment.status
        : "notLive",
    sanity: restoredRevision
      ? "restored"
      : state.publication?.revision === revision
        ? "published"
        : "notPublished",
  };
}
