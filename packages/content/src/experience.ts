import type { Locale, LocalizedValue } from "./index";
import { defineQuery } from "groq";

import { hasSanityConfiguration } from "./about";

const employerPresentations = [
  "publicEmployer",
  "confidentialClient",
] as const;

type EmployerPresentation = (typeof employerPresentations)[number];
type UnknownRecord = Record<string, unknown>;

export type ExperiencePageContent = Readonly<{
  contactChannels: readonly Readonly<{
    href: string;
    kind: "email" | "phone" | "linkedin" | "github" | "other";
    label: string;
  }>[];
  displayName: string;
  entries: readonly ExperiencePageEntry[];
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

function record(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function publishedDocument(value: unknown): UnknownRecord | null {
  const candidate = record(value);
  const id = nonEmptyString(candidate?._id);
  return id && !id.startsWith("drafts.") ? candidate : null;
}

function localizedStrings(value: unknown): LocalizedValue<string> | null {
  const candidate = record(value);
  const en = nonEmptyString(candidate?.en);
  const hr = nonEmptyString(candidate?.hr);
  return en && hr ? { en, hr } : null;
}

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

function safeUrl(value: unknown, protocols: readonly string[]): string | null {
  const url = nonEmptyString(value);
  if (!url) {
    return null;
  }

  try {
    return protocols.includes(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
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
  const contactChannels = Array.isArray(siteSettings?.contactChannels)
    ? siteSettings.contactChannels.map((entry) => {
        const channel = record(entry);
        const kind = nonEmptyString(channel?.kind);
        const label = localizedStrings(channel?.label);
        const href = safeUrl(channel?.href, ["https:", "mailto:", "tel:"]);
        return kind &&
          ["email", "phone", "linkedin", "github", "other"].includes(kind) &&
          label &&
          href
          ? {
              href,
              kind: kind as ExperiencePageContent["contactChannels"][number]["kind"],
              label: label[locale],
            }
          : null;
      })
    : null;
  const entries = Array.isArray(result?.experiences)
    ? result.experiences
        .map((entry) => normalizeExperience(entry, locale))
        .filter((entry): entry is ExperiencePageEntry => entry !== null)
        .sort(compareExperience)
    : null;

  if (
    !siteSettings ||
    !displayName ||
    !contactChannels ||
    !contactChannels.every(
      (channel): channel is ExperiencePageContent["contactChannels"][number] =>
        channel !== null,
    ) ||
    !entries ||
    entries.length === 0
  ) {
    return null;
  }

  return {
    contactChannels,
    displayName,
    entries,
  };
}

function sanityEndpoint(): string | null {
  if (!hasSanityConfiguration()) {
    return null;
  }

  const projectId =
    process.env.SANITY_PROJECT_ID ?? process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset =
    process.env.SANITY_DATASET ??
    process.env.NEXT_PUBLIC_SANITY_DATASET ??
    "production";
  const query = new URLSearchParams({ query: EXPERIENCE_PAGE_QUERY });
  return `https://${projectId}.apicdn.sanity.io/v2025-02-19/data/query/${dataset}?${query}`;
}

export async function loadPublishedExperience(
  locale: Locale,
): Promise<ExperiencePageContent | null> {
  const endpoint = sanityEndpoint();
  if (!endpoint) {
    return null;
  }

  const response = await fetch(endpoint, {
    cache: "force-cache",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(
      `Sanity Experience query failed with status ${response.status}.`,
    );
  }

  const payload: unknown = await response.json();
  return normalizePublishedExperience(record(payload)?.result, locale);
}
