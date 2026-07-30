import {
  loadPublishedAbout,
  loadPublishedContact,
  loadPublishedEducation,
  loadPublishedExperience,
  loadPublishedPrivacy,
  loadPublishedProjects,
  loadPublishedSkills,
  type Locale,
  type SanityQueryOptions,
} from "@portfolio/content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";

import { AboutPageView } from "../components/about-page-view";
import { ContactPageView } from "../components/contact-page-view";
import { DraftModeBanner } from "../components/draft-mode-banner";
import { EducationPageView } from "../components/education-page-view";
import { ExperiencePageView } from "../components/experience-page-view";
import { PrivacyPageView } from "../components/privacy-page-view";
import { ProjectDetailPageView } from "../components/project-detail-page-view";
import { ProjectsPageView } from "../components/projects-page-view";
import { SkillsPageView } from "../components/skills-page-view";
import { StructuredData } from "../components/structured-data";
import {
  aboutStructuredData,
  buildAboutMetadata,
} from "./about-route";
import { buildContactMetadata } from "./contact-route";
import { buildDraftMetadata } from "./draft-route";
import { buildEducationMetadata } from "./education-route";
import {
  buildExperienceMetadata,
  experienceStructuredData,
} from "./experience-route";
import { buildPrivacyMetadata } from "./privacy-route";
import {
  buildProjectMetadata,
  buildProjectsMetadata,
  projectStructuredData,
} from "./projects-route";
import { buildSkillsMetadata } from "./skills-route";

type DraftDestination =
  | Readonly<{ destination: "about" }>
  | Readonly<{ destination: "contact" }>
  | Readonly<{ destination: "education" }>
  | Readonly<{ destination: "experience" }>
  | Readonly<{ destination: "privacy" }>
  | Readonly<{ destination: "project"; slug: string }>
  | Readonly<{ destination: "projects" }>
  | Readonly<{ destination: "skills" }>;

const localizedSegments = {
  en: {
    about: "about",
    contact: "contact",
    education: "education",
    experience: "experience",
    privacy: "privacy",
    projects: "projects",
    skills: "skills",
  },
  hr: {
    about: "o-meni",
    contact: "kontakt",
    education: "obrazovanje",
    experience: "iskustvo",
    privacy: "privatnost",
    projects: "projekti",
    skills: "vjestine",
  },
} as const;

export function resolveDraftDestination(
  locale: Locale,
  path: readonly string[] | undefined,
): DraftDestination | null {
  const segments = path ?? [localizedSegments[locale].about];
  if (segments.length < 1 || segments.length > 2) {
    return null;
  }
  const route = localizedSegments[locale];
  const segment = segments[0];
  if (segment === route.projects) {
    return segments[1]
      ? { destination: "project", slug: segments[1] }
      : { destination: "projects" };
  }
  if (segments.length !== 1) {
    return null;
  }
  for (const destination of [
    "about",
    "contact",
    "education",
    "experience",
    "privacy",
    "skills",
  ] as const) {
    if (segment === route[destination]) {
      return { destination };
    }
  }
  return null;
}

export type DraftApplicationContext = Readonly<{
  batchName: string;
  documentIds: readonly string[];
  expiresAt: number;
  revision: string;
  token: string;
}>;

function queryOptions(
  context: DraftApplicationContext,
): SanityQueryOptions {
  return {
    documentIds: context.documentIds,
    mode: "draft",
    token: context.token,
  };
}

export async function draftApplicationMetadata(
  locale: Locale,
  path: readonly string[] | undefined,
  context: DraftApplicationContext,
): Promise<Metadata> {
  const destination = resolveDraftDestination(locale, path);
  if (!destination) {
    return buildDraftMetadata({ title: "Draft page not found" });
  }
  const options = queryOptions(context);
  switch (destination.destination) {
    case "about": {
      const content = await loadPublishedAbout(locale, options);
      return buildDraftMetadata(
        content ? buildAboutMetadata(content, locale) : {},
        content
          ? {
              alt: content.displayName,
              ...content.metadata.image,
            }
          : undefined,
      );
    }
    case "contact": {
      const content = await loadPublishedContact(locale, options);
      return buildDraftMetadata(
        content ? buildContactMetadata(content, locale) : {},
        content
          ? { alt: content.displayName, ...content.metadata.image }
          : undefined,
      );
    }
    case "education": {
      const content = await loadPublishedEducation(locale, options);
      return buildDraftMetadata(
        content ? buildEducationMetadata(content, locale) : {},
        content
          ? { alt: content.displayName, ...content.metadata.image }
          : undefined,
      );
    }
    case "experience": {
      const content = await loadPublishedExperience(locale, options);
      return buildDraftMetadata(
        content ? buildExperienceMetadata(content, locale) : {},
        content
          ? { alt: content.displayName, ...content.metadata.image }
          : undefined,
      );
    }
    case "privacy": {
      const content = await loadPublishedPrivacy(locale, options);
      return buildDraftMetadata(
        content ? buildPrivacyMetadata(content, locale) : {},
        content
          ? { alt: content.displayName, ...content.metadata.image }
          : undefined,
      );
    }
    case "skills": {
      const content = await loadPublishedSkills(locale, options);
      return buildDraftMetadata(
        content ? buildSkillsMetadata(content, locale) : {},
        content
          ? { alt: content.displayName, ...content.metadata.image }
          : undefined,
      );
    }
    case "projects":
    case "project": {
      const content = await loadPublishedProjects(locale, options);
      const project =
        destination.destination === "project"
          ? content?.entries.find(({ slug }) => slug === destination.slug)
          : null;
      return buildDraftMetadata(
        content && destination.destination === "projects"
          ? buildProjectsMetadata(content, locale)
          : content && project
            ? buildProjectMetadata(content, project, locale)
            : {},
        content && destination.destination === "projects"
          ? { alt: content.displayName, ...content.metadata.image }
          : project
            ? {
                alt: project.metadata.title,
                ...project.metadata.image,
              }
            : undefined,
      );
    }
  }
}

export async function renderDraftApplicationPage(
  locale: Locale,
  path: readonly string[] | undefined,
  context: DraftApplicationContext,
) {
  const destination = resolveDraftDestination(locale, path);
  if (!destination) {
    notFound();
  }
  const options = queryOptions(context);
  let page: React.ReactNode;
  switch (destination.destination) {
    case "about": {
      const content = await loadPublishedAbout(locale, options);
      if (!content) notFound();
      page = (
        <>
          <AboutPageView content={content} locale={locale} routeMode="draft" />
          <StructuredData value={aboutStructuredData(content, locale)} />
        </>
      );
      break;
    }
    case "contact": {
      const content = await loadPublishedContact(locale, options);
      if (!content) notFound();
      page = (
        <ContactPageView
          content={content}
          formEnabled={false}
          locale={locale}
          routeMode="draft"
        />
      );
      break;
    }
    case "education": {
      const content = await loadPublishedEducation(locale, options);
      if (!content) notFound();
      page = (
        <EducationPageView
          content={content}
          locale={locale}
          routeMode="draft"
        />
      );
      break;
    }
    case "experience": {
      const content = await loadPublishedExperience(locale, options);
      if (!content) notFound();
      page = (
        <>
          <ExperiencePageView
            content={content}
            locale={locale}
            routeMode="draft"
          />
          <StructuredData value={experienceStructuredData(content, locale)} />
        </>
      );
      break;
    }
    case "privacy": {
      const content = await loadPublishedPrivacy(locale, options);
      if (!content) notFound();
      page = (
        <PrivacyPageView
          content={content}
          locale={locale}
          routeMode="draft"
        />
      );
      break;
    }
    case "skills": {
      const content = await loadPublishedSkills(locale, options);
      if (!content) notFound();
      page = (
        <SkillsPageView
          content={content}
          locale={locale}
          routeMode="draft"
        />
      );
      break;
    }
    case "projects": {
      const content = await loadPublishedProjects(locale, options);
      if (!content) notFound();
      page = (
        <ProjectsPageView
          content={content}
          locale={locale}
          routeMode="draft"
        />
      );
      break;
    }
    case "project": {
      const content = await loadPublishedProjects(locale, options);
      const project = content?.entries.find(
        ({ slug }) => slug === destination.slug,
      );
      if (!content || !project) notFound();
      page = (
        <>
          <ProjectDetailPageView
            content={content}
            locale={locale}
            project={project}
            routeMode="draft"
          />
          <StructuredData
            value={projectStructuredData(content, project, locale)}
          />
        </>
      );
      break;
    }
  }

  return (
    <>
      <DraftModeBanner
        batchName={context.batchName}
        expiresAt={new Date(context.expiresAt)}
        locale={locale}
        revision={context.revision}
      />
      {page}
    </>
  );
}
