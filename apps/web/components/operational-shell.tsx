import type { AboutPageContent, Locale } from "@portfolio/content";
import React, { type ReactNode } from "react";

import {
  type Destination,
  destinationLabel,
  destinationRoute,
  pairedAboutRoute,
  primaryNavigation,
} from "../lib/routing";
import { resumePublicPaths } from "../lib/public-assets";
import { LanguagePreferenceLink, ThemeControl } from "./global-controls";
import { NavIcon } from "./nav-icon";

const copy = {
  en: {
    contact: "Contact channels",
    mainNavigation: "Main navigation",
    page: "View",
    resumeGroup: "Résumés",
    resumes: { en: "English résumé (PDF)", hr: "Croatian résumé (PDF)" },
    skip: "Skip to content",
  },
  hr: {
    contact: "Kanali za kontakt",
    mainNavigation: "Glavna navigacija",
    page: "Stranica",
    resumeGroup: "Životopisi",
    resumes: { en: "English résumé (PDF)", hr: "Hrvatski životopis (PDF)" },
    skip: "Preskoči na sadržaj",
  },
} as const;

type ContactChannel = AboutPageContent["contactChannels"][number];

export function OperationalShell({
  children,
  contactChannels = [],
  currentDestination,
  displayName = "Portfolio",
  locale,
  locationLabel,
  locationPrefix,
}: Readonly<{
  children: ReactNode;
  contactChannels?: readonly ContactChannel[];
  currentDestination?: Destination;
  displayName?: string;
  locale: Locale;
  locationLabel: string;
  locationPrefix?: string;
}>) {
  const labels = copy[locale];

  return (
    <div className="operational-shell">
      <a className="skip-link" href="#main-content">
        {labels.skip}
      </a>

      <header className="topbar">
        <div className="brand-zone">
          <a className="wordmark" href={destinationRoute(locale, "about")}>
            <span aria-hidden="true">[</span> {displayName.toUpperCase()}{" "}
            <span aria-hidden="true">]</span>
          </a>
        </div>
        <div className="location">
          <span>{locationPrefix ?? labels.page}</span>
          <strong>{locationLabel}</strong>
        </div>
        <div className="global-controls">
          <LanguagePreferenceLink
            href={pairedAboutRoute(locale)}
            locale={locale}
          />
          <ThemeControl locale={locale} />
          <div
            aria-label={labels.resumeGroup}
            className="resume-links"
            role="group"
          >
            {(["en", "hr"] as const).map((resumeLocale) => (
              <a
                href={resumePublicPaths[resumeLocale]}
                key={resumeLocale}
                type="application/pdf"
              >
                {labels.resumes[resumeLocale]}
              </a>
            ))}
          </div>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-label">portfolio://</div>
          <nav aria-label={labels.mainNavigation}>
            {primaryNavigation.map(({ destination }) => (
              <a
                aria-current={
                  currentDestination === destination ? "page" : undefined
                }
                href={destinationRoute(locale, destination)}
                key={destination}
              >
                <NavIcon destination={destination} />
                <span>{destinationLabel(locale, destination)}</span>
              </a>
            ))}
          </nav>
          {contactChannels.length > 0 && (
            <div className="sidebar-contact">
              <span>{labels.contact}</span>
              <div>
                {contactChannels.map((channel) => (
                  <a
                    href={channel.href}
                    key={`${channel.kind}:${channel.href}`}
                  >
                    {channel.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>

        <main className="main-pane" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
