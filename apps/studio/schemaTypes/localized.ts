import { defineField, defineType } from "sanity";

export const localizedString = defineType({
  fields: [
    defineField({
      name: "en",
      title: "English",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "hr",
      title: "Croatian",
      type: "string",
      validation: (rule) => rule.required(),
    }),
  ],
  name: "localizedString",
  title: "Localized string",
  type: "object",
});

export const localizedText = defineType({
  fields: [
    defineField({
      name: "en",
      rows: 5,
      title: "English",
      type: "text",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "hr",
      rows: 5,
      title: "Croatian",
      type: "text",
      validation: (rule) => rule.required(),
    }),
  ],
  name: "localizedText",
  title: "Localized text",
  type: "object",
});

export const localizedMetadata = defineType({
  fields: [
    defineField({
      name: "title",
      title: "Search/share title",
      type: "localizedString",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      title: "Search/share description",
      type: "localizedText",
      validation: (rule) => rule.required(),
    }),
  ],
  name: "localizedMetadata",
  title: "Localized metadata",
  type: "object",
});
