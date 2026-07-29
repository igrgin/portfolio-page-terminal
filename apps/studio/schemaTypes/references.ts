import { defineField, defineType } from "sanity";

export const skill = defineType({
  fields: [
    defineField({
      name: "canonicalName",
      title: "Canonical name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "displayName",
      title: "Optional localized display name",
      type: "localizedString",
    }),
    defineField({
      name: "capability",
      title: "Capability statement",
      type: "localizedText",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "evidence",
      title: "Scoped evidence note",
      type: "localizedText",
      validation: (rule) => rule.required(),
    }),
  ],
  name: "skill",
  title: "Skill",
  type: "document",
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
  ],
  name: "project",
  title: "Project",
  type: "document",
});
