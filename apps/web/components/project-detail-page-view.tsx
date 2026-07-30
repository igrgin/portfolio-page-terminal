import type {
  Locale,
  ProjectDiagram,
  ProjectMedia,
  ProjectPageEntry,
  ProjectsPageContent,
} from "@portfolio/content";
import { projectCaseStudyFieldKeys } from "@portfolio/content";
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
    approach: "Approach",
    back: "All Projects",
    constraints: "Constraints",
    contents: "Case study contents",
    context: "Context and problem",
    contribution: "Role and contribution",
    diagrams: "Project diagrams",
    diagramScroll: "scrollable diagram",
    gallery: "Project media",
    lessons: "Lessons and reflections",
    outcome: "Outcome and impact",
    overview: "Project summary",
    skills: "Supporting Skills",
    status: "Status and dates",
  },
  hr: {
    approach: "Pristup",
    back: "Svi projekti",
    constraints: "Ograničenja",
    contents: "Sadržaj studije slučaja",
    context: "Kontekst i problem",
    contribution: "Uloga i doprinos",
    diagrams: "Dijagrami projekta",
    diagramScroll: "pomični prikaz dijagrama",
    gallery: "Mediji projekta",
    lessons: "Lekcije i osvrt",
    outcome: "Ishod i učinak",
    overview: "Sažetak projekta",
    skills: "Potporne vještine",
    status: "Status i datumi",
  },
} as const;

function ProjectDiagramFigure({
  diagram,
  scrollLabel,
}: Readonly<{
  diagram: ProjectDiagram;
  scrollLabel: string;
}>) {
  const titleId = `diagram-${diagram.id}-title`;
  const descriptionId = `diagram-${diagram.id}-description`;
  return (
    <figure
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="project-diagram"
    >
      <h3 id={titleId}>{diagram.title}</h3>
      <div
        aria-label={`${diagram.title} — ${scrollLabel}`}
        className="project-diagram-viewport"
        role="region"
        tabIndex={0}
      >
        <img
          alt=""
          aria-hidden="true"
          className="project-diagram-asset project-diagram-asset--light"
          decoding="async"
          loading="lazy"
          src={diagram.assets.light}
        />
        <img
          alt=""
          aria-hidden="true"
          className="project-diagram-asset project-diagram-asset--dark"
          decoding="async"
          loading="lazy"
          src={diagram.assets.dark}
        />
      </div>
      <figcaption>{diagram.caption}</figcaption>
      <p className="project-diagram-description" id={descriptionId}>
        {diagram.description}
      </p>
    </figure>
  );
}

function ProjectFigure({
  media,
  priority = false,
  slug,
}: Readonly<{
  media: ProjectMedia;
  priority?: boolean;
  slug: string;
}>) {
  return (
    <figure className="project-media">
      <img
        alt={media.alt}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        height={media.height}
        loading={priority ? "eager" : "lazy"}
        src={projectMediaPublicPath(slug, media.key, media.url)}
        width={media.width}
      />
      {media.caption && <figcaption>{media.caption}</figcaption>}
    </figure>
  );
}

function ProjectContribution({
  heading,
  id,
  project,
}: Readonly<{
  heading: string;
  id?: string;
  project: ProjectPageEntry;
}>) {
  return (
    <section className="project-detail-contribution">
      <p className="eyebrow">{heading}</p>
      <h2 id={id}>{heading}</h2>
      <p>{project.contribution}</p>
    </section>
  );
}

function ProjectExternalLinks({
  locale,
  project,
}: Readonly<{ locale: Locale; project: ProjectPageEntry }>) {
  if (Object.values(project.links).every((link) => link === undefined)) {
    return null;
  }

  return (
    <nav
      aria-label={
        locale === "en" ? "External Project links" : "Vanjske poveznice"
      }
      className="project-detail-links"
    >
      <ProjectLinks links={project.links} locale={locale} />
    </nav>
  );
}

function ProjectGallery({
  heading,
  project,
}: Readonly<{ heading: string; project: ProjectPageEntry }>) {
  if (project.media.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="project-gallery-heading"
      className="project-gallery"
      id="project-media"
    >
      <h2 id="project-gallery-heading">{heading}</h2>
      <div>
        {project.media.map((media) => (
          <ProjectFigure key={media.key} media={media} slug={project.slug} />
        ))}
      </div>
    </section>
  );
}

function ProjectDiagrams({
  heading,
  project,
  scrollLabel,
}: Readonly<{
  heading: string;
  project: ProjectPageEntry;
  scrollLabel: string;
}>) {
  if (project.diagrams.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="project-diagrams-heading"
      className="project-diagrams"
      id="project-diagrams"
    >
      <h2 id="project-diagrams-heading">{heading}</h2>
      {project.diagrams.map((diagram) => (
        <ProjectDiagramFigure
          diagram={diagram}
          key={diagram.id}
          scrollLabel={scrollLabel}
        />
      ))}
    </section>
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
  const caseStudy = project.caseStudy;
  const caseStudySections = caseStudy
    ? projectCaseStudyFieldKeys.map((field) => ({
        copy: caseStudy[field],
        id: `project-${field}`,
        label: labels[field],
      }))
    : [];

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
          <ProjectFigure
            media={project.heroMedia}
            priority
            slug={project.slug}
          />
        )}

        {project.caseStudy ? (
          <div className="project-case-study-layout">
            <aside className="project-case-study-context">
              <nav aria-label={labels.contents}>
                <p>{labels.contents}</p>
                <ol>
                  <li>
                    <a href="#project-contribution">{labels.contribution}</a>
                  </li>
                  {caseStudySections.map((section) => (
                    <li key={section.id}>
                      <a href={`#${section.id}`}>{section.label}</a>
                    </li>
                  ))}
                  {project.diagrams.length > 0 && (
                    <li>
                      <a href="#project-diagrams">{labels.diagrams}</a>
                    </li>
                  )}
                  {project.media.length > 0 && (
                    <li>
                      <a href="#project-media">{labels.gallery}</a>
                    </li>
                  )}
                </ol>
              </nav>
            </aside>
            <div className="project-case-study-content">
              <ProjectContribution
                heading={labels.contribution}
                id="project-contribution"
                project={project}
              />
              {caseStudySections.map((section) => (
                <section
                  className="project-case-study-section"
                  key={section.id}
                >
                  <h2 id={section.id}>{section.label}</h2>
                  <p>{section.copy}</p>
                </section>
              ))}
              <ProjectDiagrams
                heading={labels.diagrams}
                project={project}
                scrollLabel={labels.diagramScroll}
              />
              <ProjectExternalLinks locale={locale} project={project} />
              <ProjectGallery heading={labels.gallery} project={project} />
            </div>
          </div>
        ) : (
          <div className="project-summary-body">
            <ProjectContribution
              heading={labels.contribution}
              project={project}
            />
            <ProjectExternalLinks locale={locale} project={project} />
            <ProjectGallery heading={labels.gallery} project={project} />
          </div>
        )}
      </article>
    </OperationalShell>
  );
}
