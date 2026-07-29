export const locales = ["en", "hr"] as const;

export type Locale = (typeof locales)[number];

export type LocalizedValue<T> = Readonly<Record<Locale, T>>;

export type PublishedDocument = Readonly<{
  _id: string;
  _type: string;
  _updatedAt: string;
}>;

export {
  contactChannelKinds,
  hasSanityConfiguration,
  loadPublishedAbout,
  normalizePublishedAbout,
  type AboutPageContent,
  type ContactChannelKind,
} from "./about";
