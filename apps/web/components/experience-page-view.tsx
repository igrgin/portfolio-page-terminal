import type {
  ExperiencePageContent,
  ExperiencePageEntry,
  Locale,
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
    achievements: "Selected achievements",
    current: "Present",
    dateRange: "Employment period",
    eyebrow: "Professional history",
    heading: "Experience",
    introduction:
      "Published roles and résumé-safe evidence, ordered from the current role backwards.",
    skills: "Supporting Skills",
  },
  hr: {
    achievements: "Odabrana postignuća",
    current: "Trenutačno",
    dateRange: "Razdoblje zaposlenja",
    eyebrow: "Profesionalna povijest",
    heading: "Iskustvo",
    introduction:
      "Objavljene pozicije i dokazi sigurni za životopis, od trenutačne pozicije unatrag.",
    skills: "Povezane vještine",
  },
} as const;

function formatMonth(month: string, locale: Locale) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "hr-HR", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year!, monthNumber! - 1, 1)));
}

function ExperienceDateRange({
  entry,
  locale,
}: Readonly<{ entry: ExperiencePageEntry; locale: Locale }>) {
  const labels = copy[locale];

  return (
    <p className="experience-dates">
      <span className="sr-only">{labels.dateRange}: </span>
      <time dateTime={entry.startDate}>
        {formatMonth(entry.startDate, locale)}
      </time>
      <span aria-hidden="true"> — </span>
      {entry.endDate ? (
        <time dateTime={entry.endDate}>
          {formatMonth(entry.endDate, locale)}
        </time>
      ) : (
        <span>{labels.current}</span>
      )}
    </p>
  );
}

export function ExperiencePageView({
  content,
  locale,
  routeMode = "public",
}: Readonly<{
  content: ExperiencePageContent;
  locale: Locale;
  routeMode?: ApplicationRouteMode;
}>) {
  const labels = copy[locale];
  const pairedLocale = locale === "en" ? "hr" : "en";
  const route = (path: string) => applicationRoute(path, routeMode);

  return (
    <OperationalShell
      contactChannels={content.contactChannels}
      currentDestination="experience"
      displayName={content.displayName}
      locale={locale}
      locationLabel={destinationLabel(locale, "experience")}
      pairedRoute={destinationRoute(pairedLocale, "experience")}
      routeMode={routeMode}
    >
      <header className="experience-header">
        <p className="eyebrow">{labels.eyebrow}</p>
        <h1>{labels.heading}</h1>
        <p className="lede">{labels.introduction}</p>
      </header>

      <section aria-label={labels.heading} className="experience-list">
        {content.entries.map((entry, index) => (
          <article className="experience-entry" key={entry.id}>
            <div aria-hidden="true" className="experience-index">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="experience-main">
              <header>
                <div>
                  <h2>{entry.role}</h2>
                  <p className="experience-employer">
                    {entry.employerUrl ? (
                      <a href={entry.employerUrl}>{entry.employer}</a>
                    ) : (
                      entry.employer
                    )}
                  </p>
                </div>
                <ExperienceDateRange entry={entry} locale={locale} />
              </header>
              {(entry.location || entry.employmentType) && (
                <p className="experience-meta">
                  {[entry.location, entry.employmentType]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              <p>{entry.summary}</p>
              <section
                aria-labelledby={`${entry.id}-achievements`}
                className="experience-achievements"
              >
                <h3 id={`${entry.id}-achievements`}>
                  {labels.achievements}
                </h3>
                <ul>
                  {entry.achievements.map((achievement) => (
                    <li key={achievement}>{achievement}</li>
                  ))}
                </ul>
              </section>
              <div className="experience-skills">
                <span>{labels.skills}</span>
                <ul>
                  {entry.skills.map((skill) => (
                    <li key={skill.id}>
                      <a href={route(destinationRoute(locale, "skills"))}>
                        {skill.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </section>
    </OperationalShell>
  );
}
