import {
  loadPublishedProjects,
  type Locale,
  type ProjectPageEntry,
  type ProjectsPageContent,
} from "@portfolio/content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React, { cache } from "react";

import { ProjectDetailPageView } from "../components/project-detail-page-view";
import { ProjectsPageView } from "../components/projects-page-view";
import { StructuredData } from "../components/structured-data";
import {
  projectMediaPublicPath,
  sharingImagePublicPath,
} from "./public-assets";
import { buildLocalizedPageMetadata, unpublishedContentMetadata } from "./content-route";
import { projectRoute } from "./routing";
import { absoluteSiteUrl, siteOrigin } from "./site-origin";

const publishedProjects = cache(loadPublishedProjects);

const metadataCopy = {
  en: {
    description:
      "Publish-safe software Project summaries with explicit contributions and supporting evidence.",
    title: "Projects",
  },
  hr: {
    description:
      "Sažeci softverskih projekata sigurni za objavu, s jasno navedenim doprinosima i potpornim dokazima.",
    title: "Projekti",
  },
} as const;

export function buildProjectsMetadata(
  content: ProjectsPageContent,
  locale: Locale,
  origin = siteOrigin(),
): Metadata {
  return buildLocalizedPageMetadata(
    content,
    locale,
    "projects",
    metadataCopy[locale],
    origin,
  );
}

export function buildProjectMetadata(
  content: ProjectsPageContent,
  project: ProjectPageEntry,
  locale: Locale,
  origin = siteOrigin(),
): Metadata {
  const canonical = absoluteSiteUrl(projectRoute(locale, project.slug), origin);
  const title = `${project.metadata.title} — ${content.displayName}`;
  const imagePath = project.heroMedia
    ? projectMediaPublicPath(
        project.slug,
        project.heroMedia.key,
        project.heroMedia.url,
      )
    : sharingImagePublicPath(project.metadata.image.url);
  const sharingImage = {
    alt: project.metadata.title,
    height: project.metadata.image.height,
    url: absoluteSiteUrl(imagePath, origin),
    width: project.metadata.image.width,
  };

  return {
    alternates: {
      canonical,
      languages: {
        en: absoluteSiteUrl(projectRoute("en", project.slug), origin),
        hr: absoluteSiteUrl(projectRoute("hr", project.slug), origin),
        "x-default": absoluteSiteUrl(projectRoute("en", project.slug), origin),
      },
    },
    description: project.metadata.description,
    metadataBase: origin,
    openGraph: {
      description: project.metadata.description,
      images: [sharingImage],
      locale: locale === "en" ? "en_US" : "hr_HR",
      siteName: content.displayName,
      title,
      type: "article",
      url: canonical,
    },
    title,
    twitter: {
      card: "summary_large_image",
      description: project.metadata.description,
      images: [sharingImage],
      title,
    },
  };
}

export function projectStructuredData(
  content: ProjectsPageContent,
  project: ProjectPageEntry,
  locale: Locale,
  origin = siteOrigin(),
) {
  const canonical = absoluteSiteUrl(projectRoute(locale, project.slug), origin);
  return {
    "@context": "https://schema.org",
    "@type": project.links.repository
      ? ("SoftwareSourceCode" as const)
      : ("CreativeWork" as const),
    author: {
      "@type": "Person",
      name: content.displayName,
    },
    ...(project.links.repository
      ? { codeRepository: project.links.repository }
      : {}),
    description: project.metadata.description,
    inLanguage: locale,
    name: project.metadata.title,
    temporalCoverage: project.endDate
      ? `${project.startDate}/${project.endDate}`
      : project.startDate,
    url: canonical,
  };
}

export async function projectsMetadata(locale: Locale): Promise<Metadata> {
  const content = await publishedProjects(locale);
  return content
    ? buildProjectsMetadata(content, locale)
    : unpublishedContentMetadata(locale);
}

export async function projectMetadata(
  locale: Locale,
  slug: string,
): Promise<Metadata> {
  const content = await publishedProjects(locale);
  const project = content?.entries.find((entry) => entry.slug === slug);
  return content && project
    ? buildProjectMetadata(content, project, locale)
    : unpublishedContentMetadata(locale);
}

export function buildProjectStaticParams(content: ProjectsPageContent | null) {
  return content?.entries.map(({ slug }) => ({ slug })) ?? [];
}

export async function projectStaticParams() {
  const content = await publishedProjects("en");
  return buildProjectStaticParams(content);
}

export async function renderProjectsRoute(locale: Locale) {
  const content = await publishedProjects(locale);
  if (!content) {
    notFound();
  }
  return <ProjectsPageView content={content} locale={locale} />;
}

export async function renderProjectRoute(locale: Locale, slug: string) {
  const content = await publishedProjects(locale);
  const project = content?.entries.find((entry) => entry.slug === slug);
  if (!content || !project) {
    notFound();
  }
  const structuredData = projectStructuredData(content, project, locale);
  return (
    <>
      <ProjectDetailPageView
        content={content}
        locale={locale}
        project={project}
      />
      <StructuredData value={structuredData} />
    </>
  );
}
