import {
  loadPublishedAbout,
  type AboutPageContent,
  type Locale,
} from "@portfolio/content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { AboutPageView } from "../components/about-page-view";
import { StructuredData } from "../components/structured-data";
import { unpublishedContentMetadata } from "./content-route";
import { sharingImagePublicPath } from "./public-assets";
import { destinationRoute } from "./routing";
import { absoluteSiteUrl, siteOrigin } from "./site-origin";

const publishedAbout = cache(loadPublishedAbout);

export function buildAboutMetadata(
  content: AboutPageContent,
  locale: Locale,
  origin = siteOrigin(),
): Metadata {
  const canonical = absoluteSiteUrl(destinationRoute(locale, "about"), origin);
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
        en: absoluteSiteUrl(destinationRoute("en", "about"), origin),
        hr: absoluteSiteUrl(destinationRoute("hr", "about"), origin),
        "x-default": absoluteSiteUrl(destinationRoute("en", "about"), origin),
      },
    },
    description: content.metadata.description,
    metadataBase: origin,
    openGraph: {
      description: content.metadata.description,
      images: [sharingImage],
      locale: locale === "en" ? "en_US" : "hr_HR",
      siteName: content.displayName,
      title: content.metadata.title,
      type: "profile",
      url: canonical,
    },
    title: content.metadata.title,
    twitter: {
      card: "summary_large_image",
      description: content.metadata.description,
      images: [sharingImage],
      title: content.metadata.title,
    },
  };
}

export function aboutStructuredData(
  content: AboutPageContent,
  locale: Locale,
  origin = siteOrigin(),
) {
  const canonical = absoluteSiteUrl(destinationRoute(locale, "about"), origin);
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: content.displayName,
      url: canonical,
    },
    name: content.metadata.title,
    url: canonical,
  } as const;
}

export async function aboutMetadata(locale: Locale): Promise<Metadata> {
  const content = await publishedAbout(locale);
  if (!content) {
    return unpublishedContentMetadata(locale);
  }

  return buildAboutMetadata(content, locale);
}

export async function renderAboutRoute(locale: Locale) {
  const content = await publishedAbout(locale);
  if (!content) {
    notFound();
  }

  const structuredData = aboutStructuredData(content, locale);

  return (
    <>
      <AboutPageView content={content} locale={locale} />
      <StructuredData value={structuredData} />
    </>
  );
}
