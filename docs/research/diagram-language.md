# Diagram language and rendering pipeline

Date: 2026-07-28

## Decision

Use **Mermaid** as the portfolio's one canonical text-authored diagram language.

For the first release, accept only:

- `sequenceDiagram` for interactions;
- `flowchart` for system architecture, deployment views, and data-flow diagrams.

Do not use Mermaid's `architecture-beta` syntax in the launch contract yet. It is explicitly versioned as a newer `v11.1.0+` feature and still uses a `-beta` grammar keyword. It can be reconsidered after a visual prototype, without changing the canonical language. Mermaid documents flowcharts as nodes and directed edges with subgraphs, which is sufficient for the portfolio's high-level architecture, deployment, and data-flow views; it has a dedicated sequence-diagram grammar for ordered interactions. [Mermaid flowchart documentation](https://mermaid.js.org/syntax/flowchart.html) [Mermaid sequence-diagram documentation](https://mermaid.js.org/syntax/sequenceDiagram.html) [Mermaid architecture documentation](https://mermaid.js.org/syntax/architecture.html)

Render every diagram to static SVG during the content/build pipeline. Ship neither Mermaid nor a diagram renderer to visitors, and do not call a public rendering service.

## Why Mermaid wins here

| Criterion | Mermaid | PlantUML | Portfolio consequence |
| --- | --- | --- | --- |
| Architecture | The newer architecture grammar models services, groups, edges, and junctions; mature flowcharts can express the required high-level system views. [Architecture docs](https://mermaid.js.org/syntax/architecture.html) [Flowchart docs](https://mermaid.js.org/syntax/flowchart.html) | Dedicated component and deployment grammars provide richer UML vocabulary and fine layout control. [Component docs](https://plantuml.com/component-diagram) [Deployment docs](https://plantuml.com/deployment-diagram) | PlantUML is stronger for formal UML, but the portfolio needs explanatory diagrams rather than engineering specifications. Mermaid's constrained flowchart subset is enough and easier to maintain. |
| Sequence | Dedicated sequence grammar with participants, messages, grouping, activation, loops, and alternatives. [Mermaid sequence docs](https://mermaid.js.org/syntax/sequenceDiagram.html) | Mature dedicated sequence grammar with extensive presentation controls. [PlantUML sequence docs](https://plantuml.com/sequence-diagram) | Both meet the requirement. |
| Deployment | No dedicated UML deployment grammar in the selected stable subset; use a flowchart with subgraphs for zones/nodes and labelled edges for protocols or flows. The newer architecture grammar is also explicitly intended for cloud and CI/CD deployments. [Mermaid architecture docs](https://mermaid.js.org/syntax/architecture.html) | Dedicated deployment grammar includes nodes, components, databases, queues, storage, and other element types. [PlantUML deployment docs](https://plantuml.com/deployment-diagram) | PlantUML wins on notation depth. That depth is not worth a second toolchain for a small set of public, high-level diagrams. |
| Data flow | Flowchart nodes, directed edges, labels, shapes, and subgraphs map directly to sources, processes, stores, boundaries, and flows. [Mermaid flowchart docs](https://mermaid.js.org/syntax/flowchart.html) | Component/deployment diagrams can express flows, but PlantUML's official supported-types list does not identify a first-class data-flow-diagram grammar. [PlantUML repository](https://github.com/plantuml/plantuml#supported-diagram-types) | Neither requires a second notation. Mermaid flowcharts are the simpler house style. |
| Repository Markdown | GitHub natively renders fenced `mermaid` blocks in Markdown files, issues, discussions, pull requests, and wikis. [GitHub diagram documentation](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams) | PlantUML's own repository points users to a browser extension and an open GitHub feature request rather than native GitHub rendering. [PlantUML repository](https://github.com/plantuml/plantuml) | A repository-authored project narrative can be previewed on GitHub and reused by the site with no dialect conversion. |
| CMS authoring | Mermaid is plain text. Sanity can store it in a normal text field or its official `@sanity/code-input`, which stores source in a `code` property and permits additional editor modes. [Sanity Code Input](https://www.sanity.io/plugins/code-input) | PlantUML is equally storable as plain text. Syntax highlighting would also require configuring an editor mode. | Storage is a draw. Mermaid's Markdown continuity is the differentiator. |
| Build-time SVG | The official Node CLI accepts Mermaid source and emits SVG; it can also extract Mermaid fences from Markdown. It supports local installation, Docker/Podman, and a Node API. [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli) | The Java CLI emits SVG with `-tsvg`. [PlantUML SVG docs](https://plantuml.com/svg) | Both are zero-license-cost and work offline. |
| Build dependencies | `@mermaid-js/mermaid-cli` belongs in the existing Node toolchain, but it has Puppeteer as a peer dependency and therefore needs a compatible headless browser in CI. [Mermaid CLI package](https://github.com/mermaid-js/mermaid-cli/blob/master/package.json) | Local rendering requires Java 11 or later; Graphviz is additionally required for some diagram types. [PlantUML setup guide](https://plantuml.com/starting) | Mermaid adds a heavy build-only browser dependency, while PlantUML adds a second language runtime and sometimes a native layout dependency. Mermaid is the smaller operational mismatch for a React/Next.js project. |
| Theming | Mermaid offers built-in light/dark-oriented themes and a customizable `base` theme through theme variables. [Mermaid theming docs](https://mermaid.js.org/config/theming.html) | PlantUML includes themes and extensive `skinparam` color/font controls. [PlantUML themes](https://plantuml.com/theme) [PlantUML skin parameters](https://plantuml.com/skinparam) | Both can match the TUI visual system. Mermaid makes two build-time theme variants straightforward in the existing CSS/JavaScript ecosystem. |
| Accessibility | Mermaid inserts `aria-roledescription`; `accTitle` and `accDescr` produce SVG `<title>`, `<desc>`, `aria-labelledby`, and `aria-describedby` for all diagram types. [Mermaid accessibility docs](https://mermaid.js.org/config/accessibility.html) | PlantUML can add SVG `<title>` and `<desc>` with `svgTitle` and `svgDesc`. [PlantUML SVG docs](https://plantuml.com/svg) | Both can carry metadata. Mermaid documents a more complete default ARIA contract, but the website must still provide HTML-level alternatives. |
| Security | Mermaid's default `strict` security level encodes HTML labels and disables click functionality. [Mermaid security-level schema](https://mermaid.js.org/config/schema-docs/config-properties-securitylevel.html) | PlantUML can read local files and URLs in its default `LEGACY` profile. `SANDBOX` blocks local files, URLs, and allowlists, but must be selected explicitly. [PlantUML security profiles](https://plantuml.com/security) | Both need a locked-down pipeline. Mermaid begins from a safer default and can be reduced to non-HTML, non-interactive output. |
| Hosting/runtime | Next.js static export produces HTML/CSS/JS assets in `out` and can run build-time data fetching; Cloudflare Pages accepts a custom build command and deploys that output directory. [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports) [Cloudflare Pages static Next.js guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/) [Cloudflare Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/) | Static PlantUML output is equally hostable, but Java/Graphviz must be available before the Next.js build. | Pre-rendered SVG makes either language host-neutral. Mermaid keeps all application integration in the Node pipeline. |
| Maintenance | Mermaid source works in GitHub and the site; the renderer can be pinned in the JavaScript lockfile. The CLI's Node API is explicitly not covered by semantic versioning. [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli#use-nodejs-api) | PlantUML is mature and actively released, but requires separately pinning a JAR/runtime and possibly Graphviz. | Invoke the stable CLI executable, not its Node API. Exact version pinning and fixture tests contain upgrade risk. |

PlantUML remains the better choice if the portfolio later requires formal UML deployment semantics, highly customized diagram layout, or reuse of an existing PlantUML corpus. None of those is a current requirement.

## Canonical authoring contract

Treat a diagram as a structured content object, not as arbitrary markup:

```ts
type PortfolioDiagram = {
  id: string
  kind: "architecture" | "deployment" | "data-flow" | "sequence"
  source: {
    en: string
    hr: string
  }
  title: {
    en: string
    hr: string
  }
  caption: {
    en: string
    hr: string
  }
  description: {
    en: string
    hr: string
  }
}
```

Rules:

1. `title`, `caption`, `description`, and both localized sources are required before publication. The two source strings may be identical when every visible technical label is language-neutral.
2. `description` is a prose equivalent of the relationships and sequence communicated visually, not merely a restatement of the caption.
3. The source is plain UTF-8 Mermaid. Do not allow an editor to upload raw SVG or HTML into this field.
4. Only `flowchart` and `sequenceDiagram` top-level grammars are accepted. `kind: "sequence"` must use `sequenceDiagram`; every other initial kind must use `flowchart`.
5. Reject Mermaid frontmatter/directives, `click` actions, hyperlinks, HTML labels, icon-pack registration, remote assets, and includes. Theme and security configuration are owned by the renderer, never by content.
6. Apply conservative source-size and render-time limits. A suitable starting point is 50 KiB of source and 10 seconds per variant; tune only from measured legitimate diagrams.
7. Repository Markdown ingestion may extract fenced `mermaid` blocks, but it must convert each block into the same structured object and require CMS/site metadata for locale, title, caption, and description. GitHub's native preview is convenience, not the production renderer.

This contract works with Sanity as either a multiline `text` field or an official `@sanity/code-input` field. Syntax highlighting is optional; correctness is determined by the pinned build renderer. It also works unchanged if the CMS research selects a different provider.

## Rendering contract

### Build stages

1. Fetch only published content for production, or the authenticated draft dataset for preview.
2. Validate the structured object and grammar allowlist before invoking Mermaid.
3. Inject the localized `accTitle` and `accDescr` from the structured fields. Authors should not maintain duplicate accessibility text inside the source.
4. Render **four deterministic assets per diagram**: English light, English dark, Croatian light, and Croatian dark. Use the official `mmdc` executable with an exact version pinned in the lockfile or an exact-version container image. Do not use the CLI's Node API because its own documentation says that API is not covered by semantic versioning. [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli)
5. Use renderer-owned configuration with `securityLevel: "strict"`, SVG text labels (`htmlLabels: false`), a fixed font stack, and separate light/dark `base` theme-variable files. Do not load fonts, icons, CSS, or other resources from the network.
6. Post-validate the SVG as XML and reject output containing `script`, `foreignObject`, event-handler attributes, links, external URLs, data URLs, or CSS imports. Keep only the elements and attributes emitted by approved fixture outputs. Optimization is optional and must happen after validation.
7. Name output by content hash, for example `public/generated/diagrams/<id>/<locale>-<theme>-<hash>.svg`. Remove unreferenced generated assets during a clean build.
8. Fail the preview/production build on an invalid source, missing locale, render timeout, accessibility omission, forbidden output, or nondeterministic fixture change. Never silently keep a stale diagram.
9. Run `next build` only after diagram generation. The resulting static assets work on Vercel, Cloudflare Pages, GitHub Pages, or any static host. If a provider's build image cannot run headless Chromium reliably, run the diagram and Next.js build in CI using the versioned Mermaid CLI container, then upload the static `out` artifact. This avoids a hosting-provider dependency.

No renderer, JavaScript diagram library, public rendering endpoint, or remote diagram content is required at request time. This gives visitors static-cache performance and prevents diagram source from becoming an in-browser code path.

### React presentation

Render the active localized/theme asset as an external image inside a normal HTML figure:

```tsx
<figure aria-describedby={`${id}-description`}>
  <img src={activeAssetUrl} alt={title[locale]} />
  <figcaption>{caption[locale]}</figcaption>
  <p id={`${id}-description`}>{description[locale]}</p>
</figure>
```

The final component may visually collapse the long description behind an accessible “Diagram description” disclosure, but it must remain keyboard-operable and available without relying on the SVG accessibility tree. Loading SVG through `<img>` rather than injecting it as HTML preserves a stronger content boundary. The selected theme asset must respond to the site's remembered theme choice, not only `prefers-color-scheme`.

For narrow screens, keep text at normal reading size and place the image in a labelled horizontal-scroll container or offer an enlarge action; do not scale a dense diagram until its text becomes unreadable.

### Verification fixtures

Keep one small fixture for each supported use:

- architecture with system boundary/subgraphs;
- deployment with runtime zones and protocol-labelled edges;
- data flow with sources, processes, stores, and direction;
- sequence with success and failure branches;
- Croatian labels with diacritics;
- malicious/forbidden source cases.

CI must verify that all fixtures render in both themes, contain the expected accessible title and description, contain no forbidden SVG constructs, and remain within an agreed visual size. Review generated diffs deliberately whenever the pinned Mermaid version changes.

## Cost and operational impact

The language, CLI, and generated assets have no recurring service fee. Rendering consumes only build minutes and storage already required by the site. Static SVG is cacheable and adds no server, function, database, or client-side rendering cost. A provider-hosted Mermaid or PlantUML service is therefore unnecessary and should not be introduced.

The trade-off is build weight: Mermaid CLI brings Puppeteer/headless Chromium. Isolating it to one reproducible CI stage and caching dependencies keeps that cost out of the visitor experience. PlantUML would be lighter in some CI environments, but would introduce Java and potentially Graphviz, while losing GitHub-native Markdown preview and closer alignment with the React toolchain.

## Revisit triggers

Reopen this decision only if:

- a project requires formal UML deployment notation that the constrained flowchart style cannot communicate;
- Mermaid's output cannot meet the approved TUI visual prototype after theme-variable and CSS experimentation;
- the selected free build environment cannot run the pinned CLI/container within its limits;
- accessibility testing shows a systemic issue that the HTML figure/description layer cannot solve; or
- the repository-ingestion decision mandates an existing PlantUML corpus.

Absent one of those triggers, supporting both languages would double validation, rendering, theming, accessibility, and maintenance paths without adding first-release value.
