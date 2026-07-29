import {
  loadPublishedExperience,
  type ExperiencePageContent,
  type Locale,
} from "@portfolio/content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React, { cache } from "react";

import { ExperiencePageView } from "../components/experience-page-view";
import { destinationLabel, destinationRoute } from "./routing";
import { absoluteSiteUrl, siteOrigin } from "./site-origin";

const publishedExperience = cache(loadPublishedExperience);

export function buildExperienceMetadata(
  content: ExperiencePageContent,
  locale: Locale,
  origin = siteOrigin(),
): Metadata {
  const canonical = absoluteSiteUrl(
    destinationRoute(locale, "experience"),
    origin,
  );
  const title = `${destinationLabel(locale, "experience")} — ${content.displayName}`;
  const description = content.entries[0]!.summary;

  return {
    alternates: {
      canonical,
      languages: {
        en: absoluteSiteUrl(destinationRoute("en", "experience"), origin),
        hr: absoluteSiteUrl(destinationRoute("hr", "experience"), origin),
        "x-default": absoluteSiteUrl(
          destinationRoute("en", "experience"),
          origin,
        ),
      },
    },
    description,
    metadataBase: origin,
    openGraph: {
      description,
      locale: locale === "en" ? "en_US" : "hr_HR",
      siteName: content.displayName,
      title,
      type: "website",
      url: canonical,
    },
    title,
    twitter: {
      card: "summary",
      description,
      title,
    },
  };
}

export function experienceStructuredData(
  content: ExperiencePageContent,
  locale: Locale,
  origin = siteOrigin(),
) {
  const canonical = absoluteSiteUrl(
    destinationRoute(locale, "experience"),
    origin,
  );

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: content.entries.map((entry, index) => ({
        "@type": "ListItem",
        item: {
          "@type": "EmployeeRole",
          description: entry.summary,
          name: entry.role,
          roleName: entry.role,
          startDate: entry.startDate,
          ...(entry.endDate ? { endDate: entry.endDate } : {}),
        },
        position: index + 1,
      })),
    },
    name: `${destinationLabel(locale, "experience")} — ${content.displayName}`,
    url: canonical,
  } as const;
}

export async function experienceMetadata(locale: Locale): Promise<Metadata> {
  const content = await publishedExperience(locale);
  if (!content) {
    return {
      robots: { follow: false, index: false },
      title: locale === "en" ? "Page not found" : "Stranica nije pronađena",
    };
  }

  return buildExperienceMetadata(content, locale);
}

export async function renderExperienceRoute(locale: Locale) {
  const content = await publishedExperience(locale);
  if (!content) {
    notFound();
  }

  const structuredData = experienceStructuredData(content, locale);

  return (
    <>
      <ExperiencePageView content={content} locale={locale} />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c"),
        }}
        type="application/ld+json"
      />
    </>
  );
}
