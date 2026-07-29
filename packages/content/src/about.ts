import type { Locale, LocalizedValue } from "./index";
import { defineQuery } from "groq";

type ResumeFile = Readonly<{
  mimeType: "application/pdf";
  updatedAt: string;
  url: string;
}>;

export const contactChannelKinds = [
  "email",
  "phone",
  "linkedin",
  "github",
  "other",
] as const;

export type ContactChannelKind = (typeof contactChannelKinds)[number];

export type AboutPageContent = Readonly<{
  biography: readonly string[];
  contactChannels: readonly Readonly<{
    href: string;
    kind: ContactChannelKind;
    label: string;
  }>[];
  currentFocus: string;
  displayName: string;
  featuredProjects: readonly Readonly<{
    contribution: string;
    slug: string;
    summary: string;
    title: string;
  }>[];
  headline: string;
  metadata: Readonly<{
    description: string;
    image: Readonly<{
      height: number;
      url: string;
      width: number;
    }>;
    title: string;
  }>;
  portrait: Readonly<{
    alt: string;
    caption?: string;
    crop: Readonly<{
      bottom: number;
      left: number;
      right: number;
      top: number;
    }>;
    height: number;
    hotspot: Readonly<{ x: number; y: number }>;
    url: string;
    width: number;
  }>;
  resumes: LocalizedValue<ResumeFile>;
  selectedSkills: readonly Readonly<{
    description: string;
    evidence: string;
    name: string;
  }>[];
}>;

type UnknownRecord = Record<string, unknown>;

export const ABOUT_PAGE_QUERY = defineQuery(`{
  "siteSettings": *[_id == "siteSettings" && !(_id in path("drafts.**"))][0]{
    _id,
    displayName,
    defaultMetadata,
    "defaultSharingImage": {
      "url": defaultSharingImage.asset->url,
      "width": defaultSharingImage.asset->metadata.dimensions.width,
      "height": defaultSharingImage.asset->metadata.dimensions.height
    },
    contactChannels[]{_key, kind, label, href}
  },
  "aboutMe": *[_id == "aboutMe" && !(_id in path("drafts.**"))][0]{
    _id,
    headline,
    biography,
    currentFocus,
    "selectedSkills": selectedSkills[]->{
      _id, canonicalName, displayName, capability, evidence
    },
    "featuredProjects": featuredProjects[]->{
      _id, "slug": slug.current, title, summary, contribution
    }
  },
  "profileMedia": *[_id == "aboutMe" && !(_id in path("drafts.**"))][0].profileMedia->{
    _id,
    "portrait": {
      "url": primaryPortrait.asset->url,
      "width": primaryPortrait.asset->metadata.dimensions.width,
      "height": primaryPortrait.asset->metadata.dimensions.height,
      "hotspot": primaryPortrait.hotspot,
      "crop": primaryPortrait.crop
    },
    alt,
    caption
  },
  "resumeSet": *[_id == "siteSettings" && !(_id in path("drafts.**"))][0].resumeSet->{
    _id,
    "english": {
      "url": englishResume.asset->url,
      "mimeType": englishResume.asset->mimeType,
      "updatedAt": englishUpdatedAt
    },
    "croatian": {
      "url": croatianResume.asset->url,
      "mimeType": croatianResume.asset->mimeType,
      "updatedAt": croatianUpdatedAt
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

function positiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function unitIntervalNumber(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
    ? value
    : null;
}

function imageCrop(value: unknown) {
  if (value == null) {
    return { bottom: 0, left: 0, right: 0, top: 0 };
  }

  const candidate = record(value);
  const bottom = unitIntervalNumber(candidate?.bottom);
  const left = unitIntervalNumber(candidate?.left);
  const right = unitIntervalNumber(candidate?.right);
  const top = unitIntervalNumber(candidate?.top);

  return bottom !== null &&
    left !== null &&
    right !== null &&
    top !== null &&
    bottom + top < 1 &&
    left + right < 1
    ? { bottom, left, right, top }
    : null;
}

function contactChannelKind(value: unknown): ContactChannelKind | null {
  return typeof value === "string" &&
    contactChannelKinds.includes(value as ContactChannelKind)
    ? (value as ContactChannelKind)
    : null;
}

function localizedStrings(value: unknown): LocalizedValue<string> | null {
  const candidate = record(value);
  const en = nonEmptyString(candidate?.en);
  const hr = nonEmptyString(candidate?.hr);
  return en && hr ? { en, hr } : null;
}

function publishedDocument(value: unknown): UnknownRecord | null {
  const candidate = record(value);
  const id = nonEmptyString(candidate?._id);
  return id && !id.startsWith("drafts.") ? candidate : null;
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

function localizedEntries<T>(
  value: unknown,
  normalize: (entry: UnknownRecord) => T | null,
): readonly T[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const entries = value.map((entry) => {
    const candidate = publishedDocument(entry);
    return candidate ? normalize(candidate) : null;
  });

  return entries.every((entry): entry is T => entry !== null) ? entries : null;
}

function resumeFile(value: unknown): ResumeFile | null {
  const candidate = record(value);
  const url = safeUrl(candidate?.url, ["https:"]);
  const updatedAt = nonEmptyString(candidate?.updatedAt);
  return url && updatedAt && candidate?.mimeType === "application/pdf"
    ? { mimeType: "application/pdf", updatedAt, url }
    : null;
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

export function normalizePublishedAbout(
  value: unknown,
  locale: Locale,
): AboutPageContent | null {
  const result = record(value);
  const siteSettings = publishedDocument(result?.siteSettings);
  const aboutMe = publishedDocument(result?.aboutMe);
  const profileMedia = publishedDocument(result?.profileMedia);
  const resumeSet = publishedDocument(result?.resumeSet);

  if (!siteSettings || !aboutMe || !profileMedia || !resumeSet) {
    return null;
  }

  const displayName = nonEmptyString(siteSettings.displayName);
  const metadata = record(siteSettings.defaultMetadata);
  const metadataTitle = localizedStrings(metadata?.title);
  const metadataDescription = localizedStrings(metadata?.description);
  const sharingImage = record(siteSettings.defaultSharingImage);
  const sharingImageUrl = safeUrl(sharingImage?.url, ["https:"]);
  const sharingImageWidth = positiveNumber(sharingImage?.width);
  const sharingImageHeight = positiveNumber(sharingImage?.height);
  const headline = localizedStrings(aboutMe.headline);
  const biography = localizedStrings(aboutMe.biography);
  const currentFocus = localizedStrings(aboutMe.currentFocus);
  const alt = localizedStrings(profileMedia.alt);
  const caption = profileMedia.caption
    ? localizedStrings(profileMedia.caption)
    : null;
  const portrait = record(profileMedia.portrait);
  const portraitUrl = safeUrl(portrait?.url, ["https:"]);
  const portraitWidth = positiveNumber(portrait?.width);
  const portraitHeight = positiveNumber(portrait?.height);
  const hotspot = record(portrait?.hotspot);
  const hotspotX = hotspot == null ? 0.5 : unitIntervalNumber(hotspot.x);
  const hotspotY = hotspot == null ? 0.5 : unitIntervalNumber(hotspot.y);
  const crop = imageCrop(portrait?.crop);
  const englishResume = resumeFile(resumeSet.english);
  const croatianResume = resumeFile(resumeSet.croatian);

  const contactChannels = Array.isArray(siteSettings.contactChannels)
    ? siteSettings.contactChannels.map((entry) => {
        const channel = record(entry);
        const label = localizedStrings(channel?.label);
        const href = safeUrl(channel?.href, ["https:", "mailto:", "tel:"]);
        const kind = contactChannelKind(channel?.kind);
        return label && href && kind
          ? { href, kind, label: label[locale] }
          : null;
      })
    : null;
  const selectedSkills = localizedEntries(aboutMe.selectedSkills, (skill) => {
    const name =
      localizedStrings(skill.displayName)?.[locale] ??
      nonEmptyString(skill.canonicalName);
    const capability = localizedStrings(skill.capability);
    const evidence = localizedStrings(skill.evidence);
    return name && capability && evidence
      ? {
          description: capability[locale],
          evidence: evidence[locale],
          name,
        }
      : null;
  });
  const featuredProjects = localizedEntries(
    aboutMe.featuredProjects,
    (project) => {
      const slugCandidate = nonEmptyString(project.slug);
      const slug =
        slugCandidate && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugCandidate)
          ? slugCandidate
          : null;
      const title = localizedStrings(project.title);
      const summary = localizedStrings(project.summary);
      const contribution = localizedStrings(project.contribution);
      return slug && title && summary && contribution
        ? {
            contribution: contribution[locale],
            slug,
            summary: summary[locale],
            title: title[locale],
          }
        : null;
    },
  );

  const biographyParagraphs = biography?.[locale]
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (
    !displayName ||
    !metadataTitle ||
    !metadataDescription ||
    !sharingImageUrl ||
    !sharingImageWidth ||
    !sharingImageHeight ||
    !headline ||
    !biography ||
    !currentFocus ||
    !alt ||
    (profileMedia.caption != null && !caption) ||
    !portraitUrl ||
    !portraitWidth ||
    !portraitHeight ||
    hotspotX === null ||
    hotspotY === null ||
    !crop ||
    !englishResume ||
    !croatianResume ||
    !contactChannels ||
    contactChannels.length === 0 ||
    !contactChannels.every(isPresent) ||
    !selectedSkills ||
    selectedSkills.length === 0 ||
    !featuredProjects ||
    featuredProjects.length === 0 ||
    !biographyParagraphs ||
    biographyParagraphs.length === 0
  ) {
    return null;
  }

  return {
    biography: biographyParagraphs,
    contactChannels: contactChannels.filter(isPresent),
    currentFocus: currentFocus[locale],
    displayName,
    featuredProjects,
    headline: headline[locale],
    metadata: {
      description: metadataDescription[locale],
      image: {
        height: sharingImageHeight,
        url: sharingImageUrl,
        width: sharingImageWidth,
      },
      title: metadataTitle[locale],
    },
    portrait: {
      alt: alt[locale],
      ...(caption ? { caption: caption[locale] } : {}),
      crop,
      height: portraitHeight,
      hotspot: { x: hotspotX, y: hotspotY },
      url: portraitUrl,
      width: portraitWidth,
    },
    resumes: { en: englishResume, hr: croatianResume },
    selectedSkills,
  };
}

type SanityEnvironment = Readonly<Record<string, string | undefined>>;

export function hasSanityConfiguration(
  environment: SanityEnvironment = process.env,
): boolean {
  const configuredKeys = [
    "NEXT_PUBLIC_SANITY_DATASET",
    "NEXT_PUBLIC_SANITY_PROJECT_ID",
    "SANITY_DATASET",
    "SANITY_PROJECT_ID",
  ] as const;
  if (!configuredKeys.some((key) => environment[key] !== undefined)) {
    return false;
  }

  const projectId =
    environment.SANITY_PROJECT_ID ?? environment.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset =
    environment.SANITY_DATASET ??
    environment.NEXT_PUBLIC_SANITY_DATASET ??
    "production";

  if (
    !projectId ||
    !/^[a-z0-9-]+$/.test(projectId) ||
    !/^[a-zA-Z0-9_-]+$/.test(dataset)
  ) {
    throw new Error(
      "Invalid Sanity configuration: check the project ID and dataset.",
    );
  }

  return true;
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
  const query = new URLSearchParams({ query: ABOUT_PAGE_QUERY });
  return `https://${projectId}.apicdn.sanity.io/v2025-02-19/data/query/${dataset}?${query}`;
}

export async function loadPublishedAbout(
  locale: Locale,
): Promise<AboutPageContent | null> {
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
      `Sanity About Me query failed with status ${response.status}.`,
    );
  }

  const payload: unknown = await response.json();
  return normalizePublishedAbout(record(payload)?.result, locale);
}
