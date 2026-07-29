import type {
  Locale,
  SkillEvidenceKind,
  SkillIcon as SkillIconName,
  SkillPageContent,
} from "@portfolio/content";
import React from "react";

import { destinationLabel, destinationRoute } from "../lib/routing";
import { OperationalShell } from "./operational-shell";

const copy = {
  en: {
    canonicalName: "Canonical name",
    documentation: "Documentation",
    evidence: "Evidence",
    heading: "Skills",
    introduction: "Capabilities",
    privacy: "Privacy",
    summary:
      "Capability statements grounded in public work, education, projects, or a precise publish-safe note.",
  },
  hr: {
    canonicalName: "Kanonski naziv",
    documentation: "Dokumentacija",
    evidence: "Dokazi",
    heading: "Vještine",
    introduction: "Sposobnosti",
    privacy: "Privatnost",
    summary:
      "Opisi sposobnosti utemeljeni na javno opisanom radu, obrazovanju, projektima ili preciznoj bilješci sigurnoj za objavu.",
  },
} as const;

const iconPaths: Readonly<Record<SkillIconName, string>> = {
  api: "M7 8.5 3.5 12 7 15.5M17 8.5l3.5 3.5-3.5 3.5M14 5l-4 14",
  browser: "M4 7.5h16M7 4.5h.01M10 4.5h.01M4 4h16v16H4z",
  cloud:
    "M7 18h10a4 4 0 0 0 .65-7.95A6 6 0 0 0 6.2 8.8 4.6 4.6 0 0 0 7 18Z",
  database:
    "M5 6c0 1.1 3.1 2 7 2s7-.9 7-2-3.1-2-7-2-7 .9-7 2Zm0 0v6c0 1.1 3.1 2 7 2s7-.9 7-2V6M5 12v6c0 1.1 3.1 2 7 2s7-.9 7-2v-6",
  neuralNetwork:
    "M6 6h.01M18 5h.01M12 12h.01M5 18h.01M19 18h.01M6 6l6 6 6-7M12 12l-7 6M12 12l7 6",
  terminal: "m5 7 5 5-5 5M12 17h7",
};

function SkillIcon({ icon }: Readonly<{ icon?: SkillIconName }>) {
  if (!icon) {
    return (
      <span className="skill-icon-fallback" aria-hidden="true">
        &lt;/&gt;
      </span>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="skill-icon"
      data-skill-icon={icon}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
    >
      <path d={iconPaths[icon]} />
    </svg>
  );
}

function evidenceHref(locale: Locale, kind: SkillEvidenceKind) {
  switch (kind) {
    case "education":
      return destinationRoute(locale, "education");
    case "experience":
      return destinationRoute(locale, "experience");
    case "project":
      return destinationRoute(locale, "projects");
    case "note":
      return null;
  }
}

export function SkillsPageView({
  content,
  locale,
}: Readonly<{ content: SkillPageContent; locale: Locale }>) {
  const labels = copy[locale];

  return (
    <OperationalShell
      contactChannels={content.contactChannels}
      currentDestination="skills"
      displayName={content.displayName}
      locale={locale}
      locationLabel={destinationLabel(locale, "skills")}
    >
      <header className="section-introduction">
        <p className="eyebrow">{labels.introduction}</p>
        <h1>{labels.heading}</h1>
        <p className="lede">{labels.summary}</p>
      </header>

      <section
        aria-label={destinationLabel(locale, "skills")}
        className="skill-directory"
      >
        {content.entries.map((entry, index) => (
          <article
            className="skill-entry"
            key={`${entry.order}:${entry.canonicalName}`}
          >
            <div className="skill-sequence" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="skill-icon-frame">
              <SkillIcon icon={entry.icon} />
            </div>
            <div className="skill-details">
              <p className="skill-category">{entry.category.label}</p>
              <h2>{entry.name}</h2>
              {entry.name !== entry.canonicalName && (
                <p className="skill-canonical-name">
                  <span>{labels.canonicalName}</span>
                  {entry.canonicalName}
                </p>
              )}
              <p className="skill-capability">{entry.capability}</p>
              {entry.documentationUrl && (
                <a
                  className="skill-documentation"
                  href={entry.documentationUrl}
                >
                  {labels.documentation}
                  <span aria-hidden="true"> ↗</span>
                </a>
              )}

              <section
                aria-labelledby={`skill-evidence-${index}`}
                className="skill-evidence"
              >
                <h3 id={`skill-evidence-${index}`}>{labels.evidence}</h3>
                <ul>
                  {entry.evidence.map((evidence, evidenceIndex) => {
                    const href = evidenceHref(locale, evidence.kind);
                    return (
                      <li
                        key={`${evidence.kind}:${evidenceIndex}:${evidence.label}`}
                      >
                        {href ? (
                          <a href={href}>{evidence.label}</a>
                        ) : (
                          evidence.label
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          </article>
        ))}
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
