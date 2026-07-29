import type { Locale } from "@portfolio/content";
import type { Metadata } from "next";

import { sharingImagePublicPath } from "./public-assets";
import {
  type Destination,
  destinationRoute,
} from "./routing";
import { absoluteSiteUrl } from "./site-origin";

type PageMetadataContent = Readonly<{
  displayName: string;
  metadata: Readonly<{
    image: Readonly<{
      height: number;
      url: string;
      width: number;
    }>;
  }>;
}>;

type PageMetadataCopy = Readonly<{
  description: string;
  title: string;
}>;

export function buildLocalizedPageMetadata(
  content: PageMetadataContent,
  locale: Locale,
  destination: Destination,
  copy: PageMetadataCopy,
  origin: URL,
): Metadata {
  const canonical = absoluteSiteUrl(
    destinationRoute(locale, destination),
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
        en: absoluteSiteUrl(destinationRoute("en", destination), origin),
        hr: absoluteSiteUrl(destinationRoute("hr", destination), origin),
        "x-default": absoluteSiteUrl(
          destinationRoute("en", destination),
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

export function unpublishedContentMetadata(locale: Locale): Metadata {
  return {
    robots: { follow: false, index: false },
    title: locale === "en" ? "Page not found" : "Stranica nije pronađena",
  };
}
