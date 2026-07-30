import {
  isOngoingProjectStatus,
  isProjectDisclosureLevel,
  projectCaseStudyFieldKeys,
  projectDisclosureLevels,
  projectStatusLabels,
  projectStatuses,
  type ProjectCaseStudyField,
  type ProjectDisclosureLevel,
} from "@portfolio/content";
import {
  defineArrayMember,
  defineField,
  defineType,
  type ValidationContext,
} from "sanity";

import { ProjectAuthoringInput } from "../components/project-authoring";
import { requiredSupportingSkillsField } from "./skill-reference";

const projectStatusOptions = projectStatuses.map((value) => ({
  title: projectStatusLabels[value].en,
  value,
}));

const projectDisclosureOptions = projectDisclosureLevels.map((value) => ({
  title: value === "full" ? "Full case study" : "Summary only",
  value,
}));

const projectCaseStudyTitles: Readonly<Record<ProjectCaseStudyField, string>> =
  {
    approach: "Approach",
    constraints: "Constraints",
    context: "Context and problem",
    lessons: "Lessons and reflections",
    outcome: "Outcome and impact",
  };

type ProjectSchemaParent = Readonly<{
  disclosureLevel?: ProjectDisclosureLevel;
  startDate?: string;
  status?: string;
}>;

function caseStudyField(name: ProjectCaseStudyField, title: string) {
  return defineField({
    group: "localized",
    hidden: ({ parent }) =>
      (parent as ProjectSchemaParent | undefined)?.disclosureLevel !== "full",
    name,
    title,
    type: "localizedText",
    validation: (rule) =>
      rule.custom((value, context) => {
        const parent = context.parent as ProjectSchemaParent | undefined;
        return parent?.disclosureLevel !== "full" || value != null
          ? true
          : `Paired ${title.toLowerCase()} copy is required for a full case study.`;
      }),
  });
}

function validateProjectEndDate(
  endDate: string | undefined,
  context: ValidationContext,
) {
  const parent = context.parent as ProjectSchemaParent | undefined;
  const ongoing = isOngoingProjectStatus(parent?.status);

  if (ongoing) {
    return endDate === undefined
      ? true
      : "Leave the end month empty for an in-progress or maintained Project.";
  }
  if (endDate === undefined) {
    return "An end month is required for a completed or archived Project.";
  }
  if (parent?.startDate && endDate < parent.startDate) {
    return "The end month must not be earlier than the start month.";
  }
  return true;
}

export const projectMedia = defineType({
  fields: [
    defineField({
      name: "image",
      options: { hotspot: true },
      title: "Image",
      type: "image",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "alternativeText",
      title: "Alternative text",
      type: "localizedString",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "caption",
      title: "Optional caption",
      type: "localizedText",
    }),
  ],
  name: "projectMedia",
  title: "Project media",
  type: "object",
});

export const project = defineType({
  components: { input: ProjectAuthoringInput },
  fields: [
    defineField({
      group: "localized",
      name: "title",
      title: "Title",
      type: "localizedString",
      validation: (rule) => rule.required(),
    }),
    defineField({
      group: "shared",
      name: "slug",
      options: { source: "title.en" },
      title: "Canonical slug",
      type: "slug",
      validation: (rule) => rule.required(),
    }),
    defineField({
      group: "localized",
      name: "summary",
      title: "Summary",
      type: "localizedText",
      validation: (rule) => rule.required(),
    }),
    defineField({
      group: "localized",
      name: "contribution",
      title: "Role and contribution",
      type: "localizedText",
      validation: (rule) => rule.required(),
    }),
    defineField({
      group: "shared",
      initialValue: "summary",
      name: "disclosureLevel",
      options: { layout: "radio", list: projectDisclosureOptions },
      title: "Disclosure level",
      type: "string",
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            isProjectDisclosureLevel(value)
              ? true
              : "Choose summary only or full case study.",
          ),
    }),
    ...projectCaseStudyFieldKeys.map((name) =>
      caseStudyField(name, projectCaseStudyTitles[name]),
    ),
    defineField({
      group: "shared",
      name: "startDate",
      title: "Start month",
      type: "string",
      validation: (rule) =>
        rule.required().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, {
          name: "year and month",
        }),
    }),
    defineField({
      group: "shared",
      name: "endDate",
      title: "End month",
      type: "string",
      validation: (rule) =>
        rule
          .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, {
            name: "year and month",
          })
          .custom(validateProjectEndDate),
    }),
    defineField({
      group: "shared",
      initialValue: "inProgress",
      name: "status",
      options: { layout: "radio", list: projectStatusOptions },
      title: "Status",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      group: "shared",
      initialValue: false,
      name: "featured",
      title: "Featured",
      type: "boolean",
      validation: (rule) => rule.required(),
    }),
    defineField({
      group: "shared",
      initialValue: 0,
      name: "order",
      title: "Editorial order",
      type: "number",
      validation: (rule) => rule.required().integer().min(0),
    }),
    requiredSupportingSkillsField("shared"),
    defineField({
      group: "shared",
      name: "repositoryUrl",
      title: "Optional repository URL",
      type: "url",
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
    defineField({
      group: "shared",
      name: "demoUrl",
      title: "Optional demo URL",
      type: "url",
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
    defineField({
      group: "shared",
      name: "documentationUrl",
      title: "Optional documentation URL",
      type: "url",
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
    defineField({
      description:
        "Optional reviewed search/share copy. Leave empty to derive it from the Project title and summary.",
      group: "localized",
      name: "metadataOverride",
      title: "Optional metadata override",
      type: "localizedMetadata",
    }),
    defineField({
      group: "shared",
      name: "heroMedia",
      title: "Optional hero media",
      type: "projectMedia",
    }),
    defineField({
      group: "shared",
      name: "media",
      of: [defineArrayMember({ type: "projectMedia" })],
      title: "Optional ordered media",
      type: "array",
      validation: (rule) => rule.unique(),
    }),
    defineField({
      description:
        "Confirm that the Project contains only material approved for public release.",
      group: "shared",
      initialValue: false,
      name: "publishSafe",
      title: "Publish-safe confirmation",
      type: "boolean",
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            value === true
              ? true
              : "Confirm that this Project is safe to publish.",
          ),
    }),
  ],
  groups: [
    {
      default: true,
      name: "localized",
      title: "Paired EN / HR copy",
    },
    {
      name: "shared",
      title: "Shared canonical facts",
    },
  ],
  name: "project",
  orderings: [
    {
      by: [
        { direction: "desc", field: "featured" },
        { direction: "asc", field: "order" },
        { direction: "asc", field: "title.en" },
      ],
      name: "projectEditorialOrder",
      title: "Featured and editorial order",
    },
  ],
  preview: {
    prepare({ disclosureLevel, featured, status, title }) {
      return {
        subtitle: `${featured ? "Featured · " : ""}${
          disclosureLevel === "full" ? "Full case study" : "Summary"
        } · ${
          projectStatusOptions.find(({ value }) => value === status)?.title ??
          "Unknown status"
        }`,
        title,
      };
    },
    select: {
      disclosureLevel: "disclosureLevel",
      featured: "featured",
      status: "status",
      title: "title.en",
    },
  },
  title: "Project",
  type: "document",
});
