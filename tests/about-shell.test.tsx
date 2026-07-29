import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AboutPageView } from "../apps/web/components/about-page-view";
import { NotFoundPageView } from "../apps/web/components/not-found-page-view";
import {
  aboutStructuredData,
  buildAboutMetadata,
} from "../apps/web/lib/about-route";
import {
  destinationRoute,
  pairedAboutRoute,
  primaryNavigation,
} from "../apps/web/lib/routing";
import { siteOrigin } from "../apps/web/lib/site-origin";
import {
  readLocalePreference,
  resolveThemePreference,
  saveLocalePreference,
  saveThemePreference,
} from "../apps/web/lib/preferences";
import {
  hasSanityConfiguration,
  normalizePublishedAbout,
} from "../packages/content/src";

const publishedAboutQueryResult = {
  siteSettings: {
    _id: "siteSettings",
    displayName: "Ivo Grgin",
    defaultMetadata: {
      title: {
        en: "Ivo Grgin — Software engineer",
        hr: "Ivo Grgin — Software engineer",
      },
      description: {
        en: "Backend systems, distributed data infrastructure, and developer tooling.",
        hr: "Backend sustavi, distribuirana data infrastruktura i developer tooling.",
      },
    },
    defaultSharingImage: {
      url: "https://cdn.sanity.io/images/project/production/share.jpg",
      width: 1200,
      height: 630,
    },
    contactChannels: [
      {
        _key: "github",
        kind: "github",
        label: { en: "GitHub", hr: "GitHub" },
        href: "https://github.com/igrgin",
      },
    ],
  },
  aboutMe: {
    _id: "aboutMe",
    headline: {
      en: "Software engineer across systems, data, and developer experience.",
      hr: "Software engineer za sustave, podatke i developer experience.",
    },
    biography: {
      en: "I build dependable software.\nI value explicit boundaries.",
      hr: "Gradim pouzdan softver.\nCijenim jasne granice.",
    },
    currentFocus: {
      en: "Resilient platforms and practical AI-assisted development.",
      hr: "Otporne platforme i praktičan razvoj uz pomoć AI-ja.",
    },
    selectedSkills: [
      {
        _id: "skill.backend",
        canonicalName: "Backend engineering",
        displayName: { en: "Backend engineering", hr: "Backend engineering" },
        capability: {
          en: "Production services with explicit domain boundaries.",
          hr: "Produkcijski servisi s jasnim domenskim granicama.",
        },
        evidence: {
          en: "Applied in production event-processing services.",
          hr: "Primijenjeno u produkcijskim servisima za obradu evenata.",
        },
      },
    ],
    featuredProjects: [
      {
        _id: "project.events",
        slug: "distributed-event-platform",
        title: {
          en: "Distributed event platform",
          hr: "Platforma za distribuirane evente",
        },
        summary: {
          en: "Observable and recoverable event processing.",
          hr: "Vidljiva i oporavljiva obrada evenata.",
        },
        contribution: {
          en: "Designed the domain model and recovery workflow.",
          hr: "Dizajnirao domenski model i tijek oporavka.",
        },
      },
    ],
  },
  profileMedia: {
    _id: "profileMedia",
    portrait: {
      url: "https://cdn.sanity.io/images/project/production/portrait.jpg",
      width: 1200,
      height: 1500,
      hotspot: { x: 0.5, y: 0.42 },
      crop: { top: 0.1, right: 0, bottom: 0.1, left: 0.2 },
    },
    alt: { en: "Portrait of Ivo Grgin", hr: "Portret Ive Grgina" },
    caption: {
      en: "Software engineer",
      hr: "Software engineer",
    },
  },
  resumeSet: {
    _id: "resumeSet",
    english: {
      url: "https://cdn.sanity.io/files/project/production/resume-en.pdf",
      mimeType: "application/pdf",
      updatedAt: "2026-07-01",
    },
    croatian: {
      url: "https://cdn.sanity.io/files/project/production/zivotopis-hr.pdf",
      mimeType: "application/pdf",
      updatedAt: "2026-07-01",
    },
  },
};

test("route pairing preserves the About Me entity in either locale", () => {
  assert.equal(pairedAboutRoute("en"), "/hr/o-meni");
  assert.equal(pairedAboutRoute("hr"), "/en/about");
});

test("global navigation exposes all six localized destinations", () => {
  assert.deepEqual(
    primaryNavigation.map(({ destination }) => destination),
    ["about", "experience", "education", "skills", "projects", "contact"],
  );

  assert.equal(destinationRoute("en", "about"), "/en/about");
  assert.equal(destinationRoute("hr", "about"), "/hr/o-meni");
  assert.equal(destinationRoute("en", "projects"), "/en/projects");
  assert.equal(destinationRoute("hr", "projects"), "/hr/projekti");
});

test("published paired Sanity content resolves to the requested localized About Me", () => {
  const content = normalizePublishedAbout(publishedAboutQueryResult, "hr");

  assert.ok(content);
  assert.equal(
    content.headline,
    "Software engineer za sustave, podatke i developer experience.",
  );
  assert.deepEqual(content.biography, [
    "Gradim pouzdan softver.",
    "Cijenim jasne granice.",
  ]);
  assert.equal(content.selectedSkills[0]?.name, "Backend engineering");
  assert.equal(content.featuredProjects[0]?.slug, "distributed-event-platform");
  assert.equal(
    content.metadata.image.url,
    "https://cdn.sanity.io/images/project/production/share.jpg",
  );
  assert.equal(content.resumes.en.mimeType, "application/pdf");
  assert.equal(content.resumes.hr.mimeType, "application/pdf");
  assert.equal(content.portrait.caption, "Software engineer");
});

test("invalid, incomplete, or draft About Me content is not published", () => {
  assert.equal(normalizePublishedAbout(null, "en"), null);

  const incompletePair = structuredClone(publishedAboutQueryResult);
  incompletePair.aboutMe.headline.hr = "";
  assert.equal(normalizePublishedAbout(incompletePair, "en"), null);

  const draft = structuredClone(publishedAboutQueryResult);
  draft.aboutMe._id = "drafts.aboutMe";
  assert.equal(normalizePublishedAbout(draft, "en"), null);

  const emptyEvidence = structuredClone(publishedAboutQueryResult);
  emptyEvidence.aboutMe.selectedSkills = [];
  assert.equal(normalizePublishedAbout(emptyEvidence, "en"), null);

  const unsupportedSkill = structuredClone(publishedAboutQueryResult);
  unsupportedSkill.aboutMe.selectedSkills[0]!.evidence.en = "";
  assert.equal(normalizePublishedAbout(unsupportedSkill, "en"), null);

  const unexplainedContribution = structuredClone(publishedAboutQueryResult);
  unexplainedContribution.aboutMe.featuredProjects[0]!.contribution.hr = "";
  assert.equal(normalizePublishedAbout(unexplainedContribution, "hr"), null);
});

test("valid edge focal points remain publishable", () => {
  const edgeHotspot = structuredClone(publishedAboutQueryResult);
  edgeHotspot.profileMedia.portrait.hotspot.x = 0;

  assert.ok(normalizePublishedAbout(edgeHotspot, "en"));
});

test("an untouched Sanity portrait uses a centered focal point", () => {
  const defaultPortrait = structuredClone(publishedAboutQueryResult);
  Reflect.deleteProperty(defaultPortrait.profileMedia.portrait, "hotspot");
  Reflect.deleteProperty(defaultPortrait.profileMedia.portrait, "crop");

  const content = normalizePublishedAbout(defaultPortrait, "en");
  assert.ok(content);
  assert.deepEqual(content.portrait.hotspot, { x: 0.5, y: 0.5 });
  assert.deepEqual(content.portrait.crop, {
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  });
});

test("theme follows the system until the visitor explicitly persists a choice", () => {
  const values = new Map<string, string>();
  let writes = 0;
  const storage = {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      writes += 1;
      values.set(key, value);
    },
  };

  assert.equal(resolveThemePreference(storage, true), "dark");
  assert.equal(writes, 0, "system preference must not be persisted");

  saveThemePreference(storage, "light");
  assert.equal(resolveThemePreference(storage, true), "light");
  assert.equal(writes, 1);
});

test("locale persistence only accepts an explicit supported locale", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };

  assert.equal(readLocalePreference(storage), null);
  assert.equal(values.size, 0, "default locale must not be persisted");

  saveLocalePreference(storage, "hr");
  assert.equal(readLocalePreference(storage), "hr");

  values.set("portfolio-locale", "de");
  assert.equal(readLocalePreference(storage), null);
});

test("the rendered Croatian shell keeps navigation, preferences, and both résumés reachable", () => {
  const content = normalizePublishedAbout(publishedAboutQueryResult, "hr");
  assert.ok(content);

  const html = renderToStaticMarkup(
    <AboutPageView content={content} locale="hr" />,
  );

  for (const href of [
    "/hr/o-meni",
    "/hr/iskustvo",
    "/hr/obrazovanje",
    "/hr/vjestine",
    "/hr/projekti",
    "/hr/kontakt",
  ]) {
    assert.match(html, new RegExp(`href="${href}"`));
  }
  assert.match(html, /<a aria-current="page" href="\/hr\/o-meni"/);
  assert.match(html, /href="\/en\/about"[^>]*hrefLang="en"/);
  assert.match(html, /English résumé \(PDF\)/);
  assert.match(html, /Hrvatski životopis \(PDF\)/);
  assert.match(html, /href="\/resume\/ivo-grgin-resume-en\.pdf"/);
  assert.match(html, /href="\/resume\/ivo-grgin-zivotopis-hr\.pdf"/);
  assert.match(html, /alt="Portret Ive Grgina"/);
  assert.match(html, /src="\/media\/ivo-grgin-portrait\.jpg"/);
  assert.match(html, /Software engineer/);
  assert.match(
    html,
    /Primijenjeno u produkcijskim servisima za obradu evenata\./,
  );
  assert.match(html, /Dizajnirao domenski model i tijek oporavka\./);
  assert.match(html, /href="https:\/\/github\.com\/igrgin"/);

  assert.ok(
    html.indexOf("Gradim pouzdan softver.") <
      html.indexOf('alt="Portret Ive Grgina"'),
    "introduction must precede the portrait in mobile reading order",
  );
});

test("About Me metadata exposes canonical locale pairs and the sharing image", () => {
  const content = normalizePublishedAbout(publishedAboutQueryResult, "hr");
  assert.ok(content);

  const origin = new URL("https://portfolio.example");
  const metadata = buildAboutMetadata(content, "hr", origin);
  assert.deepEqual(metadata.alternates, {
    canonical: "https://portfolio.example/hr/o-meni",
    languages: {
      en: "https://portfolio.example/en/about",
      hr: "https://portfolio.example/hr/o-meni",
      "x-default": "https://portfolio.example/en/about",
    },
  });
  assert.deepEqual(metadata.openGraph?.images, [
    {
      alt: "Ivo Grgin",
      height: 630,
      url: "https://portfolio.example/media/ivo-grgin-profile-share.jpg",
      width: 1200,
    },
  ]);

  const structuredData = aboutStructuredData(content, "hr", origin);
  assert.equal(structuredData["@type"], "ProfilePage");
  assert.equal(structuredData.mainEntity["@type"], "Person");
  assert.equal(
    structuredData.mainEntity.url,
    "https://portfolio.example/hr/o-meni",
  );
});

test("configured Sanity builds are distinguishable from local contentless builds", () => {
  assert.equal(hasSanityConfiguration({}), false);
  assert.equal(
    hasSanityConfiguration({
      SANITY_DATASET: "production",
      SANITY_PROJECT_ID: "portfolio-project",
    }),
    true,
  );
  assert.throws(
    () => hasSanityConfiguration({ SANITY_PROJECT_ID: "INVALID!" }),
    /Invalid Sanity configuration/,
  );
});

test("configured public builds require an HTTPS site origin", () => {
  const previousOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  process.env.NEXT_PUBLIC_SITE_ORIGIN = "http://portfolio.example";

  try {
    assert.throws(() => siteOrigin({ required: true }), /HTTPS origin/);
  } finally {
    if (previousOrigin === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_ORIGIN;
    } else {
      process.env.NEXT_PUBLIC_SITE_ORIGIN = previousOrigin;
    }
  }
});

test("unknown localized routes render a 404 with working global navigation", () => {
  const html = renderToStaticMarkup(<NotFoundPageView locale="en" />);

  assert.match(html, /Page not found/);
  assert.match(html, /href="\/en\/about"/);
  assert.match(html, /href="\/hr\/o-meni"/);
  assert.match(html, /English résumé \(PDF\)/);
  assert.match(html, /Croatian résumé \(PDF\)/);
});
