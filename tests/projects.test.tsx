import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ProjectDetailPageView } from "../apps/web/components/project-detail-page-view";
import { ProjectsPageView } from "../apps/web/components/projects-page-view";
import { buildSitemap } from "../apps/web/app/sitemap";
import { buildRobots } from "../apps/web/app/robots";
import {
  buildProjectMetadata,
  buildProjectStaticParams,
  buildProjectsMetadata,
  projectStructuredData,
} from "../apps/web/lib/projects-route";
import {
  normalizePublishedProjects,
  PROJECTS_PAGE_QUERY,
} from "../packages/content/src/projects";

const publishedProjectsQueryResult = {
  siteSettings: {
    _id: "siteSettings",
    displayName: "Ivo Grgin",
    defaultSharingImage: {
      url: "https://cdn.sanity.io/images/portfolio/production/share.jpg",
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
  projects: [
    {
      _id: "project.tooling",
      _type: "project",
      title: {
        en: "Delivery feedback tooling",
        hr: "Alati za povratne informacije o isporuci",
      },
      slug: "delivery-feedback-tooling",
      summary: {
        en: "Fast, explicit feedback for safer software delivery.",
        hr: "Brze i jasne povratne informacije za sigurniju isporuku softvera.",
      },
      contribution: {
        en: "Designed and implemented the build feedback workflow.",
        hr: "Dizajnirao i implementirao tijek povratnih informacija iz builda.",
      },
      disclosureLevel: "summary",
      startDate: "2026-02",
      status: "inProgress",
      featured: false,
      order: 10,
      skills: [
        {
          _id: "skill.tooling",
          _type: "skill",
          canonicalName: "Developer tooling",
          category: "developerTooling",
          capability: {
            en: "Build feedback loops that make safe delivery routine.",
            hr: "Gradim povratne sprege koje sigurnu isporuku čine rutinskom.",
          },
          evidence: {
            en: "Applied to a public delivery-feedback Project.",
            hr: "Primijenjeno na javnom projektu povratnih informacija o isporuci.",
          },
          order: 20,
          experienceEvidence: [],
          educationEvidence: [],
          projectEvidence: [],
        },
      ],
      documentationUrl: "https://docs.example.com/delivery-feedback",
      media: [],
      publishSafe: true,
    },
    {
      _id: "project.events",
      _type: "project",
      title: {
        en: "Distributed event platform",
        hr: "Platforma za distribuirane evente",
      },
      slug: "distributed-event-platform",
      summary: {
        en: "Observable and recoverable event processing.",
        hr: "Nadgledljiva i oporavljiva obrada evenata.",
      },
      contribution: {
        en: "Designed the domain model and recovery workflow.",
        hr: "Dizajnirao domenski model i tijek oporavka.",
      },
      disclosureLevel: "full",
      context: {
        en: "Teams needed event processing that stayed understandable during partial failures.",
        hr: "Timovima je trebala obrada evenata koja ostaje razumljiva tijekom djelomičnih kvarova.",
      },
      constraints: {
        en: "Recovery had to preserve ordering without exposing confidential production topology.",
        hr: "Oporavak je morao očuvati redoslijed bez otkrivanja povjerljive produkcijske topologije.",
      },
      approach: {
        en: "I separated bounded contexts, made retry state explicit, and designed observable recovery checkpoints.",
        hr: "Razdvojio sam omeđene kontekste, učinio stanje ponovnih pokušaja jasnim i osmislio nadgledljive kontrolne točke oporavka.",
      },
      outcome: {
        en: "Operators could identify stalled work and resume processing from a known checkpoint.",
        hr: "Operateri su mogli prepoznati zaustavljeni rad i nastaviti obradu od poznate kontrolne točke.",
      },
      lessons: {
        en: "Recovery behavior is easier to trust when it is modeled as product behavior rather than hidden infrastructure.",
        hr: "Ponašanju oporavka lakše je vjerovati kada je modelirano kao ponašanje proizvoda, a ne skrivena infrastruktura.",
      },
      startDate: "2024-01",
      endDate: "2025-06",
      status: "completed",
      featured: true,
      order: 20,
      skills: [
        {
          _id: "skill.backend",
          _type: "skill",
          canonicalName: "Backend engineering",
          displayName: {
            en: "Backend engineering",
            hr: "Backend inženjerstvo",
          },
          category: "backendEngineering",
          capability: {
            en: "Design services with explicit domain boundaries.",
            hr: "Projektiram servise s jasnim domenskim granicama.",
          },
          evidence: {
            en: "Applied to publish-safe event-processing work.",
            hr: "Primijenjeno na radu s obradom evenata sigurnom za objavu.",
          },
          order: 10,
          experienceEvidence: [],
          educationEvidence: [],
          projectEvidence: [],
        },
      ],
      repositoryUrl: "https://github.com/igrgin/event-platform",
      demoUrl: "https://event-platform.example.com",
      heroMedia: {
        image: {
          url: "https://cdn.sanity.io/images/portfolio/production/hero.jpg",
          width: 1600,
          height: 900,
        },
        alternativeText: {
          en: "Event-processing recovery dashboard",
          hr: "Nadzorna ploča oporavka obrade evenata",
        },
        caption: {
          en: "Recovery progress is visible without reading operational logs.",
          hr: "Napredak oporavka vidljiv je bez čitanja operativnih zapisa.",
        },
      },
      media: [
        {
          _key: "topology",
          image: {
            url: "https://cdn.sanity.io/images/portfolio/production/topology.png",
            width: 1200,
            height: 800,
          },
          alternativeText: {
            en: "Event topology grouped by bounded context",
            hr: "Topologija evenata grupirana po omeđenom kontekstu",
          },
        },
      ],
      publishSafe: true,
    },
  ],
};

test("Project authoring exposes summary and paired full-case-study fields", () => {
  const schema = JSON.parse(
    readFileSync(
      new URL("../apps/studio/schema.json", import.meta.url),
      "utf8",
    ),
  ) as Array<{
    attributes: Record<string, unknown>;
    name: string;
    type: string;
    value?: {
      attributes?: Record<string, unknown>;
      type?: string;
    };
  }>;
  const project = schema.find(({ name }) => name === "project");
  const projectMedia = schema.find(({ name }) => name === "projectMedia");

  assert.ok(project);
  assert.equal(project.type, "document");
  assert.deepEqual(
    Object.keys(project.attributes)
      .filter((name) => !name.startsWith("_"))
      .sort(),
    [
      "approach",
      "constraints",
      "context",
      "contribution",
      "demoUrl",
      "disclosureLevel",
      "documentationUrl",
      "endDate",
      "featured",
      "heroMedia",
      "lessons",
      "media",
      "metadataOverride",
      "order",
      "outcome",
      "publishSafe",
      "repositoryUrl",
      "skills",
      "slug",
      "startDate",
      "status",
      "summary",
      "title",
    ],
  );
  assert.ok(projectMedia);
  assert.equal(projectMedia.value?.type, "object");
  assert.deepEqual(
    Object.keys(projectMedia.value?.attributes ?? {})
      .filter((name) => !name.startsWith("_"))
      .sort(),
    ["alternativeText", "caption", "image"],
  );
  assert.doesNotMatch(
    JSON.stringify(project),
    /repositoryNarrative|repositorySource|markdownSource/i,
  );
});

test("published Projects localize paired facts and follow featured editorial order", () => {
  const english = normalizePublishedProjects(
    publishedProjectsQueryResult,
    "en",
  );
  const croatian = normalizePublishedProjects(
    publishedProjectsQueryResult,
    "hr",
  );

  assert.ok(english);
  assert.ok(croatian);
  assert.deepEqual(
    english.entries.map(({ slug }) => slug),
    ["distributed-event-platform", "delivery-feedback-tooling"],
  );
  assert.equal(croatian.entries[0]?.title, "Platforma za distribuirane evente");
  assert.equal(croatian.entries[0]?.disclosureLevel, "full");
  assert.deepEqual(croatian.entries[0]?.caseStudy, {
    approach:
      "Razdvojio sam omeđene kontekste, učinio stanje ponovnih pokušaja jasnim i osmislio nadgledljive kontrolne točke oporavka.",
    constraints:
      "Oporavak je morao očuvati redoslijed bez otkrivanja povjerljive produkcijske topologije.",
    context:
      "Timovima je trebala obrada evenata koja ostaje razumljiva tijekom djelomičnih kvarova.",
    lessons:
      "Ponašanju oporavka lakše je vjerovati kada je modelirano kao ponašanje proizvoda, a ne skrivena infrastruktura.",
    outcome:
      "Operateri su mogli prepoznati zaustavljeni rad i nastaviti obradu od poznate kontrolne točke.",
  });
  assert.equal(croatian.entries[1]?.disclosureLevel, "summary");
  assert.equal(croatian.entries[1]?.caseStudy, undefined);
  assert.deepEqual(croatian.entries[0]?.status, {
    key: "completed",
    label: "Dovršen",
  });
  assert.deepEqual(croatian.entries[0]?.skills, [
    { id: "skill.backend", name: "Backend inženjerstvo" },
  ]);
  assert.deepEqual(english.entries[0]?.links, {
    demo: "https://event-platform.example.com",
    repository: "https://github.com/igrgin/event-platform",
  });
  assert.equal(
    croatian.entries[0]?.heroMedia?.alt,
    "Nadzorna ploča oporavka obrade evenata",
  );
  assert.equal(
    croatian.entries[0]?.media[0]?.alt,
    "Topologija evenata grupirana po omeđenom kontekstu",
  );
  assert.equal(
    english.entries[0]?.metadata.description,
    "Observable and recoverable event processing.",
  );
  assert.equal(
    english.entries[0]?.metadata.image.url,
    "https://cdn.sanity.io/images/portfolio/production/hero.jpg",
  );
  assert.equal(
    english.entries[1]?.metadata.image.url,
    "https://cdn.sanity.io/images/portfolio/production/share.jpg",
  );
});

test("draft, sensitive, unpaired, colliding, and invalid Projects do not publish", () => {
  const expectOnlyTooling = (
    mutate: (
      project: (typeof publishedProjectsQueryResult.projects)[number],
    ) => void,
  ) => {
    const invalid = structuredClone(publishedProjectsQueryResult);
    mutate(invalid.projects[1]!);
    assert.deepEqual(
      normalizePublishedProjects(invalid, "en")?.entries.map(
        ({ slug }) => slug,
      ),
      ["delivery-feedback-tooling"],
    );
  };

  expectOnlyTooling((project) => {
    project._id = "drafts.project.events";
  });
  expectOnlyTooling((project) => {
    Object.assign(project, { sensitive: true });
  });
  expectOnlyTooling((project) => {
    project.title.hr = "";
  });
  expectOnlyTooling((project) => {
    project.slug = "Distributed Event Platform";
  });
  expectOnlyTooling((project) => {
    Reflect.deleteProperty(project, "endDate");
  });
  expectOnlyTooling((project) => {
    project.repositoryUrl = "javascript:alert(1)";
  });
  expectOnlyTooling((project) => {
    project.heroMedia!.alternativeText.hr = "";
  });
  expectOnlyTooling((project) => {
    project.media[0]!._key = "hero";
  });
  expectOnlyTooling((project) => {
    project.skills[0]!._id = "drafts.skill.backend";
  });
  expectOnlyTooling((project) => {
    project.approach.hr = "";
  });
  expectOnlyTooling((project) => {
    Reflect.deleteProperty(project, "disclosureLevel");
  });

  const collision = structuredClone(publishedProjectsQueryResult);
  collision.projects[1]!.slug = collision.projects[0]!.slug;
  assert.equal(normalizePublishedProjects(collision, "en"), null);
});

test("summary-only Projects ignore stale case-study copy instead of exposing unsupported sections", () => {
  const summaryWithStaleCopy = structuredClone(publishedProjectsQueryResult);
  Object.assign(summaryWithStaleCopy.projects[0]!, {
    context: {
      en: "This stale draft must stay private.",
      hr: "Ovaj zastarjeli nacrt mora ostati privatan.",
    },
  });

  const content = normalizePublishedProjects(summaryWithStaleCopy, "en");

  assert.equal(content?.entries[1]?.disclosureLevel, "summary");
  assert.equal(content?.entries[1]?.caseStudy, undefined);
});

test("the Project index renders featured order, status, Skills, and canonical detail links", () => {
  const content = normalizePublishedProjects(
    publishedProjectsQueryResult,
    "hr",
  );
  assert.ok(content);

  const html = renderToStaticMarkup(
    <ProjectsPageView content={content} locale="hr" />,
  );

  assert.match(html, /aria-current="page" href="\/hr\/projekti"/);
  assert.ok(
    html.indexOf("Platforma za distribuirane evente") <
      html.indexOf("Alati za povratne informacije o isporuci"),
  );
  assert.match(html, /href="\/hr\/projekti\/distributed-event-platform"/);
  assert.match(html, /Dovršen/);
  assert.match(html, /dateTime="2024-01"/);
  assert.match(html, /Backend inženjerstvo/);
  assert.match(html, /href="\/hr\/vjestine"/);
});

test("a full Project detail renders localized sections, contextual navigation, and accessible media", () => {
  const content = normalizePublishedProjects(
    publishedProjectsQueryResult,
    "hr",
  );
  assert.ok(content);
  const project = content.entries[0]!;

  const html = renderToStaticMarkup(
    <ProjectDetailPageView content={content} locale="hr" project={project} />,
  );

  assert.match(html, /href="\/en\/projects\/distributed-event-platform"/);
  assert.match(html, /aria-current="page" href="\/hr\/projekti"/);
  assert.match(html, /<h1>Platforma za distribuirane evente<\/h1>/);
  assert.match(html, /Dizajnirao domenski model i tijek oporavka/);
  assert.match(html, /aria-label="Sadržaj studije slučaja"/);
  assert.match(html, /href="#project-context"/);
  assert.match(html, /<h2 id="project-context">Kontekst i problem<\/h2>/);
  assert.match(html, /<h2 id="project-constraints">Ograničenja<\/h2>/);
  assert.match(html, /<h2 id="project-approach">Pristup<\/h2>/);
  assert.match(html, /<h2 id="project-outcome">Ishod i učinak<\/h2>/);
  assert.match(html, /<h2 id="project-lessons">Lekcije i osvrt<\/h2>/);
  assert.doesNotMatch(html, /<details/);
  assert.match(
    html,
    /src="\/media\/projects\/distributed-event-platform\/hero\.jpg"/,
  );
  assert.match(html, /alt="Nadzorna ploča oporavka obrade evenata"/);
  assert.match(
    html,
    /src="\/media\/projects\/distributed-event-platform\/topology\.png"/,
  );
  assert.match(
    html,
    /alt="Topologija evenata grupirana po omeđenom kontekstu"/,
  );
  assert.match(html, /href="https:\/\/github\.com\/igrgin\/event-platform"/);
});

test("a summary-only Project detail has no case-study table of contents or placeholders", () => {
  const content = normalizePublishedProjects(
    publishedProjectsQueryResult,
    "en",
  );
  assert.ok(content);
  const project = content.entries[1]!;

  const html = renderToStaticMarkup(
    <ProjectDetailPageView content={content} locale="en" project={project} />,
  );

  assert.equal(project.disclosureLevel, "summary");
  assert.doesNotMatch(html, /Case study contents/);
  assert.doesNotMatch(html, /id="project-context"/);
  assert.doesNotMatch(html, /Context and problem/);
});

test("full Project composition keeps a contextual rail on wide screens and one readable column when narrow", () => {
  const css = readFileSync(
    new URL("../apps/web/app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(
    css,
    /\.project-case-study-layout\s*\{[^}]*grid-template-columns:\s*minmax\([^;]+;\s*/s,
  );
  assert.match(
    css,
    /@media \(max-width: 840px\)\s*\{[\s\S]*?\.project-case-study-layout\s*\{[^}]*grid-template-columns:\s*1fr;/,
  );
});

test("Project index and detail metadata expose canonical localized route pairs", () => {
  const content = normalizePublishedProjects(
    publishedProjectsQueryResult,
    "hr",
  );
  assert.ok(content);
  const project = content.entries[0]!;
  const origin = new URL("https://portfolio.example");

  const indexMetadata = buildProjectsMetadata(content, "hr", origin);
  assert.equal(
    indexMetadata.alternates?.canonical,
    "https://portfolio.example/hr/projekti",
  );

  const detailMetadata = buildProjectMetadata(content, project, "hr", origin);
  assert.equal(
    detailMetadata.alternates?.canonical,
    "https://portfolio.example/hr/projekti/distributed-event-platform",
  );
  assert.deepEqual(detailMetadata.alternates?.languages, {
    en: "https://portfolio.example/en/projects/distributed-event-platform",
    hr: "https://portfolio.example/hr/projekti/distributed-event-platform",
    "x-default":
      "https://portfolio.example/en/projects/distributed-event-platform",
  });
  assert.equal(
    detailMetadata.title,
    "Platforma za distribuirane evente — Ivo Grgin",
  );
  assert.equal(
    detailMetadata.description,
    "Nadgledljiva i oporavljiva obrada evenata.",
  );
  assert.deepEqual(detailMetadata.openGraph?.images, [
    {
      alt: "Platforma za distribuirane evente",
      height: 900,
      url: "https://portfolio.example/media/projects/distributed-event-platform/hero.jpg",
      width: 1600,
    },
  ]);
});

test("an approved paired metadata override replaces otherwise derived Project metadata", () => {
  const overridden = structuredClone(publishedProjectsQueryResult);
  Object.assign(overridden.projects[1]!, {
    metadataOverride: {
      title: {
        en: "Reliable distributed event recovery",
        hr: "Pouzdan oporavak distribuiranih evenata",
      },
      description: {
        en: "A reviewed search description.",
        hr: "Pregledani opis za tražilice.",
      },
    },
  });

  const english = normalizePublishedProjects(overridden, "en");
  const croatian = normalizePublishedProjects(overridden, "hr");
  assert.equal(
    english?.entries[0]?.metadata.title,
    "Reliable distributed event recovery",
  );
  assert.equal(
    croatian?.entries[0]?.metadata.description,
    "Pregledani opis za tražilice.",
  );
});

test("Project structured data publishes only supported localized facts", () => {
  const content = normalizePublishedProjects(
    publishedProjectsQueryResult,
    "hr",
  );
  assert.ok(content);
  const structuredData = projectStructuredData(
    content,
    content.entries[0]!,
    "hr",
    new URL("https://portfolio.example"),
  );

  assert.equal(structuredData["@type"], "SoftwareSourceCode");
  assert.equal(structuredData.inLanguage, "hr");
  assert.equal(
    structuredData.url,
    "https://portfolio.example/hr/projekti/distributed-event-platform",
  );
  assert.equal(
    structuredData.codeRepository,
    "https://github.com/igrgin/event-platform",
  );
  assert.equal(structuredData.author.name, "Ivo Grgin");
});

test("static params and sitemap discovery include only publishable canonical Project slugs", () => {
  const content = normalizePublishedProjects(
    publishedProjectsQueryResult,
    "en",
  );
  assert.ok(content);
  assert.deepEqual(buildProjectStaticParams(content), [
    { slug: "distributed-event-platform" },
    { slug: "delivery-feedback-tooling" },
  ]);

  const unsafeFixture = structuredClone(publishedProjectsQueryResult);
  Object.assign(unsafeFixture.projects[1]!, { sensitive: true });
  const safeContent = normalizePublishedProjects(unsafeFixture, "en");
  assert.ok(safeContent);
  const urls = buildSitemap(
    {
      projects: safeContent,
      publishedDestinations: ["projects"],
    },
    new URL("https://portfolio.example"),
  ).map(({ url }) => url);

  assert.ok(
    urls.includes(
      "https://portfolio.example/en/projects/delivery-feedback-tooling",
    ),
  );
  assert.ok(
    urls.includes(
      "https://portfolio.example/hr/projekti/delivery-feedback-tooling",
    ),
  );
  assert.ok(!urls.some((url) => url.includes("distributed-event-platform")));
  assert.ok(!urls.includes("https://portfolio.example/en/about"));

  const robots = buildRobots(new URL("https://portfolio.example"));
  assert.equal(robots.sitemap, "https://portfolio.example/sitemap.xml");
  assert.deepEqual(robots.rules, {
    allow: "/",
    disallow: ["/api/preview", "/studio"],
    userAgent: "*",
  });
});

test("repository narrative sourcing stays disabled and cannot override Sanity content", () => {
  assert.doesNotMatch(
    PROJECTS_PAGE_QUERY,
    /repositoryNarrative|repositorySource|markdownSource/i,
  );

  const configuredSource = structuredClone(publishedProjectsQueryResult);
  Object.assign(configuredSource.projects[1]!, {
    repositoryNarrativeSource: {
      enabled: true,
      summary: {
        en: "Unreviewed repository summary.",
        hr: "Nepregledani sažetak iz repozitorija.",
      },
    },
  });
  const content = normalizePublishedProjects(configuredSource, "en");

  assert.equal(
    content?.entries[0]?.summary,
    "Observable and recoverable event processing.",
  );
});

test("localized App Router detail modules statically render the same canonical Project", async () => {
  const originalFetch = globalThis.fetch;
  const originalProjectId = process.env.SANITY_PROJECT_ID;
  const originalDataset = process.env.SANITY_DATASET;
  process.env.SANITY_PROJECT_ID = "portfolio";
  process.env.SANITY_DATASET = "production";
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ result: publishedProjectsQueryResult }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });

  try {
    const [EnglishProjectRoute, CroatianProjectRoute] = await Promise.all([
      import("../apps/web/app/(en)/en/projects/[slug]/page"),
      import("../apps/web/app/(hr)/hr/projekti/[slug]/page"),
    ]);
    const params = Promise.resolve({ slug: "distributed-event-platform" });
    const englishHtml = renderToStaticMarkup(
      await EnglishProjectRoute.default({ params }),
    );
    const croatianHtml = renderToStaticMarkup(
      await CroatianProjectRoute.default({ params }),
    );

    assert.equal(EnglishProjectRoute.dynamicParams, false);
    assert.equal(CroatianProjectRoute.dynamicParams, false);
    assert.match(englishHtml, /<h1>Distributed event platform<\/h1>/);
    assert.match(croatianHtml, /<h1>Platforma za distribuirane evente<\/h1>/);
    assert.match(
      englishHtml,
      /href="\/hr\/projekti\/distributed-event-platform"/,
    );
    assert.match(
      croatianHtml,
      /href="\/en\/projects\/distributed-event-platform"/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalProjectId === undefined) {
      delete process.env.SANITY_PROJECT_ID;
    } else {
      process.env.SANITY_PROJECT_ID = originalProjectId;
    }
    if (originalDataset === undefined) {
      delete process.env.SANITY_DATASET;
    } else {
      process.env.SANITY_DATASET = originalDataset;
    }
  }
});
