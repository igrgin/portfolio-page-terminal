import {
  loadPublishedPrivacy,
  type Locale,
  type PrivacyPageContent,
} from "@portfolio/content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React, { cache } from "react";

import { PrivacyPageView } from "../components/privacy-page-view";
import {
  buildLocalizedPageMetadata,
  unpublishedContentMetadata,
} from "./content-route";
import { siteOrigin } from "./site-origin";

const publishedPrivacy = cache(loadPublishedPrivacy);

const metadataCopy = {
  en: {
    description:
      "How Ivo Grgin's portfolio handles contact details, site preferences, and necessary operational data.",
    title: "Privacy",
  },
  hr: {
    description:
      "Kako portfolio Ive Grgina postupa s kontaktnim podacima, postavkama stranice i nužnim operativnim podacima.",
    title: "Privatnost",
  },
} as const;

export function buildPrivacyMetadata(
  content: PrivacyPageContent,
  locale: Locale,
  origin = siteOrigin(),
): Metadata {
  return buildLocalizedPageMetadata(
    content,
    locale,
    "privacy",
    metadataCopy[locale],
    origin,
  );
}

export async function privacyMetadata(locale: Locale): Promise<Metadata> {
  const content = await publishedPrivacy(locale);
  return content
    ? buildPrivacyMetadata(content, locale)
    : unpublishedContentMetadata(locale);
}

export async function renderPrivacyRoute(locale: Locale) {
  const content = await publishedPrivacy(locale);
  if (!content) {
    notFound();
  }

  return <PrivacyPageView content={content} locale={locale} />;
}
