import type { Locale } from "@portfolio/content";
import React from "react";

import { destinationLabel, destinationRoute } from "../lib/routing";
import { OperationalShell } from "./operational-shell";

const copy = {
  en: {
    description: "The requested page is unavailable or has not been published.",
    title: "Page not found",
  },
  hr: {
    description: "Tražena stranica nije dostupna ili nije objavljena.",
    title: "Stranica nije pronađena",
  },
} as const;

export function NotFoundPageView({ locale }: Readonly<{ locale: Locale }>) {
  const labels = copy[locale];

  return (
    <OperationalShell
      locale={locale}
      locationLabel={labels.title}
      locationPrefix="404"
    >
      <div className="not-found">
        <p className="eyebrow">404</p>
        <h1>{labels.title}</h1>
        <p className="lede">{labels.description}</p>
        <a
          className="button button-primary"
          href={destinationRoute(locale, "about")}
        >
          {destinationLabel(locale, "about")} <span aria-hidden="true">→</span>
        </a>
      </div>
    </OperationalShell>
  );
}
