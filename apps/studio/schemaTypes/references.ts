import {
  containsProhibitedSkillClaim,
  skillCategories,
  skillCategoryLabels,
  skillIcons,
} from "@portfolio/content";
import {
  defineField,
  defineType,
  type ValidationContext,
} from "sanity";

import { requiredSupportingSkillsField } from "./skill-reference";

const skillCategoryOptions = skillCategories.map((value) => ({
  title: skillCategoryLabels[value].en,
  value,
}));

const skillIconTitles = {
  api: "API",
  browser: "Browser",
  cloud: "Cloud",
  database: "Database",
  neuralNetwork: "Neural network",
  terminal: "Terminal",
} as const;
const skillIconOptions = skillIcons.map((value) => ({
  title: skillIconTitles[value],
  value,
}));

function rejectsUnsupportedClaims(value: unknown) {
  return containsProhibitedSkillClaim(value)
    ? "Remove percentages, ratings, levels, endorsements, and years-of-experience claims."
    : true;
}

const evidenceValidationMessage =
  "Add one precise scoped evidence note or reference this Skill from published Experience, Education, or Project content.";

export async function validateSkillEvidence(
  value: unknown,
  context: Pick<ValidationContext, "getClient">,
) {
  const skill =
    typeof value === "object" && value !== null
      ? (value as Readonly<{ _id?: unknown; evidence?: unknown }>)
      : null;
  if (skill?.evidence) {
    return true;
  }

  const documentId =
    typeof skill?._id === "string"
      ? skill._id.replace(/^drafts\./, "")
      : null;
  if (!documentId) {
    return evidenceValidationMessage;
  }

  const referenceCount = await context
    .getClient({ apiVersion: "2025-02-19" })
    .fetch<number>(
      `count(*[
        _type in ["experience", "education", "project"] &&
        !(_id in path("drafts.**")) &&
        references($skillId)
      ])`,
      { skillId: documentId },
    );

  return referenceCount > 0 ? true : evidenceValidationMessage;
}

export const skill = defineType({
  fields: [
    defineField({
      name: "canonicalName",
      title: "Canonical name",
      type: "string",
      validation: (rule) =>
        rule.required().custom(rejectsUnsupportedClaims),
    }),
    defineField({
      name: "displayName",
      title: "Optional localized display name",
      type: "localizedString",
      validation: (rule) => rule.custom(rejectsUnsupportedClaims),
    }),
    defineField({
      name: "category",
      options: { layout: "radio", list: skillCategoryOptions },
      title: "Category",
      type: "string",
      validation: (rule) =>
        rule.required().custom((value) =>
          typeof value === "string" &&
          skillCategories.includes(value as (typeof skillCategories)[number])
            ? true
            : "Choose one of the six approved Skill categories.",
        ),
    }),
    defineField({
      name: "capability",
      title: "Capability statement",
      type: "localizedText",
      validation: (rule) =>
        rule.required().custom(rejectsUnsupportedClaims),
    }),
    defineField({
      description:
        "Optional precise, publish-safe evidence when no public content reference is suitable.",
      name: "evidence",
      title: "Scoped evidence note",
      type: "localizedText",
      validation: (rule) => rule.custom(rejectsUnsupportedClaims),
    }),
    defineField({
      name: "icon",
      options: { list: skillIconOptions },
      title: "Optional curated icon",
      type: "string",
      validation: (rule) =>
        rule.custom((value) =>
          value == null ||
          (typeof value === "string" &&
            skillIcons.includes(value as (typeof skillIcons)[number]))
            ? true
            : "Choose a curated Skill icon or leave this field empty.",
        ),
    }),
    defineField({
      name: "documentationUrl",
      title: "Optional documentation URL",
      type: "url",
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
    defineField({
      initialValue: 0,
      name: "order",
      title: "Editorial order",
      type: "number",
      validation: (rule) => rule.required().integer().min(0),
    }),
  ],
  name: "skill",
  orderings: [
    {
      by: [
        { direction: "asc", field: "order" },
        { direction: "asc", field: "canonicalName" },
      ],
      name: "skillEditorialOrder",
      title: "Editorial order",
    },
  ],
  preview: {
    prepare({ canonicalName, category }) {
      return {
        subtitle:
          skillCategoryOptions.find(({ value }) => value === category)?.title ??
          "Uncategorized",
        title: canonicalName ?? "Untitled Skill",
      };
    },
    select: {
      canonicalName: "canonicalName",
      category: "category",
    },
  },
  title: "Skill",
  type: "document",
  validation: (rule) => rule.custom(validateSkillEvidence),
});

export const project = defineType({
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "localizedString",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      options: { source: "title.en" },
      title: "Canonical slug",
      type: "slug",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "localizedText",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "contribution",
      title: "Role and contribution",
      type: "localizedText",
      validation: (rule) => rule.required(),
    }),
    requiredSupportingSkillsField(),
  ],
  name: "project",
  title: "Project",
  type: "document",
});
