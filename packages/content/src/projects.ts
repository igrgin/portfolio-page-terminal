import { defineQuery } from "groq";

import type { Locale, LocalizedValue } from "./index";
import {
  diagramAssetPublicPath,
  isDiagramPathSegment,
  validatePortfolioDiagram,
  type PortfolioDiagram,
} from "./diagrams";
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
import { normalizeSkillEntry, SKILL_PUBLIC_PROJECTION } from "./skills";

export const projectStatuses = [
  "inProgress",
  "completed",
  "maintained",
  "archived",
] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export const projectDisclosureLevels = ["summary", "full"] as const;

export type ProjectDisclosureLevel = (typeof projectDisclosureLevels)[number];

export function isProjectDisclosureLevel(
  value: unknown,
): value is ProjectDisclosureLevel {
  return (
    typeof value === "string" &&
    projectDisclosureLevels.some((level) => level === value)
  );
}

export const projectCaseStudyFieldKeys = [
  "context",
  "constraints",
  "approach",
  "outcome",
  "lessons",
] as const;

export type ProjectCaseStudyField = (typeof projectCaseStudyFieldKeys)[number];

export function isOngoingProjectStatus(
  value: unknown,
): value is "inProgress" | "maintained" {
  return value === "inProgress" || value === "maintained";
}

export const projectStatusLabels: Readonly<
  Record<ProjectStatus, LocalizedValue<string>>
> = {
  archived: { en: "Archived", hr: "Arhiviran" },
  completed: { en: "Completed", hr: "Dovršen" },
  inProgress: { en: "In progress", hr: "U tijeku" },
  maintained: { en: "Maintained", hr: "Održavan" },
};

export type ProjectMedia = Readonly<{
  alt: string;
  caption?: string;
  height: number;
  key: string;
  url: string;
  width: number;
}>;

export type ProjectCaseStudy = Readonly<Record<ProjectCaseStudyField, string>>;

export type ProjectDiagram = Readonly<{
  assets: Readonly<{ dark: string; light: string }>;
  caption: string;
  description: string;
  id: string;
  title: string;
}>;

export type ProjectPageEntry = Readonly<{
  caseStudy?: ProjectCaseStudy;
  contribution: string;
  diagrams: readonly ProjectDiagram[];
  disclosureLevel: ProjectDisclosureLevel;
  endDate?: string;
  featured: boolean;
  heroMedia?: ProjectMedia;
  id: string;
  links: Readonly<{
    demo?: string;
    documentation?: string;
    repository?: string;
  }>;
  media: readonly ProjectMedia[];
  metadata: Readonly<{
    description: string;
    image: Readonly<{
      height: number;
      url: string;
      width: number;
    }>;
    title: string;
  }>;
  order: number;
  skills: readonly Readonly<{ id: string; name: string }>[];
  slug: string;
  startDate: string;
  status: Readonly<{ key: ProjectStatus; label: string }>;
  summary: string;
  title: string;
}>;

export type ProjectsPageContent = Readonly<{
  contactChannels: readonly ContactChannel[];
  displayName: string;
  entries: readonly ProjectPageEntry[];
  metadata: Readonly<{
    image: Readonly<{
      height: number;
      url: string;
      width: number;
    }>;
  }>;
}>;

const PROJECT_MEDIA_PROJECTION = `{
  _key,
  "image": {
    "url": image.asset->url,
    "width": image.asset->metadata.dimensions.width,
    "height": image.asset->metadata.dimensions.height
  },
  alternativeText,
  caption
}` as const;

const PROJECT_DIAGRAM_PROJECTION = `{
  _key,
  id,
  kind,
  source,
  title,
  caption,
  description
}` as const;

export const PROJECTS_PAGE_QUERY = defineQuery(`{
  "siteSettings": *[
    _id == "siteSettings" && !(_id in path("drafts.**"))
  ][0]{
    _id,
    displayName,
    "defaultSharingImage": {
      "url": defaultSharingImage.asset->url,
      "width": defaultSharingImage.asset->metadata.dimensions.width,
      "height": defaultSharingImage.asset->metadata.dimensions.height
    },
    contactChannels[]{_key, kind, label, href}
  },
  "projects": *[
    _type == "project" && !(_id in path("drafts.**"))
  ]{
    _id,
    _type,
    title,
    "slug": slug.current,
    summary,
    contribution,
    disclosureLevel,
    context,
    constraints,
    approach,
    outcome,
    lessons,
    startDate,
    endDate,
    status,
    featured,
    order,
    "skills": skills[]->${SKILL_PUBLIC_PROJECTION},
    repositoryUrl,
    demoUrl,
    documentationUrl,
    metadataOverride,
    "heroMedia": heroMedia${PROJECT_MEDIA_PROJECTION},
    diagrams[]${PROJECT_DIAGRAM_PROJECTION},
    "media": media[]${PROJECT_MEDIA_PROJECTION},
    publishSafe,
    sensitive
  }
}`);

function projectMonth(value: unknown): string | null {
  const candidate = nonEmptyString(value);
  return candidate && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(candidate)
    ? candidate
    : null;
}

function normalizeProjectMedia(
  value: unknown,
  locale: Locale,
  fallbackKey?: string,
): ProjectMedia | null {
  const media = record(value);
  const image = record(media?.image);
  const keyCandidate = fallbackKey ?? nonEmptyString(media?._key);
  const key =
    keyCandidate &&
    /^[a-z0-9_-]+$/i.test(keyCandidate) &&
    (fallbackKey || keyCandidate.toLowerCase() !== "hero")
      ? keyCandidate
      : null;
  const url = safeUrl(image?.url, ["https:"]);
  const width = positiveNumber(image?.width);
  const height = positiveNumber(image?.height);
  const alternativeText = localizedStrings(media?.alternativeText);
  const caption =
    media?.caption == null ? null : localizedStrings(media.caption);

  return key &&
    url &&
    width &&
    height &&
    alternativeText &&
    (media?.caption == null || caption)
    ? {
        alt: alternativeText[locale],
        ...(caption ? { caption: caption[locale] } : {}),
        height,
        key,
        url,
        width,
      }
    : null;
}

function normalizeProjectCaseStudy(
  project: Readonly<Record<string, unknown>>,
  locale: Locale,
): ProjectCaseStudy | null {
  const localizedSections = projectCaseStudyFieldKeys.map((field) => {
    const localized = localizedStrings(project[field]);
    return localized ? ([field, localized[locale]] as const) : null;
  });
  const completeSections = localizedSections.filter(
    (section): section is readonly [ProjectCaseStudyField, string] =>
      section !== null,
  );

  return completeSections.length !== projectCaseStudyFieldKeys.length
    ? null
    : (Object.fromEntries(completeSections) as ProjectCaseStudy);
}

function normalizeProjectDiagrams(
  value: unknown,
  projectSlug: string,
  locale: Locale,
): readonly ProjectDiagram[] | null {
  if (value == null) {
    return [];
  }
  if (!Array.isArray(value)) {
    return null;
  }

  const ids = new Set<string>();
  const diagrams = value.map((entry) => {
    const result = validatePortfolioDiagram(entry);
    if (!result.ok || ids.has(result.value.id)) {
      return null;
    }
    ids.add(result.value.id);
    return {
      assets: {
        dark: diagramAssetPublicPath(
          projectSlug,
          result.value.id,
          locale,
          "dark",
        ),
        light: diagramAssetPublicPath(
          projectSlug,
          result.value.id,
          locale,
          "light",
        ),
      },
      caption: result.value.caption[locale],
      description: result.value.description[locale],
      id: result.value.id,
      title: result.value.title[locale],
    };
  });

  return diagrams.every(
    (diagram): diagram is ProjectDiagram => diagram !== null,
  )
    ? diagrams
    : null;
}

function normalizeProjectEntry(
  value: unknown,
  locale: Locale,
  defaultSharingImage: Readonly<{
    height: number;
    url: string;
    width: number;
  }>,
): ProjectPageEntry | null {
  const project = publishedDocument(value);
  const id = nonEmptyString(project?._id);
  const title = localizedStrings(project?.title);
  const slugCandidate = nonEmptyString(project?.slug);
  const slug =
    slugCandidate && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugCandidate)
      ? slugCandidate
      : null;
  const summary = localizedStrings(project?.summary);
  const contribution = localizedStrings(project?.contribution);
  const disclosureLevel =
    project?.disclosureLevel == null
      ? "summary"
      : isProjectDisclosureLevel(project.disclosureLevel)
        ? project.disclosureLevel
        : null;
  const caseStudy =
    disclosureLevel === "full" && project
      ? normalizeProjectCaseStudy(project, locale)
      : null;
  const startDate = projectMonth(project?.startDate);
  const status =
    typeof project?.status === "string" &&
    projectStatuses.includes(project.status as ProjectStatus)
      ? (project.status as ProjectStatus)
      : null;
  const hasEndDate = project?.endDate != null;
  const endDate = hasEndDate ? projectMonth(project.endDate) : null;
  const ongoing = isOngoingProjectStatus(status);
  const featured =
    typeof project?.featured === "boolean" ? project.featured : null;
  const order =
    typeof project?.order === "number" &&
    Number.isInteger(project.order) &&
    project.order >= 0
      ? project.order
      : null;
  const skills = Array.isArray(project?.skills)
    ? project.skills.map((value) => {
        const source = publishedDocument(value);
        const skill = normalizeSkillEntry(value, locale);
        const skillId = nonEmptyString(source?._id);
        return skill && skillId ? { id: skillId, name: skill.name } : null;
      })
    : null;
  const repository =
    project?.repositoryUrl == null
      ? null
      : safeUrl(project.repositoryUrl, ["https:"]);
  const demo =
    project?.demoUrl == null ? null : safeUrl(project.demoUrl, ["https:"]);
  const documentation =
    project?.documentationUrl == null
      ? null
      : safeUrl(project.documentationUrl, ["https:"]);
  const metadataOverride =
    project?.metadataOverride == null ? null : record(project.metadataOverride);
  const metadataTitle =
    metadataOverride == null ? title : localizedStrings(metadataOverride.title);
  const metadataDescription =
    metadataOverride == null
      ? summary
      : localizedStrings(metadataOverride.description);
  const heroMedia =
    project?.heroMedia == null
      ? null
      : normalizeProjectMedia(project.heroMedia, locale, "hero");
  const media =
    project?.media == null
      ? []
      : Array.isArray(project.media)
        ? project.media.map((entry) => normalizeProjectMedia(entry, locale))
        : null;
  const mediaKeys =
    media
      ?.filter((entry): entry is ProjectMedia => entry !== null)
      .map(({ key }) => key.toLowerCase()) ?? [];
  const diagrams =
    disclosureLevel === "full" && slug
      ? normalizeProjectDiagrams(project?.diagrams, slug, locale)
      : [];

  if (
    project?._type !== "project" ||
    project?.publishSafe !== true ||
    project?.sensitive === true ||
    !id ||
    !title ||
    !slug ||
    !summary ||
    !contribution ||
    !disclosureLevel ||
    (disclosureLevel === "full" && !caseStudy) ||
    !startDate ||
    !status ||
    (ongoing ? hasEndDate : endDate === null) ||
    (endDate !== null && endDate < startDate) ||
    featured === null ||
    order === null ||
    !skills ||
    skills.length === 0 ||
    skills.some((skill) => skill === null) ||
    (project?.repositoryUrl != null && !repository) ||
    (project?.demoUrl != null && !demo) ||
    (project?.documentationUrl != null && !documentation) ||
    (project?.metadataOverride != null &&
      (!metadataTitle || !metadataDescription)) ||
    (project?.heroMedia != null && !heroMedia) ||
    !media ||
    media.some((entry) => entry === null) ||
    new Set(mediaKeys).size !== mediaKeys.length ||
    !diagrams
  ) {
    return null;
  }

  const metadataImage = heroMedia ?? defaultSharingImage;

  return {
    ...(caseStudy ? { caseStudy } : {}),
    contribution: contribution[locale],
    diagrams,
    disclosureLevel,
    ...(endDate ? { endDate } : {}),
    featured,
    ...(heroMedia ? { heroMedia } : {}),
    id,
    links: {
      ...(demo ? { demo } : {}),
      ...(documentation ? { documentation } : {}),
      ...(repository ? { repository } : {}),
    },
    media: media.filter((entry): entry is ProjectMedia => entry !== null),
    metadata: {
      description: metadataDescription![locale],
      image: {
        height: metadataImage.height,
        url: metadataImage.url,
        width: metadataImage.width,
      },
      title: metadataTitle![locale],
    },
    order,
    skills: skills.filter(
      (skill): skill is { id: string; name: string } => skill !== null,
    ),
    slug,
    startDate,
    status: { key: status, label: projectStatusLabels[status][locale] },
    summary: summary[locale],
    title: title[locale],
  };
}

function compareProjectEntries(
  left: ProjectPageEntry,
  right: ProjectPageEntry,
) {
  if (left.featured !== right.featured) {
    return left.featured ? -1 : 1;
  }
  return left.order - right.order || left.title.localeCompare(right.title);
}

export function normalizePublishedProjects(
  value: unknown,
  locale: Locale,
): ProjectsPageContent | null {
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

  if (
    !siteSettings ||
    !displayName ||
    !contactChannels ||
    contactChannels.length === 0 ||
    !sharingImageUrl ||
    !sharingImageWidth ||
    !sharingImageHeight ||
    !Array.isArray(result?.projects)
  ) {
    return null;
  }

  const defaultSharingImage = {
    height: sharingImageHeight,
    url: sharingImageUrl,
    width: sharingImageWidth,
  };
  const normalized = result.projects
    .map((project) =>
      normalizeProjectEntry(project, locale, defaultSharingImage),
    )
    .filter((project): project is ProjectPageEntry => project !== null);
  const slugCounts = new Map<string, number>();
  for (const project of normalized) {
    slugCounts.set(project.slug, (slugCounts.get(project.slug) ?? 0) + 1);
  }
  const entries = normalized
    .filter((project) => slugCounts.get(project.slug) === 1)
    .sort(compareProjectEntries);

  if (entries.length === 0) {
    return null;
  }

  return {
    contactChannels,
    displayName,
    entries,
    metadata: { image: defaultSharingImage },
  };
}

export async function loadPublishedProjects(
  locale: Locale,
  options?: SanityQueryOptions,
): Promise<ProjectsPageContent | null> {
  const result = await loadSanityQuery(PROJECTS_PAGE_QUERY, "Projects", options);
  return normalizePublishedProjects(result, locale);
}

export const PROJECT_DIAGRAMS_QUERY = defineQuery(`*[
  _type == "project" &&
  !(_id in path("drafts.**")) &&
  publishSafe == true &&
  sensitive != true &&
  disclosureLevel == "full" &&
  count(diagrams) > 0
]{
  _id,
  _type,
  "slug": slug.current,
  publishSafe,
  sensitive,
  diagrams[]${PROJECT_DIAGRAM_PROJECTION}
}`);

export type PublishedProjectDiagramInput = Readonly<{
  diagram: PortfolioDiagram;
  projectSlug: string;
}>;

export function normalizePublishedProjectDiagrams(
  value: unknown,
): readonly PublishedProjectDiagramInput[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const identities = new Set<string>();
  const inputs: PublishedProjectDiagramInput[] = [];
  for (const entry of value) {
    const project = publishedDocument(entry);
    const slug = nonEmptyString(project?.slug);
    if (
      project?._type !== "project" ||
      project?.publishSafe !== true ||
      project?.sensitive === true ||
      !slug ||
      !isDiagramPathSegment(slug) ||
      !Array.isArray(project.diagrams)
    ) {
      return null;
    }

    for (const diagram of project.diagrams) {
      const result = validatePortfolioDiagram(diagram);
      const identity = result.ok ? `${slug}/${result.value.id}` : "";
      if (!result.ok || identities.has(identity)) {
        return null;
      }
      identities.add(identity);
      inputs.push({ diagram: result.value, projectSlug: slug });
    }
  }
  return inputs;
}

export async function loadPublishedProjectDiagrams(): Promise<
  readonly PublishedProjectDiagramInput[]
> {
  const result = await loadSanityQuery(
    PROJECT_DIAGRAMS_QUERY,
    "Project diagrams",
  );
  const diagrams = normalizePublishedProjectDiagrams(result);
  if (!diagrams) {
    throw new Error(
      "Published Project diagrams are missing or invalid; preserving the last valid generated assets.",
    );
  }
  return diagrams;
}
