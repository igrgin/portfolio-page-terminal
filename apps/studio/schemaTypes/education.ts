import { EDUCATION_YEAR_RANGE } from "@portfolio/content";
import {
  defineArrayMember,
  defineField,
  defineType,
  type ValidationContext,
} from "sanity";

function validateEndYear(
  endYear: number | undefined,
  context: ValidationContext,
) {
  const parent = context.parent as
    | { inProgress?: boolean; startYear?: number }
    | undefined;

  if (parent?.inProgress) {
    return endYear === undefined
      ? true
      : "Leave the end year empty while education is in progress.";
  }

  if (endYear === undefined) {
    return "An end year is required for completed education.";
  }

  if (parent?.startYear !== undefined && endYear < parent.startYear) {
    return "The end year must not be earlier than the start year.";
  }

  return true;
}

export const relevantSubject = defineType({
  fields: [
    defineField({
      name: "title",
      title: "Subject",
      type: "localizedString",
      validation: (rule) => rule.required(),
    }),
  ],
  name: "relevantSubject",
  title: "Relevant subject",
  type: "object",
});

export const education = defineType({
  fields: [
    defineField({
      name: "institution",
      title: "Institution",
      type: "localizedString",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "qualification",
      title: "Degree or qualification",
      type: "localizedString",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "field",
      title: "Field of study",
      type: "localizedString",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "startYear",
      title: "Start year",
      type: "number",
      validation: (rule) =>
        rule
          .required()
          .integer()
          .min(EDUCATION_YEAR_RANGE.earliest)
          .max(EDUCATION_YEAR_RANGE.latest),
    }),
    defineField({
      name: "endYear",
      title: "End year",
      type: "number",
      validation: (rule) =>
        rule
          .integer()
          .min(EDUCATION_YEAR_RANGE.earliest)
          .max(EDUCATION_YEAR_RANGE.latest)
          .custom(validateEndYear),
    }),
    defineField({
      initialValue: false,
      name: "inProgress",
      title: "In progress",
      type: "boolean",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "location",
      title: "Optional location",
      type: "localizedString",
    }),
    defineField({
      name: "url",
      title: "Optional institution URL",
      type: "url",
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
    defineField({
      name: "relevantSubjects",
      of: [defineArrayMember({ type: "relevantSubject" })],
      title: "Ordered Relevant subjects",
      type: "array",
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "skills",
      of: [
        defineArrayMember({
          to: [{ type: "skill" }],
          type: "reference",
          weak: false,
        }),
      ],
      title: "Skill references",
      type: "array",
      validation: (rule) => rule.unique(),
    }),
  ],
  name: "education",
  orderings: [
    {
      by: [
        { direction: "desc", field: "inProgress" },
        { direction: "desc", field: "endYear" },
        { direction: "desc", field: "startYear" },
      ],
      name: "educationDateDesc",
      title: "In progress and most recent",
    },
  ],
  preview: {
    prepare({ institution, qualification }) {
      return {
        subtitle: qualification,
        title: institution,
      };
    },
    select: {
      institution: "institution.en",
      qualification: "qualification.en",
    },
  },
  title: "Education",
  type: "document",
});
