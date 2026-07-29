import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SkillsPageView } from "../apps/web/components/skills-page-view";
import { buildSkillsMetadata } from "../apps/web/lib/skills-route";
import {
  normalizePublishedSkills,
  SKILLS_PAGE_QUERY,
} from "../packages/content/src/skills";
import { validateSkillEvidence } from "../apps/studio/schemaTypes/references";

const approvedSkillCategories = [
  "backendEngineering",
  "distributedDataSystems",
  "developerTooling",
  "aiAndMachineLearning",
  "frontendEngineering",
  "platformsAndOperations",
] as const;

const publishedSkillsQueryResult = {
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
  skills: [
    {
      _id: "skill.frontend",
      _type: "skill",
      canonicalName: "Accessible frontend systems",
      displayName: {
        en: "Accessible frontend systems",
        hr: "Pristupačni frontend sustavi",
      },
      category: "frontendEngineering",
      capability: {
        en: "Build resilient interfaces around semantic platform primitives.",
        hr: "Gradim otporna sučelja na semantičkim platformskim osnovama.",
      },
      icon: "browser",
      documentationUrl: "https://developer.mozilla.org/",
      order: 20,
      experienceEvidence: [
        {
          _id: "experience.current",
          _type: "experience",
          employerPresentation: "publicEmployer",
          employer: "Public Systems",
          role: {
            en: "Senior software engineer",
            hr: "Viši softverski inženjer",
          },
        },
      ],
      educationEvidence: [],
      projectEvidence: [],
    },
    {
      _id: "skill.backend",
      _type: "skill",
      canonicalName: "Backend engineering",
      displayName: {
        en: "Production backend engineering",
        hr: "Produkcijsko backend inženjerstvo",
      },
      category: "backendEngineering",
      capability: {
        en: "Design services with explicit domain and reliability boundaries.",
        hr: "Projektiram servise s jasnim domenskim granicama i granicama pouzdanosti.",
      },
      evidence: {
        en: "Applied to publish-safe production event-processing work.",
        hr: "Primijenjeno na javno opisiv rad sa sustavima za obradu događaja.",
      },
      order: 10,
      experienceEvidence: [],
      educationEvidence: [],
      projectEvidence: [],
    },
  ],
};

test("Skill authoring exposes only the approved evidence-backed contract", () => {
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
  const skill = schema.find(({ name }) => name === "skill");
  const project = schema.find(({ name }) => name === "project");

  assert.ok(skill);
  assert.ok(project);
  assert.equal(skill.type, "document");
  assert.deepEqual(
    Object.keys(skill.attributes)
      .filter((name) => !name.startsWith("_"))
      .sort(),
    [
      "canonicalName",
      "capability",
      "category",
      "displayName",
      "documentationUrl",
      "evidence",
      "icon",
      "order",
    ],
  );

  const category = skill.attributes.category as {
    value?: { of?: Array<{ value?: string }> };
  };
  assert.deepEqual(
    category.value?.of?.map(({ value }) => value),
    approvedSkillCategories,
  );

  const serializedContract = JSON.stringify(skill);
  for (const prohibited of [
    "percentage",
    "proficiency",
    "level",
    "stars",
    "endorsements",
    "yearsOfExperience",
  ]) {
    assert.doesNotMatch(serializedContract, new RegExp(prohibited, "i"));
  }
  assert.ok(
    Object.prototype.hasOwnProperty.call(project.attributes, "skills"),
    "Project evidence must be authorable through a strong Skill reference.",
  );
});

test("published Skills localize evidence and follow explicit editorial order", () => {
  const english = normalizePublishedSkills(publishedSkillsQueryResult, "en");
  const croatian = normalizePublishedSkills(publishedSkillsQueryResult, "hr");

  assert.ok(english);
  assert.ok(croatian);
  assert.deepEqual(
    english.entries.map(({ canonicalName }) => canonicalName),
    ["Backend engineering", "Accessible frontend systems"],
  );
  assert.equal(english.entries[0]?.name, "Production backend engineering");
  assert.equal(
    english.entries[0]?.evidence[0]?.label,
    "Applied to publish-safe production event-processing work.",
  );
  assert.equal(english.entries[0]?.icon, undefined);
  assert.equal(
    croatian.entries[1]?.name,
    "Pristupačni frontend sustavi",
  );
  assert.deepEqual(croatian.entries[1]?.evidence[0], {
    kind: "experience",
    label: "Viši softverski inženjer — Public Systems",
  });
  assert.equal(
    english.entries[1]?.documentationUrl,
    "https://developer.mozilla.org/",
  );
});

test("published Education and Project references provide localized Skill evidence", () => {
  const referenced = structuredClone(publishedSkillsQueryResult);
  referenced.skills.push(
    {
      _id: "skill.data",
      _type: "skill",
      canonicalName: "Distributed data systems",
      category: "distributedDataSystems",
      capability: {
        en: "Design event-driven data flows with explicit delivery semantics.",
        hr: "Projektiram tokove podataka vođene događajima s jasnom semantikom isporuke.",
      },
      order: 30,
      experienceEvidence: [],
      educationEvidence: [
        {
          _id: "education.master",
          _type: "education",
          institution: {
            en: "University of Zagreb",
            hr: "Sveučilište u Zagrebu",
          },
          qualification: {
            en: "Master of Science",
            hr: "Magistar inženjer",
          },
        },
      ],
      projectEvidence: [],
    },
    {
      _id: "skill.tooling",
      _type: "skill",
      canonicalName: "Developer tooling",
      category: "developerTooling",
      capability: {
        en: "Build feedback loops that make safe delivery routine.",
        hr: "Gradim povratne sprege koje sigurnu isporuku čine rutinskom.",
      },
      order: 40,
      experienceEvidence: [],
      educationEvidence: [],
      projectEvidence: [
        {
          _id: "project.delivery",
          _type: "project",
          title: {
            en: "Delivery observability",
            hr: "Praćenje isporuke",
          },
          slug: "delivery-observability",
        },
      ],
    },
  );

  const content = normalizePublishedSkills(referenced, "hr");
  assert.ok(content);
  assert.deepEqual(content.entries[2]?.evidence, [
    {
      kind: "education",
      label: "Magistar inženjer — Sveučilište u Zagrebu",
    },
  ]);
  assert.deepEqual(content.entries[3]?.evidence, [
    { kind: "project", label: "Praćenje isporuke" },
  ]);
});

test("invalid categories, evidence, references, localization, icons, links, and metrics never publish", () => {
  const expectOnlyFrontend = (
    mutate: (skill: (typeof publishedSkillsQueryResult.skills)[number]) => void,
  ) => {
    const invalid = structuredClone(publishedSkillsQueryResult);
    mutate(invalid.skills[1]!);
    assert.deepEqual(
      normalizePublishedSkills(invalid, "en")?.entries.map(
        ({ canonicalName }) => canonicalName,
      ),
      ["Accessible frontend systems"],
    );
  };

  expectOnlyFrontend((skill) => {
    skill.category = "leadership" as never;
  });
  expectOnlyFrontend((skill) => {
    Reflect.deleteProperty(skill, "evidence");
  });
  expectOnlyFrontend((skill) => {
    skill.capability.hr = "";
  });
  expectOnlyFrontend((skill) => {
    Object.assign(skill, { icon: "unreviewed-logo" });
  });
  expectOnlyFrontend((skill) => {
    Object.assign(skill, { documentationUrl: "javascript:alert(1)" });
  });
  for (const unsupportedClaim of [
    "Expert level",
    "95%",
    "5 stars",
    "Level 5",
    "senior level",
    "proficiency: high",
    "Endorsements: 12",
    "12 years of experience",
  ]) {
    expectOnlyFrontend((skill) => {
      skill.capability.en = unsupportedClaim;
    });
  }

  const invalidReference = structuredClone(publishedSkillsQueryResult);
  invalidReference.skills[0]!.experienceEvidence[0]!._id =
    "drafts.experience.current";
  assert.deepEqual(
    normalizePublishedSkills(invalidReference, "en")?.entries.map(
      ({ canonicalName }) => canonicalName,
    ),
    ["Backend engineering"],
  );
});

test("Skill authoring requires a scoped note or an incoming published evidence reference", async () => {
  const queriedIds: string[] = [];
  const context = {
    getClient: () => ({
      fetch: async (_query: string, parameters: { skillId: string }) => {
        queriedIds.push(parameters.skillId);
        return parameters.skillId === "skill.referenced" ? 1 : 0;
      },
    }),
  };

  assert.equal(
    await validateSkillEvidence(
      {
        _id: "drafts.skill.note",
        evidence: { en: "Public evidence.", hr: "Javni dokaz." },
      },
      context as never,
    ),
    true,
  );
  assert.equal(queriedIds.length, 0);
  assert.equal(
    await validateSkillEvidence(
      { _id: "drafts.skill.referenced" },
      context as never,
    ),
    true,
  );
  assert.match(
    String(
      await validateSkillEvidence(
        { _id: "drafts.skill.unsupported" },
        context as never,
      ),
    ),
    /Add one precise scoped evidence note/,
  );
  assert.deepEqual(queriedIds, ["skill.referenced", "skill.unsupported"]);
});

test("the Skills query selects only published allowlisted fields and strong evidence references", () => {
  assert.match(SKILLS_PAGE_QUERY, /_type == "skill"/);
  assert.match(SKILLS_PAGE_QUERY, /!\(_id in path\("drafts\.\*\*"\)\)/);
  assert.match(SKILLS_PAGE_QUERY, /"experienceEvidence": \*\[/);
  assert.match(SKILLS_PAGE_QUERY, /"educationEvidence": \*\[/);
  assert.match(SKILLS_PAGE_QUERY, /"projectEvidence": \*\[/);
  assert.match(SKILLS_PAGE_QUERY, /references\(\^\._id\)/);
  assert.doesNotMatch(
    SKILLS_PAGE_QUERY,
    /percentage|proficiency|level|stars|endorsements|yearsOfExperience/i,
  );
});

test("the rendered Skills page preserves editorial order, links, evidence, and icon fallback", () => {
  const content = normalizePublishedSkills(publishedSkillsQueryResult, "hr");
  assert.ok(content);

  const html = renderToStaticMarkup(
    <SkillsPageView content={content} locale="hr" />,
  );

  assert.match(html, /aria-current="page" href="\/hr\/vjestine"/);
  assert.ok(
    html.indexOf("Produkcijsko backend inženjerstvo") <
      html.indexOf("Pristupačni frontend sustavi"),
  );
  assert.match(html, /Backend engineering/);
  assert.match(html, /Frontend inženjerstvo/);
  assert.match(html, /class="skill-icon-fallback"[^>]*>&lt;\/&gt;/);
  assert.match(html, /data-skill-icon="browser"/);
  assert.match(html, /href="https:\/\/developer\.mozilla\.org\/"/);
  assert.match(html, /href="\/hr\/iskustvo"/);
  assert.doesNotMatch(html, /expert|95%|years of experience/i);
});

test("Skills metadata exposes canonical English and Croatian routes", () => {
  const content = normalizePublishedSkills(publishedSkillsQueryResult, "en");
  assert.ok(content);

  const metadata = buildSkillsMetadata(
    content,
    "en",
    new URL("https://portfolio.example"),
  );
  assert.equal(
    metadata.alternates?.canonical,
    "https://portfolio.example/en/skills",
  );
  assert.deepEqual(metadata.alternates?.languages, {
    en: "https://portfolio.example/en/skills",
    hr: "https://portfolio.example/hr/vjestine",
    "x-default": "https://portfolio.example/en/skills",
  });
  assert.equal(metadata.openGraph?.title, "Skills — Ivo Grgin");
});
