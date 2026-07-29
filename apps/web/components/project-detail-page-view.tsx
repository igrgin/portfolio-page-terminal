import type {
  Locale,
  ProjectMedia,
  ProjectPageEntry,
  ProjectsPageContent,
} from "@portfolio/content";
import React from "react";

import { projectMediaPublicPath } from "../lib/public-assets";
import {
  destinationLabel,
  destinationRoute,
  pairedDestinationRoute,
} from "../lib/routing";
import { OperationalShell } from "./operational-shell";
import { ProjectDates, ProjectLinks } from "./projects-page-view";

const copy = {
  en: {
    back: "All Projects",
    contribution: "Role and contribution",
    gallery: "Project media",
    overview: "Project summary",
    skills: "Supporting Skills",
    status: "Status and dates",
  },
  hr: {
    back: "Svi projekti",
    contribution: "Uloga i doprinos",
    gallery: "Mediji projekta",
    overview: "Sažetak projekta",
    skills: "Potporne vještine",
    status: "Status i datumi",
  },
} as const;

function ProjectFigure({
  media,
  slug,
}: Readonly<{ media: ProjectMedia; slug: string }>) {
  return (
    <figure className="project-media">
      <img
        alt={media.alt}
        height={media.height}
        src={projectMediaPublicPath(slug, media.key, media.url)}
        width={media.width}
      />
      {media.caption && <figcaption>{media.caption}</figcaption>}
    </figure>
  );
}

export function ProjectDetailPageView({
  content,
  locale,
  project,
}: Readonly<{
  content: ProjectsPageContent;
  locale: Locale;
  project: ProjectPageEntry;
}>) {
  const labels = copy[locale];
  const projectsRoute = destinationRoute(locale, "projects");

  return (
    <OperationalShell
      contactChannels={content.contactChannels}
      currentDestination="projects"
      displayName={content.displayName}
      locale={locale}
      locationLabel={project.title}
      locationPrefix={destinationLabel(locale, "projects")}
      pairedRoute={`${pairedDestinationRoute(locale, "projects")}/${
        project.slug
      }`}
    >
      <article className="project-detail">
        <header className="project-detail-header">
          <a className="back-link" href={projectsRoute}>
            <span aria-hidden="true">← </span>
            {labels.back}
          </a>
          <p className="eyebrow">{labels.overview}</p>
          <h1>{project.title}</h1>
          <p className="lede">{project.summary}</p>
          <div className="project-detail-facts">
            <section>
              <h2>{labels.status}</h2>
              <p>
                <span className="project-status-label">
                  {project.status.label}
                </span>
                <ProjectDates locale={locale} project={project} />
              </p>
            </section>
            <section>
              <h2>{labels.skills}</h2>
              <ul>
                {project.skills.map((skill) => (
                  <li key={skill.id}>
                    <a href={destinationRoute(locale, "skills")}>
                      {skill.name}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </header>

        {project.heroMedia && (
          <ProjectFigure media={project.heroMedia} slug={project.slug} />
        )}

        <section className="project-detail-contribution">
          <p className="eyebrow">{labels.contribution}</p>
          <h2>{labels.contribution}</h2>
          <p>{project.contribution}</p>
        </section>

        <nav
          aria-label={
            locale === "en" ? "External Project links" : "Vanjske poveznice"
          }
          className="project-detail-links"
        >
          <ProjectLinks links={project.links} locale={locale} />
        </nav>

        {project.media.length > 0 && (
          <section
            aria-labelledby="project-gallery-heading"
            className="project-gallery"
          >
            <h2 id="project-gallery-heading">{labels.gallery}</h2>
            <div>
              {project.media.map((media) => (
                <ProjectFigure
                  key={media.key}
                  media={media}
                  slug={project.slug}
                />
              ))}
            </div>
          </section>
        )}
      </article>
    </OperationalShell>
  );
}
