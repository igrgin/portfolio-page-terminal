import type { Locale } from "@portfolio/content";
import type { Metadata } from "next";

export function unpublishedContentMetadata(locale: Locale): Metadata {
  return {
    robots: { follow: false, index: false },
    title: locale === "en" ? "Page not found" : "Stranica nije pronađena",
  };
}
