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
  containsProhibitedSkillClaim,
  loadPublishedSkills,
  normalizeSkillEntry,
  normalizePublishedSkills,
  skillCategoryLabels,
  skillCategories,
  skillIcons,
  SKILLS_PAGE_QUERY,
  type SkillCategory,
  type SkillEvidence,
  type SkillEvidenceKind,
  type SkillIcon,
  type SkillPageContent,
  type SkillPageEntry,
} from "./skills";

export {
  contactChannelKinds,
  hasSanityConfiguration,
  type ContactChannel,
  type ContactChannelKind,
} from "./sanity";
