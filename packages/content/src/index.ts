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
  isOngoingProjectStatus,
  loadPublishedProjects,
  normalizePublishedProjects,
  projectDisclosureLevels,
  projectStatusLabels,
  projectStatuses,
  PROJECTS_PAGE_QUERY,
  type ProjectCaseStudy,
  type ProjectDisclosureLevel,
  type ProjectMedia,
  type ProjectPageEntry,
  type ProjectStatus,
  type ProjectsPageContent,
} from "./projects";

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
  hasRequiredContactChannelOrder,
  hasSanityConfiguration,
  requiredContactChannelKinds,
  type ContactChannel,
  type ContactChannelKind,
} from "./sanity";
