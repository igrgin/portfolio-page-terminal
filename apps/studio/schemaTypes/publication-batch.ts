import { publicationLimitMaximums } from "@portfolio/content";
import {
  defineArrayMember,
  defineField,
  defineType,
  type ValidationContext,
} from "sanity";

import {
  PublicationBatchInput,
  runPublicationReadiness,
  type PublicationBatchFormValue,
  type ReadinessClient,
} from "../components/publication-readiness";

const contentDocumentTypes = [
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

type StoredBatch = Readonly<{
  documents?: ReadonlyArray<Readonly<{ _ref?: string }>>;
  validation?: Readonly<{ ready?: boolean; revision?: string }>;
}>;

async function validateCurrentReadiness(
  input: unknown,
  context: ValidationContext,
) {
  const value = input as StoredBatch | undefined;
  if (
    value?.validation?.ready !== true ||
    typeof value.validation.revision !== "string"
  ) {
    return "Run complete batch readiness and resolve every issue before publication.";
  }
  const report = await runPublicationReadiness(
    context.getClient({ apiVersion: "2025-02-19" }) as ReadinessClient,
    value as PublicationBatchFormValue,
  );
  return report.ready && report.revision === value.validation.revision
    ? true
    : "The validated revision is stale or blocked. Re-run readiness after the latest edit.";
}

export const publicationReadinessIssue = defineType({
  fields: [
    defineField({ name: "category", type: "string" }),
    defineField({ name: "code", type: "string" }),
    defineField({ name: "documentId", type: "string" }),
    defineField({ name: "message", type: "string" }),
    defineField({ name: "path", type: "string" }),
  ],
  name: "publicationReadinessIssue",
  title: "Publication readiness issue",
  type: "object",
});

export const publicationAssetCheck = defineType({
  fields: [
    defineField({
      name: "assetId",
      title: "Sanity asset ID",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "documentId",
      title: "Changed document ID using this asset",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "kind",
      options: {
        list: [
          { title: "Image", value: "image" },
          { title: "Résumé PDF", value: "resume" },
        ],
      },
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "filename",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "mimeType",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "sizeBytes",
      title: "Size in bytes",
      type: "number",
      validation: (rule) => rule.required().integer().positive(),
    }),
    defineField({
      initialValue: false,
      name: "metadataSafe",
      title: "Metadata inspected and safe",
      type: "boolean",
      validation: (rule) => rule.required(),
    }),
    defineField({
      initialValue: false,
      name: "privacySafe",
      title: "Asset privacy reviewed",
      type: "boolean",
      validation: (rule) => rule.required(),
    }),
    defineField({
      hidden: ({ parent }) =>
        (parent as Readonly<{ kind?: string }> | undefined)?.kind !== "resume",
      name: "selectableText",
      title: "Résumé has selectable text",
      type: "boolean",
    }),
    defineField({
      hidden: ({ parent }) =>
        (parent as Readonly<{ kind?: string }> | undefined)?.kind !== "resume",
      name: "stableFilename",
      title: "Résumé uses its approved stable filename",
      type: "boolean",
    }),
  ],
  name: "publicationAssetCheck",
  title: "Asset validation evidence",
  type: "object",
});

export const publicationReleaseLimits = defineType({
  fields: [
    defineField({
      description: `Must remain at or below ${publicationLimitMaximums.compressedWorkerBytes.toLocaleString()} bytes.`,
      name: "compressedWorkerBytes",
      title: "Compressed Worker bytes",
      type: "number",
      validation: (rule) => rule.required().min(0),
    }),
    defineField({
      description: `Must remain at or below ${publicationLimitMaximums.staticFileCount.toLocaleString()} files.`,
      name: "staticFileCount",
      title: "Static file count",
      type: "number",
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      description: `Must remain at or below ${publicationLimitMaximums.dynamicCpuMilliseconds} ms per invocation.`,
      name: "dynamicCpuMilliseconds",
      title: "Measured dynamic CPU milliseconds",
      type: "number",
      validation: (rule) => rule.required().min(0),
    }),
  ],
  name: "publicationReleaseLimits",
  title: "Active free-tier measurements",
  type: "object",
});

export const publicationValidation = defineType({
  fields: [
    defineField({ name: "ready", type: "boolean" }),
    defineField({ name: "revision", type: "string" }),
    defineField({ name: "validatedAt", type: "datetime" }),
    defineField({
      name: "documentIds",
      of: [defineArrayMember({ type: "string" })],
      type: "array",
    }),
    defineField({
      name: "issues",
      of: [defineArrayMember({ type: "publicationReadinessIssue" })],
      type: "array",
    }),
  ],
  name: "publicationValidation",
  title: "Readiness validation",
  type: "object",
});

export const publicationBatch = defineType({
  components: { input: PublicationBatchInput },
  fields: [
    defineField({
      name: "name",
      title: "Batch name",
      type: "string",
      validation: (rule) => rule.required().min(3),
    }),
    defineField({
      description:
        "Include every changed draft in this dependency-closed release group.",
      name: "documents",
      of: [
        defineArrayMember({
          to: contentDocumentTypes.map((type) => ({ type })),
          type: "reference",
        }),
      ],
      title: "Changed drafts",
      type: "array",
      validation: (rule) => rule.required().min(1).unique(),
    }),
    defineField({
      initialValue: false,
      name: "factualParityConfirmed",
      title: "EN/HR factual parity reviewed",
      type: "boolean",
      validation: (rule) => rule.required(),
    }),
    defineField({
      initialValue: false,
      name: "privacyReviewed",
      title: "Privacy and disclosure boundaries reviewed",
      type: "boolean",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "assetChecks",
      of: [defineArrayMember({ type: "publicationAssetCheck" })],
      title: "Changed asset checks",
      type: "array",
    }),
    defineField({
      name: "limits",
      title: "Active free-tier release measurements",
      type: "publicationReleaseLimits",
      validation: (rule) => rule.required(),
    }),
    defineField({
      hidden: true,
      name: "validation",
      readOnly: true,
      type: "publicationValidation",
    }),
  ],
  name: "publicationBatch",
  title: "Publication batch",
  type: "document",
  validation: (rule) => rule.custom(validateCurrentReadiness),
});
