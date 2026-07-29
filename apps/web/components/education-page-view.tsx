import type { EducationPageContent, Locale } from "@portfolio/content";
import React from "react";

import { destinationLabel, destinationRoute } from "../lib/routing";
import { OperationalShell } from "./operational-shell";

const copy = {
  en: {
    field: "Field",
    heading: "Education",
    inProgress: "In progress",
    introduction: "Background",
    privacy: "Privacy",
    relevantSubjects: "Relevant subjects",
    skills: "Related skills",
    summary:
      "Formal education and intentionally selected subjects relevant to my engineering work.",
  },
  hr: {
    field: "Područje",
    heading: "Obrazovanje",
    inProgress: "U tijeku",
    introduction: "Pozadina",
    privacy: "Privatnost",
    relevantSubjects: "Relevantni predmeti",
    skills: "Povezane vještine",
    summary:
      "Formalno obrazovanje i namjerno odabrani predmeti relevantni za moj inženjerski rad.",
  },
} as const;

export function EducationPageView({
  content,
  locale,
}: Readonly<{ content: EducationPageContent; locale: Locale }>) {
  const labels = copy[locale];

  return (
    <OperationalShell
      contactChannels={content.contactChannels}
      currentDestination="education"
      displayName={content.displayName}
      locale={locale}
      locationLabel={destinationLabel(locale, "education")}
    >
      <header className="section-introduction">
        <p className="eyebrow">{labels.introduction}</p>
        <h1>{labels.heading}</h1>
        <p className="lede">{labels.summary}</p>
      </header>

      <section
        aria-label={destinationLabel(locale, "education")}
        className="education-timeline"
      >
        {content.entries.map((entry, index) => {
          const entryKey = `education-${index}`;

          return (
            <article className="education-entry" key={entryKey}>
              <div className="education-sequence" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="education-period">
                <time dateTime={String(entry.startYear)}>
                  {entry.startYear}
                </time>
                <span aria-hidden="true">—</span>
                {entry.inProgress ? (
                  <strong>{labels.inProgress}</strong>
                ) : (
                  <time dateTime={String(entry.endYear)}>{entry.endYear}</time>
                )}
              </div>
              <div className="education-details">
                <h2>{entry.qualification}</h2>
                <p className="education-institution">
                  {entry.url ? (
                    <a href={entry.url}>{entry.institution}</a>
                  ) : (
                    entry.institution
                  )}
                  {entry.location && <span>{entry.location}</span>}
                </p>
                <p className="education-field">
                  <strong>{labels.field}:</strong> {entry.field}
                </p>

                <section
                  aria-labelledby={`subjects-${entryKey}`}
                  className="education-evidence"
                >
                  <h3 id={`subjects-${entryKey}`}>
                    {labels.relevantSubjects}
                  </h3>
                  <ul className="subject-list">
                    {entry.relevantSubjects.map((subject, subjectIndex) => (
                      <li key={`${entryKey}:subject:${subjectIndex}`}>
                        {subject}
                      </li>
                    ))}
                  </ul>
                </section>

                {entry.skills.length > 0 && (
                  <section
                    aria-labelledby={`skills-${entryKey}`}
                    className="education-evidence"
                  >
                    <h3 id={`skills-${entryKey}`}>{labels.skills}</h3>
                    <ul className="skill-list">
                      {entry.skills.map((skill, skillIndex) => (
                        <li key={`${entryKey}:skill:${skillIndex}`}>{skill}</li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </article>
          );
        })}
      </section>

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
