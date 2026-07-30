import type { Locale, PrivacyPageContent } from "@portfolio/content";
import React from "react";

import {
  type ApplicationRouteMode,
  destinationLabel,
} from "../lib/routing";
import { OperationalShell } from "./operational-shell";

const copy = {
  en: {
    azopComplaint: "Complaint to AZOP",
    automatedDecisionMaking: "Automated decision-making",
    contactData: "Contact data",
    controller: "Controller",
    effectiveDate: "Effective date",
    eyebrow: "Privacy notice",
    heading: "Privacy",
    localPreferences: "Local preferences",
    privacyRequest: "Send a privacy request",
    processorsAndTransfers: "Recipients, processors, and transfers",
    purposesAndLegalBases: "Purposes and legal bases",
    retention: "Retention",
    rightsAndRequests: "Your rights and requests",
    summary:
      "How this portfolio handles the limited personal data needed to deliver, secure, and remember your explicit preferences for the site.",
  },
  hr: {
    azopComplaint: "Pritužba AZOP-u",
    automatedDecisionMaking: "Automatizirano odlučivanje",
    contactData: "Podaci za kontakt",
    controller: "Voditelj obrade",
    effectiveDate: "Datum primjene",
    eyebrow: "Obavijest o privatnosti",
    heading: "Privatnost",
    localPreferences: "Lokalne postavke",
    privacyRequest: "Pošalji zahtjev za privatnost",
    processorsAndTransfers: "Primatelji, izvršitelji obrade i prijenosi",
    purposesAndLegalBases: "Svrhe i pravne osnove",
    retention: "Rokovi čuvanja",
    rightsAndRequests: "Vaša prava i zahtjevi",
    summary:
      "Kako ovaj portfolio postupa s ograničenim osobnim podacima potrebnima za isporuku i zaštitu stranice te pamćenje vaših izričitih postavki.",
  },
} as const;

const sectionFields = [
  "controller",
  "purposesAndLegalBases",
  "processorsAndTransfers",
  "retention",
  "rightsAndRequests",
  "contactData",
  "localPreferences",
  "automatedDecisionMaking",
  "azopComplaint",
] as const;

function formatEffectiveDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "hr-HR", {
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function PrivacyPageView({
  content,
  locale,
  routeMode = "public",
}: Readonly<{
  content: PrivacyPageContent;
  locale: Locale;
  routeMode?: ApplicationRouteMode;
}>) {
  const labels = copy[locale];

  return (
    <OperationalShell
      contactChannels={content.contactChannels}
      currentDestination="privacy"
      displayName={content.displayName}
      locale={locale}
      locationLabel={destinationLabel(locale, "privacy")}
      routeMode={routeMode}
    >
      <header className="section-introduction privacy-introduction">
        <p className="eyebrow">{labels.eyebrow}</p>
        <h1>{labels.heading}</h1>
        <p className="lede">{labels.summary}</p>
        <p className="privacy-effective-date">
          <strong>{labels.effectiveDate}:</strong>{" "}
          <time dateTime={content.effectiveDate}>
            {formatEffectiveDate(content.effectiveDate, locale)}
          </time>
        </p>
      </header>

      <div className="privacy-sections">
        {sectionFields.map((field, index) => (
          <section
            aria-labelledby={`privacy-${field}`}
            className="privacy-section"
            key={field}
          >
            <span aria-hidden="true" className="privacy-section-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 id={`privacy-${field}`}>{labels[field]}</h2>
              <p>{content[field]}</p>
              {field === "rightsAndRequests" && (
                <a href={`mailto:${content.privacyRequestEmail}`}>
                  {labels.privacyRequest}
                </a>
              )}
              {field === "azopComplaint" && (
                <a href={content.azopUrl}>{labels.azopComplaint}</a>
              )}
            </div>
          </section>
        ))}
      </div>
    </OperationalShell>
  );
}
