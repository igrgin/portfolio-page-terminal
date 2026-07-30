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
  type SanityQueryOptions,
} from "./sanity";
import type { Locale } from "./index";

export const EDUCATION_YEAR_RANGE = {
  earliest: 1900,
  latest: 2100,
} as const;

export type EducationPageContent = Readonly<{
  contactChannels: readonly ContactChannel[];
  displayName: string;
  entries: readonly EducationPageEntry[];
  metadata: Readonly<{
    image: Readonly<{
      height: number;
      url: string;
      width: number;
    }>;
  }>;
}>;

export type EducationPageEntry = Readonly<{
  endYear?: number;
  field: string;
  inProgress: boolean;
  institution: string;
  location?: string;
  qualification: string;
  relevantSubjects: readonly string[];
  skills: readonly string[];
  startYear: number;
  url?: string;
}>;

export const EDUCATION_PAGE_QUERY = defineQuery(`{
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
  "educationEntries": *[
    _type == "education" && !(_id in path("drafts.**"))
  ]{
    _id,
    institution,
    qualification,
    field,
    startYear,
    endYear,
    inProgress,
    location,
    url,
    relevantSubjects[]{_key, title},
    "skills": skills[]->{
      _id, _type, canonicalName, displayName, capability, evidence
    }
  }
}`);

function educationYear(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= EDUCATION_YEAR_RANGE.earliest &&
    value <= EDUCATION_YEAR_RANGE.latest
    ? value
    : null;
}

function normalizeEducationEntry(
  value: unknown,
  locale: Locale,
): EducationPageEntry | null {
  const entry = publishedDocument(value);
  if (!entry) {
    return null;
  }

  const institution = localizedStrings(entry.institution);
  const qualification = localizedStrings(entry.qualification);
  const field = localizedStrings(entry.field);
  const startYear = educationYear(entry.startYear);
  const inProgress =
    typeof entry.inProgress === "boolean" ? entry.inProgress : null;
  const hasEndYear = entry.endYear != null;
  const endYear = hasEndYear ? educationYear(entry.endYear) : null;
  const location =
    entry.location == null ? null : localizedStrings(entry.location);
  const url =
    entry.url == null ? null : safeUrl(entry.url, ["https:"]);

  const relevantSubjects = Array.isArray(entry.relevantSubjects)
    ? entry.relevantSubjects.map((value) => {
        const subject = record(value);
        return localizedStrings(subject?.title)?.[locale] ?? null;
      })
    : null;
  const skills =
    entry.skills == null
      ? []
      : Array.isArray(entry.skills)
        ? entry.skills.map((value) => {
            const skill = publishedDocument(value);
            const canonicalName = nonEmptyString(skill?.canonicalName);
            const displayName =
              skill?.displayName == null
                ? null
                : localizedStrings(skill.displayName);
            const capability = localizedStrings(skill?.capability);
            const evidence =
              skill?.evidence == null ? null : localizedStrings(skill.evidence);
            return skill?._type === "skill" &&
              canonicalName &&
              (skill.displayName == null || displayName) &&
              capability &&
              (skill.evidence == null || evidence)
              ? (displayName?.[locale] ?? canonicalName)
              : null;
          })
        : null;

  if (
    !institution ||
    !qualification ||
    !field ||
    startYear === null ||
    inProgress === null ||
    (inProgress ? hasEndYear : endYear === null) ||
    (endYear !== null && endYear < startYear) ||
    (entry.location != null && !location) ||
    (entry.url != null && !url) ||
    !relevantSubjects ||
    relevantSubjects.length === 0 ||
    relevantSubjects.some((subject) => subject === null) ||
    !skills ||
    skills.some((skill) => skill === null)
  ) {
    return null;
  }

  return {
    ...(endYear === null ? {} : { endYear }),
    field: field[locale],
    inProgress,
    institution: institution[locale],
    ...(location ? { location: location[locale] } : {}),
    qualification: qualification[locale],
    relevantSubjects: relevantSubjects.filter(
      (subject): subject is string => subject !== null,
    ),
    skills: skills.filter((skill): skill is string => skill !== null),
    startYear,
    ...(url ? { url } : {}),
  };
}

function compareEducationEntries(
  left: EducationPageEntry,
  right: EducationPageEntry,
) {
  if (left.inProgress !== right.inProgress) {
    return left.inProgress ? -1 : 1;
  }

  const endDifference =
    (right.endYear ?? right.startYear) - (left.endYear ?? left.startYear);
  return endDifference || right.startYear - left.startYear;
}

export function normalizePublishedEducation(
  value: unknown,
  locale: Locale,
): EducationPageContent | null {
  const result = record(value);
  const siteSettings = publishedDocument(result?.siteSettings);
  if (!siteSettings || !Array.isArray(result?.educationEntries)) {
    return null;
  }

  const displayName = nonEmptyString(siteSettings.displayName);
  const contactChannels = normalizeContactChannels(
    siteSettings.contactChannels,
    locale,
  );
  const sharingImage = record(siteSettings.defaultSharingImage);
  const sharingImageUrl = safeUrl(sharingImage?.url, ["https:"]);
  const sharingImageWidth = positiveNumber(sharingImage?.width);
  const sharingImageHeight = positiveNumber(sharingImage?.height);
  const entries = result.educationEntries
    .map((entry) => normalizeEducationEntry(entry, locale))
    .filter((entry): entry is EducationPageEntry => entry !== null)
    .sort(compareEducationEntries);

  if (
    !displayName ||
    !contactChannels ||
    contactChannels.length === 0 ||
    !sharingImageUrl ||
    !sharingImageWidth ||
    !sharingImageHeight ||
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

export async function loadPublishedEducation(
  locale: Locale,
  options?: SanityQueryOptions,
): Promise<EducationPageContent | null> {
  const result = await loadSanityQuery(
    EDUCATION_PAGE_QUERY,
    "Education",
    options,
  );
  return normalizePublishedEducation(result, locale);
}
