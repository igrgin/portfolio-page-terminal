import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

import { validatePortfolioDiagram } from "./diagrams";
import { EDUCATION_YEAR_RANGE } from "./education";
import {
  hasRequiredContactChannelOrder,
  nonEmptyString,
  record,
  type UnknownRecord,
} from "./sanity";

export const publicationLimitMaximums = {
  compressedWorkerBytes: 3_000_000,
  dynamicCpuMilliseconds: 10,
  staticFileCount: 20_000,
} as const;

export const publicationManagedDocumentTypes = [
  "siteSettings",
  "aboutMe",
  "contact",
  "privacyNotice",
  "profileMedia",
  "resumeSet",
  "experience",
  "education",
  "skill",
  "project",
] as const;

export type PublicationReadinessCategory =
  | "accessibility"
  | "asset"
  | "batch"
  | "bilingual"
  | "date"
  | "diagram"
  | "freeTier"
  | "ordering"
  | "privacy"
  | "reference"
  | "slug"
  | "url";

export type PublicationReadinessIssue = Readonly<{
  category: PublicationReadinessCategory;
  code: string;
  documentId?: string;
  message: string;
  path: string;
}>;

export type PublicationAssetCheck = Readonly<{
  assetId: string;
  documentId: string;
  filename: string;
  kind: "image" | "resume";
  metadataSafe: boolean;
  mimeType: string;
  privacySafe: boolean;
  selectableText?: boolean;
  sizeBytes: number;
  stableFilename?: boolean;
}>;

export type PublicationReleaseLimits = Readonly<{
  compressedWorkerBytes: number;
  dynamicCpuMilliseconds: number;
  staticFileCount: number;
}>;

export type PublicationBatchCandidate = Readonly<{
  assetChecks: readonly PublicationAssetCheck[];
  changedDocumentIds: readonly string[];
  documents: readonly UnknownRecord[];
  factualParityConfirmed: boolean;
  limits: PublicationReleaseLimits;
  name: string;
  privacyReviewed: boolean;
  referenceDocuments?: readonly UnknownRecord[];
}>;

export type PublicationReadinessReport = Readonly<{
  closureDocumentIds: readonly string[];
  documentIds: readonly string[];
  issues: readonly PublicationReadinessIssue[];
  ready: boolean;
  revision: string;
}>;

export function publishedDocumentId(value: string): string {
  return value.replace(/^drafts\./, "");
}

export function publicationBatchRevision(
  candidate: PublicationBatchCandidate,
): string {
  const revisionRows = (documents: readonly UnknownRecord[]) =>
    documents
      .map((document) => ({
        id: publishedDocumentId(nonEmptyString(document._id) ?? ""),
        rev: nonEmptyString(document._rev) ?? "",
        updatedAt: nonEmptyString(document._updatedAt) ?? "",
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  const source = JSON.stringify({
    assetChecks: [...candidate.assetChecks]
      .map((asset) => ({
        assetId: publishedDocumentId(asset.assetId),
        documentId: publishedDocumentId(asset.documentId),
        filename: asset.filename,
        kind: asset.kind,
        metadataSafe: asset.metadataSafe,
        mimeType: asset.mimeType,
        privacySafe: asset.privacySafe,
        selectableText: asset.selectableText ?? null,
        sizeBytes: asset.sizeBytes,
        stableFilename: asset.stableFilename ?? null,
      }))
      .sort((left, right) => left.assetId.localeCompare(right.assetId)),
    changedDocumentIds: candidate.changedDocumentIds
      .map(publishedDocumentId)
      .sort(),
    documents: revisionRows(candidate.documents),
    factualParityConfirmed: candidate.factualParityConfirmed,
    limits: {
      compressedWorkerBytes: candidate.limits.compressedWorkerBytes,
      dynamicCpuMilliseconds: candidate.limits.dynamicCpuMilliseconds,
      staticFileCount: candidate.limits.staticFileCount,
    },
    name: candidate.name.trim(),
    privacyReviewed: candidate.privacyReviewed,
    referenceDocuments: revisionRows(candidate.referenceDocuments ?? []),
  });

  return bytesToHex(sha256(utf8ToBytes(source)));
}

export function isPublicationValidationCurrent(
  validatedRevision: string | null | undefined,
  candidate: PublicationBatchCandidate,
): boolean {
  return (
    typeof validatedRevision === "string" &&
    validatedRevision.length > 0 &&
    validatedRevision === publicationBatchRevision(candidate)
  );
}

export function collectStrongReferenceIds(
  value: unknown,
  references = new Set<string>(),
): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectStrongReferenceIds(entry, references));
    return references;
  }
  const object = record(value);
  if (!object) {
    return references;
  }
  const reference = nonEmptyString(object._ref);
  if (
    reference &&
    object._weak !== true &&
    !reference.startsWith("image-") &&
    !reference.startsWith("file-")
  ) {
    references.add(publishedDocumentId(reference));
  }
  Object.values(object).forEach((entry) =>
    collectStrongReferenceIds(entry, references),
  );
  return references;
}

export async function loadStrongReferenceClosure(
  documents: readonly UnknownRecord[],
  loadDocuments: (
    documentIds: readonly string[],
  ) => Promise<readonly UnknownRecord[]>,
) {
  const selectedIds = documents
    .map((document) => nonEmptyString(document._id))
    .filter((id): id is string => id !== null)
    .map(publishedDocumentId);
  const visitedIds = new Set(selectedIds);
  const referenceDocuments: UnknownRecord[] = [];
  let pendingIds = [...collectStrongReferenceIds(documents)].filter(
    (id) => !visitedIds.has(id),
  );
  while (pendingIds.length > 0) {
    pendingIds.forEach((id) => visitedIds.add(id));
    const referenced = [...(await loadDocuments(pendingIds))];
    referenceDocuments.push(...referenced);
    pendingIds = [...collectStrongReferenceIds(referenced)].filter(
      (id) => !visitedIds.has(id),
    );
  }
  return {
    documentIds: [...visitedIds].sort(),
    referenceDocuments,
  } as const;
}

function validPublicationDate(value: string): boolean {
  if (/^\d{4}-(?:0[1-9]|1[0-2])$/u.test(value)) {
    return true;
  }
  if (!/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

export function validatePublicationBatch(
  candidate: PublicationBatchCandidate,
): PublicationReadinessReport {
  const documents = candidate.documents
    .map((document) => record(document))
    .filter((document): document is UnknownRecord => document !== null);
  const documentIds = documents
    .map((document) => publishedDocumentId(nonEmptyString(document._id) ?? ""))
    .filter(Boolean)
    .sort();
  const issues: PublicationReadinessIssue[] = [];
  const issue = (
    category: PublicationReadinessCategory,
    code: string,
    path: string,
    message: string,
    documentId?: string,
  ) => {
    issues.push({
      category,
      code,
      ...(documentId ? { documentId } : {}),
      message,
      path,
    });
  };

  if (!nonEmptyString(candidate.name)) {
    issue(
      "batch",
      "BATCH_NAME_REQUIRED",
      "name",
      "Name the Publication batch before validation.",
    );
  }
  if (documents.length === 0) {
    issue(
      "batch",
      "BATCH_EMPTY",
      "documents",
      "Include at least one changed draft in the Publication batch.",
    );
  }

  const selectedIds = new Set(documentIds);
  const changedIds = new Set(
    candidate.changedDocumentIds.map(publishedDocumentId),
  );
  for (const changedId of changedIds) {
    if (!selectedIds.has(changedId)) {
      issue(
        "reference",
        "STRONG_REFERENCE_CLOSURE",
        "documents",
        `Changed document ${changedId} is outside the Publication batch.`,
        changedId,
      );
    }
  }
  for (const selectedId of selectedIds) {
    if (!changedIds.has(selectedId)) {
      issue(
        "batch",
        "BATCH_DOCUMENT_NOT_DRAFT",
        "documents",
        `Selected document ${selectedId} has no changed draft.`,
        selectedId,
      );
    }
  }

  if (!candidate.factualParityConfirmed) {
    issue(
      "bilingual",
      "FACTUAL_PARITY_UNCONFIRMED",
      "factualParityConfirmed",
      "Confirm equal English and Croatian factual coverage.",
    );
  }
  if (!candidate.privacyReviewed) {
    issue(
      "privacy",
      "PRIVACY_REVIEW_REQUIRED",
      "privacyReviewed",
      "Confirm the batch privacy and disclosure review.",
    );
  }

  const knownReferenceIds = new Set([
    ...documentIds,
    ...(candidate.referenceDocuments ?? [])
      .map((document) => nonEmptyString(document._id))
      .filter((id): id is string => id !== null)
      .map(publishedDocumentId),
    ...candidate.assetChecks.map(({ assetId }) => publishedDocumentId(assetId)),
  ]);
  const referencedAssetIds = new Set<string>();
  const orders = new Map<string, Map<number, string>>();

  function visit(
    value: unknown,
    path: string,
    documentId: string,
    parent: UnknownRecord | null,
  ) {
    if (Array.isArray(value)) {
      value.forEach((entry, index) =>
        visit(entry, `${path}[${index}]`, documentId, parent),
      );
      return;
    }
    const object = record(value);
    if (!object) {
      return;
    }

    const hasEnglish = Object.hasOwn(object, "en");
    const hasCroatian = Object.hasOwn(object, "hr");
    if (hasEnglish || hasCroatian) {
      const english = object.en;
      const croatian = object.hr;
      const completeStringPair =
        nonEmptyString(english) !== null && nonEmptyString(croatian) !== null;
      const completeArrayPair =
        Array.isArray(english) &&
        Array.isArray(croatian) &&
        english.length > 0 &&
        english.length === croatian.length;
      if (!completeStringPair && !completeArrayPair) {
        issue(
          "bilingual",
          "LOCALIZED_PAIR_INCOMPLETE",
          path,
          "Provide complete English and Croatian values with equal list coverage.",
          documentId,
        );
      }
    }

    const reference = nonEmptyString(object._ref);
    if (reference && object._weak !== true) {
      const referencedId = publishedDocumentId(reference);
      if (
        referencedId.startsWith("image-") ||
        referencedId.startsWith("file-")
      ) {
        referencedAssetIds.add(referencedId);
      }
      if (
        !knownReferenceIds.has(referencedId) &&
        !referencedId.startsWith("image-") &&
        !referencedId.startsWith("file-")
      ) {
        issue(
          "reference",
          "REFERENCE_UNRESOLVED",
          path,
          `Strong reference ${referencedId} does not resolve inside the review inventory.`,
          documentId,
        );
      }
      if (changedIds.has(referencedId) && !selectedIds.has(referencedId)) {
        issue(
          "reference",
          "STRONG_REFERENCE_CLOSURE",
          path,
          `Changed strong reference ${referencedId} is outside the Publication batch.`,
          referencedId,
        );
      }
    }

    const diagramCandidate =
      nonEmptyString(object.kind) && record(object.source) ? object : null;
    if (diagramCandidate) {
      const validation = validatePortfolioDiagram(diagramCandidate);
      if (!validation.ok) {
        issue("diagram", "DIAGRAM_INVALID", path, validation.error, documentId);
      }
      for (const field of ["title", "description"] as const) {
        const localized = record(object[field]);
        if (
          !localized ||
          !nonEmptyString(localized.en) ||
          !nonEmptyString(localized.hr)
        ) {
          issue(
            "accessibility",
            "DIAGRAM_ACCESSIBILITY_MISSING",
            `${path}.${field}`,
            "Provide localized diagram accessibility text.",
            documentId,
          );
        }
      }
    }

    for (const [key, child] of Object.entries(object)) {
      const childPath = path ? `${path}.${key}` : key;
      if (
        (key === "alternativeText" || key === "alt") &&
        (!record(child) ||
          !nonEmptyString(record(child)?.en) ||
          !nonEmptyString(record(child)?.hr))
      ) {
        issue(
          "accessibility",
          "MEDIA_ALTERNATIVE_TEXT_MISSING",
          childPath,
          "Provide English and Croatian alternative text.",
          documentId,
        );
      }

      if (/(?:url|href)$/iu.test(key) && child != null) {
        const url = nonEmptyString(child);
        let safe = false;
        if (url) {
          try {
            const protocol = new URL(url).protocol;
            safe =
              protocol === "https:" ||
              (key === "href" &&
                (protocol === "mailto:" || protocol === "tel:"));
          } catch {
            safe = false;
          }
        }
        if (!safe) {
          issue(
            "url",
            "URL_UNSAFE",
            childPath,
            "Use an absolute HTTPS URL or an approved Contact link protocol.",
            documentId,
          );
        }
      }

      if (
        /(?:Date|UpdatedAt)$/u.test(key) &&
        child != null &&
        key !== "_updatedAt" &&
        (typeof child !== "string" || !validPublicationDate(child))
      ) {
        issue(
          "date",
          "DATE_INVALID",
          childPath,
          "Use a valid ISO year-month or calendar date.",
          documentId,
        );
      }

      if (
        (key === "startYear" || key === "endYear") &&
        child != null &&
        (typeof child !== "number" ||
          !Number.isInteger(child) ||
          child < EDUCATION_YEAR_RANGE.earliest ||
          child > EDUCATION_YEAR_RANGE.latest)
      ) {
        issue(
          "date",
          "YEAR_INVALID",
          childPath,
          `Use a year from ${EDUCATION_YEAR_RANGE.earliest} through ${EDUCATION_YEAR_RANGE.latest}.`,
          documentId,
        );
      }

      if (
        key === "order" &&
        (typeof child !== "number" || !Number.isInteger(child) || child < 0)
      ) {
        issue(
          "ordering",
          "ORDER_INVALID",
          childPath,
          "Editorial order must be a non-negative integer.",
          documentId,
        );
      }

      if (key === "slug") {
        const slug = nonEmptyString(record(child)?.current);
        if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
          issue(
            "slug",
            "SLUG_INVALID",
            childPath,
            "Use a lowercase canonical kebab-case slug.",
            documentId,
          );
        }
      }

      visit(child, childPath, documentId, object);
    }

    if (
      parent === null &&
      typeof object.order === "number" &&
      Number.isInteger(object.order) &&
      object.order >= 0
    ) {
      const type = nonEmptyString(object._type) ?? "unknown";
      const typeOrders = orders.get(type) ?? new Map<number, string>();
      const previous = typeOrders.get(object.order);
      if (previous) {
        issue(
          "ordering",
          "ORDER_COLLISION",
          "order",
          `Editorial order collides with ${previous}.`,
          documentId,
        );
      } else {
        typeOrders.set(object.order, documentId);
        orders.set(type, typeOrders);
      }
    }
  }

  for (const document of documents) {
    const documentId = publishedDocumentId(
      nonEmptyString(document._id) ?? "unknown",
    );
    if (
      !nonEmptyString(document._id) ||
      !nonEmptyString(document._type) ||
      !nonEmptyString(document._rev) ||
      !nonEmptyString(document._updatedAt)
    ) {
      issue(
        "batch",
        "DOCUMENT_REVISION_MISSING",
        "documents",
        "Every changed document needs an ID, type, revision, and update time.",
        documentId,
      );
    }
    if (document.publishSafe === false || document.sensitive === true) {
      issue(
        "privacy",
        "DOCUMENT_NOT_PUBLISH_SAFE",
        "publishSafe",
        "Every changed document must be confirmed publish-safe and non-sensitive.",
        documentId,
      );
    }
    if (document._type === "project" && document.publishSafe !== true) {
      issue(
        "privacy",
        "PROJECT_PUBLISH_SAFETY_REQUIRED",
        "publishSafe",
        "Confirm that the Project is safe to publish.",
        documentId,
      );
    }
    if (
      (document._type === "project" || document._type === "skill") &&
      (typeof document.order !== "number" ||
        !Number.isInteger(document.order) ||
        document.order < 0)
    ) {
      issue(
        "ordering",
        "EDITORIAL_ORDER_REQUIRED",
        "order",
        "Projects and Skills require an explicit non-negative editorial order.",
        documentId,
      );
    }
    const startDate = nonEmptyString(document.startDate);
    const endDate = nonEmptyString(document.endDate);
    if (startDate && endDate && endDate < startDate) {
      issue(
        "date",
        "DATE_RANGE_INVALID",
        "endDate",
        "The end date must not precede the start date.",
        documentId,
      );
    }
    const status = nonEmptyString(document.status);
    if (
      status &&
      ["inProgress", "maintained", "current"].includes(status) &&
      endDate
    ) {
      issue(
        "date",
        "ONGOING_END_DATE_PRESENT",
        "endDate",
        "Ongoing content must not have an end date.",
        documentId,
      );
    }
    if (status && ["completed", "archived"].includes(status) && !endDate) {
      issue(
        "date",
        "COMPLETED_END_DATE_MISSING",
        "endDate",
        "Completed or archived content requires an end date.",
        documentId,
      );
    }
    if (document._type === "experience") {
      if (document.current === true && endDate) {
        issue(
          "date",
          "CURRENT_EXPERIENCE_END_DATE_PRESENT",
          "endDate",
          "A current Experience must not have an end date.",
          documentId,
        );
      }
      if (document.current === false && !endDate) {
        issue(
          "date",
          "COMPLETED_EXPERIENCE_END_DATE_MISSING",
          "endDate",
          "A completed Experience requires an end date.",
          documentId,
        );
      }
    }
    if (document._type === "education") {
      const startYear =
        typeof document.startYear === "number" ? document.startYear : null;
      const endYear =
        typeof document.endYear === "number" ? document.endYear : null;
      if (document.inProgress === true && endYear !== null) {
        issue(
          "date",
          "IN_PROGRESS_EDUCATION_END_YEAR_PRESENT",
          "endYear",
          "In-progress Education must not have an end year.",
          documentId,
        );
      }
      if (document.inProgress === false && endYear === null) {
        issue(
          "date",
          "COMPLETED_EDUCATION_END_YEAR_MISSING",
          "endYear",
          "Completed Education requires an end year.",
          documentId,
        );
      }
      if (startYear !== null && endYear !== null && endYear < startYear) {
        issue(
          "date",
          "EDUCATION_YEAR_RANGE_INVALID",
          "endYear",
          "The Education end year must not precede its start year.",
          documentId,
        );
      }
    }
    if (
      Array.isArray(document.contactChannels) &&
      !hasRequiredContactChannelOrder(document.contactChannels)
    ) {
      issue(
        "ordering",
        "CONTACT_ORDER_INVALID",
        "contactChannels",
        "Contact channels must begin with email, LinkedIn, GitHub, and phone.",
        documentId,
      );
    }
    visit(document, "", documentId, null);
  }

  for (const referenceDocument of candidate.referenceDocuments ?? []) {
    const documentId = publishedDocumentId(
      nonEmptyString(referenceDocument._id) ?? "unknown",
    );
    if (
      referenceDocument.publishSafe === false ||
      referenceDocument.sensitive === true ||
      (referenceDocument._type === "project" &&
        referenceDocument.publishSafe !== true)
    ) {
      issue(
        "reference",
        "REFERENCE_NOT_PUBLISH_SAFE",
        "referenceDocuments",
        "Strong references must resolve to publish-safe content.",
        documentId,
      );
    }
    visit(
      referenceDocument,
      `referenceDocuments.${documentId}`,
      documentId,
      null,
    );
  }

  const checkedAssetIds = new Set(
    candidate.assetChecks.map(({ assetId }) => publishedDocumentId(assetId)),
  );
  for (const assetId of referencedAssetIds) {
    if (!checkedAssetIds.has(assetId)) {
      issue(
        "asset",
        "ASSET_CHECK_MISSING",
        `assets.${assetId}`,
        "Attach current type, size, metadata, accessibility, and privacy evidence for every referenced asset.",
      );
    }
  }

  for (const asset of candidate.assetChecks) {
    const assetPath = `assetChecks.${asset.assetId}`;
    if (!selectedIds.has(publishedDocumentId(asset.documentId))) {
      issue(
        "asset",
        "ASSET_OWNER_OUTSIDE_BATCH",
        assetPath,
        "The document using this changed asset must be in the batch.",
        asset.documentId,
      );
    }
    const mimeTypeValid =
      asset.kind === "image"
        ? ["image/avif", "image/jpeg", "image/png", "image/webp"].includes(
            asset.mimeType,
          )
        : asset.mimeType === "application/pdf";
    if (!mimeTypeValid) {
      issue(
        "asset",
        "ASSET_TYPE_INVALID",
        assetPath,
        "Use an approved image type or PDF résumé.",
        asset.documentId,
      );
    }
    const maximumSize = asset.kind === "resume" ? 5_000_000 : 10_000_000;
    if (
      !Number.isFinite(asset.sizeBytes) ||
      asset.sizeBytes <= 0 ||
      asset.sizeBytes > maximumSize
    ) {
      issue(
        "asset",
        "ASSET_SIZE_INVALID",
        assetPath,
        "The asset exceeds its approved size boundary.",
        asset.documentId,
      );
    }
    if (!asset.metadataSafe) {
      issue(
        "asset",
        "ASSET_METADATA_UNSAFE",
        assetPath,
        "Remove unsafe or identifying asset metadata.",
        asset.documentId,
      );
    }
    if (!asset.privacySafe) {
      issue(
        "privacy",
        "ASSET_PRIVACY_UNSAFE",
        assetPath,
        "Confirm that the asset is safe for public release.",
        asset.documentId,
      );
    }
    if (asset.kind === "resume" && asset.selectableText !== true) {
      issue(
        "asset",
        "RESUME_SELECTABLE_TEXT",
        assetPath,
        "The résumé PDF must contain selectable text.",
        asset.documentId,
      );
    }
    if (asset.kind === "resume" && asset.stableFilename !== true) {
      issue(
        "asset",
        "RESUME_FILENAME_UNSTABLE",
        assetPath,
        "Use the approved stable résumé filename.",
        asset.documentId,
      );
    }
  }

  for (const [key, maximum] of Object.entries(publicationLimitMaximums)) {
    const value = candidate.limits[key as keyof PublicationReleaseLimits];
    if (!Number.isFinite(value) || value < 0 || value > maximum) {
      issue(
        "freeTier",
        `FREE_TIER_${key.replace(/([A-Z])/gu, "_$1").toUpperCase()}`,
        `limits.${key}`,
        `The measured ${key} value exceeds the active free-tier limit of ${maximum}.`,
      );
    }
  }

  return {
    closureDocumentIds: [
      ...new Set([
        ...documentIds,
        ...(candidate.referenceDocuments ?? [])
          .map((document) => nonEmptyString(document._id))
          .filter((id): id is string => id !== null)
          .map(publishedDocumentId),
      ]),
    ].sort(),
    documentIds,
    issues,
    ready: issues.length === 0,
    revision: publicationBatchRevision(candidate),
  };
}
