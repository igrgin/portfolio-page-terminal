import { defineField, defineType } from "sanity";

export const contact = defineType({
  fields: [
    defineField({
      name: "introduction",
      title: "Introduction",
      type: "localizedText",
      validation: (rule) => rule.required(),
    }),
    defineField({
      description:
        "Optional availability, location, or timezone context. Complete both locales or leave both empty.",
      name: "availability",
      title: "Availability and timezone",
      type: "localizedText",
    }),
  ],
  name: "contact",
  title: "Contact",
  type: "document",
});

const localizedPrivacyFields = [
  {
    name: "controller",
    title: "Controller",
  },
  {
    name: "purposesAndLegalBases",
    title: "Purposes and legal bases",
  },
  {
    name: "processorsAndTransfers",
    title: "Recipients, processors, and transfers",
  },
  {
    name: "retention",
    title: "Retention",
  },
  {
    name: "rightsAndRequests",
    title: "Rights and request procedure",
  },
  {
    name: "contactData",
    title: "Contact and required form data",
  },
  {
    name: "localPreferences",
    title: "Local language and theme preferences",
  },
  {
    name: "automatedDecisionMaking",
    title: "Automated decision-making and profiling",
  },
  {
    name: "azopComplaint",
    title: "AZOP complaint information",
  },
] as const;

export const privacyNotice = defineType({
  fields: [
    defineField({
      name: "effectiveDate",
      title: "Effective date",
      type: "date",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "privacyRequestEmail",
      title: "Privacy request email",
      type: "email",
      validation: (rule) => rule.required(),
    }),
    ...localizedPrivacyFields.map(({ name, title }) =>
      defineField({
        name,
        title,
        type: "localizedText",
        validation: (rule) => rule.required(),
      }),
    ),
    defineField({
      name: "azopUrl",
      title: "AZOP complaint URL",
      type: "url",
      validation: (rule) =>
        rule.required().uri({ allowRelative: false, scheme: ["https"] }),
    }),
  ],
  name: "privacyNotice",
  title: "Privacy notice",
  type: "document",
});
