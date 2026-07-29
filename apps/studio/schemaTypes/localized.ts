import { defineArrayMember, defineField, defineType } from "sanity";

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

export const localizedStringList = defineType({
  fields: [
    defineField({
      name: "en",
      of: [
        defineArrayMember({
          type: "string",
          validation: (rule) => rule.required(),
        }),
      ],
      title: "English",
      type: "array",
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "hr",
      of: [
        defineArrayMember({
          type: "string",
          validation: (rule) => rule.required(),
        }),
      ],
      title: "Croatian",
      type: "array",
      validation: (rule) => rule.required().min(1),
    }),
  ],
  name: "localizedStringList",
  title: "Localized string list",
  type: "object",
  validation: (rule) =>
    rule.custom((value) => {
      const lists = value as
        | Readonly<{ en?: readonly unknown[]; hr?: readonly unknown[] }>
        | undefined;
      return lists?.en &&
        lists.hr &&
        lists.en.length !== lists.hr.length
        ? "English and Croatian lists must contain the same number of facts."
        : true;
    }),
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
