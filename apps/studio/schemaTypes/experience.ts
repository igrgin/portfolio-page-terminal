import { defineField, defineType } from "sanity";

import { requiredSupportingSkillsField } from "./skill-reference";

const monthPattern = /^\d{4}-(?:0[1-9]|1[0-2])$/;

type ExperienceParent = Readonly<{
  current?: boolean;
  employerPresentation?: "publicEmployer" | "confidentialClient";
  startDate?: string;
}>;

function parent(value: unknown): ExperienceParent {
  return typeof value === "object" && value !== null
    ? (value as ExperienceParent)
    : {};
}

export const experience = defineType({
  fields: [
    defineField({
      name: "employerPresentation",
      options: {
        layout: "radio",
        list: [
          { title: "Public employer", value: "publicEmployer" },
          { title: "Confidential client", value: "confidentialClient" },
        ],
      },
      title: "Employer presentation",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      hidden: ({ parent: value }) =>
        parent(value).employerPresentation === "confidentialClient",
      name: "employer",
      title: "Public employer",
      type: "string",
      validation: (rule) =>
        rule.custom((value, context) => {
          const presentation = parent(context.parent).employerPresentation;
          if (presentation === "publicEmployer") {
            return typeof value === "string" && value.trim()
              ? true
              : "A public employer is required.";
          }
          return value == null || value === ""
            ? true
            : "Remove the employer identity from a confidential-client entry.";
        }),
    }),
    defineField({
      hidden: ({ parent: value }) =>
        parent(value).employerPresentation !== "confidentialClient",
      name: "confidentialClientLabel",
      title: "Confidential-client label",
      type: "localizedString",
      validation: (rule) =>
        rule.custom((value, context) => {
          const presentation = parent(context.parent).employerPresentation;
          if (presentation === "confidentialClient") {
            return value == null
              ? "A bilingual confidential-client label is required."
              : true;
          }
          return value == null
            ? true
            : "Remove the confidential-client label from a public-employer entry.";
        }),
    }),
    defineField({
      name: "role",
      title: "Official role",
      type: "localizedString",
      validation: (rule) => rule.required(),
    }),
    defineField({
      description: "Use YYYY-MM.",
      name: "startDate",
      title: "Start month",
      type: "string",
      validation: (rule) =>
        rule
          .required()
          .regex(monthPattern, { name: "a YYYY-MM month" }),
    }),
    defineField({
      initialValue: false,
      name: "current",
      title: "Current role",
      type: "boolean",
      validation: (rule) => rule.required(),
    }),
    defineField({
      description: "Use YYYY-MM. Leave empty for a current role.",
      hidden: ({ parent: value }) => parent(value).current === true,
      name: "endDate",
      title: "End month",
      type: "string",
      validation: (rule) =>
        rule
          .regex(monthPattern, { name: "a YYYY-MM month" })
          .custom((value, context) => {
            const document = parent(context.parent);
            if (document.current) {
              return value == null || value === ""
                ? true
                : "A current role cannot have an end month.";
            }
            if (typeof value !== "string" || !value) {
              return "An end month is required for a completed role.";
            }
            return !document.startDate || value >= document.startDate
              ? true
              : "The end month cannot be earlier than the start month.";
          }),
    }),
    defineField({
      name: "location",
      title: "Optional location",
      type: "localizedString",
    }),
    defineField({
      name: "employmentType",
      title: "Optional employment type",
      type: "localizedString",
    }),
    defineField({
      hidden: ({ parent: value }) =>
        parent(value).employerPresentation === "confidentialClient",
      name: "employerUrl",
      title: "Optional employer URL",
      type: "url",
      validation: (rule) =>
        rule
          .uri({ scheme: ["https"] })
          .custom((value, context) =>
            parent(context.parent).employerPresentation ===
              "confidentialClient" && value != null
              ? "A confidential-client entry cannot link to the client."
              : true,
          ),
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "localizedText",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "achievements",
      title: "Ordered achievements",
      type: "localizedStringList",
      validation: (rule) => rule.required(),
    }),
    requiredSupportingSkillsField(),
  ],
  name: "experience",
  preview: {
    prepare({ confidentialClientLabel, employer, role }) {
      return {
        subtitle: employer ?? confidentialClientLabel,
        title: role ?? "Untitled Experience",
      };
    },
    select: {
      confidentialClientLabel: "confidentialClientLabel.en",
      employer: "employer",
      role: "role.en",
    },
  },
  title: "Experience",
  type: "document",
});
