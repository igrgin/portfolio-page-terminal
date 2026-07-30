import type {
  ContactChannelKind,
  ContactPageContent,
  Locale,
} from "@portfolio/content";
import React from "react";

import {
  type ApplicationRouteMode,
  destinationLabel,
} from "../lib/routing";
import { ContactForm } from "./contact-form";
import { OperationalShell } from "./operational-shell";

const copy = {
  en: {
    eyebrow: "Direct channels",
    heading: "Contact",
  },
  hr: {
    eyebrow: "Izravni kanali",
    heading: "Kontakt",
  },
} as const;

const channelNames: Readonly<
  Record<Exclude<ContactChannelKind, "other">, Readonly<Record<Locale, string>>>
> = {
  email: { en: "Email", hr: "E-pošta" },
  github: { en: "GitHub", hr: "GitHub" },
  linkedin: { en: "LinkedIn", hr: "LinkedIn" },
  phone: { en: "Phone", hr: "Telefon" },
};

function ContactChannelIcon({
  kind,
}: Readonly<{ kind: ContactChannelKind }>) {
  const path =
    kind === "email"
      ? "M3.5 5.5h17v13h-17zM4 6l8 7 8-7"
      : kind === "linkedin"
        ? "M5 9v10M5 5.5v.1M9.5 19v-6c0-2.2 1.3-3.5 3.2-3.5s3.3 1.1 3.3 3.5v6M9.5 9.5V19"
        : kind === "github"
          ? "M12 3.5a8.5 8.5 0 0 0-2.7 16.6c.4.1.6-.2.6-.5v-1.7c-2.5.5-3-1.2-3-1.2-.4-1.1-1-1.4-1-1.4-.8-.6.1-.6.1-.6.9.1 1.4.9 1.4.9.8 1.4 2.1 1 2.6.8.1-.6.4-1 .7-1.3-2-.2-4.1-1-4.1-4.3 0-.9.3-1.7.9-2.3-.1-.2-.4-1.1.1-2.3 0 0 .7-.2 2.4.9a8.2 8.2 0 0 1 4.4 0c1.7-1.1 2.4-.9 2.4-.9.5 1.2.2 2.1.1 2.3.6.6.9 1.4.9 2.3 0 3.3-2.1 4.1-4.1 4.3.4.4.7 1.1.7 2.1v2.9c0 .3.2.6.7.5A8.5 8.5 0 0 0 12 3.5Z"
          : "M7.2 3.8 9.7 8l-1.8 1.8a14 14 0 0 0 6.3 6.3l1.8-1.8 4.2 2.5-.8 3c-.2.7-.8 1.2-1.6 1.2C9.6 21 3 14.4 3 6.2c0-.8.5-1.4 1.2-1.6z";

  return (
    <svg
      aria-hidden="true"
      className="contact-channel-icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d={path} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function ContactPageView({
  content,
  formEnabled = false,
  locale,
  routeMode = "public",
}: Readonly<{
  content: ContactPageContent;
  formEnabled?: boolean;
  locale: Locale;
  routeMode?: ApplicationRouteMode;
}>) {
  const labels = copy[locale];

  return (
    <OperationalShell
      contactChannels={content.contactChannels}
      currentDestination="contact"
      displayName={content.displayName}
      locale={locale}
      locationLabel={destinationLabel(locale, "contact")}
      routeMode={routeMode}
    >
      <header className="section-introduction">
        <p className="eyebrow">{labels.eyebrow}</p>
        <h1>{labels.heading}</h1>
        <p className="lede">{content.introduction}</p>
        {content.availability && (
          <p className="contact-availability">{content.availability}</p>
        )}
      </header>

      <section aria-label={labels.eyebrow} className="contact-channels">
        {content.contactChannels.map((channel) => (
          <article
            className={`contact-channel contact-channel-${channel.kind}`}
            key={`${channel.kind}:${channel.href}`}
          >
            <ContactChannelIcon kind={channel.kind} />
            <div>
              <h2>
                {channel.kind === "other"
                  ? channel.label
                  : channelNames[channel.kind][locale]}
              </h2>
              <a href={channel.href}>
                {channel.label} <span aria-hidden="true">→</span>
              </a>
            </div>
          </article>
        ))}
      </section>
      {formEnabled && <ContactForm locale={locale} />}
    </OperationalShell>
  );
}
