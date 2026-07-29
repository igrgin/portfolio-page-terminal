import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ExperiencePageView } from "../apps/web/components/experience-page-view";
import {
  buildExperienceMetadata,
  experienceStructuredData,
} from "../apps/web/lib/experience-route";
import { normalizePublishedExperience } from "../packages/content/src";

const publishedExperienceQueryResult = {
  siteSettings: {
    _id: "siteSettings",
    displayName: "Ivo Grgin",
    contactChannels: [
      {
        _key: "github",
        kind: "github",
        label: { en: "GitHub", hr: "GitHub" },
        href: "https://github.com/igrgin",
      },
    ],
  },
  experiences: [
    {
      _id: "experience.older",
      employerPresentation: "publicEmployer",
      employer: "Earlier Systems",
      employerUrl: "https://earlier.example",
      role: {
        en: "Software Engineer",
        hr: "Software Engineer",
      },
      startDate: "2020-02",
      endDate: "2022-08",
      current: false,
      location: { en: "Zagreb, Croatia", hr: "Zagreb, Hrvatska" },
      employmentType: { en: "Full-time", hr: "Puno radno vrijeme" },
      summary: {
        en: "Built reliable data services.",
        hr: "Razvijao pouzdane podatkovne servise.",
      },
      achievements: {
        en: ["Reduced recovery time.", "Improved operational visibility."],
        hr: [
          "Smanjio vrijeme oporavka.",
          "Poboljšao operativnu vidljivost.",
        ],
      },
      skills: [
        {
          _id: "skill.backend",
          canonicalName: "Backend engineering",
          displayName: {
            en: "Backend engineering",
            hr: "Backend engineering",
          },
        },
      ],
    },
    {
      _id: "experience.current",
      employerPresentation: "confidentialClient",
      confidentialClientLabel: {
        en: "Confidential financial-services client",
        hr: "Povjerljivi klijent iz financijskog sektora",
      },
      role: {
        en: "Senior Software Engineer",
        hr: "Senior Software Engineer",
      },
      startDate: "2024-03",
      current: true,
      summary: {
        en: "Builds resilient event-processing systems.",
        hr: "Razvija otporne sustave za obradu evenata.",
      },
      achievements: {
        en: ["Designed recoverable processing workflows."],
        hr: ["Dizajnirao oporavljive tijekove obrade."],
      },
      skills: [
        {
          _id: "skill.distributed-data",
          canonicalName: "Distributed data systems",
        },
      ],
    },
    {
      _id: "experience.recent",
      employerPresentation: "publicEmployer",
      employer: "Platform Works",
      role: {
        en: "Backend Engineer",
        hr: "Backend Engineer",
      },
      startDate: "2022-09",
      endDate: "2024-02",
      current: false,
      summary: {
        en: "Delivered observable backend platforms.",
        hr: "Isporučivao vidljive backend platforme.",
      },
      achievements: {
        en: ["Introduced production readiness checks."],
        hr: ["Uveo provjere spremnosti za produkciju."],
      },
      skills: [
        {
          _id: "skill.platforms",
          canonicalName: "Platforms and operations",
        },
      ],
    },
  ],
};

test("published Experience normalizes into current-first reverse chronology", () => {
  const content = normalizePublishedExperience(
    publishedExperienceQueryResult,
    "hr",
  );

  assert.ok(content);
  assert.equal(content.displayName, "Ivo Grgin");
  assert.deepEqual(
    content.entries.map((entry) => entry.id),
    ["experience.current", "experience.recent", "experience.older"],
  );
  assert.deepEqual(content.entries[0], {
    achievements: ["Dizajnirao oporavljive tijekove obrade."],
    current: true,
    employer: "Povjerljivi klijent iz financijskog sektora",
    endDate: null,
    id: "experience.current",
    role: "Senior Software Engineer",
    skills: [
      {
        id: "skill.distributed-data",
        name: "Distributed data systems",
      },
    ],
    startDate: "2024-03",
    summary: "Razvija otporne sustave za obradu evenata.",
  });
  assert.equal(content.entries[2]?.location, "Zagreb, Hrvatska");
  assert.equal(content.entries[2]?.employmentType, "Puno radno vrijeme");
  assert.equal(content.entries[2]?.employerUrl, "https://earlier.example");
});

test("the localized Experience page renders linked evidence and accessible dates", () => {
  const content = normalizePublishedExperience(
    publishedExperienceQueryResult,
    "hr",
  );
  assert.ok(content);

  const html = renderToStaticMarkup(
    <ExperiencePageView content={content} locale="hr" />,
  );

  assert.match(html, /<h1[^>]*>Iskustvo<\/h1>/);
  assert.match(
    html,
    /<a aria-current="page" href="\/hr\/iskustvo"/,
  );
  assert.match(html, /href="\/en\/experience"[^>]*hrefLang="en"/);
  assert.match(html, /Povjerljivi klijent iz financijskog sektora/);
  assert.match(html, /Razvija otporne sustave za obradu evenata\./);
  assert.match(html, /Dizajnirao oporavljive tijekove obrade\./);
  assert.match(html, /href="https:\/\/earlier\.example"/);
  assert.match(html, /href="\/hr\/vjestine"/);
  assert.match(html, /<time dateTime="2024-03">[^<]+<\/time>/);
  assert.match(html, /<time dateTime="2024-02">[^<]+<\/time>/);
  assert.match(html, /Trenutačno/);

  assert.ok(
    html.indexOf("Povjerljivi klijent iz financijskog sektora") <
      html.indexOf("Platform Works"),
    "current Experience must render before completed Experience",
  );
});

test("draft, invalid, unsafe, or reference-incomplete Experience stays private", () => {
  const draft = structuredClone(publishedExperienceQueryResult);
  draft.experiences[0]!._id = "drafts.experience.older";
  assert.deepEqual(
    normalizePublishedExperience(draft, "en")?.entries.map(({ id }) => id),
    ["experience.current", "experience.recent"],
  );

  const invalidDate = structuredClone(publishedExperienceQueryResult);
  invalidDate.experiences[2]!.startDate = "2024-13";
  assert.deepEqual(
    normalizePublishedExperience(invalidDate, "en")?.entries.map(({ id }) => id),
    ["experience.current", "experience.older"],
  );

  const endedCurrentRole = structuredClone(publishedExperienceQueryResult);
  Object.assign(endedCurrentRole.experiences[1]!, { endDate: "2026-01" });
  assert.deepEqual(
    normalizePublishedExperience(endedCurrentRole, "en")?.entries.map(
      ({ id }) => id,
    ),
    ["experience.recent", "experience.older"],
  );

  const leakedClientIdentity = structuredClone(publishedExperienceQueryResult);
  Object.assign(leakedClientIdentity.experiences[1]!, {
    employer: "Unapproved Client Name",
  });
  assert.deepEqual(
    normalizePublishedExperience(leakedClientIdentity, "en")?.entries.map(
      ({ id }) => id,
    ),
    ["experience.recent", "experience.older"],
  );

  const achievementMismatch = structuredClone(publishedExperienceQueryResult);
  achievementMismatch.experiences[0]!.achievements.hr.pop();
  assert.deepEqual(
    normalizePublishedExperience(achievementMismatch, "en")?.entries.map(
      ({ id }) => id,
    ),
    ["experience.current", "experience.recent"],
  );

  const draftSkillReference = structuredClone(publishedExperienceQueryResult);
  draftSkillReference.experiences[2]!.skills[0]!._id =
    "drafts.skill.platforms";
  assert.deepEqual(
    normalizePublishedExperience(draftSkillReference, "en")?.entries.map(
      ({ id }) => id,
    ),
    ["experience.current", "experience.older"],
  );

  const incompleteOptionalLocalization = structuredClone(
    publishedExperienceQueryResult,
  );
  incompleteOptionalLocalization.experiences[0]!.skills[0]!.displayName.hr = "";
  assert.deepEqual(
    normalizePublishedExperience(
      incompleteOptionalLocalization,
      "en",
    )?.entries.map(({ id }) => id),
    ["experience.current", "experience.recent"],
  );

  const noPublicEntries = structuredClone(publishedExperienceQueryResult);
  noPublicEntries.experiences = [
    {
      ...noPublicEntries.experiences[0]!,
      _id: "drafts.experience.only",
    },
  ];
  assert.equal(normalizePublishedExperience(noPublicEntries, "en"), null);
});

test("Experience discovery data uses the localized canonical route and public entries", () => {
  const content = normalizePublishedExperience(
    publishedExperienceQueryResult,
    "en",
  );
  assert.ok(content);

  const origin = new URL("https://portfolio.example");
  const metadata = buildExperienceMetadata(content, "en", origin);
  assert.deepEqual(metadata.alternates, {
    canonical: "https://portfolio.example/en/experience",
    languages: {
      en: "https://portfolio.example/en/experience",
      hr: "https://portfolio.example/hr/iskustvo",
      "x-default": "https://portfolio.example/en/experience",
    },
  });
  assert.equal(metadata.title, "Experience — Ivo Grgin");
  assert.equal(
    metadata.description,
    "Builds resilient event-processing systems.",
  );

  const structuredData = experienceStructuredData(content, "en", origin);
  assert.equal(structuredData["@type"], "CollectionPage");
  assert.equal(structuredData.mainEntity["@type"], "ItemList");
  assert.deepEqual(
    structuredData.mainEntity.itemListElement.map(({ item }) => item.name),
    ["Senior Software Engineer", "Backend Engineer", "Software Engineer"],
  );
});
