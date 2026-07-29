import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ContactPageView } from "../apps/web/components/contact-page-view";
import { PrivacyPageView } from "../apps/web/components/privacy-page-view";
import { buildContactMetadata } from "../apps/web/lib/contact-route";
import { buildPrivacyMetadata } from "../apps/web/lib/privacy-route";
import { normalizePublishedContact } from "../packages/content/src/contact";
import { normalizePublishedPrivacy } from "../packages/content/src/privacy";

const publishedContactQueryResult = {
  siteSettings: {
    _id: "siteSettings",
    displayName: "Ivo Grgin",
    defaultSharingImage: {
      url: "https://cdn.sanity.io/images/project/production/share.jpg",
      width: 1200,
      height: 630,
    },
    contactChannels: [
      {
        _key: "email",
        kind: "email",
        label: { en: "Send email", hr: "Pošalji e-poruku" },
        href: "mailto:ivo@example.com",
      },
      {
        _key: "linkedin",
        kind: "linkedin",
        label: { en: "Open LinkedIn", hr: "Otvori LinkedIn" },
        href: "https://www.linkedin.com/in/igrgin",
      },
      {
        _key: "github",
        kind: "github",
        label: { en: "Open GitHub", hr: "Otvori GitHub" },
        href: "https://github.com/igrgin",
      },
      {
        _key: "phone",
        kind: "phone",
        label: { en: "Call by phone", hr: "Nazovi telefonom" },
        href: "tel:+385991234567",
      },
    ],
  },
  contact: {
    _id: "contact",
    introduction: {
      en: "Choose the direct channel that works best for you.",
      hr: "Odaberite izravni kanal koji vam najviše odgovara.",
    },
    availability: {
      en: "Based in Zagreb (Central European Time).",
      hr: "U Zagrebu (srednjoeuropsko vrijeme).",
    },
  },
};

const localized = (en: string, hr: string) => ({ en, hr });

const publishedPrivacyQueryResult = {
  siteSettings: publishedContactQueryResult.siteSettings,
  privacyNotice: {
    _id: "privacyNotice",
    effectiveDate: "2026-07-29",
    privacyRequestEmail: "privacy@example.com",
    controller: localized(
      "Ivo Grgin is the controller for this portfolio.",
      "Ivo Grgin voditelj je obrade za ovaj portfolio.",
    ),
    purposesAndLegalBases: localized(
      "The site is delivered and secured on the basis of legitimate interests.",
      "Stranica se isporučuje i štiti na temelju legitimnih interesa.",
    ),
    processorsAndTransfers: localized(
      "Hosting and content processors are reviewed, including any transfer safeguards.",
      "Pružatelji hostinga i sadržaja provjeravaju se, uključujući zaštitne mjere prijenosa.",
    ),
    retention: localized(
      "Security logs target no more than 30 days; direct correspondence is normally deleted six months after the last meaningful exchange.",
      "Sigurnoski zapisi čuvaju se najviše 30 dana; izravna korespondencija u pravilu se briše šest mjeseci nakon posljednje značajne razmjene.",
    ),
    rightsAndRequests: localized(
      "You may request access, rectification, erasure, restriction, portability, or object to processing.",
      "Možete zatražiti pristup, ispravak, brisanje, ograničenje, prenosivost ili uložiti prigovor na obradu.",
    ),
    contactData: localized(
      "Direct enquiries use the details you choose to provide so Ivo can receive and answer them. No contact form is currently active.",
      "Izravni upiti koriste podatke koje sami navedete kako bi ih Ivo mogao primiti i odgovoriti. Kontaktni obrazac trenutačno nije aktivan.",
    ),
    localPreferences: localized(
      "An explicitly selected language or theme is stored locally until you change it or clear browser storage.",
      "Izričito odabrani jezik ili tema pohranjuju se lokalno dok ih ne promijenite ili izbrišete podatke preglednika.",
    ),
    automatedDecisionMaking: localized(
      "The site does not use automated decision-making, profiling, advertising, or analytics.",
      "Stranica ne koristi automatizirano odlučivanje, profiliranje, oglašavanje ni analitiku.",
    ),
    azopComplaint: localized(
      "You may lodge a complaint with the Croatian Personal Data Protection Agency (AZOP).",
      "Možete podnijeti pritužbu Agenciji za zaštitu osobnih podataka (AZOP).",
    ),
    azopUrl: "https://azop.hr/zahtjev-za-utvrdivanje-povrede-prava/",
  },
};

test("published Contact localizes its copy and preserves the required channel order", () => {
  const content = normalizePublishedContact(publishedContactQueryResult, "hr");

  assert.ok(content);
  assert.equal(
    content.introduction,
    "Odaberite izravni kanal koji vam najviše odgovara.",
  );
  assert.equal(
    content.availability,
    "U Zagrebu (srednjoeuropsko vrijeme).",
  );
  assert.deepEqual(
    content.contactChannels.map(({ kind }) => kind),
    ["email", "linkedin", "github", "phone"],
  );
  assert.equal(content.contactChannels[0]?.label, "Pošalji e-poruku");
  assert.equal(content.metadata.image.width, 1200);
});

test("Contact preserves additional channels after the four required channels", () => {
  const withAdditionalChannel = structuredClone(
    publishedContactQueryResult,
  );
  withAdditionalChannel.siteSettings.contactChannels.push({
    _key: "website",
    kind: "other",
    label: { en: "Open website", hr: "Otvori web-stranicu" },
    href: "https://example.com",
  });

  const content = normalizePublishedContact(withAdditionalChannel, "en");
  assert.ok(content);
  assert.deepEqual(
    content.contactChannels.map(({ kind }) => kind),
    ["email", "linkedin", "github", "phone", "other"],
  );
});

test("Contact rejects unsafe, misordered, draft, or incomplete bilingual content", () => {
  const mismatchedProtocol = structuredClone(publishedContactQueryResult);
  mismatchedProtocol.siteSettings.contactChannels[0]!.href =
    "https://example.com/not-an-email-action";
  assert.equal(normalizePublishedContact(mismatchedProtocol, "en"), null);

  const misorderedChannels = structuredClone(publishedContactQueryResult);
  misorderedChannels.siteSettings.contactChannels.reverse();
  assert.equal(normalizePublishedContact(misorderedChannels, "en"), null);

  const draft = structuredClone(publishedContactQueryResult);
  draft.contact._id = "drafts.contact";
  assert.equal(normalizePublishedContact(draft, "en"), null);

  const incompleteOptionalPair = structuredClone(publishedContactQueryResult);
  incompleteOptionalPair.contact.availability.hr = "";
  assert.equal(
    normalizePublishedContact(incompleteOptionalPair, "en"),
    null,
  );
});

test("Contact renders four visible direct actions and a complete form-disabled experience", () => {
  const content = normalizePublishedContact(
    publishedContactQueryResult,
    "en",
  );
  assert.ok(content);

  const html = renderToStaticMarkup(
    <ContactPageView content={content} locale="en" />,
  );

  assert.match(html, /<a aria-current="page" href="\/en\/contact"/);
  assert.match(html, /href="\/hr\/kontakt"[^>]*hrefLang="hr"/);
  assert.match(html, /Choose the direct channel that works best for you/);
  assert.match(html, /Based in Zagreb \(Central European Time\)/);
  assert.match(html, /class="contact-channel-icon"/);
  assert.match(html, />Send email</);
  assert.match(html, />Open LinkedIn</);
  assert.match(html, />Open GitHub</);
  assert.match(html, />Call by phone</);
  assert.match(html, /class="contact-channel contact-channel-phone"/);

  const emailPosition = html.indexOf("mailto:ivo@example.com");
  const linkedinPosition = html.indexOf("https://www.linkedin.com/in/igrgin");
  const githubPosition = html.indexOf("https://github.com/igrgin");
  const phonePosition = html.indexOf("tel:+385991234567");
  assert.ok(
    emailPosition < linkedinPosition &&
      linkedinPosition < githubPosition &&
      githubPosition < phonePosition,
  );

  assert.doesNotMatch(html, /<form|disabled|coming soon|uskoro/i);
});

test("Contact metadata exposes canonical English and Croatian routes", () => {
  const content = normalizePublishedContact(
    publishedContactQueryResult,
    "hr",
  );
  assert.ok(content);

  const metadata = buildContactMetadata(
    content,
    "hr",
    new URL("https://portfolio.example"),
  );

  assert.equal(metadata.title, "Kontakt — Ivo Grgin");
  assert.deepEqual(metadata.alternates, {
    canonical: "https://portfolio.example/hr/kontakt",
    languages: {
      en: "https://portfolio.example/en/contact",
      hr: "https://portfolio.example/hr/kontakt",
      "x-default": "https://portfolio.example/en/contact",
    },
  });
  assert.equal(
    metadata.openGraph?.url,
    "https://portfolio.example/hr/kontakt",
  );
  assert.deepEqual(metadata.openGraph?.images, [
    {
      alt: "Ivo Grgin",
      height: 630,
      url: "https://portfolio.example/media/ivo-grgin-profile-share.jpg",
      width: 1200,
    },
  ]);
});

test("published Privacy localizes every required notice section", () => {
  const content = normalizePublishedPrivacy(
    publishedPrivacyQueryResult,
    "hr",
  );

  assert.ok(content);
  assert.equal(content.effectiveDate, "2026-07-29");
  assert.equal(content.privacyRequestEmail, "privacy@example.com");
  assert.match(content.controller, /voditelj je obrade/);
  assert.match(content.purposesAndLegalBases, /legitimnih interesa/);
  assert.match(content.processorsAndTransfers, /zaštitne mjere prijenosa/);
  assert.match(content.retention, /šest mjeseci/);
  assert.match(content.rightsAndRequests, /prenosivost/);
  assert.match(content.contactData, /obrazac trenutačno nije aktivan/);
  assert.match(content.localPreferences, /pohranjuju se lokalno/);
  assert.match(content.automatedDecisionMaking, /automatizirano odlučivanje/);
  assert.match(content.azopComplaint, /AZOP/);
  assert.equal(
    content.azopUrl,
    "https://azop.hr/zahtjev-za-utvrdivanje-povrede-prava/",
  );
  assert.deepEqual(
    content.contactChannels.map(({ kind }) => kind),
    ["email", "linkedin", "github", "phone"],
  );
});

test("Privacy rejects malformed request details and incomplete localized sections", () => {
  const malformedEmail = structuredClone(publishedPrivacyQueryResult);
  malformedEmail.privacyNotice.privacyRequestEmail =
    "privacy@example.com?subject=request";
  assert.equal(normalizePublishedPrivacy(malformedEmail, "en"), null);

  const invalidDate = structuredClone(publishedPrivacyQueryResult);
  invalidDate.privacyNotice.effectiveDate = "2026-02-30";
  assert.equal(normalizePublishedPrivacy(invalidDate, "en"), null);

  const unsafeAzopUrl = structuredClone(publishedPrivacyQueryResult);
  unsafeAzopUrl.privacyNotice.azopUrl = "javascript:alert(1)";
  assert.equal(normalizePublishedPrivacy(unsafeAzopUrl, "hr"), null);

  const incompletePair = structuredClone(publishedPrivacyQueryResult);
  incompletePair.privacyNotice.retention.hr = "";
  assert.equal(normalizePublishedPrivacy(incompletePair, "en"), null);
});

test("Privacy renders the complete localized notice and request paths", () => {
  const content = normalizePublishedPrivacy(
    publishedPrivacyQueryResult,
    "hr",
  );
  assert.ok(content);

  const html = renderToStaticMarkup(
    <PrivacyPageView content={content} locale="hr" />,
  );

  assert.match(html, /href="\/en\/privacy"[^>]*hrefLang="en"/);
  assert.match(
    html,
    /<time dateTime="2026-07-29">29\. 07\. 2026\.<\/time>/,
  );
  assert.match(html, />Voditelj obrade</);
  assert.match(html, />Svrhe i pravne osnove</);
  assert.match(html, />Primatelji, izvršitelji obrade i prijenosi</);
  assert.match(html, />Rokovi čuvanja</);
  assert.match(html, />Vaša prava i zahtjevi</);
  assert.match(html, />Podaci za kontakt</);
  assert.match(html, />Lokalne postavke</);
  assert.match(html, />Automatizirano odlučivanje</);
  assert.match(html, />Pritužba AZOP-u</);
  assert.match(html, /href="mailto:privacy@example\.com"/);
  assert.match(
    html,
    /href="https:\/\/azop\.hr\/zahtjev-za-utvrdivanje-povrede-prava\/"/,
  );
  assert.match(html, /Kontaktni obrazac trenutačno nije aktivan/);
});

test("Privacy metadata exposes canonical English and Croatian routes", () => {
  const content = normalizePublishedPrivacy(
    publishedPrivacyQueryResult,
    "en",
  );
  assert.ok(content);

  const metadata = buildPrivacyMetadata(
    content,
    "en",
    new URL("https://portfolio.example"),
  );

  assert.equal(metadata.title, "Privacy — Ivo Grgin");
  assert.deepEqual(metadata.alternates, {
    canonical: "https://portfolio.example/en/privacy",
    languages: {
      en: "https://portfolio.example/en/privacy",
      hr: "https://portfolio.example/hr/privatnost",
      "x-default": "https://portfolio.example/en/privacy",
    },
  });
  assert.equal(
    metadata.openGraph?.url,
    "https://portfolio.example/en/privacy",
  );
  assert.equal(metadata.robots, undefined);
});

test("the shared global footer exposes localized Contact and Privacy routes", () => {
  const content = normalizePublishedContact(
    publishedContactQueryResult,
    "hr",
  );
  assert.ok(content);

  const html = renderToStaticMarkup(
    <ContactPageView content={content} locale="hr" />,
  );

  assert.match(
    html,
    /<\/main><footer class="global-footer">[\s\S]*href="\/hr\/kontakt"[\s\S]*href="\/hr\/privatnost"[\s\S]*<\/footer>/,
  );
});
