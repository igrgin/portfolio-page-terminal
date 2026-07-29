import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { EducationPageView } from "../apps/web/components/education-page-view";
import { buildEducationMetadata } from "../apps/web/lib/education-route";
import {
  EDUCATION_PAGE_QUERY,
  normalizePublishedEducation,
} from "../packages/content/src/education";

const publishedEducationQueryResult = {
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
        _key: "github",
        kind: "github",
        label: { en: "GitHub", hr: "GitHub" },
        href: "https://github.com/igrgin",
      },
    ],
  },
  educationEntries: [
    {
      _id: "education.bachelor",
      institution: {
        en: "University of Zagreb",
        hr: "Sveučilište u Zagrebu",
      },
      qualification: {
        en: "Bachelor of Science",
        hr: "Sveučilišni prvostupnik",
      },
      field: {
        en: "Computing",
        hr: "Računarstvo",
      },
      startYear: 2015,
      endYear: 2018,
      inProgress: false,
      relevantSubjects: [
        {
          _key: "distributed-systems",
          title: {
            en: "Distributed systems",
            hr: "Distribuirani sustavi",
          },
        },
      ],
      skills: [
        {
          _id: "skill.backend",
          _type: "skill",
          canonicalName: "Backend engineering",
          displayName: {
            en: "Backend engineering",
            hr: "Backend inženjerstvo",
          },
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
    },
    {
      _id: "education.current",
      institution: {
        en: "Open University",
        hr: "Otvoreno učilište",
      },
      qualification: {
        en: "Professional programme",
        hr: "Stručni program",
      },
      field: {
        en: "Machine learning",
        hr: "Strojno učenje",
      },
      startYear: 2025,
      inProgress: true,
      relevantSubjects: [
        {
          _key: "deep-learning",
          title: {
            en: "Deep learning",
            hr: "Duboko učenje",
          },
        },
      ],
      skills: [],
    },
    {
      _id: "education.master",
      institution: {
        en: "University of Zagreb",
        hr: "Sveučilište u Zagrebu",
      },
      qualification: {
        en: "Master of Science",
        hr: "Magistar inženjer",
      },
      field: {
        en: "Information systems",
        hr: "Informacijski sustavi",
      },
      startYear: 2018,
      endYear: 2020,
      inProgress: false,
      location: {
        en: "Zagreb, Croatia",
        hr: "Zagreb, Hrvatska",
      },
      url: "https://www.unizg.hr/",
      relevantSubjects: [
        {
          _key: "data-engineering",
          title: {
            en: "Data engineering",
            hr: "Podatkovno inženjerstvo",
          },
        },
      ],
      skills: [],
    },
  ],
};

test("Education authoring exposes the approved publish-safe contract", () => {
  const studioConfig = readFileSync(
    new URL("../apps/studio/sanity.config.ts", import.meta.url),
    "utf8",
  );
  const schema = JSON.parse(
    readFileSync(
      new URL("../apps/studio/schema.json", import.meta.url),
      "utf8",
    ),
  ) as Array<{
    attributes: Record<string, unknown>;
    name: string;
    type: string;
  }>;
  const education = schema.find(({ name }) => name === "education");

  assert.match(
    studioConfig,
    /documentTypeListItem\("education"\)\.title\("Education"\)/,
  );
  assert.ok(education);
  assert.equal(education.type, "document");
  assert.deepEqual(
    Object.keys(education.attributes)
      .filter((name) => !name.startsWith("_"))
      .sort(),
    [
      "endYear",
      "field",
      "inProgress",
      "institution",
      "location",
      "qualification",
      "relevantSubjects",
      "skills",
      "startYear",
      "url",
    ],
  );

  const serializedContract = JSON.stringify(education);
  for (const prohibited of [
    "grade",
    "transcript",
    "scan",
    "studentId",
    "identifier",
  ]) {
    assert.doesNotMatch(serializedContract, new RegExp(prohibited, "i"));
  }
});

test("published Education localizes paired content and orders in-progress study first", () => {
  const content = normalizePublishedEducation(
    publishedEducationQueryResult,
    "hr",
  );

  assert.ok(content);
  assert.deepEqual(
    content.entries.map(({ qualification }) => qualification),
    ["Stručni program", "Magistar inženjer", "Sveučilišni prvostupnik"],
  );
  assert.equal(content.entries[0]?.institution, "Otvoreno učilište");
  assert.equal(content.entries[0]?.endYear, undefined);
  assert.equal(content.entries[1]?.location, "Zagreb, Hrvatska");
  assert.equal(content.entries[1]?.url, "https://www.unizg.hr/");
  assert.deepEqual(content.entries[2]?.relevantSubjects, [
    "Distribuirani sustavi",
  ]);
  assert.deepEqual(content.entries[2]?.skills, ["Backend inženjerstvo"]);
});

test("Sanity null projections remain absent optional Education facts", () => {
  const projected = structuredClone(publishedEducationQueryResult);
  Object.assign(projected.educationEntries[1]!, {
    endYear: null,
    location: null,
    skills: null,
    url: null,
  });

  const content = normalizePublishedEducation(projected, "en");
  assert.ok(content);
  assert.equal(content.entries[0]?.qualification, "Professional programme");
  assert.equal(content.entries[0]?.endYear, undefined);
  assert.equal(content.entries[0]?.location, undefined);
  assert.deepEqual(content.entries[0]?.skills, []);
});

test("invalid dates, incomplete locale pairs, and missing references never publish", () => {
  const invalid = structuredClone(publishedEducationQueryResult);
  invalid.educationEntries[0]!.endYear = 2014;
  invalid.educationEntries[1]!.field.hr = "";
  invalid.educationEntries[2]!.skills = [null] as never;

  assert.equal(normalizePublishedEducation(invalid, "en"), null);
});

test("Education excludes references to Skills that are not publish-safe", () => {
  const invalidSkill = structuredClone(publishedEducationQueryResult);
  invalidSkill.educationEntries[0]!.skills[0]!.evidence.hr = "";

  const content = normalizePublishedEducation(invalidSkill, "en");
  assert.ok(content);
  assert.deepEqual(
    content.entries.map(({ qualification }) => qualification),
    ["Professional programme", "Master of Science"],
  );
});

test("an Education reference can itself provide a Skill's optional evidence", () => {
  const referencedSkill = structuredClone(publishedEducationQueryResult);
  Reflect.deleteProperty(
    referencedSkill.educationEntries[0]!.skills[0]!,
    "evidence",
  );

  const content = normalizePublishedEducation(referencedSkill, "en");
  assert.ok(content);
  assert.deepEqual(content.entries[2]?.skills, ["Backend engineering"]);
});

test("the public Education contract cannot disclose prohibited academic material", () => {
  const sensitive = structuredClone(publishedEducationQueryResult);
  Object.assign(sensitive.educationEntries[2]!, {
    diplomaScan: "private-scan.pdf",
    grade: "top-secret-grade",
    studentIdentifier: "private-student-id",
    transcript: ["private-course-result"],
  });

  const content = normalizePublishedEducation(sensitive, "en");
  assert.ok(content);

  const published = JSON.stringify(content);
  assert.doesNotMatch(
    published,
    /education\.(?:bachelor|current|master)/,
    "Sanity document IDs must remain internal",
  );
  for (const prohibited of [
    "top-secret-grade",
    "private-scan.pdf",
    "private-student-id",
    "private-course-result",
  ]) {
    assert.doesNotMatch(published, new RegExp(prohibited, "i"));
  }
});

test("the Education query selects only published allowlisted fields and strong references", () => {
  assert.match(EDUCATION_PAGE_QUERY, /_type == "education"/);
  assert.match(EDUCATION_PAGE_QUERY, /!\(_id in path\("drafts\.\*\*"\)\)/);
  assert.match(EDUCATION_PAGE_QUERY, /skills\[\]->/);
  assert.match(EDUCATION_PAGE_QUERY, /capability/);
  assert.match(EDUCATION_PAGE_QUERY, /evidence/);

  for (const prohibited of [
    "grade",
    "transcript",
    "scan",
    "studentIdentifier",
  ]) {
    assert.doesNotMatch(EDUCATION_PAGE_QUERY, new RegExp(prohibited, "i"));
  }
});

test("the rendered Education page preserves its locale pair and publishes selected evidence", () => {
  const content = normalizePublishedEducation(
    publishedEducationQueryResult,
    "en",
  );
  assert.ok(content);

  const html = renderToStaticMarkup(
    <EducationPageView content={content} locale="en" />,
  );

  assert.match(
    html,
    /<a aria-current="page" href="\/en\/education"/,
  );
  assert.match(html, /href="\/hr\/obrazovanje"[^>]*hrefLang="hr"/);
  assert.match(html, /Professional programme/);
  assert.match(html, /2025/);
  assert.match(html, /In progress/);
  assert.match(html, /Data engineering/);
  assert.match(html, /Backend engineering/);
  assert.match(html, /href="https:\/\/www\.unizg\.hr\/"/);
  assert.match(html, /href="\/en\/privacy"/);
  assert.doesNotMatch(html, /top-secret-grade|transcript|student identifier/i);
});

test("Education metadata exposes canonical English and Croatian routes", () => {
  const content = normalizePublishedEducation(
    publishedEducationQueryResult,
    "hr",
  );
  assert.ok(content);

  const metadata = buildEducationMetadata(
    content,
    "hr",
    new URL("https://portfolio.example"),
  );

  assert.equal(metadata.title, "Obrazovanje — Ivo Grgin");
  assert.deepEqual(metadata.alternates, {
    canonical: "https://portfolio.example/hr/obrazovanje",
    languages: {
      en: "https://portfolio.example/en/education",
      hr: "https://portfolio.example/hr/obrazovanje",
      "x-default": "https://portfolio.example/en/education",
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
  assert.deepEqual(metadata.twitter, {
    card: "summary_large_image",
    description:
      "Formalno obrazovanje i odabrani predmeti relevantni za softversko-inženjerski rad Ive Grgina.",
    images: [
      {
        alt: "Ivo Grgin",
        height: 630,
        url: "https://portfolio.example/media/ivo-grgin-profile-share.jpg",
        width: 1200,
      },
    ],
    title: "Obrazovanje — Ivo Grgin",
  });
});
