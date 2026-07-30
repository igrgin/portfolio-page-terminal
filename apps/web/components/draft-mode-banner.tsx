import type { Locale } from "@portfolio/content";
import React from "react";

import { applicationRoute, destinationRoute } from "../lib/routing";

const copy = {
  en: {
    batch: "Publication batch",
    english: "Review English",
    expires: "Session expires",
    exit: "Exit Draft Mode",
    heading: "Draft Mode",
    croatian: "Review Croatian",
    revision: "Validated revision",
  },
  hr: {
    batch: "Publikacijska serija",
    english: "Pregledaj English",
    expires: "Sesija istječe",
    exit: "Izađi iz načina skice",
    heading: "Način skice / Draft Mode",
    croatian: "Pregledaj hrvatski",
    revision: "Validirana revizija",
  },
} as const;

export function DraftModeBanner({
  batchName,
  expiresAt,
  locale,
  revision,
}: Readonly<{
  batchName: string;
  expiresAt: Date;
  locale: Locale;
  revision: string;
}>) {
  const labels = copy[locale];
  return (
    <aside
      aria-label={labels.heading}
      className="draft-mode-banner"
      data-testid="draft-mode-banner"
    >
      <div>
        <strong>{labels.heading}</strong>
        <span>
          {labels.batch}: {batchName}
        </span>
        <span>
          {labels.revision}: <code>{revision.slice(0, 12)}</code>
        </span>
        <span>
          {labels.expires}:{" "}
          <time dateTime={expiresAt.toISOString()}>
            {new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "hr-HR", {
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
            }).format(expiresAt)}
          </time>
        </span>
      </div>
      <nav aria-label={labels.heading}>
        <a
          href={applicationRoute(destinationRoute("en", "about"), "draft")}
          hrefLang="en"
        >
          {labels.english}
        </a>
        <a
          href={applicationRoute(destinationRoute("hr", "about"), "draft")}
          hrefLang="hr"
        >
          {labels.croatian}
        </a>
      </nav>
      <form action="/api/draft/session/exit" method="post">
        <button type="submit">{labels.exit}</button>
      </form>
    </aside>
  );
}
