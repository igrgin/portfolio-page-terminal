export const locales = ["en", "hr"] as const;

export type Locale = (typeof locales)[number];

export type LocalizedValue<T> = Readonly<Record<Locale, T>>;

export type PublishedDocument = Readonly<{
  _id: string;
  _type: string;
  _updatedAt: string;
}>;

export {
  loadPublishedAbout,
  normalizePublishedAbout,
  type AboutPageContent,
} from "./about";

export {
  CONTACT_PAGE_QUERY,
  loadPublishedContact,
  normalizePublishedContact,
  type ContactPageContent,
} from "./contact";

export {
  EDUCATION_PAGE_QUERY,
  EDUCATION_YEAR_RANGE,
  loadPublishedEducation,
  normalizePublishedEducation,
  type EducationPageContent,
  type EducationPageEntry,
} from "./education";

export {
  loadPublishedExperience,
  normalizePublishedExperience,
  type ExperiencePageContent,
  type ExperiencePageEntry,
} from "./experience";

export {
  loadPublishedPrivacy,
  normalizePublishedPrivacy,
  PRIVACY_PAGE_QUERY,
  type PrivacyPageContent,
} from "./privacy";

export {
  contactChannelKinds,
  hasRequiredContactChannelOrder,
  hasSanityConfiguration,
  requiredContactChannelKinds,
  type ContactChannel,
  type ContactChannelKind,
} from "./sanity";
