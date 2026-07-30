import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";

import {
  DIAGRAM_SOURCE_MAX_BYTES,
  validatePortfolioDiagram,
} from "../packages/content/src/diagrams";
import {
  PROJECT_DIAGRAMS_QUERY,
  normalizePublishedProjectDiagrams,
} from "../packages/content/src/projects";
import {
  DIAGRAM_RENDERER_VERSION,
  diagramAssetPublicPath,
  generatedSvgUpgradeFingerprint,
  injectDiagramAccessibility,
  renderDiagramAssets,
  validateGeneratedSvg,
  withRenderTimeout,
} from "../scripts/diagram-pipeline";

const validDiagram = {
  id: "delivery-flow",
  kind: "data-flow",
  source: {
    en: "flowchart LR\n  Browser --> API\n  API --> Store",
    hr: "flowchart LR\n  Preglednik --> API\n  API --> Spremište",
  },
  title: {
    en: "Delivery flow",
    hr: "Tijek isporuke",
  },
  caption: {
    en: "Requests pass through the API.",
    hr: "Zahtjevi prolaze kroz API.",
  },
  description: {
    en: "The browser sends a request to the API, which writes to the store.",
    hr: "Preglednik šalje zahtjev API-ju, koji zapisuje podatke u spremište.",
  },
} as const;

const validSequence = {
  ...validDiagram,
  id: "delivery-sequence",
  kind: "sequence",
  source: {
    en: "sequenceDiagram\n  Browser->>API: Request\n  alt Accepted\n    API-->>Browser: Response\n  else Rejected\n    API-->>Browser: Error\n  end",
    hr: "sequenceDiagram\n  Preglednik->>API: Zahtjev\n  alt Prihvaćeno\n    API-->>Preglednik: Odgovor\n  else Odbijeno\n    API-->>Preglednik: Pogreška\n  end",
  },
  title: {
    en: "Delivery sequence",
    hr: "Slijed isporuke",
  },
} as const;

test("only complete bilingual constrained flowcharts and sequences are approved", () => {
  assert.deepEqual(validatePortfolioDiagram(validDiagram), {
    ok: true,
    value: validDiagram,
  });
  assert.equal(
    validatePortfolioDiagram({
      ...validDiagram,
      kind: "sequence",
      source: {
        en: "sequenceDiagram\n  Browser->>API: Request\n  API-->>Browser: Response",
        hr: "sequenceDiagram\n  Preglednik->>API: Zahtjev\n  API-->>Preglednik: Odgovor",
      },
    }).ok,
    true,
  );
  for (const label of [
    "Image processor",
    "Import pipeline",
    "Link health",
    "Call service",
  ]) {
    assert.equal(
      validatePortfolioDiagram({
        ...validDiagram,
        source: {
          en: `flowchart LR\n  A[${label}] --> B[Safe output]`,
          hr: `flowchart LR\n  A[${label}] --> B[Siguran izlaz]`,
        },
      }).ok,
      true,
      label,
    );
  }

  const rejectedSources = [
    "classDiagram\n  Animal <|-- Duck",
    "flowchart LR\n  %%{init: {'theme': 'dark'}}%%\n  A --> B",
    "flowchart LR\n  A[<b>Unsafe</b>] --> B",
    'flowchart LR\n  click A href "https://example.com"',
    "flowchart LR\n  A --> B\n  classDef danger fill:red",
    "---\ntitle: Unsafe\n---\nflowchart LR\n  A --> B",
    "flowchart LR\n  participant Browser",
  ];

  for (const source of rejectedSources) {
    const result = validatePortfolioDiagram({
      ...validDiagram,
      source: { en: source, hr: source },
    });
    assert.equal(result.ok, false, source);
  }

  const oversized = `flowchart LR\n  A[${"č".repeat(
    DIAGRAM_SOURCE_MAX_BYTES,
  )}] --> B`;
  assert.equal(
    validatePortfolioDiagram({
      ...validDiagram,
      source: { en: oversized, hr: oversized },
    }).ok,
    false,
  );
});

test("only published, safe, full Project diagrams enter the build pipeline", () => {
  const source = [
    {
      _id: "project.delivery",
      _type: "project",
      diagrams: [validDiagram],
      publishSafe: true,
      sensitive: false,
      slug: "delivery-platform",
    },
  ];
  assert.deepEqual(normalizePublishedProjectDiagrams(source), [
    {
      diagram: validDiagram,
      projectSlug: "delivery-platform",
    },
  ]);
  assert.match(PROJECT_DIAGRAMS_QUERY, /!\(_id in path\("drafts\.\*\*"\)\)/);
  assert.match(PROJECT_DIAGRAMS_QUERY, /publishSafe == true/);
  assert.match(PROJECT_DIAGRAMS_QUERY, /sensitive != true/);
  assert.match(PROJECT_DIAGRAMS_QUERY, /disclosureLevel == "full"/);

  const unsafe = structuredClone(source);
  unsafe[0]!.diagrams[0]!.source.en =
    'flowchart LR\n  click A href "https://example.com"';
  assert.equal(normalizePublishedProjectDiagrams(unsafe), null);

  const draft = structuredClone(source);
  draft[0]!._id = "drafts.project.delivery";
  assert.equal(normalizePublishedProjectDiagrams(draft), null);

  const duplicate = structuredClone(source);
  duplicate[0]!.diagrams.push(structuredClone(validDiagram));
  assert.equal(normalizePublishedProjectDiagrams(duplicate), null);
});

test("renderer-owned accessibility metadata is injected without changing grammar", () => {
  const source = injectDiagramAccessibility(validDiagram, "hr");

  assert.match(source, /^flowchart LR\n/);
  assert.match(source, /\n\s+accTitle: Tijek isporuke\n/);
  assert.match(
    source,
    /\n\s+accDescr: Preglednik šalje zahtjev API-ju, koji zapisuje podatke u spremište\.\n/,
  );
  assert.match(source, /Preglednik --> API/);
});

test("generated SVG is parsed and rejects every prohibited output construct", () => {
  const safeSvg = `<svg xmlns="http://www.w3.org/2000/svg" role="graphics-document">
    <title>Delivery flow</title>
    <desc>The browser sends a request to the API, which writes to the store.</desc>
    <defs><marker id="arrow"><path d="M0 0 L10 5 L0 10 z"/></marker></defs>
    <path d="M0 0 L10 10" marker-end="url(#arrow)"/>
    <text>Browser</text>
  </svg>`;
  assert.doesNotThrow(() =>
    validateGeneratedSvg(safeSvg, {
      description:
        "The browser sends a request to the API, which writes to the store.",
      title: "Delivery flow",
    }),
  );

  const prohibited = [
    `<svg><title>x</title><desc>y</desc><script>alert(1)</script></svg>`,
    `<svg><title>x</title><desc>y</desc><foreignObject/></svg>`,
    `<svg onload="alert(1)"><title>x</title><desc>y</desc></svg>`,
    `<svg xmlns:evil="urn:evil" evil:onload="alert(1)"><title>x</title><desc>y</desc></svg>`,
    `<svg><title>x</title><desc>y</desc><a href="#target"><text>link</text></a></svg>`,
    `<svg><title>x</title><desc>y</desc><link href="styles.css"/></svg>`,
    `<svg><title>x</title><desc>y</desc><image href="https://example.com/x.png"/></svg>`,
    `<svg><title>x</title><desc>y</desc><use href="sprite.svg#icon"/></svg>`,
    `<svg><title>x</title><desc>y</desc><style>@import url("https://example.com/x.css");</style></svg>`,
    `<svg><title>x</title><desc>y</desc><path style="fill:url(data:image/svg+xml,x)"/></svg>`,
    `<!DOCTYPE svg SYSTEM "https://example.com/evil.dtd"><svg><title>x</title><desc>y</desc></svg>`,
    `<svg><title>Wrong</title><desc>Wrong</desc></svg>`,
    `<not-svg><title>x</title><desc>y</desc></not-svg>`,
  ];

  for (const svg of prohibited) {
    assert.throws(
      () =>
        validateGeneratedSvg(svg, {
          description: "Expected description",
          title: "Expected title",
        }),
      undefined,
      svg,
    );
  }
});

test("the exact-pinned renderer produces deterministic bilingual light and dark assets", async () => {
  const publicDirectory = await mkdtemp(
    join(tmpdir(), "portfolio-diagram-render-"),
  );

  try {
    const packageJson = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8"),
    ) as { devDependencies: Record<string, string> };
    assert.equal(DIAGRAM_RENDERER_VERSION, "11.16.0");
    assert.equal(
      packageJson.devDependencies["@mermaid-js/mermaid-cli"],
      DIAGRAM_RENDERER_VERSION,
    );
    const upgradeGolden = JSON.parse(
      await readFile(
        new URL("./fixtures/diagram-renderer-golden.json", import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;

    const input = [
      {
        diagram: validDiagram,
        projectSlug: "distributed-event-platform",
      },
      {
        diagram: validSequence,
        projectSlug: "distributed-event-platform",
      },
    ] as const;
    const first = await renderDiagramAssets(input, publicDirectory);
    const firstContents = await Promise.all(
      first.flatMap(({ assets, diagramId }) =>
        assets.map(async ({ locale, publicPath, theme }) => {
          const diagram =
            diagramId === validDiagram.id ? validDiagram : validSequence;
          const svg = await readFile(
            join(publicDirectory, publicPath.replace(/^\//, "")),
            "utf8",
          );
          validateGeneratedSvg(svg, {
            description: diagram.description[locale],
            title: diagram.title[locale],
          });
          return { locale, publicPath, svg, theme };
        }),
      ),
    );

    assert.deepEqual(
      firstContents.map(({ publicPath }) => publicPath),
      [
        "/generated/diagrams/distributed-event-platform/delivery-flow/en-light.svg",
        "/generated/diagrams/distributed-event-platform/delivery-flow/en-dark.svg",
        "/generated/diagrams/distributed-event-platform/delivery-flow/hr-light.svg",
        "/generated/diagrams/distributed-event-platform/delivery-flow/hr-dark.svg",
        "/generated/diagrams/distributed-event-platform/delivery-sequence/en-light.svg",
        "/generated/diagrams/distributed-event-platform/delivery-sequence/en-dark.svg",
        "/generated/diagrams/distributed-event-platform/delivery-sequence/hr-light.svg",
        "/generated/diagrams/distributed-event-platform/delivery-sequence/hr-dark.svg",
      ],
    );
    assert.match(firstContents[2]!.svg, /Spremište/);
    for (const { publicPath, svg } of firstContents) {
      assert.equal(
        generatedSvgUpgradeFingerprint(svg),
        upgradeGolden[publicPath],
        publicPath,
      );
    }
    assert.equal(
      diagramAssetPublicPath(
        "distributed-event-platform",
        "delivery-flow",
        "hr",
        "dark",
      ),
      firstContents[3]!.publicPath,
    );

    const second = await renderDiagramAssets(input, publicDirectory);
    const secondContents = await Promise.all(
      second.flatMap(({ assets }) =>
        assets.map(({ publicPath }) =>
          readFile(
            join(publicDirectory, publicPath.replace(/^\//, "")),
            "utf8",
          ),
        ),
      ),
    );
    assert.deepEqual(
      secondContents,
      firstContents.map(({ svg }) => svg),
    );

    await assert.rejects(
      renderDiagramAssets(input, publicDirectory, 1),
      /timed out after 1 ms/,
    );
    const preservedContents = await Promise.all(
      second.flatMap(({ assets }) =>
        assets.map(({ publicPath }) =>
          readFile(
            join(publicDirectory, publicPath.replace(/^\//, "")),
            "utf8",
          ),
        ),
      ),
    );
    assert.deepEqual(preservedContents, secondContents);

    await assert.rejects(
      renderDiagramAssets(
        [
          {
            diagram: {
              ...validDiagram,
              source: {
                en: 'flowchart LR\n  click A href "https://example.com"',
                hr: validDiagram.source.hr,
              },
            },
            projectSlug: "distributed-event-platform",
          },
        ],
        publicDirectory,
      ),
      /Invalid distributed-event-platform\/delivery-flow/,
    );
    const preservedAfterInvalidDraft = await Promise.all(
      second.flatMap(({ assets }) =>
        assets.map(({ publicPath }) =>
          readFile(
            join(publicDirectory, publicPath.replace(/^\//, "")),
            "utf8",
          ),
        ),
      ),
    );
    assert.deepEqual(preservedAfterInvalidDraft, secondContents);
  } finally {
    await rm(publicDirectory, { force: true, recursive: true });
  }
});

test("the timeout helper rejects stalled renderer work", async () => {
  await assert.rejects(
    withRenderTimeout(new Promise<never>(() => undefined), 5),
    /timed out after 5 ms/,
  );
});
