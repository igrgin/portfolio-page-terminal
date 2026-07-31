# Portfolio

Production workspace for Ivo Grgin's bilingual TUI-styled portfolio.

This is a source-visible portfolio repository shared for evaluation. No license is
granted to copy, modify, or redistribute the source or its personal content.

## Workspace

- `apps/web` — TypeScript Next.js App Router application
- `apps/studio` — independently buildable Sanity Studio
- `packages/ui` — portfolio-owned UI boundary, shadcn source scaffold, Base UI
  primitives, and semantic TUI tokens
- `packages/content` — shared content contracts and generated-type boundary

Install the exact lockfile with Node.js 22.23.2:

```sh
nvm use
npm ci
```

Run the applications independently:

```sh
npm run dev:web
npm run dev:studio
```

The Studio uses a non-production placeholder project ID until provider provisioning is
completed. Set `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET` to connect an
authorized Sanity project. Set `SANITY_STUDIO_PREVIEW_ORIGIN` to the public Web
application origin used by the persistent Project preview; it defaults to
`http://localhost:3000` for local development. The preview renders the real published
Project route. Complete batch review uses the authenticated Draft Mode workflow below.

Static Web builds read published content through Sanity's CDN. Set
`SANITY_PROJECT_ID`, `SANITY_DATASET`, and the public HTTPS origin in
`NEXT_PUBLIC_SITE_ORIGIN` in the Web build environment. A configured build fails
before deployment when published About Me content or its required local assets are
invalid, preserving the last successful public site. When Sanity variables are absent,
local builds deliberately leave localized content routes unpublished rather than
inventing fallback content.

### Publication readiness and Draft Mode

Create a named Publication batch in Studio, include the complete changed-draft
set, attach asset evidence and active free-tier measurements, confirm the factual
and privacy reviews, then run **Run batch readiness**. The report lists all
bilingual, reference, URL, date, ordering, slug, asset, diagram, accessibility,
privacy, and release-limit failures together. Its revision fingerprint changes
after any selected/reference document, asset evidence, confirmation, or limit
edit; stale validation cannot open Draft Mode. Direct content Publish actions
remain disabled so readiness cannot be bypassed; the batch publication workflow
owns release publication.

Configure the Web runtime with:

- `DRAFT_MODE_SECRET` — a random server-only value of at least 32 characters;
- `SANITY_API_READ_TOKEN` — a least-privilege server-only Sanity Viewer token;
- the existing `SANITY_PROJECT_ID` and `SANITY_DATASET`.

Generate an access token for the exact green revision, optionally choosing a
shorter lifetime than the 15-minute maximum:

```sh
npm run draft:token -- <revision> 600
```

Open `/draft`, submit the token, and review the real application separately under
`/draft/en/...` and `/draft/hr/...`. Draft URLs and responses are non-indexable,
all internal application links remain inside the isolated batch preview, Sanity
credentials never enter the browser, and the visible banner provides an explicit
exit. The HTTP-only session expires with the signed token.

Set `SANITY_STUDIO_ROLLBACK_DATASET` to a separate private Sanity dataset before
using the release controls. After both localized previews are acknowledged,
Studio captures the current published document versions and asset references
there, then publishes every saved draft in one revision-locked transaction. A
single published batch marker is the only event eligible for the protected
production build hook; direct content and batch Publish actions remain disabled.
The Studio shows **Published in Sanity** separately from **Live on the
portfolio**. Configure and operate the private dataset and idempotent webhook
using [the Publication batch runbook](docs/operations/publication.md).

### Recovery exports and restore drills

The scheduled `Encrypted Sanity export` workflow exports the configured content
dataset in Sanity's stream mode. The command includes documents, drafts, and
assets and rejects the private rollback dataset. The archive and its SHA-256
evidence are encrypted together before the only uploaded artifact is created.

Preview an export command without contacting Sanity:

```sh
npm run content:export -- \
  --project-id portfolio-production \
  --dataset production \
  --rollback-dataset publication-recovery-private \
  --output /secure/backups/sanity-2026-07-31.tar.gz \
  --evidence /secure/backups/sanity-2026-07-31.export.json \
  --date 2026-07-31 \
  --dry-run
```

The matching restore command verifies the archive hash and complete-export
evidence, then refuses to run unless the target project differs from production:

```sh
npm run content:restore -- \
  --source /secure/backups/sanity-2026-07-31.tar.gz \
  --export-evidence /secure/backups/sanity-2026-07-31.export.json \
  --production-project-id portfolio-production \
  --target-project-id portfolio-recovery-test \
  --target-dataset restore-2026-07-31 \
  --evidence /secure/backups/sanity-2026-07-31.restore.json \
  --date 2026-07-31 \
  --dry-run
```

Remove `--dry-run` only after following the access, recovery, and verification
steps in the Publication batch runbook.

### Project diagrams

Full Project case studies may contain paired English/Croatian Mermaid diagrams.
Only `sequenceDiagram` and the approved directional `flowchart` subset are
accepted. The Web prebuild uses the exact-pinned Mermaid CLI to generate light
and dark SVG assets for both locales, validates the SVG as XML, and replaces the
last valid generated directory only after every variant succeeds. The build
requires the Chromium binary installed with the root development dependencies;
no renderer or diagram source is shipped as visitor-side JavaScript.

Run the complete local quality gate:

```sh
npm run check
```

Individual build commands are `npm run build:web` and `npm run build:studio`.

## Dependency security

Run the dependency-security report with:

```sh
npm run check:dependencies
```

The report groups npm's affected dependency entries into distinct advisories and
shows their dependency paths and available patches. Critical findings fail the
check, high findings produce a non-blocking GitHub warning, and moderate or low
findings remain visible in the report. Dependency changes and vulnerability fixes
are always reviewed and applied manually.

## Conditional Contact form

The Contact form is omitted unless its SES runtime configuration is complete and
every release gate below is exactly `true`:

- `CONTACT_FORM_ENABLED`
- `CONTACT_FORM_DELIVERY_GATE`
- `CONTACT_FORM_PROCESSOR_GATE`
- `CONTACT_FORM_TRANSFER_GATE`
- `CONTACT_FORM_RETENTION_GATE`
- `CONTACT_FORM_SECURITY_GATE`
- `CONTACT_FORM_PRIVACY_GATE`

The runtime also requires `CONTACT_SES_REGION` (an approved EEA SES region),
`CONTACT_SES_FROM`, `CONTACT_SES_TO`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, and `CONTACT_RATE_LIMIT_SECRET` (at least 32
characters). Store credentials and the rate-limit secret only in deployment
secrets. The endpoint permits five requests per HMAC-derived client token and
50 requests route-wide per 60-second runtime window; Amazon SES must remain
sandboxed as the final cap. The rate-limit boundary must be backed by the
deployment platform before the delivery gate is enabled across more than one
runtime instance. The endpoint creates no payload store and emits no submission
or provider logs.
