import { defineQuery } from "groq";

import type { Locale, LocalizedValue } from "./index";
import {
  loadSanityQuery,
  localizedStrings,
  nonEmptyString,
  normalizeContactChannels,
  positiveNumber,
  publishedDocument,
  record,
  safeUrl,
  type ContactChannel,
  type SanityQueryOptions,
  type UnknownRecord,
} from "./sanity";

export const skillCategories = [
  "backendEngineering",
  "distributedDataSystems",
  "developerTooling",
  "aiAndMachineLearning",
  "frontendEngineering",
  "platformsAndOperations",
] as const;

export type SkillCategory = (typeof skillCategories)[number];

export const skillIcons = [
  "api",
  "database",
  "terminal",
  "neuralNetwork",
  "browser",
  "cloud",
] as const;

export type SkillIcon = (typeof skillIcons)[number];

export type SkillEvidenceKind =
  | "education"
  | "experience"
  | "note"
  | "project";

export type SkillEvidence = Readonly<{
  kind: SkillEvidenceKind;
  label: string;
}>;

export type SkillPageEntry = Readonly<{
  canonicalName: string;
  capability: string;
  category: Readonly<{
    key: SkillCategory;
    label: string;
  }>;
  documentationUrl?: string;
  evidence: readonly SkillEvidence[];
  icon?: SkillIcon;
  name: string;
  order: number;
}>;

export type SkillPageContent = Readonly<{
  contactChannels: readonly ContactChannel[];
  displayName: string;
  entries: readonly SkillPageEntry[];
  metadata: Readonly<{
    image: Readonly<{
      height: number;
      url: string;
      width: number;
    }>;
  }>;
}>;

export const skillCategoryLabels: Readonly<
  Record<SkillCategory, LocalizedValue<string>>
> = {
  aiAndMachineLearning: {
    en: "AI and machine learning",
    hr: "AI i strojno učenje",
  },
  backendEngineering: {
    en: "Backend engineering",
    hr: "Backend inženjerstvo",
  },
  developerTooling: {
    en: "Developer tooling",
    hr: "Razvojni alati",
  },
  distributedDataSystems: {
    en: "Distributed data systems",
    hr: "Distribuirani podatkovni sustavi",
  },
  frontendEngineering: {
    en: "Frontend engineering",
    hr: "Frontend inženjerstvo",
  },
  platformsAndOperations: {
    en: "Platforms and operations",
    hr: "Platforme i operacije",
  },
};

const prohibitedSkillClaimPatterns = [
  /\d+(?:[.,]\d+)?\s*(?:%|percent(?:age)?s?|posto|postotak)/iu,
  /(?:[★☆⭐]|\b[1-5]\s*(?:\/\s*5|stars?)\b)/iu,
  /\b(?:one|two|three|four|five)\s+stars?\b/iu,
  /\b(?:(?:beginner|intermediate|advanced|expert)\s+(?:level|proficiency)|(?:level|proficiency)\s*[:=-]\s*(?:beginner|intermediate|advanced|expert))\b/iu,
  /\b(?:(?:junior|senior|low|medium|high)\s+(?:skill\s+)?level|level\s*(?::|=|-)?\s*(?:[1-9]\d*|junior|senior|low|medium|high)|proficiency\s*[:=-]\s*(?:[1-9]\d*|low|medium|high))\b/iu,
  /\b(?:početn\w*|srednj\w*|napredn\w*|stručn\w*)\s+razin\w*\b/iu,
  /\brazin\w*\s*(?::|=|-)?\s*[1-9]\d*\b/iu,
  /\bendorsements?\b|\bpreporuk(?:a|e|ama)\b/iu,
  /\b\d+\+?\s+(?:years?|yrs?)(?:\s+of)?\s+experience\b/iu,
  /\b\d+\+?\s+godin(?:a|e|u)?\s+iskustva\b/iu,
] as const;

function skillClaimStrings(value: unknown): readonly string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.values(value).flatMap(skillClaimStrings);
}

export function containsProhibitedSkillClaim(value: unknown) {
  return skillClaimStrings(value).some((claim) =>
    prohibitedSkillClaimPatterns.some((pattern) => pattern.test(claim)),
  );
}

export const SKILL_PUBLIC_PROJECTION = `{
  _id,
  _type,
  canonicalName,
  displayName,
  category,
  capability,
  evidence,
  icon,
  documentationUrl,
  order,
  "experienceEvidence": *[
    _type == "experience" &&
    !(_id in path("drafts.**")) &&
    references(^._id)
  ]{
    _id,
    _type,
    employerPresentation,
    employer,
    confidentialClientLabel,
    role
  },
  "educationEvidence": *[
    _type == "education" &&
    !(_id in path("drafts.**")) &&
    references(^._id)
  ]{
    _id,
    _type,
    institution,
    qualification
  },
  "projectEvidence": *[
    _type == "project" &&
    !(_id in path("drafts.**")) &&
    references(^._id)
  ]{
    _id,
    _type,
    title,
    "slug": slug.current
  }
}` as const;

export const SKILLS_PAGE_QUERY = defineQuery(`{
  "siteSettings": *[_id == "siteSettings" && !(_id in path("drafts.**"))][0]{
    _id,
    displayName,
    "defaultSharingImage": {
      "url": defaultSharingImage.asset->url,
      "width": defaultSharingImage.asset->metadata.dimensions.width,
      "height": defaultSharingImage.asset->metadata.dimensions.height
    },
    contactChannels[]{_key, kind, label, href}
  },
  "skills": *[
    _type == "skill" && !(_id in path("drafts.**"))
  ]${SKILL_PUBLIC_PROJECTION}
}`);

function evidenceArray(
  value: unknown,
  normalize: (entry: UnknownRecord) => SkillEvidence | null,
): readonly SkillEvidence[] | null {
  if (value == null) {
    return [];
  }
  if (!Array.isArray(value)) {
    return null;
  }

  const entries = value.map((entry) => {
    const document = publishedDocument(entry);
    return document ? normalize(document) : null;
  });

  return entries.every(
    (entry): entry is SkillEvidence => entry !== null,
  )
    ? entries
    : null;
}

function normalizeExperienceEvidence(
  value: unknown,
  locale: Locale,
): readonly SkillEvidence[] | null {
  return evidenceArray(value, (experience) => {
    if (experience._type !== "experience") {
      return null;
    }

    const role = localizedStrings(experience.role);
    const presentation = nonEmptyString(experience.employerPresentation);
    const publicEmployer = nonEmptyString(experience.employer);
    const confidentialClient = localizedStrings(
      experience.confidentialClientLabel,
    );
    const employer =
      presentation === "publicEmployer" && publicEmployer
        ? publicEmployer
        : presentation === "confidentialClient" && confidentialClient
          ? confidentialClient[locale]
          : null;

    return role && employer
      ? {
          kind: "experience",
          label: `${role[locale]} — ${employer}`,
        }
      : null;
  });
}

function normalizeEducationEvidence(
  value: unknown,
  locale: Locale,
): readonly SkillEvidence[] | null {
  return evidenceArray(value, (education) => {
    const qualification = localizedStrings(education.qualification);
    const institution = localizedStrings(education.institution);
    return education._type === "education" && qualification && institution
      ? {
          kind: "education",
          label: `${qualification[locale]} — ${institution[locale]}`,
        }
      : null;
  });
}

function normalizeProjectEvidence(
  value: unknown,
  locale: Locale,
): readonly SkillEvidence[] | null {
  return evidenceArray(value, (project) => {
    const title = localizedStrings(project.title);
    return project._type === "project" && title
      ? { kind: "project", label: title[locale] }
      : null;
  });
}

export function normalizeSkillEntry(
  value: unknown,
  locale: Locale,
): SkillPageEntry | null {
  const skill = publishedDocument(value);
  if (
    !skill ||
    skill._type !== "skill" ||
    containsProhibitedSkillClaim({
      canonicalName: skill.canonicalName,
      capability: skill.capability,
      displayName: skill.displayName,
      evidence: skill.evidence,
    })
  ) {
    return null;
  }

  const canonicalName = nonEmptyString(skill.canonicalName);
  const displayName =
    skill.displayName == null ? null : localizedStrings(skill.displayName);
  const category =
    typeof skill.category === "string" &&
    skillCategories.includes(skill.category as SkillCategory)
      ? (skill.category as SkillCategory)
      : null;
  const capability = localizedStrings(skill.capability);
  const note =
    skill.evidence == null ? null : localizedStrings(skill.evidence);
  const icon =
    typeof skill.icon === "string" &&
    skillIcons.includes(skill.icon as SkillIcon)
      ? (skill.icon as SkillIcon)
      : null;
  const documentationUrl =
    skill.documentationUrl == null
      ? null
      : safeUrl(skill.documentationUrl, ["https:"]);
  const order =
    typeof skill.order === "number" &&
    Number.isInteger(skill.order) &&
    skill.order >= 0
      ? skill.order
      : null;
  const experienceEvidence = normalizeExperienceEvidence(
    skill.experienceEvidence,
    locale,
  );
  const educationEvidence = normalizeEducationEvidence(
    skill.educationEvidence,
    locale,
  );
  const projectEvidence = normalizeProjectEvidence(
    skill.projectEvidence,
    locale,
  );

  if (
    !canonicalName ||
    (skill.displayName != null && !displayName) ||
    !category ||
    !capability ||
    (skill.evidence != null && !note) ||
    (skill.icon != null && !icon) ||
    (skill.documentationUrl != null && !documentationUrl) ||
    order === null ||
    !experienceEvidence ||
    !educationEvidence ||
    !projectEvidence
  ) {
    return null;
  }

  const evidence = [
    ...(note ? [{ kind: "note" as const, label: note[locale] }] : []),
    ...experienceEvidence,
    ...educationEvidence,
    ...projectEvidence,
  ];
  if (evidence.length === 0) {
    return null;
  }

  return {
    canonicalName,
    capability: capability[locale],
    category: {
      key: category,
      label: skillCategoryLabels[category][locale],
    },
    ...(documentationUrl ? { documentationUrl } : {}),
    evidence,
    ...(icon ? { icon } : {}),
    name: displayName?.[locale] ?? canonicalName,
    order,
  };
}

function compareSkills(left: SkillPageEntry, right: SkillPageEntry) {
  return (
    left.order - right.order ||
    left.canonicalName.localeCompare(right.canonicalName)
  );
}

export function normalizePublishedSkills(
  value: unknown,
  locale: Locale,
): SkillPageContent | null {
  const result = record(value);
  const siteSettings = publishedDocument(result?.siteSettings);
  const displayName = nonEmptyString(siteSettings?.displayName);
  const contactChannels = normalizeContactChannels(
    siteSettings?.contactChannels,
    locale,
  );
  const sharingImage = record(siteSettings?.defaultSharingImage);
  const sharingImageUrl = safeUrl(sharingImage?.url, ["https:"]);
  const sharingImageWidth = positiveNumber(sharingImage?.width);
  const sharingImageHeight = positiveNumber(sharingImage?.height);
  const entries = Array.isArray(result?.skills)
    ? result.skills
        .map((skill) => normalizeSkillEntry(skill, locale))
        .filter((skill): skill is SkillPageEntry => skill !== null)
        .sort(compareSkills)
    : null;

  if (
    !siteSettings ||
    !displayName ||
    !contactChannels ||
    contactChannels.length === 0 ||
    !sharingImageUrl ||
    !sharingImageWidth ||
    !sharingImageHeight ||
    !entries ||
    entries.length === 0
  ) {
    return null;
  }

  return {
    contactChannels,
    displayName,
    entries,
    metadata: {
      image: {
        height: sharingImageHeight,
        url: sharingImageUrl,
        width: sharingImageWidth,
      },
    },
  };
}

export async function loadPublishedSkills(
  locale: Locale,
  options?: SanityQueryOptions,
): Promise<SkillPageContent | null> {
  const result = await loadSanityQuery(SKILLS_PAGE_QUERY, "Skills", options);
  return normalizePublishedSkills(result, locale);
}
