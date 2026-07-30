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
Project route. Authenticated draft data is intentionally reserved for the later Draft
Mode workflow.

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
after any selected document edit; stale validation cannot open Draft Mode.

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
