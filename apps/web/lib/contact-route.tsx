import {
  loadPublishedContact,
  type ContactPageContent,
  type Locale,
} from "@portfolio/content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React, { cache } from "react";

import { ContactPageView } from "../components/contact-page-view";
import { contactFormAvailable } from "./contact-form-server";
import {
  buildLocalizedPageMetadata,
  unpublishedContentMetadata,
} from "./content-route";
import { siteOrigin } from "./site-origin";

const publishedContact = cache(loadPublishedContact);

const metadataCopy = {
  en: {
    description: "Direct ways to contact Ivo Grgin.",
    title: "Contact",
  },
  hr: {
    description: "Izravni načini za kontakt s Ivom Grginom.",
    title: "Kontakt",
  },
} as const;

export function buildContactMetadata(
  content: ContactPageContent,
  locale: Locale,
  origin = siteOrigin(),
): Metadata {
  return buildLocalizedPageMetadata(
    content,
    locale,
    "contact",
    metadataCopy[locale],
    origin,
  );
}

export async function contactMetadata(locale: Locale): Promise<Metadata> {
  const content = await publishedContact(locale);
  return content
    ? buildContactMetadata(content, locale)
    : unpublishedContentMetadata(locale);
}

export async function renderContactRoute(locale: Locale) {
  const content = await publishedContact(locale);
  if (!content) {
    notFound();
  }

  return (
    <ContactPageView
      content={content}
      formEnabled={contactFormAvailable(process.env)}
      locale={locale}
    />
  );
}
