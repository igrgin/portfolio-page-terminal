# Single-owner bilingual CMS options

**Research date:** 2026-07-28  
**Decision ticket:** “Evaluate single-owner bilingual CMS options and hosting integrations”

## Decision

Use **Sanity on its Free plan** as the portfolio’s content system, with a
Sanity-hosted Studio as the private editing interface.

Model English and Croatian as required field-level siblings in the same
document, and publish both languages together. Keep project metadata and
shared facts non-localized, while requiring both localized values for every
public string and rich-text field. The frontend must not silently fall back
from one language to the other.

This is the best fit because it provides, without building an admin:

- authenticated browser editing and free Studio hosting;
- ordinary drafts, explicit publishing, live preview, and visual editing on
  the Free plan;
- rich, structured project case studies through Portable Text, including
  custom image and diagram blocks;
- image assets and arbitrary file uploads, including English and Croatian PDF
  résumés;
- a first-party Vercel integration without making Vercel mandatory;
- a documented full-dataset export path, including assets and drafts; and
- free-tier quotas with ample headroom for a personal portfolio.

The choice is conditional on the implementation safeguards below. In
particular, Sanity Free only permits public datasets, has no backup feature,
and retains draft change review for only three days. Those constraints are
acceptable for content intended to become public, provided draft access is
kept authenticated and off-platform exports are automated.

## Required implementation shape

### Content model

Use a single public `production` dataset containing **only portfolio content
that is safe to publish**. Do not store contact-form submissions, secrets,
private project notes, unpublished AI-project details, or other private data
in it. Sanity Free includes public datasets only; private datasets begin on a
paid plan. Public dataset visibility permits unauthenticated reads, while
Studio access remains authenticated. Sanity also warns that uploaded asset
files are not private even when a dataset is private.
([Sanity pricing](https://www.sanity.io/pricing),
[dataset visibility](https://www.sanity.io/docs/content-lake/keeping-your-data-safe),
[Studio hosting and access](https://www.sanity.io/docs/studio/deployment))

Use localized value objects in the same document, for example:

```text
title.en
title.hr
summary.en
summary.hr
caseStudy.en
caseStudy.hr
```

This gives one editor a clear parity view and makes publishing an atomic
English/Croatian action. Sanity documents field-level localization as a
single document containing multiple languages that publishes together, which
matches the requirement for complete content parity.
([Sanity localization](https://www.sanity.io/docs/studio/localization))

Schema validation must reject publication when either `en` or `hr` is absent
for any public localized field. Shared values—dates, technology references,
repository URLs, display order, visibility, and featured status—should exist
only once. Slugs may be localized when the routing decision requires it.

Recommended document types are:

- `siteSettings`: identity, profile photo, contact channels, social links,
  localized SEO defaults, and the two résumé assets;
- `about`, `experience`, `education`, and `skillGroup`;
- `project`: shared metadata plus paired localized title, summary, case study,
  captions, alt text, and SEO fields; and
- `navigationLabel` only if navigation copy is intended to be editor-managed.
  Otherwise stable interface strings belong in the application’s i18n files.

Use Portable Text for each localized project case study. It is structured
JSON rich text, supports custom blocks such as images and code-like data, and
has an official React renderer. Add constrained custom blocks for project
images, captions/alt text, repository/demo links, and the canonical diagram
source or rendered diagram asset selected by the separate diagram decision.
([Sanity block content](https://www.sanity.io/docs/studio/block-content),
[Portable Text in React](https://www.sanity.io/docs/developer-guides/presenting-block-text))

Use Sanity `image` fields for images and `file` fields restricted to
`application/pdf` for both résumés. The file type supports PDFs and custom
metadata; the image block schema can require accessible alt text.
([Sanity file type](https://www.sanity.io/docs/studio/file-type),
[Portable Text image blocks with alt text](https://www.sanity.io/docs/developer-guides/ultimate-guide-for-customising-portable-text-from-schema-to-react-component))

### Draft, preview, and publishing workflow

Sanity creates a draft when a new document is made or a published document is
edited. Unauthenticated API consumers do not receive drafts, and publishing
makes the new version public. The production frontend must query the
`published` perspective only. The authenticated preview route should query
the `drafts` perspective so the owner can inspect all pending changes before
publishing.
([Sanity drafts](https://www.sanity.io/docs/content-lake/drafts),
[presenting and previewing content](https://www.sanity.io/docs/content-lake/presenting-and-previewing-content),
[secure draft mode](https://www.sanity.io/docs/visual-editing/implementing-draft-mode))

The Free plan includes Live Preview, Visual Editing, and the Presentation
tool, but not scheduled drafts or content releases. Scheduling and multi-step
approval are not first-release requirements, so their absence is acceptable.
Do not depend on Vercel Content Link, which Vercel documents as a Pro or
Enterprise feature; use Sanity’s included preview tooling instead.
([Sanity pricing](https://www.sanity.io/pricing),
[Vercel’s Sanity integration](https://vercel.com/docs/integrations/cms/sanity))

### Hosting integration and portability

Host the Studio on Sanity’s included `*.sanity.studio` service. Sanity
describes Studio as an open-source React SPA that can alternatively be hosted
on any platform supporting SPA routing, so the editor is not coupled to the
public site’s host.
([Sanity Studio deployment](https://www.sanity.io/docs/studio/deployment))

If Vercel wins the separate hosting decision, use Sanity’s native Vercel
Marketplace integration for project configuration and environment variables.
The official integration provisions read and write tokens, so write tokens
must remain server-only and must never enter browser bundles. The integration
is a convenience, not an architectural dependency.
([Sanity’s Vercel integration](https://www.sanity.io/docs/developer-guides/vercel-integration),
[Vercel Marketplace announcement](https://vercel.com/changelog/sanity-vercel-marketplace))

If another host wins, use Sanity’s framework-agnostic HTTP/JavaScript client
and webhooks. Sanity Free includes two GROQ-powered webhooks, enough for a
production publish/revalidation hook and one spare integration. Static
hosting must rebuild or revalidate after publishing; a runtime-rendered host
may read published content from the API CDN.
([Sanity pricing](https://www.sanity.io/pricing),
[Sanity webhooks](https://www.sanity.io/docs/http-reference/webhooks))

Automate a periodic authenticated dataset export and retain it outside Sanity.
The Export API includes non-deleted documents, drafts, and asset documents;
Sanity recommends its CLI or JavaScript package when asset downloads are
needed. Treat the export plus source-controlled Studio schemas as the exit
path to another CMS.
([Sanity Export API](https://www.sanity.io/docs/http-reference/export))

## Free-tier fit

Sanity’s published Free-plan allowances are:

- up to 20 seats with Administrator and Viewer roles;
- two public datasets;
- 10,000 documents and 2,000 unique attributes per dataset;
- one million API CDN requests and 250,000 uncached API requests per month;
- 100 GB of assets and 100 GB of monthly bandwidth;
- two GROQ-powered webhooks;
- free Studio hosting, Live Preview, Visual Editing, and unlimited locales;
- three days of draft change review; and
- no managed backups, scheduled drafts, content releases, or private dataset.

Additional Free-plan quota is not available, so exceeding a hard limit would
require reducing usage or moving to a paid plan. For a portfolio with dozens,
not thousands, of content records, the document and request margins are very
large. Keep a lightweight usage check and off-platform export in the release
runbook.
([Sanity pricing](https://www.sanity.io/pricing))

## Alternatives considered

| Option | Fit | Why it was not selected |
| --- | --- | --- |
| **Storyblok Starter** | Strong hosted runner-up | Its free plan is unusually close to the requirement: one included user, two locales, 20,000 stories, 2,000 assets, 100,000 API requests and 100 GB traffic per month, plus a visual editor. It has explicit Draft, Published, and Changed states and can publish all languages together. However, Starter retains content versions for only one day, has no SLA, caps preview URLs at two, and provides less direct backup/export assurance than Sanity’s documented full dataset-and-asset export. Choose it instead only if its page-oriented visual editor proves materially easier during a hands-on spike. ([pricing](https://www.storyblok.com/pricing), [Visual Editor and statuses](https://www.storyblok.com/docs/manuals/visual-editor), [internationalization](https://www.storyblok.com/docs/concepts/internationalization.html)) |
| **Contentful Free** | Viable but weaker value | Free provides exactly two locales, 100,000 API calls/month, 50 GB asset bandwidth/month, 50 MB uploads, validation, rich text, content versioning, Live Preview, and separate delivery/preview APIs. It can store localized PDF assets. Its quotas are materially tighter than Sanity’s, locale-based publishing is limited to specific higher plans, and its product surface is heavier than a one-owner portfolio needs. ([pricing](https://www.contentful.com/pricing/), [localization](https://www.contentful.com/developers/docs/tutorials/general/setting-locales/), [preview API](https://www.contentful.com/developers/docs/references/content-preview-api/overview/), [assets](https://www.contentful.com/developers/docs/references/content-management-api/assets/)) |
| **TinaCMS Free** | Best Git portability, misses workflow | Content and media can live in Git as Markdown/MDX/JSON and repository assets; TinaCloud connects to GitHub, authenticates editors, and supports field- or directory-based localization. Free includes two users, unlimited documents, and a 100 MB per-asset cap. But its branch/PR Editorial Workflow—the feature that provides a genuine draft, preview, and explicit merge-to-publish flow—is only on Business/Enterprise. The free “draft field” is merely a normal boolean and requires custom preview logic; it does not preserve a published version while existing content is edited. This fails a core requirement without bespoke workflow code. ([pricing](https://tina.io/pricing), [editorial workflow](https://tina.io/docs/tinacloud/editorial-workflow), [draft fields](https://tina.io/docs/drafts/drafts-fields), [localization](https://tina.io/docs/guides/internationalization), [repo media](https://tina.io/docs/reference/media/repo-based)) |
| **Decap CMS** | Zero license cost, high integration burden | Decap provides side-by-side i18n authoring and a Git/PR editorial workflow with deploy-preview links. Its direct GitHub backend still needs an OAuth server; the common Netlify Git Gateway route is now deprecated and not recommended for new configurations. Using Decap therefore adds hosting coupling or a separately operated OAuth proxy, plus Git/media repository growth and more fragile preview plumbing. That is unnecessary operational complexity for one editor. ([i18n](https://decapcms.org/docs/i18n/), [editorial workflow](https://decapcms.org/docs/editorial-workflows/), [GitHub authentication](https://decapcms.org/docs/github-backend/), [Netlify Git Gateway deprecation](https://docs.netlify.com/manage/security/secure-access-to-sites/git-gateway/)) |
| **DatoCMS Free** | Feature-capable, unsuitable reliability policy | Free includes one collaborator, five locales, 300 records, 200 MB storage, 100,000 monthly API calls, drafts, and explicit publishing. DatoCMS explicitly says production use on Free is discouraged; reaching any monthly resource limit suspends the admin, APIs, and asset CDN for the rest of the month, and an owner who does not log in for a year risks project/account deletion after warnings. That is not a dependable launch foundation. ([pricing](https://www.datocms.com/pricing), [free-plan deactivation policy](https://www.datocms.com/docs/plans-pricing-and-billing/free-developer-plan-limits-and-deactivations), [draft/published system](https://www.datocms.com/docs/general-concepts/draft-published)) |
| **Self-hosted Strapi, Directus, Payload, or a custom admin** | Technically possible | These options introduce a database, authentication, patching, backups, monitoring, and service hosting. They do not improve the one-owner editing outcome enough to justify recurring cost or operational ownership. A custom admin is expressly outside the decision’s scope. |

## Acceptance checks for implementation

Before treating the CMS integration as complete, verify all of the following:

1. A single owner can authenticate to the hosted Studio, while an anonymous
   visitor cannot read drafts or mutate content.
2. About, experience, education, skill, project, contact, SEO, image-alt, and
   résumé-label fields cannot publish unless both English and Croatian values
   are present.
3. Editing a published record leaves the public version unchanged until the
   owner selects Publish.
4. Preview shows the pending English and Croatian routes and never exposes a
   preview token to browser source, logs, or a public URL.
5. Both résumé PDFs can be replaced in Studio and downloaded from both
   localized sites.
6. A project case study can contain formatted text, images with localized
   captions and alt text, and the chosen diagram block.
7. Publishing causes the production site to revalidate or rebuild, and a
   failed deployment leaves the previously published site available.
8. A full export including assets can be restored into a test project or
   transformed without depending on the live Sanity project.
9. Usage alerts or a monthly check cover API requests, asset storage, and
   bandwidth before any free-plan ceiling is approached.

## Revisit triggers

Re-open the decision if any of these becomes true:

- private content must be stored in the same dataset;
- more than one person needs editor-only permissions rather than full
  Administrator access;
- scheduled publishing, releases, approvals, or long change history becomes a
  requirement;
- expected traffic approaches a Free-plan hard limit;
- the hands-on authoring spike finds Sanity Studio meaningfully less usable
  than Storyblok for bilingual case studies; or
- the project requires content to remain natively in Git rather than merely
  being exportable.
