import {
  loadPublishedSkills,
  type Locale,
  type SkillPageContent,
} from "@portfolio/content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React, { cache } from "react";

import { SkillsPageView } from "../components/skills-page-view";
import { sharingImagePublicPath } from "./public-assets";
import { destinationRoute } from "./routing";
import { absoluteSiteUrl, siteOrigin } from "./site-origin";

const publishedSkills = cache(loadPublishedSkills);

const metadataCopy = {
  en: {
    description:
      "Evidence-backed software-engineering capabilities from Ivo Grgin's public work, education, and projects.",
    title: "Skills",
  },
  hr: {
    description:
      "Dokazima potkrijepljene softversko-inženjerske sposobnosti Ive Grgina iz javno opisanog rada, obrazovanja i projekata.",
    title: "Vještine",
  },
} as const;

export function buildSkillsMetadata(
  content: SkillPageContent,
  locale: Locale,
  origin = siteOrigin(),
): Metadata {
  const copy = metadataCopy[locale];
  const canonical = absoluteSiteUrl(destinationRoute(locale, "skills"), origin);
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
        en: absoluteSiteUrl(destinationRoute("en", "skills"), origin),
        hr: absoluteSiteUrl(destinationRoute("hr", "skills"), origin),
        "x-default": absoluteSiteUrl(
          destinationRoute("en", "skills"),
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

export async function skillsMetadata(locale: Locale): Promise<Metadata> {
  const content = await publishedSkills(locale);
  if (!content) {
    return {
      robots: { follow: false, index: false },
      title: locale === "en" ? "Page not found" : "Stranica nije pronađena",
    };
  }

  return buildSkillsMetadata(content, locale);
}

export async function renderSkillsRoute(locale: Locale) {
  const content = await publishedSkills(locale);
  if (!content) {
    notFound();
  }

  return <SkillsPageView content={content} locale={locale} />;
}
