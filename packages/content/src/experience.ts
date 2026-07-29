import type { Locale, LocalizedValue } from "./index";
import { defineQuery } from "groq";

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
} from "./sanity";

const employerPresentations = [
  "publicEmployer",
  "confidentialClient",
] as const;

type EmployerPresentation = (typeof employerPresentations)[number];

export type ExperiencePageContent = Readonly<{
  contactChannels: readonly ContactChannel[];
  displayName: string;
  entries: readonly ExperiencePageEntry[];
  metadata: Readonly<{
    image: Readonly<{
      height: number;
      url: string;
      width: number;
    }>;
  }>;
}>;

export type ExperiencePageEntry = Readonly<{
  achievements: readonly string[];
  current: boolean;
  employer: string;
  employerUrl?: string;
  employmentType?: string;
  endDate: string | null;
  id: string;
  location?: string;
  role: string;
  skills: readonly Readonly<{ id: string; name: string }>[];
  startDate: string;
  summary: string;
}>;

export const EXPERIENCE_PAGE_QUERY = defineQuery(`{
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
  "experiences": *[_type == "experience" && !(_id in path("drafts.**"))]{
    _id,
    employerPresentation,
    employer,
    confidentialClientLabel,
    role,
    startDate,
    endDate,
    current,
    location,
    employmentType,
    employerUrl,
    summary,
    achievements,
    "skills": skills[]->{
      _id,
      canonicalName,
      displayName
    }
  }
}`);

function localizedStringLists(
  value: unknown,
): LocalizedValue<readonly string[]> | null {
  const candidate = record(value);
  const normalize = (entries: unknown) =>
    Array.isArray(entries)
      ? entries.map(nonEmptyString).filter((entry): entry is string => !!entry)
      : null;
  const en = normalize(candidate?.en);
  const hr = normalize(candidate?.hr);

  return en &&
    hr &&
    en.length > 0 &&
    en.length === hr.length &&
    en.length === (candidate?.en as unknown[]).length &&
    hr.length === (candidate?.hr as unknown[]).length
    ? { en, hr }
    : null;
}

function optionalLocalizedString(
  value: unknown,
  locale: Locale,
): string | null | undefined {
  if (value == null) {
    return undefined;
  }

  return localizedStrings(value)?.[locale] ?? null;
}

function month(value: unknown): string | null {
  const candidate = nonEmptyString(value);
  return candidate && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(candidate)
    ? candidate
    : null;
}

function presentation(value: unknown): EmployerPresentation | null {
  return typeof value === "string" &&
    employerPresentations.includes(value as EmployerPresentation)
    ? (value as EmployerPresentation)
    : null;
}

function normalizeSkills(
  value: unknown,
  locale: Locale,
): ExperiencePageEntry["skills"] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const skills = value.map((entry) => {
    const skill = publishedDocument(entry);
    const id = nonEmptyString(skill?._id);
    const canonicalName = nonEmptyString(skill?.canonicalName);
    const localizedName =
      skill?.displayName == null ? undefined : localizedStrings(skill.displayName);
    const name = localizedName?.[locale] ?? canonicalName;

    return id &&
      name &&
      (skill?.displayName == null || localizedName !== null)
      ? { id, name }
      : null;
  });

  return skills.every(
    (skill): skill is ExperiencePageEntry["skills"][number] => skill !== null,
  )
    ? skills
    : null;
}

function normalizeExperience(
  value: unknown,
  locale: Locale,
): ExperiencePageEntry | null {
  const experience = publishedDocument(value);
  const id = nonEmptyString(experience?._id);
  const employerPresentation = presentation(experience?.employerPresentation);
  const role = localizedStrings(experience?.role);
  const startDate = month(experience?.startDate);
  const current = experience?.current;
  const endDate =
    current === true
      ? experience?.endDate == null
        ? null
        : undefined
      : month(experience?.endDate);
  const summary = localizedStrings(experience?.summary);
  const achievements = localizedStringLists(experience?.achievements);
  const location = optionalLocalizedString(experience?.location, locale);
  const employmentType = optionalLocalizedString(
    experience?.employmentType,
    locale,
  );
  const skills = normalizeSkills(experience?.skills, locale);
  const publicEmployer = nonEmptyString(experience?.employer);
  const confidentialClientLabel = localizedStrings(
    experience?.confidentialClientLabel,
  );
  const employerUrl =
    experience?.employerUrl == null
      ? undefined
      : safeUrl(experience.employerUrl, ["https:"]);

  const employer =
    employerPresentation === "publicEmployer" &&
    publicEmployer &&
    experience?.confidentialClientLabel == null
      ? publicEmployer
      : employerPresentation === "confidentialClient" &&
          confidentialClientLabel &&
          experience?.employer == null &&
          experience?.employerUrl == null
        ? confidentialClientLabel[locale]
        : null;

  if (
    !id ||
    !employer ||
    !role ||
    !startDate ||
    typeof current !== "boolean" ||
    endDate === undefined ||
    (!current && endDate === null) ||
    (!current && endDate !== null && endDate < startDate) ||
    !summary ||
    !achievements ||
    location === null ||
    employmentType === null ||
    (experience?.employerUrl != null && !employerUrl) ||
    !skills
  ) {
    return null;
  }

  return {
    achievements: achievements[locale],
    current,
    employer,
    ...(employerUrl ? { employerUrl } : {}),
    ...(employmentType ? { employmentType } : {}),
    endDate,
    id,
    ...(location ? { location } : {}),
    role: role[locale],
    skills,
    startDate,
    summary: summary[locale],
  };
}

function compareExperience(
  left: ExperiencePageEntry,
  right: ExperiencePageEntry,
) {
  if (left.current !== right.current) {
    return left.current ? -1 : 1;
  }

  return (
    right.startDate.localeCompare(left.startDate) ||
    right.id.localeCompare(left.id)
  );
}

export function normalizePublishedExperience(
  value: unknown,
  locale: Locale,
): ExperiencePageContent | null {
  const result = record(value);
  const siteSettings = publishedDocument(result?.siteSettings);
  const displayName = nonEmptyString(siteSettings?.displayName);
  const sharingImage = record(siteSettings?.defaultSharingImage);
  const sharingImageUrl = safeUrl(sharingImage?.url, ["https:"]);
  const sharingImageWidth = positiveNumber(sharingImage?.width);
  const sharingImageHeight = positiveNumber(sharingImage?.height);
  const contactChannels = normalizeContactChannels(
    siteSettings?.contactChannels,
    locale,
  );
  const entries = Array.isArray(result?.experiences)
    ? result.experiences
        .map((entry) => normalizeExperience(entry, locale))
        .filter((entry): entry is ExperiencePageEntry => entry !== null)
        .sort(compareExperience)
    : null;

  if (
    !siteSettings ||
    !displayName ||
    !sharingImageUrl ||
    !sharingImageWidth ||
    !sharingImageHeight ||
    !contactChannels ||
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

export async function loadPublishedExperience(
  locale: Locale,
): Promise<ExperiencePageContent | null> {
  const result = await loadSanityQuery(EXPERIENCE_PAGE_QUERY, "Experience");
  return normalizePublishedExperience(result, locale);
}
