import type { AboutPageContent, Locale } from "@portfolio/content";
import React from "react";

import { destinationLabel, destinationRoute } from "../lib/routing";
import {
  croppedPortraitDimensions,
  croppedPortraitPosition,
  portraitPublicPath,
} from "../lib/public-assets";
import { OperationalShell } from "./operational-shell";

const copy = {
  en: {
    currentFocus: "Current focus",
    evidence: "Evidence",
    featuredProjects: "Featured work",
    introduction: "Introduction",
    openProject: "Open project",
    privacy: "Privacy",
    contribution: "Contribution",
    selectedSkills: "Selected evidence",
  },
  hr: {
    currentFocus: "Trenutačni fokus",
    evidence: "Dokaz",
    featuredProjects: "Odabrani projekti",
    introduction: "Uvod",
    openProject: "Otvori projekt",
    privacy: "Privatnost",
    contribution: "Doprinos",
    selectedSkills: "Odabrano iskustvo",
  },
} as const;

export function AboutPageView({
  content,
  locale,
}: Readonly<{ content: AboutPageContent; locale: Locale }>) {
  const labels = copy[locale];
  const portraitDimensions = croppedPortraitDimensions(content.portrait);
  const portraitPosition = croppedPortraitPosition(content.portrait);

  return (
    <OperationalShell
      contactChannels={content.contactChannels}
      currentDestination="about"
      displayName={content.displayName}
      locale={locale}
      locationLabel={destinationLabel(locale, "about")}
    >
      <section aria-labelledby="about-heading" className="about-hero">
        <div className="hero-copy">
          <p className="eyebrow">{labels.introduction}</p>
          <h1 id="about-heading">{content.headline}</h1>
          {content.biography.map((paragraph, index) => (
            <p className={index === 0 ? "lede" : undefined} key={paragraph}>
              {paragraph}
            </p>
          ))}
          <div className="cta-row">
            <a
              className="button button-primary"
              href={destinationRoute(locale, "projects")}
            >
              {destinationLabel(locale, "projects")}{" "}
              <span aria-hidden="true">→</span>
            </a>
            <a
              className="button button-secondary"
              href={destinationRoute(locale, "contact")}
            >
              {destinationLabel(locale, "contact")}
            </a>
          </div>
        </div>

        <aside className="hero-aside">
          <figure className="portrait">
            <div className="portrait-frame">
              <img
                alt={content.portrait.alt}
                height={portraitDimensions.height}
                src={portraitPublicPath(content.portrait.url)}
                style={{
                  objectPosition: `${portraitPosition.x * 100}% ${
                    portraitPosition.y * 100
                  }%`,
                }}
                width={portraitDimensions.width}
              />
            </div>
            <figcaption>
              <strong>{content.displayName}</strong>
              {content.portrait.caption && (
                <span>{content.portrait.caption}</span>
              )}
            </figcaption>
          </figure>
          <section className="current-focus">
            <h2>{labels.currentFocus}</h2>
            <p>{content.currentFocus}</p>
          </section>
        </aside>
      </section>

      {content.selectedSkills.length > 0 && (
        <section aria-labelledby="skills-heading" className="evidence-band">
          <header>
            <span>01</span>
            <h2 id="skills-heading">{labels.selectedSkills}</h2>
          </header>
          <div className="evidence-list">
            {content.selectedSkills.map((skill) => (
              <article key={skill.name}>
                <h3>{skill.name}</h3>
                <p>{skill.description}</p>
                <p className="evidence-note">
                  <strong>{labels.evidence}:</strong> {skill.evidence}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {content.featuredProjects.length > 0 && (
        <section
          aria-labelledby="projects-heading"
          className="featured-projects"
        >
          <header>
            <span>02</span>
            <h2 id="projects-heading">{labels.featuredProjects}</h2>
          </header>
          <div className="project-list">
            {content.featuredProjects.map((project) => (
              <article key={project.slug}>
                <div>
                  <h3>{project.title}</h3>
                  <p>{project.summary}</p>
                  <p className="evidence-note">
                    <strong>{labels.contribution}:</strong>{" "}
                    {project.contribution}
                  </p>
                </div>
                <a
                  href={`${destinationRoute(locale, "projects")}/${project.slug}`}
                >
                  {labels.openProject} <span aria-hidden="true">→</span>
                </a>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className="global-footer">
        <a href={destinationRoute(locale, "privacy")}>{labels.privacy}</a>
        <span aria-hidden="true">·</span>
        {content.contactChannels.map((channel) => (
          <a href={channel.href} key={`footer:${channel.kind}:${channel.href}`}>
            {channel.label}
          </a>
        ))}
      </footer>
    </OperationalShell>
  );
}
