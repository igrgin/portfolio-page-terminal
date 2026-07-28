# Repository-authored project narratives

## Decision

Repository-authored project narratives are **technically viable, but should be a later enhancement rather than a first-release requirement**.

The first release should author project case studies and media in the CMS. Its content model should reserve an optional repository source so this capability can be added without a migration. Deferring it keeps the first release's bilingual draft/preview/publish workflow coherent and avoids coupling that workflow to GitHub and the still-undecided hosting/CMS stack.

When added, GitHub should own only the long-form narrative body for a selected locale and revision. The CMS must remain authoritative for whether a project exists or is public, ordering, featured status, localized title and summary, slugs, metadata, repository/demo links, preview state, the published Git revision, and locale-specific fallback bodies.

## Why it is viable

GitHub's repository contents API can return a file at a branch, tag, or commit reference, either as encoded content or with the raw media type. Public repository content can be fetched without authentication; private content requires a token with repository `Contents: read` permission. The endpoint returns a content SHA and has explicit `403` and `404` outcomes. Files up to 1 MB have full endpoint support, files from 1–100 MB require raw/object media types, and files above 100 MB are unsupported. Download URLs expire and are intended for one-time use, so they should not be persisted as asset URLs. [GitHub: Repository contents API](https://docs.github.com/en/rest/repos/contents#get-repository-content)

GitHub also defines repository-relative links and image paths: they are relative to the Markdown file, while paths beginning with `/` are relative to the repository root. That provides a predictable authoring convention that an importer can reproduce. [GitHub: Relative links](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github#relative-links)

The integration is small enough to be reasonable after the main stack is selected: resolve a repository and revision, fetch two optional Markdown files, parse a deliberately limited GFM subset, download approved relative assets, validate everything, and feed the result into the same project-page renderer used by CMS-authored bodies.

## Why it should not be in the first release

The fetch itself is simple; reliable publishing semantics are not.

1. A source-repository push is outside the CMS. Automatically publishing that push would bypass the agreed draft, preview, and explicit Publish workflow.
2. The portfolio requires English/Croatian parity. A single repository file does not supply that, and GitHub has no portfolio-specific localization model.
3. A static site cannot notice upstream changes by itself. Every source repository would need a secure webhook or workflow integration, or the portfolio would need polling. The appropriate mechanism depends on the eventual host and CMS.
4. A repository can become private, be renamed, be transferred, delete the expected file, or disappear. None of those should blank or break an already-published project page.
5. Rendering repository Markdown and media creates a new untrusted-content boundary even when the current author owns every repository.

The CMS already satisfies the user need—editable rich project pages without changing portfolio code—so the GitHub importer is convenience, not a prerequisite. Shipping it later also lets the implementation be tested against the chosen CMS's preview and revision model rather than designing an abstract synchronization layer now.

## Required behavior by repository state

| State | Required importer behavior |
| --- | --- |
| Public repository | Fetch at build/preview time through the GitHub API. Do not fetch from each visitor's browser. |
| Private repository | Not supported by the minimal contract. Later support may use a narrowly scoped GitHub App installation token or fine-grained token with only `Contents: read`, stored only as a build secret. GitHub deliberately returns `404` for private resources when authentication is absent or insufficient, so a `404` cannot be assumed to mean deletion. [GitHub: Troubleshooting `404` for private resources](https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api#404-not-found-for-an-existing-resource) |
| Renamed or transferred repository | Follow API redirects and update the stored canonical `full_name` after a permanent redirect. GitHub's REST guidance says clients should follow redirects and update permanent URLs. GitHub also redirects renamed repository traffic, but warns that reusing the old name can defeat the redirect. Store and compare GitHub's numeric repository `id` before accepting content so a reused slug cannot silently substitute a different repository. The repository response exposes both `id` and `full_name`. [GitHub: REST redirect guidance](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api#follow-redirects), [GitHub: Renaming a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository), [GitHub: Get a repository](https://docs.github.com/en/rest/repos/repos#get-a-repository) |
| Missing file, inaccessible repository, timeout, malformed Markdown, or rejected asset | Preview reports a precise error. Production continues to use the last explicitly published revision or the CMS fallback for that locale; it never substitutes an empty body. |
| Repository deleted or made private after publication | The existing static deployment remains valid because imported assets are copied into the portfolio build. A later build uses the last published snapshot or CMS fallback and surfaces a warning. |

## Minimal safe contract for the later enhancement

### 1. CMS record

Each project remains a CMS document with:

- `published`, order, featured state, localized slug/title/summary, dates, technologies, SEO/social metadata, repository/demo links, and contact-safe attribution;
- a CMS-authored, publishable fallback body for both `en` and `hr`;
- per-locale `bodySource: cms | github`;
- when GitHub is selected: `repositoryId`, canonical `owner/repo`, source path, tracked branch or tag for preview, and an immutable published commit SHA;
- the last successful import status, timestamp, and source revision.

Recommended conventional paths are:

```text
PORTFOLIO.en.md
PORTFOLIO.hr.md
```

The paths may be overridden in the CMS, but a project must not infer arbitrary files from the repository. Either a valid imported body or the CMS fallback must exist for each locale before publishing. There is no automatic cross-language fallback: English content must not appear silently on a Croatian route.

### 2. Preview and publishing

- A preview resolves the configured branch/tag to one commit and fetches all Markdown and assets from that immutable commit, so the page cannot mix files from different revisions.
- Production changes only after an explicit Publish action. That action records the reviewed commit SHA and promotes the validated Markdown plus copied assets into a durable published snapshot before triggering the production build. The snapshot belongs in the selected CMS/content store or a versioned portfolio artifact store, never only in an ephemeral build cache.
- A later source-repository push may create or refresh a **preview only**. It must not alter production automatically.
- The production artifact records the imported repository ID, commit SHA, Markdown blob SHA, and asset hashes for diagnosis and reproducibility.

GitHub's `push` webhook contains the new `after` commit SHA, so preview refreshes are feasible. If webhooks are used, GitHub recommends subscribing only to necessary events, using a high-entropy secret, keeping HTTPS verification enabled, checking event type/action, and using delivery IDs to prevent duplicate processing. [GitHub: `push` webhook payload](https://docs.github.com/en/webhooks/webhook-events-and-payloads#push), [GitHub: Webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks)

If the chosen host/CMS cannot express preview-only webhook builds followed by explicit promotion, omit automatic source-repository triggers. A CMS “Refresh preview” action is an acceptable first version of the enhancement.

### 3. Markdown and link policy

Use CommonMark plus a documented GFM subset: headings, paragraphs, emphasis, lists, blockquotes, fenced code, tables, links, and images. Raw HTML, MDX, embedded components, scripts, iframes, forms, inline styles, and arbitrary directives are forbidden.

GitHub Flavored Markdown permits raw HTML syntactically and GitHub applies additional post-processing and sanitization on github.com. The portfolio cannot assume GitHub's site sanitizer is present merely because the source file renders safely there. [GitHub Flavored Markdown specification](https://github.github.com/gfm/)

Parse Markdown into an AST and render typed React elements; never inject generated HTML with `innerHTML`. `react-markdown`, for example, does not use `dangerouslySetInnerHTML`, skips raw HTML unless explicitly enabled, and exposes URL transformation and element allow-listing. The eventual component-framework decision may choose a different parser, but it must preserve these properties. [react-markdown security and architecture](https://github.com/remarkjs/react-markdown#security)

Allow only:

- `https:` links, plus explicitly supported `mailto:` links;
- fragment links within the current narrative;
- repository-relative links, rewritten to the GitHub `blob/<commit>/...` page for the same repository;
- repository-relative images that pass the asset policy below.

Reject protocol-relative URLs, `data:`, `javascript:`, `file:`, and other schemes. Add safe external-link attributes in the renderer.

### 4. Relative image policy

Resolve `./`, `../`, and root-relative paths using POSIX path rules against the Markdown file's directory, normalize the result, and reject any path that escapes the repository root. Fetch assets from the same repository and immutable commit through an API-returned URL; do not predict or permanently store expiring download URL shapes, because GitHub explicitly advises clients not to manually construct API URLs and says contents download URLs should be refreshed for each download. [GitHub: Do not manually parse URLs](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api#do-not-manually-parse-urls), [GitHub: Repository contents API](https://docs.github.com/en/rest/repos/contents#get-repository-content)

The minimal importer accepts only PNG, JPEG, and WebP, verifies the actual MIME signature, requires non-empty alt text, and enforces configured count, byte, and pixel-dimension limits. It copies validated images into the portfolio's own immutable build output and rewrites the Markdown URL to that local asset.

SVG, animated images, external images, and arbitrary downloadable files are rejected in the minimal importer. SVG can be added only with a separate sanitize/render policy. The canonical text-diagram language selected elsewhere in the Wayfinder map may be supported through fenced code rendered to static SVG during the build; it should not weaken this image policy.

### 5. Rate limits, caching, and failure handling

GitHub permits only 60 unauthenticated REST requests per originating IP per hour; authenticated user requests generally permit 5,000 per hour. Builds on shared infrastructure can therefore exhaust unauthenticated capacity unexpectedly even at zero visitor traffic. [GitHub: REST API rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)

The importer should:

- fetch only during preview/build, never per page view;
- cache by `repositoryId + commit SHA + path`;
- reuse imported assets by content hash;
- use bounded concurrency, request timeouts, and bounded retries that respect `retry-after` and rate-limit reset headers;
- use conditional `ETag` requests for mutable preview refs where the integration has authentication—an authorized `304 Not Modified` does not consume primary rate-limit quota; [GitHub: Conditional requests](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api#use-conditional-requests)
- build production from the durable published snapshot rather than refetching GitHub, so an upstream outage cannot change or blank an already-published page;
- fail a new Publish action closed when neither the requested import nor the locale's CMS fallback is valid.

An optional read-only token may later improve public-repository build limits, but adding any credential should be a deliberate deployment decision. It is not required for the public-only minimal contract.

## Acceptance tests for the enhancement

Before enabling GitHub narratives in production, verify:

1. both locale files render headings, tables, code, internal anchors, and relative repository links correctly;
2. nested Markdown paths resolve `./`, `../`, and `/` image paths against one immutable commit;
3. raw HTML and dangerous URL schemes render inert or are rejected;
4. oversized, spoofed-MIME, external, traversal, and SVG image inputs are rejected;
5. a repository rename follows the redirect and preserves the stored repository ID;
6. slug reuse with a different repository ID is rejected;
7. missing/private/deleted repositories, missing locale files, GitHub `403`/`404`/`429`, timeout, and malformed content all use the reviewed snapshot or CMS fallback without blanking production;
8. a repository push refreshes preview only, while production remains pinned until explicit Publish;
9. a production build is reproducible from the recorded commit and asset hashes;
10. all imported images have CMS- or Markdown-supplied alt text, and the rendered case study meets the portfolio's accessibility and performance gates.

## Resulting implementation boundary

For the first release:

- use CMS-authored bilingual project bodies and uploaded media;
- keep the project rendering model independent of the CMS editor;
- reserve `bodySource` and source-revision fields in the schema, but do not expose them unless implemented;
- do not add GitHub tokens, source-repository webhooks, polling, or runtime content fetches.

For the later enhancement:

- implement the public-repository contract above first;
- require a prototype of the chosen CMS's preview/publish flow before enabling automatic preview refreshes;
- add private repositories only if a concrete project needs them and the chosen host can securely scope and rotate read-only credentials.

This preserves the useful part of the idea—writing a backend project's detailed story next to its code and diagrams—without turning GitHub into a second authority for portfolio navigation, localization, or publication state.
