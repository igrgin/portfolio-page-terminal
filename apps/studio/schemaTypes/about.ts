import { defineArrayMember, defineField, defineType } from "sanity";

export const aboutMe = defineType({
  fields: [
    defineField({
      name: "headline",
      title: "Headline",
      type: "localizedString",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "biography",
      title: "Biography",
      type: "localizedText",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "currentFocus",
      title: "Current focus",
      type: "localizedText",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "selectedSkills",
      of: [
        defineArrayMember({
          to: [{ type: "skill" }],
          type: "reference",
          weak: false,
        }),
      ],
      title: "Ordered selected Skills",
      type: "array",
      validation: (rule) => rule.required().min(1).unique(),
    }),
    defineField({
      name: "featuredProjects",
      of: [
        defineArrayMember({
          to: [{ type: "project" }],
          type: "reference",
          weak: false,
        }),
      ],
      title: "Ordered featured Projects",
      type: "array",
      validation: (rule) => rule.required().min(1).unique(),
    }),
    defineField({
      name: "profileMedia",
      title: "Profile media",
      to: [{ type: "profileMedia" }],
      type: "reference",
      validation: (rule) => rule.required(),
    }),
  ],
  name: "aboutMe",
  title: "About Me",
  type: "document",
});
