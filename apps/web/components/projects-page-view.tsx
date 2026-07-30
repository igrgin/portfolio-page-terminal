import type {
  Locale,
  ProjectPageEntry,
  ProjectsPageContent,
} from "@portfolio/content";
import React from "react";

import {
  applicationRoute,
  type ApplicationRouteMode,
  destinationLabel,
  destinationRoute,
} from "../lib/routing";
import { OperationalShell } from "./operational-shell";

const copy = {
  en: {
    contribution: "Role and contribution",
    demo: "Live demo",
    documentation: "Documentation",
    featured: "Featured",
    heading: "Projects",
    introduction: "Selected work",
    openProject: "View Project",
    present: "Present",
    repository: "Repository",
    skills: "Supporting Skills",
    summary:
      "Publish-safe summaries of software work, with contribution and evidence made explicit.",
  },
  hr: {
    contribution: "Uloga i doprinos",
    demo: "Demo",
    documentation: "Dokumentacija",
    featured: "Istaknuto",
    heading: "Projekti",
    introduction: "Odabrani radovi",
    openProject: "Otvori projekt",
    present: "Danas",
    repository: "Repozitorij",
    skills: "Potporne vještine",
    summary:
      "Sažeci softverskog rada sigurni za objavu, s jasno navedenim doprinosom i dokazima.",
  },
} as const;

function formatProjectMonth(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "hr-HR", {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}-01T00:00:00Z`));
}

function ProjectDates({
  project,
  locale,
}: Readonly<{ locale: Locale; project: ProjectPageEntry }>) {
  return (
    <span className="project-dates">
      <time dateTime={project.startDate}>
        {formatProjectMonth(project.startDate, locale)}
      </time>
      <span aria-hidden="true"> — </span>
      {project.endDate ? (
        <time dateTime={project.endDate}>
          {formatProjectMonth(project.endDate, locale)}
        </time>
      ) : (
        <span>{copy[locale].present}</span>
      )}
    </span>
  );
}

function ProjectLinks({
  links,
  locale,
}: Readonly<{
  links: ProjectPageEntry["links"];
  locale: Locale;
}>) {
  const labels = copy[locale];
  const entries = [
    ["repository", labels.repository, links.repository],
    ["demo", labels.demo, links.demo],
    ["documentation", labels.documentation, links.documentation],
  ] as const;
  const available = entries.filter((entry) => entry[2]);

  return available.length > 0 ? (
    <ul aria-label={locale === "en" ? "Project links" : "Poveznice projekta"}>
      {available.map(([kind, label, href]) => (
        <li key={kind}>
          <a href={href}>
            {label}
            <span aria-hidden="true"> ↗</span>
          </a>
        </li>
      ))}
    </ul>
  ) : null;
}

export function ProjectsPageView({
  content,
  locale,
  routeMode = "public",
}: Readonly<{
  content: ProjectsPageContent;
  locale: Locale;
  routeMode?: ApplicationRouteMode;
}>) {
  const labels = copy[locale];
  const projectsRoute = destinationRoute(locale, "projects");
  const route = (path: string) => applicationRoute(path, routeMode);

  return (
    <OperationalShell
      contactChannels={content.contactChannels}
      currentDestination="projects"
      displayName={content.displayName}
      locale={locale}
      locationLabel={destinationLabel(locale, "projects")}
      routeMode={routeMode}
    >
      <header className="section-introduction">
        <p className="eyebrow">{labels.introduction}</p>
        <h1>{labels.heading}</h1>
        <p className="lede">{labels.summary}</p>
      </header>

      <section
        aria-label={destinationLabel(locale, "projects")}
        className="project-directory"
      >
        {content.entries.map((project, index) => (
          <article
            className="project-directory-entry"
            data-featured={project.featured || undefined}
            key={project.id}
          >
            <div className="project-sequence" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="project-directory-copy">
              <div className="project-entry-heading">
                <div>
                  {project.featured && (
                    <p className="project-featured">{labels.featured}</p>
                  )}
                  <h2>{project.title}</h2>
                </div>
                <p className="project-status">
                  <span>{project.status.label}</span>
                  <ProjectDates locale={locale} project={project} />
                </p>
              </div>
              <p className="project-summary">{project.summary}</p>
              <section className="project-contribution">
                <h3>{labels.contribution}</h3>
                <p>{project.contribution}</p>
              </section>
              <section className="project-skills">
                <h3>{labels.skills}</h3>
                <ul>
                  {project.skills.map((skill) => (
                    <li key={skill.id}>
                      <a href={route(destinationRoute(locale, "skills"))}>
                        {skill.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
              <div className="project-entry-actions">
                <a
                  className="button button-primary"
                  href={route(`${projectsRoute}/${project.slug}`)}
                >
                  {labels.openProject}
                  <span aria-hidden="true"> →</span>
                </a>
                <ProjectLinks links={project.links} locale={locale} />
              </div>
            </div>
          </article>
        ))}
      </section>
    </OperationalShell>
  );
}

export { ProjectDates, ProjectLinks };
