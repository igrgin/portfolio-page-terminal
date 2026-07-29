/**
 * PROTOTYPE — pure state model for the bilingual editorial release workflow.
 *
 * Question: can one publication batch safely coordinate paired localization,
 * cross-document references, preview review, publication, deployment, export,
 * and rollback without conflating Sanity's published state with the live site?
 */

const EDIT_ACTIONS = new Set([
  "FIX_PARITY",
  "FIX_ACCESSIBILITY",
  "INCLUDE_REFERENCE_CLOSURE",
  "FIX_ASSETS",
  "FIX_PRIVACY",
]);

export function createInitialState() {
  return {
    batch: {
      name: "July portfolio refresh",
      status: "editing",
      documents: ["project.distributed-event-platform"],
      changedReferencesOutsideBatch: ["skill.kafka"],
    },
    checks: {
      parity: false,
      accessibility: false,
      references: false,
      assets: false,
      privacy: false,
    },
    validation: {
      run: 0,
      valid: false,
    },
    preview: {
      enReviewed: false,
      hrReviewed: false,
      route: "/projects/distributed-event-platform",
    },
    export: {
      rollbackBundle: null,
      lastFullExport: "2026-07-28",
      restoreDrillPassed: true,
    },
    revisions: {
      draftCandidate: "content-r8",
      sanityPublished: "content-r7",
      publicApplication: "content-r7",
      previousPublic: "content-r7",
    },
    deployment: {
      status: "idle",
      candidate: null,
    },
    lastEvent:
      "Draft changes exist. Complete the batch-wide release gates before publication.",
  };
}

function clone(state) {
  return structuredClone(state);
}

function staticBlockers(state) {
  return Object.entries(state.checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
}

export function derive(state) {
  const blockers = staticBlockers(state);
  const validationCurrent = state.validation.valid && blockers.length === 0;
  const previewsReviewed =
    state.preview.enReviewed && state.preview.hrReviewed;
  const rollbackReady = Boolean(state.export.rollbackBundle);
  const exportRecoverable = state.export.restoreDrillPassed;
  const readyToPublish =
    validationCurrent &&
    previewsReviewed &&
    rollbackReady &&
    exportRecoverable &&
    state.batch.status === "ready";

  return {
    blockers,
    validationCurrent,
    previewsReviewed,
    rollbackReady,
    exportRecoverable,
    readyToPublish,
    contentMatchesPublic:
      state.revisions.sanityPublished === state.revisions.publicApplication,
  };
}

function invalidateReview(next) {
  next.validation.valid = false;
  next.preview.enReviewed = false;
  next.preview.hrReviewed = false;
  next.export.rollbackBundle = null;
  next.batch.status = "editing";
  next.deployment.status = "idle";
  next.deployment.candidate = null;
}

function reject(state, message) {
  const next = clone(state);
  next.lastEvent = `BLOCKED — ${message}`;
  return next;
}

export function transition(state, action) {
  if (action.type === "RESET") return createInitialState();

  const next = clone(state);

  if (EDIT_ACTIONS.has(action.type)) {
    if (state.batch.status !== "editing" && state.batch.status !== "ready") {
      return reject(
        state,
        "Reset the prototype before editing a batch that has already been published.",
      );
    }
    invalidateReview(next);
  }

  switch (action.type) {
    case "FIX_PARITY":
      next.checks.parity = true;
      next.lastEvent =
        "EN and HR now have equal factual coverage; no runtime locale fallback is used.";
      return next;

    case "FIX_ACCESSIBILITY":
      next.checks.accessibility = true;
      next.lastEvent =
        "Localized alt text, captions, diagram titles, and long descriptions are complete.";
      return next;

    case "INCLUDE_REFERENCE_CLOSURE":
      next.checks.references = true;
      next.batch.documents.push(...next.batch.changedReferencesOutsideBatch);
      next.batch.changedReferencesOutsideBatch = [];
      next.lastEvent =
        "The changed Skill and every other strong-reference dependency are inside the batch.";
      return next;

    case "FIX_ASSETS":
      next.checks.assets = true;
      next.lastEvent =
        "PDF type/text/metadata and image/Mermaid render checks now pass for both locales.";
      return next;

    case "FIX_PRIVACY":
      next.checks.privacy = true;
      next.lastEvent =
        "The internal client name was removed; every draft and asset is publish-safe.";
      return next;

    case "VALIDATE": {
      next.validation.run += 1;
      const blockers = staticBlockers(next);
      next.validation.valid = blockers.length === 0;
      next.batch.status = next.validation.valid ? "validated" : "editing";
      next.lastEvent = next.validation.valid
        ? "Batch-wide schema, parity, accessibility, reference, asset, and privacy validation passed."
        : `Validation failed: ${blockers.join(", ")}.`;
      return next;
    }

    case "PREVIEW_EN":
    case "PREVIEW_HR": {
      if (!derive(state).validationCurrent) {
        return reject(state, "Run a clean validation before reviewing previews.");
      }
      const locale = action.type === "PREVIEW_EN" ? "en" : "hr";
      next.preview[`${locale}Reviewed`] = true;
      next.batch.status =
        next.preview.enReviewed && next.preview.hrReviewed
          ? "previewed"
          : "validated";
      next.lastEvent =
        `${locale.toUpperCase()} draft preview reviewed in the real application composition.`;
      return next;
    }

    case "CAPTURE_EXPORT": {
      const readiness = derive(state);
      if (!readiness.validationCurrent || !readiness.previewsReviewed) {
        return reject(
          state,
          "Validate and review both localized previews before freezing a rollback bundle.",
        );
      }
      next.export.rollbackBundle = "rollback-content-r7.json";
      next.batch.status = "ready";
      next.lastEvent =
        "Previous published documents and asset references captured; off-platform export restore drill is current.";
      return next;
    }

    case "PUBLISH": {
      if (!derive(state).readyToPublish) {
        return reject(
          state,
          "The publication batch is not ready; validation, both previews, and recovery evidence are mandatory.",
        );
      }
      next.revisions.sanityPublished = next.revisions.draftCandidate;
      next.batch.status = "published_build_pending";
      next.deployment.status = "queued";
      next.deployment.candidate = next.revisions.draftCandidate;
      next.lastEvent =
        "All batch drafts published in one transaction; one protected production build was queued.";
      return next;
    }

    case "DEPLOY_SUCCESS": {
      if (!["queued", "failed", "rollback_queued"].includes(state.deployment.status)) {
        return reject(state, "There is no queued or retryable deployment.");
      }
      next.revisions.publicApplication = state.deployment.candidate;
      const rolledBack =
        state.deployment.candidate === state.revisions.previousPublic;
      next.batch.status = rolledBack ? "rolled_back" : "live";
      next.deployment.status = "succeeded";
      next.lastEvent = rolledBack
        ? "Restored content built successfully; Sanity and the public application are back on content-r7."
        : "The static build passed release checks and atomically replaced the public deployment.";
      return next;
    }

    case "DEPLOY_FAILURE": {
      if (state.deployment.status !== "queued") {
        return reject(state, "Only a queued candidate build can fail in this scenario.");
      }
      next.batch.status = "build_failed";
      next.deployment.status = "failed";
      next.lastEvent =
        "Candidate build failed. The existing content-r7 application remains public.";
      return next;
    }

    case "ROLLBACK_PUBLIC": {
      if (
        state.batch.status !== "live" ||
        state.revisions.publicApplication === state.revisions.previousPublic
      ) {
        return reject(
          state,
          "Public rollback is available only after the new candidate is live.",
        );
      }
      next.revisions.publicApplication = state.revisions.previousPublic;
      next.batch.status = "public_rolled_back";
      next.deployment.status = "rolled_back";
      next.deployment.candidate = null;
      next.lastEvent =
        "The host reactivated content-r7 immediately; Sanity still holds content-r8 and must be restored.";
      return next;
    }

    case "RESTORE_CONTENT": {
      if (!["build_failed", "public_rolled_back"].includes(state.batch.status)) {
        return reject(
          state,
          "Restore content only after a failed candidate build or public deployment rollback.",
        );
      }
      if (!state.export.rollbackBundle) {
        return reject(state, "The batch has no verified rollback bundle.");
      }
      next.revisions.sanityPublished = state.revisions.previousPublic;
      next.batch.status = "restoring";
      next.deployment.status = "rollback_queued";
      next.deployment.candidate = state.revisions.previousPublic;
      next.lastEvent =
        "The rollback bundle restored affected Sanity documents in one transaction; a confirming build is queued.";
      return next;
    }

    default:
      return reject(state, `Unknown action: ${action.type}`);
  }
}

