import {
  loadPublishedEducation,
  type EducationPageContent,
  type Locale,
} from "@portfolio/content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React, { cache } from "react";

import { EducationPageView } from "../components/education-page-view";
import { sharingImagePublicPath } from "./public-assets";
import { destinationRoute } from "./routing";
import { absoluteSiteUrl, siteOrigin } from "./site-origin";

const publishedEducation = cache(loadPublishedEducation);

const metadataCopy = {
  en: {
    description:
      "Formal education and selected subjects relevant to Ivo Grgin's software-engineering work.",
    title: "Education",
  },
  hr: {
    description:
      "Formalno obrazovanje i odabrani predmeti relevantni za softversko-inženjerski rad Ive Grgina.",
    title: "Obrazovanje",
  },
} as const;

export function buildEducationMetadata(
  content: EducationPageContent,
  locale: Locale,
  origin = siteOrigin(),
): Metadata {
  const copy = metadataCopy[locale];
  const canonical = absoluteSiteUrl(
    destinationRoute(locale, "education"),
    origin,
  );
  const title = `${copy.title} — ${content.displayName}`;
  const sharingImage = {
    alt: content.displayName,
    height: content.metadata.image.height,
    url: absoluteSiteUrl(
      sharingImagePublicPath(content.metadata.image.url),
      origin,
    ),
    width: content.metadata.image.width,
  };

  return {
    alternates: {
      canonical,
      languages: {
        en: absoluteSiteUrl(destinationRoute("en", "education"), origin),
        hr: absoluteSiteUrl(destinationRoute("hr", "education"), origin),
        "x-default": absoluteSiteUrl(
          destinationRoute("en", "education"),
          origin,
        ),
      },
    },
    description: copy.description,
    metadataBase: origin,
    openGraph: {
      description: copy.description,
      images: [sharingImage],
      locale: locale === "en" ? "en_US" : "hr_HR",
      siteName: content.displayName,
      title,
      type: "website",
      url: canonical,
    },
    title,
    twitter: {
      card: "summary_large_image",
      description: copy.description,
      images: [sharingImage],
      title,
    },
  };
}

export async function educationMetadata(locale: Locale): Promise<Metadata> {
  const content = await publishedEducation(locale);
  if (!content) {
    return {
      robots: { follow: false, index: false },
      title: locale === "en" ? "Page not found" : "Stranica nije pronađena",
    };
  }

  return buildEducationMetadata(content, locale);
}

export async function renderEducationRoute(locale: Locale) {
  const content = await publishedEducation(locale);
  if (!content) {
    notFound();
  }

  return <EducationPageView content={content} locale={locale} />;
}
