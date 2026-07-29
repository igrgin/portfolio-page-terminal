import {
  contactChannelKinds,
  type ContactChannelKind,
} from "@portfolio/content";
import { defineArrayMember, defineField, defineType } from "sanity";

const contactChannelTitles: Readonly<Record<ContactChannelKind, string>> = {
  email: "Email",
  github: "GitHub",
  linkedin: "LinkedIn",
  other: "Other",
  phone: "Phone",
};

const englishResumeDisclaimer =
  "This résumé provides a broad overview of my experience and is not tailored to a specific role.";
const croatianResumeDisclaimer =
  "Ovaj životopis pruža širi pregled mojeg iskustva i nije prilagođen pojedinoj poziciji.";

export const contactChannel = defineType({
  fields: [
    defineField({
      name: "kind",
      options: {
        list: contactChannelKinds.map((value) => ({
          title: contactChannelTitles[value],
          value,
        })),
      },
      title: "Channel",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "label",
      title: "Visible label",
      type: "localizedString",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "href",
      title: "URL, email, or phone link",
      type: "url",
      validation: (rule) =>
        rule
          .required()
          .uri({ allowRelative: false, scheme: ["https", "mailto", "tel"] }),
    }),
  ],
  name: "contactChannel",
  preview: {
    prepare({ kind, label }) {
      return {
        subtitle: kind,
        title: label?.en ?? "Untitled channel",
      };
    },
    select: { kind: "kind", label: "label" },
  },
  title: "Contact channel",
  type: "object",
});

export const siteSettings = defineType({
  fields: [
    defineField({
      name: "displayName",
      title: "Professional display name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "defaultMetadata",
      title: "Default search/share metadata",
      type: "localizedMetadata",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "defaultSharingImage",
      options: { hotspot: true },
      title: "Default sharing image",
      type: "image",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "contactChannels",
      of: [defineArrayMember({ type: "contactChannel" })],
      title: "Ordered Contact channels",
      type: "array",
      validation: (rule) => rule.required().min(1).unique(),
    }),
    defineField({
      name: "resumeSet",
      title: "Résumé set",
      to: [{ type: "resumeSet" }],
      type: "reference",
      validation: (rule) => rule.required(),
    }),
  ],
  name: "siteSettings",
  title: "Site settings",
  type: "document",
});

export const profileMedia = defineType({
  fields: [
    defineField({
      name: "primaryPortrait",
      options: { hotspot: true },
      title: "Primary portrait",
      type: "image",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "alt",
      title: "Portrait alternative text",
      type: "localizedString",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "caption",
      title: "Optional caption or credit",
      type: "localizedString",
    }),
    defineField({
      name: "sharingImage",
      options: { hotspot: true },
      title: "Optional profile sharing image",
      type: "image",
    }),
  ],
  name: "profileMedia",
  title: "Profile media",
  type: "document",
});

export const resumeSet = defineType({
  fields: [
    defineField({
      name: "englishResume",
      options: { accept: "application/pdf" },
      title: "English résumé PDF",
      type: "file",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "englishUpdatedAt",
      title: "English résumé update date",
      type: "date",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "croatianResume",
      options: { accept: "application/pdf" },
      title: "Croatian résumé PDF",
      type: "file",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "croatianUpdatedAt",
      title: "Croatian résumé update date",
      type: "date",
      validation: (rule) => rule.required(),
    }),
    defineField({
      initialValue: englishResumeDisclaimer,
      name: "englishDisclaimer",
      readOnly: true,
      title: "English disclaimer",
      type: "text",
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            value === englishResumeDisclaimer
              ? true
              : "Use the approved English broad-overview disclaimer.",
          ),
    }),
    defineField({
      initialValue: croatianResumeDisclaimer,
      name: "croatianDisclaimer",
      readOnly: true,
      title: "Croatian disclaimer",
      type: "text",
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            value === croatianResumeDisclaimer
              ? true
              : "Use the approved Croatian broad-overview disclaimer.",
          ),
    }),
    defineField({
      name: "internalVersionNote",
      title: "Optional internal version note",
      type: "string",
    }),
  ],
  name: "resumeSet",
  title: "Résumé set",
  type: "document",
});
