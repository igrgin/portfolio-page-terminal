import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  isPublicationValidationCurrent,
  validatePublicationBatch,
  type PublicationBatchCandidate,
} from "../packages/content/src";
import { PublicationReadinessSummary } from "../apps/studio/components/publication-readiness";

function validCandidate(): PublicationBatchCandidate {
  return {
    assetChecks: [],
    changedDocumentIds: ["project.platform"],
    documents: [
      {
        _id: "drafts.project.platform",
        _rev: "project-r2",
        _type: "project",
        _updatedAt: "2026-07-30T12:00:00.000Z",
        contribution: {
          en: "Designed the recovery workflow.",
          hr: "Dizajnirao tijek oporavka.",
        },
        endDate: "2026-07",
        order: 10,
        publishSafe: true,
        slug: { current: "event-platform" },
        startDate: "2026-01",
        status: "completed",
        summary: {
          en: "Recoverable event processing.",
          hr: "Obrada evenata s mogućnošću oporavka.",
        },
        title: {
          en: "Event platform",
          hr: "Platforma za evente",
        },
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
  };
}

test("a complete publish-safe bilingual batch produces a current readiness fingerprint", () => {
  const report = validatePublicationBatch(validCandidate());

  assert.equal(report.ready, true);
  assert.deepEqual(report.issues, []);
  assert.deepEqual(report.documentIds, ["project.platform"]);
  assert.match(report.revision, /^[a-f0-9]{64}$/);
});

test("readiness reports every release-gate category without hiding later failures", () => {
  const candidate = validCandidate();
  const report = validatePublicationBatch({
    ...candidate,
    assetChecks: [
      {
        assetId: "file.resume-en",
        documentId: "resumeSet",
        filename: "resume-latest.docx",
        kind: "resume",
        metadataSafe: false,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        privacySafe: false,
        selectableText: false,
        sizeBytes: 6_000_000,
        stableFilename: false,
      },
    ],
    changedDocumentIds: [
      "project.platform",
      "skill.kafka",
      "resumeSet",
    ],
    documents: [
      {
        ...candidate.documents[0],
        _rev: "project-r3",
        contribution: { en: "English only" },
        diagrams: [
          {
            _key: "unsafe",
            caption: { en: "Caption", hr: "Opis" },
            description: { en: "", hr: "" },
            id: "unsafe",
            kind: "data-flow",
            source: {
              en: "flowchart LR\n  A -- click --> B",
              hr: "flowchart LR\n  A --> B",
            },
            title: { en: "Flow", hr: "" },
          },
        ],
        endDate: "2025-13",
        heroMedia: {
          alternativeText: { en: "Dashboard" },
          image: {
            asset: {
              _ref: "image-missing-100x100-jpg",
              _type: "reference",
            },
          },
        },
        order: -1,
        publishSafe: false,
        repositoryUrl: "http://example.com/repository",
        sensitive: true,
        slug: { current: "Not Canonical" },
        startDate: "2026-02",
        supportingSkills: [
          { _ref: "skill.kafka", _type: "reference" },
        ],
      },
      {
        _id: "drafts.resumeSet",
        _rev: "resume-r2",
        _type: "resumeSet",
        _updatedAt: "2026-07-30T12:00:00.000Z",
      },
    ],
    factualParityConfirmed: false,
    limits: {
      compressedWorkerBytes: 3_000_001,
      dynamicCpuMilliseconds: 10.1,
      staticFileCount: 20_001,
    },
    name: "",
    privacyReviewed: false,
  });

  assert.equal(report.ready, false);
  assert.deepEqual(
    [...new Set(report.issues.map(({ category }) => category))].sort(),
    [
      "accessibility",
      "asset",
      "batch",
      "bilingual",
      "date",
      "diagram",
      "freeTier",
      "ordering",
      "privacy",
      "reference",
      "slug",
      "url",
    ],
  );
  assert.ok(
    report.issues.some(
      ({ code, documentId }) =>
        code === "STRONG_REFERENCE_CLOSURE" && documentId === "skill.kafka",
    ),
  );
  assert.ok(
    report.issues.some(({ code }) => code === "RESUME_SELECTABLE_TEXT"),
  );
  assert.ok(report.issues.some(({ code }) => code === "ASSET_CHECK_MISSING"));
  assert.ok(report.issues.length >= 18);
});

test("any document edit invalidates the exact validated batch revision", () => {
  const candidate = validCandidate();
  const validated = validatePublicationBatch(candidate);
  const edited = {
    ...candidate,
    documents: candidate.documents.map((document) => ({
      ...document,
      _rev: "project-r3",
      _updatedAt: "2026-07-30T12:01:00.000Z",
      summary: {
        en: "Edited recoverable event processing.",
        hr: "Uređena obrada evenata s mogućnošću oporavka.",
      },
    })),
  };

  assert.equal(
    isPublicationValidationCurrent(validated.revision, candidate.documents),
    true,
  );
  assert.equal(
    isPublicationValidationCurrent(validated.revision, edited.documents),
    false,
  );
  assert.notEqual(validatePublicationBatch(edited).revision, validated.revision);
});

test("the Studio readiness summary keeps every blocker visible", () => {
  const candidate = validCandidate();
  const report = validatePublicationBatch({
    ...candidate,
    factualParityConfirmed: false,
    privacyReviewed: false,
  });
  const markup = renderToStaticMarkup(
    React.createElement(PublicationReadinessSummary, { report }),
  );

  assert.match(markup, /Publication readiness/);
  assert.match(markup, /Not ready/);
  assert.match(markup, /Bilingual/);
  assert.match(markup, /Privacy/);
  assert.match(markup, /Confirm equal English and Croatian factual coverage/);
  assert.match(markup, /Confirm the batch privacy and disclosure review/);
});

test("Studio exposes named Publication batches and stores only validation evidence", () => {
  const schema = JSON.parse(
    readFileSync(
      new URL("../apps/studio/schema.json", import.meta.url),
      "utf8",
    ),
  ) as Array<{
    attributes: Record<string, unknown>;
    name: string;
    type: string;
  }>;
  const batch = schema.find(({ name }) => name === "publicationBatch");

  assert.ok(batch);
  assert.equal(batch.type, "document");
  assert.deepEqual(
    Object.keys(batch.attributes)
      .filter((name) => !name.startsWith("_"))
      .sort(),
    [
      "assetChecks",
      "documents",
      "factualParityConfirmed",
      "limits",
      "name",
      "privacyReviewed",
      "validation",
    ],
  );
  assert.equal(
    schema.some(({ name }) => name === "publicationReadinessIssue"),
    true,
  );
  assert.equal(
    schema.some(({ name }) => name === "publicationReleaseLimits"),
    true,
  );
});
